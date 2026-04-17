import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

// Detect if we are running in Vercel or local
const IS_VERCEL = !!process.env.VERCEL;

import https from "https";
import { generate } from "./potoken/generator";

let ytBinaryPromise: Promise<string> | null = null;

const ensureBinary = async (): Promise<string> => {
  if (ytBinaryPromise) return ytBinaryPromise;

  ytBinaryPromise = (async () => {
    if (!IS_VERCEL) {
      const localBinary = path.join(process.cwd(), "bin", "yt-dlp");
      return fs.existsSync(localBinary) ? localBinary : "yt-dlp";
    }

    const tmpBinary = path.join(os.tmpdir(), "yt-dlp");
    
    // Check size to ensure we aren't executing the Python zipapp (~3MB). Compiled binary is >20MB.
    if (fs.existsSync(tmpBinary) && fs.statSync(tmpBinary).size > 15000000) {
      return tmpBinary;
    }

    const tracedBinary = path.join(process.cwd(), "bin", "yt-dlp");
    if (fs.existsSync(tracedBinary) && fs.statSync(tracedBinary).size > 15000000) {
      try {
        fs.copyFileSync(tracedBinary, tmpBinary);
        fs.chmodSync(tmpBinary, 0o777);
        return tmpBinary;
      } catch (e) {
        console.error("[YouTube] Failed to copy traced binary:", e);
      }
    }

    // Dynamic Download Fallback for Vercel
    console.log("[YouTube] Downloading yt-dlp_linux to /tmp dynamically...");
    const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
    
    return new Promise<string>((resolve, reject) => {
      const download = (dlUrl: string) => {
        https.get(dlUrl, (res) => {
          if ([301, 302, 307, 308].includes(res.statusCode || 0)) {
            return download(res.headers.location as string);
          }
          if (res.statusCode !== 200) {
            reject(new Error(`Download failed with status ${res.statusCode}`));
            return;
          }
          const file = fs.createWriteStream(tmpBinary);
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            try { fs.chmodSync(tmpBinary, 0o777); resolve(tmpBinary); }
            catch (err) { reject(err); }
          });
        }).on('error', reject);
      };
      download(url);
    });
  })();

  return ytBinaryPromise;
};

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

// Cache for PoToken to avoid expensive regeneration (Expires in 30 mins)
let cachedPoToken: { visitorData: string, poToken: string, timestamp: number } | null = null;

const getAutomatedPoToken = async () => {
  const NOW = Date.now();
  if (cachedPoToken && (NOW - cachedPoToken.timestamp) < 1800000) {
    return cachedPoToken;
  }

  try {
    console.log("[YouTube] Generating fresh PoToken for session integrity...");
    const data = await generate();
    cachedPoToken = { ...data, timestamp: NOW };
    return cachedPoToken;
  } catch (err) {
    console.error("[YouTube] PoToken generation failed:", err);
    return null;
  }
};

