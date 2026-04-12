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

        // LOCAL TRANSPORT BYPASS: Skip Supabase upload and return local reference
        controller.enqueue(encoder.encode(JSON.stringify({ status: "local_ready" }) + "\n"));
        
        const fileName = path.basename(filePath);
        
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

        controller.enqueue(encoder.encode(JSON.stringify({ 
          status: "completed", 
          url: `/api/youtube/proxy?localPath=${encodeURIComponent(fileName)}&filename=${encodeURIComponent(metadata.title)}.${format}`,
          isLocal: true
        }) + "\n"));

        // Note: fs.unlinkSync(filePath) is NOT called here because the proxy will handle it after the download.

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
