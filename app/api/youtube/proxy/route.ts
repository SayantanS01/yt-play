import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";
import os from "os";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url");
  const localPath = searchParams.get("localPath");
  const storagePath = searchParams.get("storagePath");
  const filename = searchParams.get("filename") || "download";

  try {
    let body: any;
    let headers: Headers;
    let status = 200;

    const range = req.headers.get("range");

    if (localPath) {
      // HANDLE LOCAL TRANSPORT
      const fullPath = path.join(os.tmpdir(), localPath);
      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: "Local resource expired or missing" }, { status: 404 });
      }

      const stats = fs.statSync(fullPath);
      headers = new Headers();
      headers.set("Content-Type", filename.endsWith(".mp3") ? "audio/mpeg" : "video/mp4");
      headers.set("Accept-Ranges", "bytes");

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        const chunksize = (end - start) + 1;
        
        body = fs.createReadStream(fullPath, { start, end });
        status = 206;
        headers.set("Content-Range", `bytes ${start}-${end}/${stats.size}`);
        headers.set("Content-Length", chunksize.toString());
      } else {
        body = fs.createReadStream(fullPath);
        headers.set("Content-Length", stats.size.toString());
      }
    } else if (fileUrl) {
      // HANDLE REMOTE/STORAGE TRANSPORT
      const isStream = searchParams.get("type") === "stream";
      
      const fetchHeaders: any = {};
      if (isStream) {
        fetchHeaders["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
      }
      if (range) {
        fetchHeaders["Range"] = range;
      }

      const response = await fetch(fileUrl, { headers: fetchHeaders });
      if (!response.ok && response.status !== 206) throw new Error("Faulty storage handshake");
      
      body = response.body;
      status = response.status;
      headers = new Headers(response.headers);

      headers.set("Accept-Ranges", "bytes");

      // If it's a stream, ensure the browser treats it as audio/mpeg or similar if it doesn't already
      if (isStream && !headers.get("Content-Type")?.includes("audio")) {
        headers.set("Content-Type", "audio/mpeg");
      }
    } else {
      return NextResponse.json({ error: "Resource identifier required" }, { status: 400 });
    }

    // Common forced attachment headers
    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');
    headers.set("Content-Disposition", `attachment; filename="${filename}"; filename*=UTF-8''${safeFilename}`);
    
    // Logic to delete the resource after the stream finishes
    const cleanup = async () => {
      if (storagePath) {
        console.log(`Cleaning up cloud resource: ${storagePath}`);
        await supabase.storage.from("download").remove([storagePath]);
      }
      if (localPath) {
        const fullPath = path.join(os.tmpdir(), localPath);
        if (fs.existsSync(fullPath)) {
          console.log(`Cleaning up local resource: ${fullPath}`);
          fs.unlinkSync(fullPath);
        }
      }
    };

    // Use TransformStream to detect stream closure
    const { readable, writable } = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
      flush() { cleanup(); }
    });

    if (body.pipeTo) {
      body.pipeTo(writable);
    } else {
      // Node.js stream fallback
      const { Readable } = require("stream");
      Readable.toWeb(body).pipeTo(writable);
    }

    return new Response(readable, {
      status: status,
      headers: headers,
    });
  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Transport failed: " + error.message }, { status: 500 });
  }
}
