// ORDER 287a — bildfrekvensen under servicen i produktionsbygget, från
// sparfilen måndag i vinbaren (reports/order284/save-mandag-vinbaren.json),
// utan annan last på datorn. Samma skript mot main och grenen, så att
// skillnaden går att läsa. Fem mätningar à en sekund, tio sekunder isär,
// när rummet har fyllts (efter 60 s service i 2×).
//
//   FRONTEND=<katalog> PORT=4176 LABEL=main node scripts/order287a-fps.mjs
//
// Skriver reports/order287a/fps-<LABEL>.json. Bygger inte: kör `npm run
// build` i FRONTEND först.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = process.env.FRONTEND ?? resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4176);
const LABEL = process.env.LABEL ?? 'branch';
const URL = `http://localhost:${PORT}`;
const OUT = resolve(HERE, '../reports/order287a');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 120; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const SAVE = readFileSync(resolve(HERE, '../reports/order284/save-mandag-vinbaren.json'), 'utf8');
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(([key, value]) => {
  if (!sessionStorage.getItem('fps-seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('fps-seeded', '1'); }
}, ['nexus.v1.slot1', SAVE]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const fps = () => page.evaluate(() => new Promise((res) => {
  let n = 0; const start = performance.now();
  const f = () => { n++; if (performance.now() - start < 1000) requestAnimationFrame(f); else res(n); };
  requestAnimationFrame(f);
}));
const report = { label: LABEL, frontend: FRONTEND, save: 'reports/order284/save-mandag-vinbaren.json', viewport: '1920×1080', samples: [], median: null, errors };
try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  if (await page.$('[data-testid=open-buy-foot]')) {
    await page.click('[data-testid=open-buy-foot]');
    await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
    await page.click('[data-testid=buy-base]').catch(() => {});
    await delay(600);
    await page.click('[data-testid=open-doors]');
  } else {
    await page.click('[data-testid=start-service]');
  }
  await delay(4000);
  await page.click('[data-testid=mentor-close-service]').catch(() => {});
  await delay(60000);
  for (let i = 0; i < 5; i++) {
    // Ett raketkort svaras med första svaret, så att rummet syns.
    const opt = await page.$('[data-testid^=incident-option-]:not([disabled])');
    if (opt) await opt.click().catch(() => {});
    report.samples.push(await fps());
    await delay(10000);
  }
  const s = [...report.samples].sort((a, b) => a - b);
  report.median = s[Math.floor(s.length / 2)];
} catch (e) {
  report.error = String(e?.message ?? e);
} finally {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, `fps-${LABEL}.json`), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify({ label: LABEL, samples: report.samples, median: report.median, error: report.error ?? null, errors: errors.length }));
