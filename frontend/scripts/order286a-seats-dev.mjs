#!/usr/bin/env node
// ORDER 286a — tillägget till leverans 2: gäster som sätter sig på barstol och
// i loungen, från 12 m med spelets lutning, i vinbarens eget rum.
//
// AVVIKELSE (CLAUDE.md DoD, ORDER 174): dev-servern med
// `#playtest=1&business=vinbaren&start=dinner15`, dörrarna öppnas med
// START_SERVICE (samma åtgärd som knappen). Kamerans avstånd (12 m) och
// vilken sits en gäst sätter sig på läses bara i dev (__nxCamera,
// __nxWineBarDirector). Spelarens flöde och bildrutorna mäts i produktionsbygget
// med order271-dod-from-start.mjs. Utdata: reports/order286a/seats-*.png + seats.json.
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order286a');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 5181);
// FLOW=save: sparfilen måndag vecka 2 i vinbaren (reports/order284/save-mandag-vinbaren.json),
// baspaketet köps och dörrarna öppnas med spelets knappar. Där används loungen;
// dev-kvällen dag 1 sätter inga sällskap i loungen.
const FLOW = process.env.FLOW ?? 'dev';
const URL = FLOW === 'save' ? `http://localhost:${PORT}/` : `http://localhost:${PORT}/#playtest=1&business=vinbaren&start=dinner15`;
const DEADLINE = Date.now() + Number(process.env.DEADLINE_MIN ?? 10) * 60000;
const DIST = 12;
const proc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 120; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch {} await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-angle=metal', '--enable-gpu'] }).catch(() => chromium.launch({ headless: false }));
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
if (FLOW === 'save') {
  const SAVE = readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8');
  await ctx.addInitScript(([key, value]) => {
    if (!sessionStorage.getItem('seats-seeded')) { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', 'en'); sessionStorage.setItem('seats-seeded', '1'); }
  }, ['nexus.v1.slot1', SAVE]);
}
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 400)));
const report = { url: URL, distanceM: DIST, shots: [], errors };

// Gäster i en sittfas på en sits av sorten (bar/lounge), med världens läge.
const seatedOn = (prefix) => page.evaluate((prefix) => {
  const d = window.__nxWineBarDirector; const g = window.__nxWineBarGroup;
  if (!d || !g) return [];
  g.updateMatrixWorld(true);
  const e = g.matrixWorld.elements;
  const out = [];
  for (const s of d.guestSamples) {
    if (!s.visible || !s.guestId) continue;
    const seat = d.guestSeat(s.guestId);
    if (!seat || !seat.id.startsWith(prefix)) continue;
    const wx = e[0] * s.x + e[4] * s.y + e[8] * s.z + e[12];
    const wz = e[2] * s.x + e[6] * s.y + e[10] * s.z + e[14];
    const sw = [e[0] * seat.local[0] + e[8] * seat.local[1] + e[12], e[2] * seat.local[0] + e[10] * seat.local[1] + e[14]];
    out.push({ seatWorld: [+sw[0].toFixed(2), +sw[1].toFixed(2)], id: s.guestId, seat: seat.id, pose: s.pose, progress: +s.progress.toFixed(2), seated: s.seated, world: [+wx.toFixed(2), +wz.toFixed(2)] });
  }
  return out;
}, prefix);
const cam = () => page.evaluate(() => { const c = window.__nxCamera; return c ? { actual: +c.actualRef.current.distance.toFixed(2), target: +c.targetRef.current.distance.toFixed(2) } : null; });
const shot = async (file, what, extra) => {
  await page.screenshot({ path: resolve(OUT, file) });
  report.shots.push({ file, what, camera: await cam(), ...extra });
  console.log(file, JSON.stringify(report.shots.at(-1).camera));
};

// Rummets lokala punkt → världen (figurgruppen har rummets placering).
const toWorld = (local) => page.evaluate(([x, z]) => {
  const g = window.__nxWineBarGroup; g.updateMatrixWorld(true);
  const e = g.matrixWorld.elements; const y = 0;
  return [e[0] * x + e[4] * y + e[8] * z + e[12], e[2] * x + e[6] * y + e[10] * z + e[14]];
}, local);
// Väntan i 4× (speed-toggle, tredje knappen); bilderna i 1×.
const speed = (k) => page.click(`[data-testid=speed-toggle] button:nth-child(${k})`).catch(() => {});
const aim = (w) => page.evaluate(([w, d]) => { const t = window.__nxCamera.targetRef.current; t.focus = { x: w[0], z: w[1] }; t.distance = d; }, [w, DIST]);

