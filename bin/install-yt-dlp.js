const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

/**
 * Script to download yt-dlp binary for the current platform (targeted at Linux for Vercel).
 */
async function installYtDlp() {
  const binDir = path.join(process.cwd(), 'bin');
  if (!fs.existsSync(binDir)) fs.mkdirSync(binDir);

  const targetPath = path.join(binDir, 'yt-dlp');
  
  // Skip if already exists (local dev with manual download)
  if (fs.existsSync(targetPath)) {
    console.log('[Setup] yt-dlp binary already exists, skipping download.');
    return;
  }

  // URL for the latest Linux binary (Standalone executable, no python3 needed!)
  const downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

  console.log(`[Setup] Downloading yt-dlp_linux from ${downloadUrl}...`);

  function download(url) {
    https.get(url, (res) => {
      const { statusCode } = res;
      if (statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) {
        // Recursively handle redirects
        return download(res.headers.location);
      }
      
      if (statusCode !== 200) {
        console.error(`[Setup] Failed to download: Status Code ${statusCode}`);
        process.exit(1);
      }

      downloadBinary(res);
    }).on('error', (err) => {
      console.error('[Setup] Failed to download yt-dlp:', err.message);
      process.exit(1);
    });
  }

  download(downloadUrl);

  function downloadBinary(response) {
    const file = fs.createWriteStream(targetPath);
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('[Setup] yt-dlp downloaded successfully.');
      // Make it executable
      try {
        fs.chmodSync(targetPath, '755');
        console.log('[Setup] yt-dlp is now executable.');
      } catch (err) {
        console.warn('[Setup] Failed to set executable permissions:', err.message);
      }
    });
  }
}

installYtDlp().catch((err) => {
  console.error('[Setup] Critical error during installation:', err);
  process.exit(1);
});