// Common arguments for yt-dlp to handle signatures and warnings
const getCommonArgs = async () => {
  const sanitizedCookies = getSanitizedCookiesPath();
  const hasCookies = !!sanitizedCookies || !!process.env.YT_COOKIES_BROWSER;
  const poData = await getAutomatedPoToken();

  const extractorArgs = [
    `youtube:player_client=android_test,ios`,
  ];

  if (poData) {
    extractorArgs.push(`youtube:po_token=ios+${poData.poToken}`);
    extractorArgs.push(`visitor_data=${poData.visitorData}`);
  } else if (process.env.YT_PO_TOKEN) {
    extractorArgs.push(`youtube:po_token=${process.env.YT_PO_TOKEN}`);
  }

  const args = [
    "--no-warnings",
    "--no-check-certificates",
    "--js-runtime", "node",
    // EXTRACTOR AGENTS: Use android_test,ios which are more stable against datacenter blocks
    "--extractor-args", extractorArgs.join(";"),
    "--geo-bypass",
    "--geo-bypass-country", process.env.YT_GEO_BYPASS_COUNTRY || "IN",
    "--user-agent", MOBILE_USER_AGENT,
    "--add-header", "Accept-Language:en-US,en;q=0.9",
    "--add-header", "X-Youtube-Client-Name:3",
    "--add-header", "X-Youtube-Client-Version:19.29.37",
    "--no-cache-dir"
  ];

  if (sanitizedCookies) {
    console.log(`[YouTube] Auth Handshake: Using authenticated session (Region: ${process.env.YT_GEO_BYPASS_COUNTRY || 'IN'}).`);
    args.push("--cookies", sanitizedCookies);
  } else if (process.env.YT_COOKIES_BROWSER) {
    console.log(`[YouTube] Auth Handshake: Using browser session (${process.env.YT_COOKIES_BROWSER}).`);
    args.push("--cookies-from-browser", process.env.YT_COOKIES_BROWSER);
  } else {
    console.warn(`[YouTube] WARNING: No cookies found. Bot detection is likely to trigger.`);
  }

  return args;
};

const spawnWithTimeout = async (args: string[], timeoutMs: number): Promise<{ stdout: string, stderr: string }> => {
  const binary = await ensureBinary();
  return new Promise((resolve, reject) => {
    const ytProcess = spawn(binary, args);
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
        const errorMsg = stderr || "Process exited with error";
        console.error(`[YouTube] Error: Binary exited with code ${code}. Stderr: ${errorMsg}`);
        reject(new Error(errorMsg));
      }
    });

    ytProcess.on("error", (err) => {
      clearTimeout(timeout);
      console.error(`[YouTube] Critical Spawn Error: ${err.message}. Binary Path: ${binary}`);
      reject(new Error(`Failed to start extraction engine: ${err.message}`));
    });
  });
};

export const getMetadata = async (url: string): Promise<VideoMetadata> => {
  const commonArgs = await getCommonArgs();
  const { stdout } = await spawnWithTimeout(["--dump-json", "--flat-playlist", "--no-warnings", ...commonArgs, url], 60000);
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
  const common = await getCommonArgs();
  
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
      // For TV client, we MUST strip the po_token as it's not compatible
      // This provides a "clean" fallback if the authenticated android/ios clients fail
      const tvArgs = common.filter(arg => !arg.includes("po_token") && !arg.includes("visitor_data"))
                           .map(arg => arg.includes("player_client=") ? arg.replace(/player_client=[^;]+/, "player_client=tv") : arg);
      
      console.log(`[YouTube] Rotating to CLEAN TV client for playlist manifest...`);
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
  const commonArgs = await getCommonArgs();
  const { stdout } = await spawnWithTimeout(["-g", "--no-playlist", ...commonArgs, "-f", "bestaudio/best", `https://www.youtube.com/watch?v=${id}`], 45000);
  const urls = stdout.trim().split("\n").filter(l => l.startsWith("http"));
  if (urls.length > 0) {
    return urls[0];
  }
  throw new Error("No stream URL in manifest");
};

export const downloadFile = async (
  url: string,
  format: "mp4" | "mp3",
  onProgress: (percent: string) => void
): Promise<string> => {
  const binary = await ensureBinary();
  const commonArgs = await getCommonArgs();
  
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const fileName = `${Date.now()}.${format === "mp3" ? "mp3" : "mp4"}`;
    const filePath = path.join(tempDir, fileName);

    const formatArgs =
      format === "mp3"
        // Use bestaudio but avoid complex post-processing that requires ffmpeg
        ? ["-f", "bestaudio/best"]
        // Use best mp4 that doesn't require merging (single-file format)
        : ["-f", "best[ext=mp4]"];

    const ytProcess = spawn(binary, [...formatArgs, ...commonArgs, "--prefer-free-formats", "-o", filePath, url]);
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
        // Force one final progress pulse to 100% to ensure UI closure
        onProgress("100.0");
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
