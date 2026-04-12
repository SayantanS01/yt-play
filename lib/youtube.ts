import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

// Detect if we are running in Vercel or local
const IS_VERCEL = !!process.env.VERCEL;
// Binary path: Use bundled binary in Vercel (Linux), or system/local for dev
const YT_BINARY = IS_VERCEL ? path.join(process.cwd(), "bin", "yt-dlp") : "yt-dlp";

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
}

// Utility to extract only the JSON parts from yt-dlp output
const parseYtDlpJson = (output: string) => {
  const lines = output.split("\n");
  for (const line of lines) {
    if (line.trim().startsWith("{")) {
      try {
        return JSON.parse(line.trim());
      } catch (e) {
        continue;
      }
    }
  }
  throw new Error("No valid JSON found in output");
};

// Mobile App User-Agent to bypass strict bot detection
const MOBILE_USER_AGENT = "com.google.android.youtube/19.29.37 (Linux; U; Android 11; en_US; Pixel 5; Build/RD1A.201105.003.C1) gzip";
const WEB_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const getSanitizedCookiesPath = (): string | null => {
  // Priority 1: Vercel Environment Variable (Content provided by user)
  if (process.env.YT_COOKIES_CONTENT) {
    const tempCookiesPath = path.join(os.tmpdir(), "cookies.txt");
    // Write the cookies content once per session if it doesn't exist
    if (!fs.existsSync(tempCookiesPath)) {
      console.log(`[YouTube] Provisioning cookies from ENV var to ${tempCookiesPath}...`);
      fs.writeFileSync(tempCookiesPath, process.env.YT_COOKIES_CONTENT, 'utf8');
    }
    return tempCookiesPath;
  }

  // Priority 2: Local File (Standard Dev)
  const rootCookies = path.join(process.cwd(), "cookies.txt");
  if (!fs.existsSync(rootCookies)) return null;

  try {
    const buffer = fs.readFileSync(rootCookies);
    const isUtf16 = (buffer[0] === 0xFF && buffer[1] === 0xFE) || (buffer[0] === 0xFE && buffer[1] === 0xFF);
    
    if (isUtf16) {
      console.log(`[YouTube] Detected UTF-16 encoding in cookies. Converting to UTF-8...`);
      const content = buffer.toString('utf16le');
      const sanitizedPath = path.join(os.tmpdir(), "sanitized_cookies.txt");
      fs.writeFileSync(sanitizedPath, content, 'utf8');
      return sanitizedPath;
    }
    
    return rootCookies;
  } catch (err) {
    console.error(`[YouTube] Failed to sanitize cookies:`, err);
    return rootCookies;
  }
};

// Common arguments for yt-dlp to handle signatures and warnings
const getCommonArgs = () => {
  const sanitizedCookies = getSanitizedCookiesPath();
  const hasCookies = !!sanitizedCookies || !!process.env.YT_COOKIES_BROWSER;

  const args = [
    "--no-warnings",
    "--no-check-certificates",
    "--js-runtime", "node",
    // IF we have cookies, use "web" client which matches browser cookies
    // IF we have NO cookies, use "android" client for mobile bypass
    "--extractor-args", `youtube:player_client=${hasCookies ? "web" : "android"}`,
    "--user-agent", hasCookies ? WEB_USER_AGENT : MOBILE_USER_AGENT,
    "--no-cache-dir",
    "--mark-watched"
  ];

  if (sanitizedCookies) {
    console.log(`[YouTube] Auth Handshake: Using authenticated session.`);
    args.push("--cookies", sanitizedCookies);
  } else if (process.env.YT_COOKIES_BROWSER) {
    console.log(`[YouTube] Auth Handshake: Using browser session (${process.env.YT_COOKIES_BROWSER}).`);
    args.push("--cookies-from-browser", process.env.YT_COOKIES_BROWSER);
  } else {
    console.warn(`[YouTube] WARNING: No cookies found. Bot detection is likely to trigger.`);
  }

  return args;
};

const spawnWithTimeout = (args: string[], timeoutMs: number): Promise<{ stdout: string, stderr: string }> => {
  return new Promise((resolve, reject) => {
    const ytProcess = spawn(YT_BINARY, args);
    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      ytProcess.kill("SIGKILL");
      reject(new Error("Mastering Timeout: The extraction manifest failed to respond. YouTube may be limiting connections."));
    }, timeoutMs);

    ytProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ytProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ytProcess.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || "Process exited with error"));
      }
    });
  });
};

export const getMetadata = async (url: string): Promise<VideoMetadata> => {
  const { stdout } = await spawnWithTimeout(["--dump-json", "--flat-playlist", ...getCommonArgs(), url], 60000);
  try {
    const json = parseYtDlpJson(stdout);
    return {
      id: json.id,
      title: json.title,
      thumbnail: json.thumbnail || json.thumbnails?.[0]?.url,
      duration: json.duration,
      channel: json.uploader || json.channel,
    };
  } catch (e: any) {
    throw new Error("Failed to parse metadata: " + e.message);
  }
};

