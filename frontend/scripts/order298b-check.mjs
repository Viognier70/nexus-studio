// ORDER 298b — Lugn kväll och provsmakningen i produktionsbygget, i spelarens
// flöde: sparfilen måndag i vinbaren med lågt rykte (CHECK_REP, förvalt 0,2),
// på svenska. På morgonen: raden Lugn kväll bredvid "Provsmakning på torget"
// (calm-morning, tasting-parties); spelaren väljer provsmakningen, köper
// baspaketet och öppnar. Under kvällen var tionde spelminut: bandets rad Lugn
// kväll (calm-evening), klockan, sittande i simuleringen och i rummet.
// Utdata: reports/<order>/check.json och check-*.png.
//
//   REPORT_ORDER=order298b [SKIP_BUILD=1] [PORT=4195] [CHECK_REP=0.2] node scripts/order298b-check.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4195);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order298b');
mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
save.sim.reputation = Number(process.env.CHECK_REP ?? 0.2);
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(([k, v]) => {
  if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
}, ['nexus.v1.slot1', JSON.stringify(save)]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const report = { errors, morning: null, beforeOpen: null, samples: [] };
try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  report.morning = await page.evaluate(() => {
    const group = document.querySelector('[data-testid=calm-morning]');
    const rows = [...document.querySelectorAll('[data-testid=morning-activities] [data-testid^=activity-]')].map((b) => b.getAttribute('data-testid'));
    return { calmLine: group?.querySelector('[data-testid=calm-evening]')?.textContent ?? null, tastingInGroup: !!group?.querySelector('[data-testid=activity-square-tasting]'), tastingParties: document.querySelector('[data-testid=tasting-parties]')?.textContent ?? null, firstRow: rows[0] ?? null, bandCalm: document.querySelector('[data-testid=rival-band] [data-testid=calm-evening]')?.textContent ?? null };
  });
  await page.screenshot({ path: resolve(OUT, 'check-morgon.png') });
  await page.click('[data-testid=activity-square-tasting]');
  await delay(500);
  await page.click('[data-testid=open-buy-foot]');
  await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
  await page.click('[data-testid=buy-base]').catch(() => {});
  await delay(800);
  await page.click('[data-testid=open-doors]');
  await delay(500);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 15000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  const until = Date.now() + 10 * 60000;
  let lastSlot = '';
  while (Date.now() < until) {
    if (await page.$('[data-testid=waste-continue], [data-testid=screen-T2], [data-testid=transfer-do]')) break;
    const card = await page.$('[data-testid=incident-card]');
    if (card) { const o = await page.$('[data-testid^=incident-option-]'); if (o) await o.click().catch(() => {}); }
    const d = await page.evaluate(() => {
      const q = (s) => document.querySelector(s)?.textContent ?? null;
      const band = document.querySelector('[data-testid=rival-band]');
      return { clock: q('[data-testid=service-clock-time]'), label: q('[data-testid=service-clock-label]'), bandState: band?.getAttribute('data-state') ?? null, calm: band?.querySelector('[data-testid=calm-evening]')?.textContent ?? null, rank: q('[data-testid=rival-rank]'), simSeated: document.body.dataset.simSeated ?? null, roomSeated: document.body.dataset.roomSeated ?? null };
    });
    if (d.clock && !report.beforeOpen && d.bandState === 'before') { report.beforeOpen = d; await page.screenshot({ path: resolve(OUT, 'check-fore-oppning.png') }); }
    const slot = d.clock ? d.clock.slice(0, 4) : '';
    if (d.clock && slot !== lastSlot && d.clock.endsWith('0')) {
      lastSlot = slot;
      report.samples.push(d);
      if (d.clock === '19.40') await page.screenshot({ path: resolve(OUT, 'check-1940.png') });
    }
    await delay(150);
  }
} catch (e) {
  report.error = String(e?.message ?? e);
  await page.screenshot({ path: resolve(OUT, 'check-99-fel.png') }).catch(() => {});
} finally {
  writeFileSync(resolve(OUT, process.env.CHECK_OUT ?? 'check.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify({ morning: report.morning, beforeOpen: report.beforeOpen, errors, error: report.error }, null, 0));