async function catchSit(prefix, label, max = Number(process.env.PER_SEAT ?? 1)) {
  // En gäst på väg till en sits av sorten: kameran ställs på 12 m över just den sitsen
  // medan gästen går, och bilderna tas när gästen sätter sig och när hen sitter.
  // Kameran landar på 12 m över sitsarnas del av rummet innan väntan börjar.
  await aim(await toWorld(prefix === 'lounge' ? [0.1, 4.8] : [-1.35, 0]));
  for (let i = 0; i < 400; i++) { const c = await cam(); if (c && Math.abs(c.actual - DIST) < 0.2) break; await delay(250); }
  await speed(1);
  // Någon som redan sitter på sorten: en bild av den som sitter.
  const already = (await seatedOn(prefix)).find((g) => g.seated);
  if (already) {
    await aim(already.seatWorld);
    await delay(3000);
    await shot(`seats-${label}-sitter-redan.png`, `${label}: gästen sitter (${already.seat})`, { guest: (await seatedOn(prefix)).find((x) => x.id === already.id) });
    report[`${label}Seated`] = true;
  }
  const taken = new Set();
  let n = 0;
  let rose = false;
  while (Date.now() < DEADLINE && n < max) {
    const list = await seatedOn(prefix);
    const coming = list.find((g) => !g.seated && g.pose !== 'sitDown' && g.pose !== 'standUp' && !taken.has(g.id));
    const rising = !rose && list.find((g) => g.pose === 'standUp' && g.progress < 0.4);
    if (rising) {
      rose = true;
      await speed(1); await aim(rising.seatWorld); await delay(300);
      await shot(`seats-${label}-reser-sig.png`, `${label}: gästen reser sig (${rising.seat})`, { guest: (await seatedOn(prefix)).find((x) => x.id === rising.id) });
      continue;
    }
    if (!coming) { await speed(3); await delay(200); continue; }
    await speed(1);
    taken.add(coming.id);
    await aim(coming.seatWorld);
    let g = coming;
    // Bilderna tas bara när kameran står på 12 m (actual inom 0,2 m).
    for (let i = 0; i < 300 && g && g.pose !== 'sitDown' && !g.seated; i++) { await delay(100); g = (await seatedOn(prefix)).find((x) => x.id === coming.id); }
    if (!g || g.pose !== 'sitDown') continue;
    const c0 = await cam();
    if (!c0 || Math.abs(c0.actual - DIST) > 0.2) continue;
    n++;
    for (const [i, wait] of [[1, 0], [2, 350], [3, 450]]) {
      await delay(wait);
      const now = (await seatedOn(prefix)).find((x) => x.id === coming.id);
      await shot(`seats-${label}-${n}-${i}.png`, `${label}: gästen sätter sig (${coming.seat})`, { guest: now });
    }
    await delay(2500);
    const now = (await seatedOn(prefix)).find((x) => x.id === coming.id);
    await shot(`seats-${label}-${n}-sitter.png`, `${label}: gästen sitter (${coming.seat})`, { guest: now });
  }
  return n;
}

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  if (FLOW === 'save') {
    await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
    await page.click('[data-testid=continue-saved]');
    await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
    await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 120000 });
    if (await page.$('[data-testid=salvage-option-b]:not([disabled])')) { await page.click('[data-testid=salvage-option-b]'); await delay(300); await page.click('[data-testid=salvage-close]').catch(() => {}); }
    await page.click('[data-testid=open-buy]');
    await page.waitForSelector('[data-testid=screen-M1]');
    await page.click('[data-testid=buy-base]');
    await delay(1200);
    await page.click('[data-testid=open-doors]');
    await page.waitForSelector('[data-testid=event-stream]', { timeout: 60000 });
    await delay(3000);
  } else {
    await page.waitForSelector('canvas', { timeout: 120000 });
    await delay(10000);
    await page.evaluate(() => { const s = document.querySelector('[data-testid=start-screen]'); (s?.closest('[role=dialog]') ?? s?.parentElement ?? s)?.remove(); });
    await page.focus('canvas').catch(() => {});
    await page.keyboard.press('4');
    await delay(3000);
    // Dörrarna öppnas (samma åtgärd som knappen "Open the doors").
    await page.evaluate(() => window.__nxSimDispatch({ type: 'START_SERVICE' }));
    await delay(2000);
  }
  // Raketerna besvaras (första möjliga svaret) i bakgrunden, så att kvällen går vidare.
  const answer = setInterval(() => {
    page.evaluate(() => {
      const card = document.querySelector('[data-testid=incident-card]');
      if (!card || document.querySelector('[data-testid=incident-band]')) return;
      const opt = document.querySelector('[data-testid^=incident-option-]:not([disabled])');
      if (opt) opt.click();
      if (card.getAttribute('data-backed') === 'true') document.querySelector('[data-testid=back-lock]')?.click();
    }).catch(() => {});
  }, 700);
  report.answerTimer = true;
  globalThis.__answer = answer;
  const only = process.env.ONLY;
  if (only !== 'bar') report.lounge = await catchSit('lounge', 'lounge');
  if (only !== 'lounge') report.bar = await catchSit('bar', 'barstol');
  clearInterval(globalThis.__answer);
} catch (err) {
  report.error = String(err?.message ?? err);
} finally {
  writeFileSync(resolve(OUT, `seats-${process.env.ONLY ?? 'alla'}.json`), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log('SEATS', report.bar, report.lounge, errors.length ? errors : 'inga fel');
