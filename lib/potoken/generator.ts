import fs from 'fs/promises';
import path from 'path';
import https from 'https';
// Note: JSDOM is loaded dynamically inside createTask to avoid ESM/CJS interop issues on Vercel

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
    https.get(URL, { headers: HEADERS }, (res) => {
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
        // Fallback or secondary match
        const match2 = data.match(/"visitorData"\s*:\s*"(.+?)"/);
        if (match2) return resolve(match2[1]);
        
        reject(new Error('Failed to fetch visitorData from YouTube embed'));
      });
    }).on('error', reject);
  });
}

async function createTask(visitorData: string) {
  // Dynamically load JSDOM for Vercel/ESM compatibility
  const { JSDOM, VirtualConsole } = await import('jsdom');
  
  // Use process.cwd() to ensure Vercel can find these files in the deployed lambda
  const assetsDir = path.join(process.cwd(), 'lib', 'potoken');
  
  const domContent = await fs.readFile(path.join(assetsDir, 'vendor', 'index.html'), 'utf-8');
  const baseContent = await fs.readFile(path.join(assetsDir, 'vendor', 'base.js'), 'utf-8');
  const injectContent = await fs.readFile(path.join(assetsDir, 'inject.js'), 'utf-8');

  let destroy: (() => void) | undefined = undefined;

  return {
    start: async (): Promise<{ poToken: string }> => {
      // YouTube signatures are typically 164 chars
      while (true) {
        const { poToken } = await new Promise<{ poToken: string }>(async (res, rej) => {
          const dom = new JSDOM(domContent, {
            url: URL,
            pretendToBeVisual: true,
            runScripts: 'dangerously',
            virtualConsole: new VirtualConsole(),
          });

          const { window } = dom;
          
          // Mimic browser environment
          Object.defineProperty(window.navigator, 'userAgent', { value: USER_AGENT, writable: false });
          (window as any).visitorData = visitorData;
          (window as any).onPoToken = (token: string) => {
            res({ poToken: token });
          };

          // Injected logic: intercept the token generation
          const scriptToEval = baseContent.replace(
            /}\s*\)\(_yt_player\);\s*$/, 
            (matched) => `;${injectContent};${matched}`
          );

          try {
            window.eval(scriptToEval);
          } catch (e) {
            rej(e);
          }

          destroy = () => {
            window.close();
            rej(new Error('Window closed'));
          };
        }).finally(() => {
          if (destroy) destroy();
        });

        if (poToken && poToken.length === 164) {
          return { poToken };
        }
        // If token is invalid, loop continues
      }
    }
  };
}

export async function generate() {
  const visitorData = await fetchVisitorData();
  const task = await createTask(visitorData);
  const { poToken } = await task.start();
  return { visitorData, poToken };
}