export const getPlaylistMetadata = async (url: string): Promise<VideoMetadata[]> => {
  const common = getCommonArgs();
  
  // Strategy: Try standard extraction first, but rotate to TV client for Mixes/Radio
  // The TV client is much more resilient for dynamic playlists
  const attemptExtraction = async (clientType: "standard" | "tv"): Promise<VideoMetadata[]> => {
    const playlistArgs = [
      "--dump-json",
      "--flat-playlist",
      "--yes-playlist",
      "--playlist-items", "1-50",
      "--ignore-errors"
    ];

    if (clientType === "tv") {
      // Override client to TV for the fallback attempt
      const tvArgs = common.map(arg => arg.startsWith("youtube:player_client=") ? "youtube:player_client=tv" : arg);
      console.log(`[YouTube] Rotating to TV client for playlist manifest...`);
      const { stdout } = await spawnWithTimeout([...playlistArgs, ...tvArgs, url], 120000);
      return parseOutput(stdout);
    } else {
      const { stdout } = await spawnWithTimeout([...playlistArgs, ...common, url], 90000);
      return parseOutput(stdout);
    }
  };

  const parseOutput = (stdout: string): VideoMetadata[] => {
    const lines = stdout.trim().split("\n");
    return lines
      .filter((line) => line.trim().startsWith("{"))
      .map((line) => {
        try {
          const json = JSON.parse(line);
          return {
            id: json.id,
            title: json.title,
            thumbnail: json.thumbnails?.[0]?.url || json.thumbnail,
            duration: json.duration || 0,
            channel: json.uploader || json.channel || "Unknown Artist",
          };
        } catch (e) { return null; }
      })
      .filter((v): v is VideoMetadata => v !== null);
  };

  try {
    let videos: VideoMetadata[] = [];
    
    try {
      videos = await attemptExtraction("standard");
    } catch (e) {
      console.warn(`[YouTube] Standard extraction failed, checking fallback...`);
    }
    
    // If standard extraction failed or only found 1 song on a potential playlist URL, try the TV fallback
    if (videos.length <= 1 && (url.includes("list=") || url.includes("radio=1"))) {
      try {
        const tvVideos = await attemptExtraction("tv");
        if (tvVideos.length > videos.length) {
          videos = tvVideos;
        }
      } catch (e: any) {
        console.error(`[YouTube] TV fallback also failed: ${e.message}`);
      }
    }

    if (videos.length === 0) throw new Error("No entries found in manifest");
    return videos;
  } catch (e: any) {
    throw new Error("Failed to parse playlist manifest: " + e.message);
  }
};

export const getStreamUrl = async (id: string): Promise<string> => {
  const { stdout } = await spawnWithTimeout(["-g", "--no-playlist", ...getCommonArgs(), "-f", "bestaudio/best", `https://www.youtube.com/watch?v=${id}`], 45000);
  const urls = stdout.trim().split("\n").filter(l => l.startsWith("http"));
  if (urls.length > 0) {
    return urls[0];
  }
  throw new Error("No stream URL in manifest");
};

export const downloadFile = (
  url: string,
  format: "mp4" | "mp3",
  onProgress: (percent: string) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const fileName = `${Date.now()}.${format === "mp3" ? "mp3" : "mp4"}`;
    const filePath = path.join(tempDir, fileName);

    const formatArgs =
      format === "mp3"
        ? ["-x", "--audio-format", "mp3", "-f", "bestaudio/best"]
        : ["-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"];

    const ytProcess = spawn(YT_BINARY, [...formatArgs, ...getCommonArgs(), "--prefer-free-formats", "-o", filePath, url]);
    let errorOutput = "";
    
    // Watchdog for progress: Kill process if no progress for 90 seconds
    let lastProgressTime = Date.now();
    const watchdog = setInterval(() => {
      if (Date.now() - lastProgressTime > 90000) {
        ytProcess.kill("SIGKILL");
        clearInterval(watchdog);
        reject(new Error("Mastering Timeout: Resource extraction stalled at current progress."));
      }
    }, 10000);

    ytProcess.stdout.on("data", (data) => {
      const output = data.toString();
      // Improved regex to capture fragment and standard progress
      const match = output.match(/(\d+\.\d+)%/);
      if (match) {
        lastProgressTime = Date.now();
        onProgress(match[1]);
      }
    });

    ytProcess.stderr.on("data", (data) => {
       errorOutput += data.toString();
       console.error("yt-dlp stderr:", data.toString());
    });

    ytProcess.on("close", (code) => {
      clearInterval(watchdog);
      if (code === 0) {
        resolve(filePath);
      } else {
        reject(new Error(errorOutput || "Download failed"));
      }
    });

    // Hard process limit: 10 minutes
    setTimeout(() => {
      if (ytProcess.exitCode === null) {
        ytProcess.kill("SIGKILL");
        clearInterval(watchdog);
        reject(new Error("Mastering Timeout: Total process duration exceeded limit (10m)."));
      }
    }, 600000);
  });
};
