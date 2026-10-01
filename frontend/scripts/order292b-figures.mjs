// ORDER 292b — en hel kväll i produktionsbygget (provspel av e079883):
//   1. "En figur ligger på golvet nere till höger vid väggen när servicen
//      börjar." Ingen figur får någonsin ligga ned eller sitta utan sits.
//      Läses ur rummets egen mätning (scene/figureAudit.ts,
//      body.dataset.figuresDown), som räknar på riggarna som ritas.
//   2. "Raketknappen säger 'Öppnar när dörrarna öppnar' klockan 18.10."
//      Knappen (back-start) ska bli aktiv när dörrarna öppnar, och texten
//      (back-why) ska följa med. Klockan läses ur service-clock
//      (data-label och klockslaget).
//   3. Rummets etiketter (room-reaction, nx-room-labels) syns inte i byn:
//      efter första raketens svar flyger kameran ut med V och de räknas.
//
// Sparfilen måndag i vinbaren (reports/order284/save-mandag-vinbaren.json),
// på svenska, 1920 × 1080, baspaketet. Kameran står där servicen ställer den
// (ServiceCamera, 24 m), så att rummet och figurerna ritas.
// Utdata: reports/<order>/figures.json och figures-*.png.
//
//   REPORT_ORDER=order292b [SKIP_BUILD=1] [PORT=4183] [SAVE_DAY_OFFSET=0] node scripts/order292b-figures.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4183);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order292b');
mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
// Rummets tonband (GRAY_BOX_CAMERA.restaurantInteriorFadeMid + Half = 55 + 20 m):
// längre bort syns rummet inte, och inga etiketter får synas.
const FAR_M = 75;

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
const report = { samples: 0, auditedSamples: 0, maxDown: 0, faults: [], button: [], errors };
const seen = new Set();
const t0 = Date.now();
const step = (n) => console.log(`${Math.round((Date.now() - t0) / 1000)}s ${n}`);

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  await page.click('[data-testid=open-buy-foot]');
  await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
  await page.click('[data-testid=buy-base]').catch(() => {});
  await delay(800);
  await page.click('[data-testid=open-doors]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 15000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  step('servicen');
  let lastButton = '';
  const until = Date.now() + 16 * 60000;
  while (Date.now() < until) {
    if (await page.$('[data-testid=waste-continue], [data-testid=screen-T2], [data-testid=screen-R1]')) break;
    report.samples += 1;
    const raw = await page.evaluate(() => document.body.dataset.figuresDown ?? null);
    if (raw) {
      report.auditedSamples += 1;
      const d = JSON.parse(raw);
      report.maxDown = Math.max(report.maxDown, d.n);
      for (const f of d.faults) {
        const key = `${f.kind}:${f.id}:${f.fault}:${f.pose}:${f.clip}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const clock = await page.textContent('[data-testid=service-clock-time]').catch(() => null);
        report.faults.push({ ...f, clock, atSec: Math.round((Date.now() - t0) / 1000) });
        if (report.faults.length <= 4) await page.screenshot({ path: resolve(OUT, `figures-fel-${report.faults.length}.png`) });
      }
    }
    // Punkt 3: rummets etiketter över byn. Varje mätning räknar etiketterna
    // (room-reaction, nx-room-labels) och kamerans avstånd; första gången en
    // etikett syns i rummet flyger kameran ut till byn (V) och räknar igen.
    {
      const labels = await page.$$eval('[data-testid=room-reaction], .nx-room-labels', (els) => els.length);
      const cam = await page.evaluate(() => Number(document.body.dataset.camDistance ?? NaN));
      if (cam > FAR_M) report.labelsWhileFar = Math.max(report.labelsWhileFar ?? 0, labels);
      if (!report.village && labels > 0) {
        await page.keyboard.press('v');
        for (let k = 0; k < 48; k++) { await delay(250); if ((await page.evaluate(() => Number(document.body.dataset.camDistance ?? NaN))) > FAR_M) break; }
        await delay(500);
        const camV = await page.evaluate(() => Number(document.body.dataset.camDistance ?? NaN));
        const inVillage = await page.$$eval('[data-testid=room-reaction], .nx-room-labels', (els) => els.length);
        await page.screenshot({ path: resolve(OUT, 'figures-byn-etiketter.png') });
        report.village = { labelsInRoom: labels, camDistanceRoom: cam, camDistanceVillage: camV, labelsInVillage: inVillage };
        await page.keyboard.press('v');
        await delay(2500);
      }
    }
    // Raketknappen mot klockan: varje gång läget eller texten byts.
    const clockLabel = await page.getAttribute('[data-testid=service-clock]', 'data-label').catch(() => null);
    const clock = await page.textContent('[data-testid=service-clock-time]').catch(() => null);
    const sub = await page.textContent('[data-testid=service-clock-left]').catch(() => null);
    const enabled = await page.$eval('[data-testid=back-start]', (b) => !b.disabled).catch(() => null);
    const why = await page.textContent('[data-testid=back-why]').catch(() => null);
    const b = `${clockLabel}|${enabled}|${why}`;
    if (b !== lastButton) {
      lastButton = b;
      report.button.push({ atSec: Math.round((Date.now() - t0) / 1000), clockLabel, clock, sub, enabled, why });
      if (report.button.length <= 6) await page.screenshot({ path: resolve(OUT, `figures-knappen-${report.button.length}.png`) });
    }
    await delay(200);
  }
  step('stängt');
} catch (e) {
  report.error = String(e?.message ?? e);
  await page.screenshot({ path: resolve(OUT, 'figures-99-fel.png') }).catch(() => {});
} finally {
  writeFileSync(resolve(OUT, 'figures.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify({ village: report.village, samples: report.samples, audited: report.auditedSamples, maxDown: report.maxDown, faults: report.faults, button: report.button, errors, error: report.error }, null, 2));
