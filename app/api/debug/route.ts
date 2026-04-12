import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export async function GET(req: NextRequest) {
  const results: any = {
    cwd: process.cwd(),
    binExists: false,
    binFiles: [],
    binaryCheck: null,
    env: {
       HAS_COOKIES: !!process.env.YT_COOKIES_CONTENT,
       DATABASE_URL: !!process.env.DATABASE_URL,
    }
  };

  try {
    const binPath = path.join(process.cwd(), "bin");
    if (fs.existsSync(binPath)) {
      results.binExists = true;
      results.binFiles = fs.readdirSync(binPath);
      
      const ytPath = path.join(binPath, "yt-dlp");
      if (fs.existsSync(ytPath)) {
        try {
          const stats = fs.statSync(ytPath);
          results.binaryCheck = {
            size: stats.size,
            mode: stats.mode.toString(8),
            testOutput: execSync(`${ytPath} --version`).toString().trim()
          };
        } catch (e: any) {
          results.binaryCheck = { error: e.message };
        }
      }
    }
  } catch (error: any) {
    results.error = error.message;
  }

  return NextResponse.json(results);
}
