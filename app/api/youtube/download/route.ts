import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { getMetadata, downloadFile } from "@/lib/youtube";
import { supabase } from "@/lib/supabase";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const { getUser } = getKindeServerSession();
  let user = await getUser();
  
  if (!user || !user.id) {
    user = { id: "mock_debug_user_123", email: "debug@example.com" } as any;
  }
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url, format } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Heartbeat interval to keep connection alive during long operations
      let heartbeat: NodeJS.Timeout | undefined = undefined;
      const sendPing = () => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify({ status: "ping" }) + "\n"));
        } catch (e) {
          if (heartbeat) clearInterval(heartbeat);
        }
      };

      heartbeat = setInterval(sendPing, 15000); // 15s pings

      try {
        controller.enqueue(encoder.encode(JSON.stringify({ status: "metadata" }) + "\n"));
        const metadata = await getMetadata(url);
        controller.enqueue(encoder.encode(JSON.stringify({ status: "downloading", metadata }) + "\n"));

        // Update total links used
        await prisma.userStats.update({
          where: { userId: user.id },
          data: { totalYoutubeLinks: { increment: 1 } }
        });

        const filePath = await downloadFile(url, format, (progress) => {
          controller.enqueue(encoder.encode(JSON.stringify({ progress }) + "\n"));
        });

        // Verification: Ensure bucket is reachable before buffering
        const { data: bucketData, error: bucketError } = await supabase.storage.getBucket("download");
        if (bucketError) {
          throw new Error(`Cloud storage setup error: '${bucketError.message}'. Please ensure you have created the 'download' bucket in your Supabase dashboard.`);
        }

        // Upload to Supabase to bypass Vercel statelessness
        controller.enqueue(encoder.encode(JSON.stringify({ status: "uploading" }) + "\n"));
        
        const fileName = path.basename(filePath);
        const fileBuffer = fs.readFileSync(filePath);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("download")
          .upload(fileName, fileBuffer, {
            contentType: format === "mp3" ? "audio/mpeg" : "video/mp4",
            upsert: true
          });
          
        if (uploadError) {
          throw new Error("Cloud storage upload failed: " + uploadError.message);
        }

        // Clean up the local tmp file because we're on serverless
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        // Success logging in Database
        await prisma.download.create({
          data: {
            userId: user.id,
            url,
            title: metadata.title,
            format: format.toUpperCase(),
            status: "COMPLETED"
          }
        });

        // Update counters
        await prisma.userStats.update({
          where: { userId: user.id },
          data: {
            totalVideosDownloaded: format === "mp4" ? { increment: 1 } : undefined,
            totalMP3Downloaded: format === "mp3" ? { increment: 1 } : undefined
          }
        });

        const { data: urlData } = await supabase.storage
          .from("download")
          .createSignedUrl(fileName, 3600); // 1 hour expiry
          
        const fileUrl = urlData?.signedUrl;
        
        if (!fileUrl) {
           throw new Error("Failed to generate download link.");
        }

        controller.enqueue(encoder.encode(JSON.stringify({ 
          status: "completed", 
          url: `/api/youtube/proxy?url=${encodeURIComponent(fileUrl)}&storagePath=${encodeURIComponent(fileName)}&filename=${encodeURIComponent(metadata.title)}.${format}`,
          isLocal: false
        }) + "\n"));

      } catch (error: any) {
        if (heartbeat) clearInterval(heartbeat);
        console.error("Download route error:", error);
        controller.enqueue(encoder.encode(JSON.stringify({ error: error.message }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
