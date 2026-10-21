// ORDER 333 H — resursen som ger 404 på varje sida (ORDER 332, Öppet 7). Produktionsbygget (vite build + preview),
// startsidan och spelarens flöde: fortsätt det sparade spelet (reports/order284/save-mandag-vinbaren.json) och öppna
// servicen. Varje svar med status 400 eller mer, varje misslyckad begäran och konsolens fel med sin adress
// (ConsoleMessage.location, som är resursens adress när webbläsaren själv hämtar den, till exempel favicon).
// Utdata: reports/order333/404.json, under nyckeln LABEL (fore eller efter).
//
//   LABEL=fore [SKIP_BUILD=1] node scripts/order333-404.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT_DIR = resolve(FRONTEND, 'reports', 'order333');
mkdirSync(OUT_DIR, { recursive: true });
const OUT = resolve(OUT_DIR, '404.json');
const PORT = Number(process.env.PORT ?? 4193);
const URL = `http://localhost:${PORT}`;
const LABEL = process.env.LABEL ?? 'efter';

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const save = readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8');

const result = { at: new Date().toISOString(), build: 'produktion (vite build + preview)', pages: {} };
try {
  for (const flow of ['start', 'service']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.addInitScript(([key, value]) => {
      if (sessionStorage.getItem('seeded') !== '1') { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('seeded', '1'); }
    }, ['nexus.v1.slot1', save]);
    const page = await ctx.newPage();
    page.setDefaultTimeout(90000);
    const row = { responses: [], failed: [], console: [] };
    ctx.on('response', (r) => { if (r.status() >= 400) row.responses.push(`${r.status()} ${r.url().replace(URL, '')}`); });
    ctx.on('requestfailed', (r) => row.failed.push(`${r.failure()?.errorText} ${r.url().replace(URL, '')}`));
    page.on('console', (m) => { if (m.type() === 'error') row.console.push({ text: m.text().slice(0, 200), url: (m.location()?.url ?? '').replace(URL, '') }); });
    await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
    await delay(3000);
    if (flow === 'service') {
      await page.click('[data-testid=continue-saved]');
      await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
      await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 }).catch(() => {});
      await delay(1500);
      if (await page.$('[data-testid=morning-review-backdrop]')) await page.click('[data-testid=morning-review-backdrop]', { position: { x: 5, y: 5 } }).catch(() => {});
      await page.click('[data-testid=start-service]').catch(() => {});
      await delay(5000);
    }
    row.unique = [...new Set([...row.responses, ...row.failed, ...row.console.map((c) => `${c.text} @ ${c.url}`)])];
    result.pages[flow] = row;
    await ctx.close();
  }
} finally {
  let prev = {};
  try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* första körningen */ }
  writeFileSync(OUT, JSON.stringify({
    definition: 'ORDER 333 H. Per flöde (start = startsidan, service = sparat spel och servicen öppnad): responses = svar med status ≥ 400 (BrowserContext response), failed = misslyckade begäranden, console = konsolens fel med adressen (ConsoleMessage.location). fore = före rättelsen, efter = med den.',
    ...prev, [LABEL]: result
  }, null, 2) + '\n');
  await browser.close().catch(() => {});
  try { process.kill(-proc.pid); } catch { /* redan borta */ }
}
console.log(JSON.stringify(result, null, 1));
