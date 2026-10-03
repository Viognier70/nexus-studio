// ORDER 298 — kvällen i produktionsbygget, i spelarens flöde: sparfilen
// måndag i vinbaren (SAVE_DAY_OFFSET, förvalt 0), på svenska, baspaketet.
// Var femte spelminut från öppning: klockans etikett (service-clock-label),
// kvällskassan (till-amount), simuleringens sittande (body.dataset.simSeated)
// mot figurerna som sitter i rummet (roomSeated, roomGuests), raden "I den här
// takten" (till-forecast) och bandet i byn (rival-rank).
// Raketerna besvaras rätt. Utdata: reports/<order>/check.json och check-*.png.
//
//   REPORT_ORDER=order298 [SKIP_BUILD=1] [PORT=4194] [SAVE_DAY_OFFSET=0] node scripts/order298-check.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4194);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order298');
mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const meta = JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/vinbar.meta.json'), 'utf8'));
const menuMeta = JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/menu.meta.json'), 'utf8'));
const bestOf = (id, step) => [...meta.incidents, ...menuMeta.incidents].find((i) => i.id === id)?.steps[step]?.options.find((o) => o.quality === 'best')?.id;
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
save.sim.day.dayNumber += Number(process.env.SAVE_DAY_OFFSET ?? 0);
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(([k, v]) => {
  if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
}, ['nexus.v1.slot1', JSON.stringify(save)]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const report = { errors, samples: [] };
const text = (sel) => page.textContent(sel).catch(() => null);
try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  report.rankBefore = await text('[data-testid=rival-rank]');
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
    if (card && !(await page.$('[data-testid=incident-band]'))) {
      const o = bestOf(await card.getAttribute('data-incident-id'), Number(await card.getAttribute('data-step')));
      if (o) await page.click(`[data-testid=incident-option-${o}]`).catch(() => {});
    }
    const clock = await text('[data-testid=service-clock-time]');
    const slot = clock ? clock.slice(0, 4) : '';
    if (clock && slot !== lastSlot && Number(clock.slice(-1)) % 5 === 0) {
      lastSlot = slot;
      // En enda läsning per prov, så att klockan, bandet och rummet hör till samma bildruta.
      const d = await page.evaluate(() => {
        const q = (s) => document.querySelector(s)?.textContent ?? null;
        const band = document.querySelector('[data-testid=rival-band]');
        return { clockAtRead: q('[data-testid=service-clock-time]'), label: q('[data-testid=service-clock-label]'), till: q('[data-testid=till-amount]'), forecast: q('[data-testid=till-forecast]'), rank: q('[data-testid=rival-rank]'), bandState: band?.getAttribute('data-state') ?? null, bandGuests: band?.getAttribute('data-guests') ?? null, simSeated: document.body.dataset.simSeated ?? null, roomSeated: document.body.dataset.roomSeated ?? null, roomGuests: document.body.dataset.roomGuests ?? null };
      });
      report.samples.push({ clock, ...d });
      if (clock === '19.35' || clock === '19.40') await page.screenshot({ path: resolve(OUT, `check-${clock.replace('.', '')}.png`) });
      if (clock === '20.40') await page.screenshot({ path: resolve(OUT, 'check-2040.png') });
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
console.log(JSON.stringify(report.samples.slice(0, 30), null, 0));
