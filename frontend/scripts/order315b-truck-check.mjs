// ORDER 315b — foodtrucken i spelarens flöde (produktionsbygget).
//
// Sparfilen måndag vecka 2 (reports/order284/save-mandag-vinbaren.json) med
// introduktionens sista steg: övningen gjord, inträdesprovet klarat (brons i
// Stensöta), ingen verksamhet och inget lån (sim/introduction.ts, steget
// 'bank'). Åsas skärm (M1) säger att foodtrucken står ledig; efter "Nästa"
// kommer erbjudandet; "Ta över" ger foodtrucken. Kvällen öppnas, och på
// krogens nivå (Z) visas luckan och kön (FoodtruckScene). Bilder på gatans
// nivå (X) och kvarterets (C) visar vagnen vid Torget.
// LANG_GAME=sv spelar på svenska. Utdata: reports/order315b/truck-<lang>.json
// och truck-<lang>-{asa,erbjudande,morgon,luckan,gatan,kvarteret}.png.

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order315b');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4180);
const URL = `http://localhost:${PORT}`;
const LANG = process.env.LANG_GAME ?? 'en';

async function startPreview() {
  if (!process.env.SKIP_BUILD) {
    await new Promise((res, rej) => {
      const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' });
      b.on('exit', (code) => (code === 0 ? res() : rej(new Error(`build exit ${code}`))));
    });
  }
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(URL); if (r.ok) return proc; } catch { /* väntar */ }
    await delay(500);
  }
  throw new Error('preview timeout');
}

const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
const sim = save.sim;
sim.economy = { ...sim.economy, businessClass: null, loan: null };
sim.introduction = { practiced: true };
sim.startLocked = true;
sim.medals = { stensota: 'brons' };
sim.cash = 15000;
// Inträdesprovet i introduktionen satte unlockSaid (reducer.ts, ORDER 313 §2).
sim.unlockSaid = true;
delete sim.ladder;
sim.day = { ...sim.day, morningReview: null };
const SAVE = JSON.stringify(save);

const preview = await startPreview();
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const report = { build: 'produktion (vite build + preview)', lang: LANG, errors: [], ok: false };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(([key, value, lang]) => {
  if (!sessionStorage.getItem('truck-seeded')) { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', lang); sessionStorage.setItem('truck-seeded', '1'); }
}, ['nexus.v1.slot1', SAVE, LANG]);
const page = await ctx.newPage();
page.on('pageerror', (e) => report.errors.push(e.message));
const has = async (sel) => !!(await page.$(sel));
const shot = (name) => page.screenshot({ path: resolve(OUT, `truck-${LANG}-${name}.png`) });

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1200);
  // Åsas skärm (M1) i introduktionens steg: foodtrucken.
  if (await has('[data-testid=mentor][data-step=bank]')) {
    report.asa = { step: 'bank', line: await page.textContent('[data-testid=mentor]'), offerHidden: !(await has('[data-testid=ladder-offer]')) };
    await shot('asa');
    await page.click('[data-testid=mentor-next]');
    await delay(600);
  }
  await page.waitForSelector('[data-testid=ladder-offer]', { timeout: 15000 });
  report.offer = { to: await page.getAttribute('[data-testid=ladder-offer]', 'data-to'), line: await page.textContent('[data-testid=ladder-line]'), price: await page.textContent('[data-testid=ladder-price]') };
  await shot('erbjudande');
  await page.click('[data-testid=ladder-take]');
  await delay(1000);
  for (let i = 0; i < 3 && (await has('[data-testid=mentor-close]')); i++) { await page.click('[data-testid=mentor-close]').catch(() => {}); await delay(500); }
  if (await has('[data-testid=mentor-next]')) { await page.click('[data-testid=mentor-next]').catch(() => {}); await delay(500); }
  report.morning = { offerGone: !(await has('[data-testid=ladder-offer]')), startService: await has('[data-testid=start-service]'), truckMenu: await has('[data-testid=truck-menu]'), menuEditor: await has('[data-testid=morning-menu]') };
  await shot('morgon');
  await page.click('[data-testid=start-service]');
  await delay(2500);
  // Krogens nivå: luckan och kön.
  await page.keyboard.press('z');
  await delay(4000);
  for (let i = 0; i < 40 && !(await has('[data-testid=foodtruck-scene]')); i++) await delay(500);
  await delay(8000);
  report.room = { scene: await has('[data-testid=foodtruck-scene]'), guests: await page.getAttribute('[data-testid=foodtruck-scene]', 'data-guests').catch(() => null) };
  await page.click('[data-testid=mentor-close-service]').catch(() => {});
  await delay(400);
  await shot('luckan');
  // Dockskåpet tar ingen kamerainmatning: nivåraden byter nivå.
  await page.click('[data-testid=level-street]').catch(() => page.keyboard.press('x'));
  await delay(5000);
  report.street = { dollhouseGone: !(await has('[data-testid=foodtruck-scene]')) };
  await shot('gatan');
  await page.click('[data-testid=level-district]').catch(() => page.keyboard.press('c'));
  await delay(5000);
  await shot('kvarteret');
  report.ok = report.offer.to === 'foodtruck' && /foodtruck|food truck/i.test(report.offer.line) && report.morning.offerGone && report.morning.startService && report.room.scene && report.errors.length === 0;
} catch (err) {
  report.error = String(err?.message ?? err);
  console.log('FEL', report.error);
  await shot('fel').catch(() => {});
} finally {
  writeFileSync(resolve(OUT, `truck-${LANG}.json`), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
  console.log('TRUCK', report.ok ? 'OK' : 'FEL');
}
