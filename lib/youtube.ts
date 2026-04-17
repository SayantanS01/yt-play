import path from "path";
import os from "os";
import { spawn } from "child_process";
import fs from "fs";
import { generate } from "./potoken/generator";

const MOBILE_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
}

const ensureBinary = async (): Promise<string> => {
  const isWindows = process.platform === "win32";
  const binaryName = isWindows ? "yt-dlp.exe" : "yt-dlp";
  const binaryPath = path.join(process.cwd(), "bin", binaryName);
  
  if (!fs.existsSync(binaryPath)) {
    throw new Error(`yt-dlp binary not found at ${binaryPath}`);
  }
  
  if (!isWindows) {
    fs.chmodSync(binaryPath, 0o755);
  }
  
  return binaryPath;
};

const getSanitizedCookiesPath = () => {
  const content = process.env.YT_COOKIES_CONTENT;
  if (!content) return null;
  
  const tempPath = path.join(os.tmpdir(), "cookies.txt");
  fs.writeFileSync(tempPath, content);
  return tempPath;
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
const getCommonArgs = async (options: { useAuth?: boolean, client?: "standard" | "tv" } = { useAuth: true, client: "standard" }) => {
  const sanitizedCookies = getSanitizedCookiesPath();
  const poData = await getAutomatedPoToken();

  const extractorArgs = [
    options.client === "tv" 
      ? `youtube:player_client=tv` 
      : `youtube:player_client=android_test,ios,web_embedded,default`,
  ];

  // PoToken is ONLY compatible with standard clients (android/ios/web)
  if (poData && options.client !== "tv") {
    extractorArgs.push(`youtube:po_token=ios+${poData.poToken}`);
    extractorArgs.push(`visitor_data=${poData.visitorData}`);
  } else if (process.env.YT_PO_TOKEN && options.client !== "tv") {
    extractorArgs.push(`youtube:po_token=${process.env.YT_PO_TOKEN}`);
  }

  const args = [
    "--no-warnings",
    "--no-check-certificates",
    "--js-runtime", "node",
    "--extractor-args", extractorArgs.join(";"),
    "--geo-bypass",
    "--geo-bypass-country", process.env.YT_GEO_BYPASS_COUNTRY || "IN",
    "--user-agent", MOBILE_USER_AGENT,
    "--add-header", "Accept-Language:en-US,en;q=0.9",
    "--add-header", "X-Youtube-Client-Name:3",
    "--add-header", "X-Youtube-Client-Version:19.29.37",
    "--no-cache-dir"
  ];

  if (sanitizedCookies && options.useAuth !== false) {
    console.log(`[YouTube] Auth Handshake: Using authenticated session (Region: ${process.env.YT_GEO_BYPASS_COUNTRY || 'IN'}).`);
    args.push("--cookies", sanitizedCookies);
  } else if (process.env.YT_COOKIES_BROWSER && options.useAuth !== false) {
    console.log(`[YouTube] Auth Handshake: Using browser session (${process.env.YT_COOKIES_BROWSER}).`);
    args.push("--cookies-from-browser", process.env.YT_COOKIES_BROWSER);
  } else {
    console.log(`[YouTube] Auth Handshake: SKIP (Clean session mode).`);
  }

  return args;
};

const spawnWithTimeout = async (args: string[], timeoutMs: number): Promise<{ stdout: string, stderr: string }> => {
  const binary = await ensureBinary();
  return new Promise((resolve, reject) => {
    const process = spawn(binary, args);
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      process.kill();
      reject(new Error(`Process timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    process.stdout.on("data", (data) => (stdout += data.toString()));
    process.stderr.on("data", (data) => (stderr += data.toString()));

    process.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`Binary exited with code ${code}. Stderr: ${stderr}`));
    });
  });
};

const parseYtDlpJson = (stdout: string) => {
  try {
    return JSON.parse(stdout.split("\n")[0]);
  } catch (e) {
    throw new Error("Failed to parse yt-dlp JSON output");
  }
};

const parseOutput = (stdout: string): VideoMetadata[] => {
  return stdout
    .trim()
    .split("\n")
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

export const getPlaylistMetadata = async (url: string): Promise<VideoMetadata[]> => {
  const attemptExtraction = async (clientType: "standard" | "tv"): Promise<VideoMetadata[]> => {
    const common = await getCommonArgs({ useAuth: false, client: clientType });
    const playlistArgs = [
      "--dump-json",
      "--flat-playlist",
      "--yes-playlist",
      "--playlist-items", "1-50",
      "--ignore-errors"
    ];

    if (clientType === "tv") {
      console.log(`[YouTube] Rotating to CLEAN TV client for playlist manifest...`);
      const { stdout } = await spawnWithTimeout([...playlistArgs, ...common, url], 120000);
      return parseOutput(stdout);
    } else {
      const { stdout } = await spawnWithTimeout([...playlistArgs, ...common, url], 90000);
      return parseOutput(stdout);
    }
  };

  try {
    let videos: VideoMetadata[] = [];
    try {
      videos = await attemptExtraction("standard");
    } catch (e) {
      console.warn(`[YouTube] Standard extraction failed, checking fallback...`);
    }
    
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
  const commonArgs = await getCommonArgs({ useAuth: false });
  const { stdout } = await spawnWithTimeout(["-g", "--no-playlist", ...commonArgs, "-f", "bestaudio/best", `https://www.youtube.com/watch?v=${id}`], 45000);
  const urls = stdout.trim().split("\n").filter(l => l.startsWith("http"));
  if (urls.length > 0) return urls[0];
  throw new Error("No stream URL in manifest");
};

export const downloadFile = async (
  url: string,
  format: "mp4" | "mp3",
  onProgress: (percent: string) => void
): Promise<string> => {
  const binary = await ensureBinary();
  const tempDir = os.tmpdir();
  const fileName = `${Date.now()}.${format === "mp3" ? "mp3" : "mp4"}`;
  const filePath = path.join(tempDir, fileName);

  return new Promise((resolve, reject) => {
    // Hard process limit: 12 minutes
    const globalTimeout = setTimeout(() => {
      reject(new Error("Mastering Timeout: Total process duration exceeded limit (12m)."));
    }, 720000);

    const attemptDownload = async (clientType: "standard" | "tv") => {
      const commonArgs = await getCommonArgs({ useAuth: false, client: clientType });
      const formatArgs = format === "mp3" ? ["-f", "bestaudio/best"] : ["-f", "best[ext=mp4]"];

      const ytProcess = spawn(binary, [...formatArgs, ...commonArgs, "--prefer-free-formats", "-o", filePath, url]);
      let errorOutput = "";
      let lastProgressTime = Date.now();

      const watchdog = setInterval(() => {
        if (Date.now() - lastProgressTime > 90000) {
          ytProcess.kill("SIGKILL");
          clearInterval(watchdog);
          reject(new Error("Mastering Timeout: Resource extraction stalled at current progress."));
        }
      }, 10000);

      ytProcess.stdout.on("data", (data) => {
        const match = data.toString().match(/(\d+\.\d+)%/);
        if (match) {
          lastProgressTime = Date.now();
          onProgress(match[1]);
        }
      });

      ytProcess.stderr.on("data", (data) => (errorOutput += data.toString()));

      ytProcess.on("close", async (code) => {
        clearInterval(watchdog);
        if (code === 0) {
          clearTimeout(globalTimeout);
          onProgress("100.0");
          resolve(filePath);
        } else {
          if (clientType === "standard" && (errorOutput.includes("Sign in") || errorOutput.includes("403"))) {
            console.warn(`[YouTube] Download blocked by bot check, rotating to TV client fallback...`);
            await attemptDownload("tv");
          } else {
            clearTimeout(globalTimeout);
            reject(new Error(errorOutput || "Download failed"));
          }
        }
      });
    };

    attemptDownload("standard");
  });
};
