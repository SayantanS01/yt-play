import fs from 'fs/promises';
import path from 'path';
import https from 'https';

// Constants from PoToken generator
const URL = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)';
const HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-language': 'en-US;q=0.9',
  'user-agent': USER_AGENT,
};

async function fetchVisitorData(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Add a 5s timeout to the network fetch
    const req = https.get(URL, { headers: HEADERS }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const match = data.match(/"ytcfg\.set"\s*,\s*({.+?})\s*\)/);
        if (match) {
          try {
            const ytcfg = JSON.parse(match[1]);
            if (ytcfg.INNERTUBE_CONTEXT?.client?.visitorData) {
              return resolve(ytcfg.INNERTUBE_CONTEXT.client.visitorData);
            }
          } catch (e) {}
        }
        const match2 = data.match(/"visitorData"\s*:\s*"(.+?)"/);
        if (match2) return resolve(match2[1]);
        
        reject(new Error('Failed to fetch visitorData from YouTube embed'));
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('VisitorData fetch timed out'));
    });
  });
}

async function createTask(visitorData: string) {
  const { JSDOM, VirtualConsole } = await import('jsdom');
  const assetsDir = path.join(process.cwd(), 'lib', 'potoken');
  
  const domContent = await fs.readFile(path.join(assetsDir, 'vendor', 'index.html'), 'utf-8');
  const baseContent = await fs.readFile(path.join(assetsDir, 'vendor', 'base.js'), 'utf-8');
  const injectContent = await fs.readFile(path.join(assetsDir, 'inject.js'), 'utf-8');

  return {
    start: async (): Promise<{ poToken: string }> => {
      // MAX ATTEMPTS: Prevent infinite loops on Vercel
      for (let attempt = 1; attempt <= 5; attempt++) {
        let windowRef: any = null;
        
        try {
          console.log(`[YouTube] PoToken Attempt ${attempt}/5...`);
          
          const result = await new Promise<{ poToken: string }>((resolve, reject) => {
            const dom = new JSDOM(domContent, {
              url: URL,
              pretendToBeVisual: true,
              runScripts: 'dangerously',
              virtualConsole: new VirtualConsole(), // Keeps logs clean but we can add listeners for debug
            });

            windowRef = dom.window;
            
            // Watchdog for this specific attempt (8 seconds)
            const attemptTimeout = setTimeout(() => {
              reject(new Error('PoToken attempt timed out'));
            }, 8000);

            Object.defineProperty(windowRef.navigator, 'userAgent', { value: USER_AGENT, writable: false });
            windowRef.visitorData = visitorData;
            windowRef.onPoToken = (token: string) => {
              clearTimeout(attemptTimeout);
              resolve({ poToken: token });
            };

            const scriptToEval = baseContent.replace(
              /}\s*\)\(_yt_player\);\s*$/, 
              (matched) => `;${injectContent};${matched}`
            );

            try {
              windowRef.eval(scriptToEval);
            } catch (e) {
              clearTimeout(attemptTimeout);
              reject(e);
            }
          });

          if (result.poToken && result.poToken.length >= 100) {
            console.log(`[YouTube] PoToken Generated Successfully (Length: ${result.poToken.length})`);
            return result;
          }
        } catch (err: any) {
          console.error(`[YouTube] PoToken Attempt ${attempt} failed: ${err.message}`);
        } finally {
          if (windowRef) {
            try { windowRef.close(); } catch (e) {}
          }
        }
        
        // Brief pause between attempts
        await new Promise(r => setTimeout(r, 200));
      }
      
      throw new Error('PoToken generation failed after 5 attempts');
    }
  };
}

export async function generate() {
  try {
    // Overall guard for the entire operation (15 seconds)
    return await Promise.race([
      (async () => {
        const visitorData = await fetchVisitorData();
        const task = await createTask(visitorData);
        const { poToken } = await task.start();
        return { visitorData, poToken };
      })(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Overall PoToken generation timed out (15s)')), 15000)
      )
    ]);
  } catch (err: any) {
    console.error(`[YouTube] Automated PoToken failure: ${err.message}`);
    // Return placeholder or re-throw? 
    // Re-throwing allows standard extraction to attempt its own bypass
    throw err;
  }
}
