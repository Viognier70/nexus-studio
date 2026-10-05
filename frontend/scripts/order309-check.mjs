// ORDER 309 — Designs D5 (följderna och konceptet) i spelarens flöde,
// produktionsbygget (vite build + preview), 1440 × 900.
//
// Sparfilen måndag vecka 2 i vinbaren (reports/order284/save-mandag-vinbaren.json).
// SPARFILEN ÄNDRAS på en punkt: sim.equipment sätts till alla fem sakerna
// (vinkyl, flamberingsvagn, ostvagn, avecvagn, humidor), eftersom de öppnas med
// silver- och guldmedaljer som sparfilen inte har. Allt annat är spelarens
// flöde: inköpen (baspaketet), dörrarna öppnas, kvällen spelas och nästa
// morgon kommer.
//
// Under kvällen:
//   - utrustningen i rummet (body.dataset.roomEquipment) och gästgrupperna
//     (body.dataset.guestGroups), bild i rummet och närmare;
//   - statusläget (S): orkringarna och trivselplattorna (dataset orkRings,
//     wellbeingPlates), kortet för personal och gäst (klick på figuren ur
//     dataset staffScreen / guestScreen), kortets ruta mot panelerna;
//   - fokusläget (H, och kameran under 14 m): body.dataset.focus, panelerna;
//   - nästa morgon: Recensioner i morse (data-testid morning-review, raderna).
// Överlapp: HUD:ens paneler och kortet räknas som i layoutkörningen
// (scripts/order300-layout.mjs, ORDER 303 G), par som skär varandra mer än 2 px.
// Utdata: reports/<REPORT_ORDER|order309>/check.json och check-*.png.
//
//   [REPORT_ORDER=order309] [SKIP_BUILD=1] [CHECK_PART=evening] node scripts/order309-check.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order309');
mkdirSync(OUT, { recursive: true });
const PORT = 4179;
const URL = `http://localhost:${PORT}`;
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
const EQUIPMENT = ['vinkyl', 'flamberingsvagn', 'ostvagn', 'avecvagn', 'humidor'];
save.sim.equipment = EQUIPMENT;
const SAVE = JSON.stringify(save);
const report = { build: 'produktion (vite build + preview)', size: '1440×900', saveEdit: { field: 'sim.equipment', value: EQUIPMENT, why: 'utrustningen öppnas med silver och guld; sparfilen har brons' }, steps: {}, errors: [] };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('o309')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o309', '1'); } }, ['nexus.v1.slot1', SAVE]);
const page = await ctx.newPage();
page.on('pageerror', (e) => report.errors.push(e.message));
const shot = (n) => page.screenshot({ path: resolve(OUT, `check-${n}.png`) });
const ds = (k) => page.evaluate((k) => document.body.dataset[k] ?? null, k);

/** HUD:ens paneler och kortet: rutorna och paren som skär varandra (som layoutkörningen). */
const panels = () => page.evaluate(() => {
  const sel = '.gb-topleft > *, .nx-hud-stack > *, .nx-hud-row > *, .gb-topright > *, .nx-hud-tools > *, .nx-tabs, .nx-tab-dock, .nx-queue, [data-testid=event-stream], .nx-rocket, .nx-agency, .nx-mood-meter, .nx-prep-hint, .nx-scard, .nx-focus-strip';
  const W = innerWidth, H = innerHeight;
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 && r.bottom > 0 && r.right > 0 && r.top < H && r.left < W; };
  const name = (el) => el.getAttribute('data-testid') || `${el.tagName.toLowerCase()}.${String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.')}`;
  const els = [...new Set(document.querySelectorAll(sel))].filter((el) => vis(el) && !el.matches('.nx-hud-stack, .nx-hud-row'));
  const rects = els.map((el) => { const r = el.getBoundingClientRect(); return { el: name(el), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; });
  const overlaps = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (w > 2 && h > 2) overlaps.push({ a: name(a), b: name(b), px: Math.round(w * h) });
  }
  return { rects, overlaps };
});

async function answerOpen() {
  const o = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
  if (o) await o.click().catch(() => {});
  for (const sel of ['[data-testid=incident-kvitt-stop]']) { const b = await page.$(sel); if (b) await b.click().catch(() => {}); }
}
async function noRocket(maxMs = 60000) {
  const until = Date.now() + maxMs;
  while (Date.now() < until && await page.$('[data-testid=incident-card]')) { await answerOpen(); await delay(300); }
}
async function clickFigure(kind) {
  const raw = await ds(kind === 'staff' ? 'staffScreen' : 'guestScreen');
  if (!raw) return null;
  for (const item of raw.split(';')) {
    const parts = item.split('@');
    const [fx, fy] = parts[parts.length - 1].split(',').map(Number);
    const x = Math.round(fx * 1440), y = Math.round(fy * 900);
    // I rummets fria del: ingen panel över punkten (duken överst).
    const free = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.tagName === 'CANVAS', [x, y]);
    if (!free || x < 20 || y < 20 || x > 1420 || y > 880) continue;
    await page.mouse.move(x - 4, y - 4);
    await page.mouse.move(x, y);
    await page.mouse.click(x, y);
    const card = await page.waitForSelector(`[data-testid=${kind}-card]`, { timeout: 1500 }).catch(() => null);
    if (card) { await delay(400); return { id: parts[0], type: parts.length > 2 ? parts[1] : null, x, y }; }
  }
  return null;
}

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  await page.click('[data-testid=open-buy-foot]');
  await page.waitForSelector('[data-testid=screen-M1]');
  await page.click('[data-testid=buy-base]').catch(() => {});
  await delay(600);
  await page.click('[data-testid=open-doors]');
  await delay(500);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 8000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await page.keyboard.press('z');
  // Till kvällen med gäster vid borden (rummet fylls efter dörröppningen).
  const until = Date.now() + 5 * 60000;
  while (Date.now() < until) {
    await answerOpen();
    const c = await page.$eval('[data-testid=service-clock-time]', (el) => el.textContent).catch(() => null);
    if (c && c >= '19.40') break;
    await delay(300);
  }
  await noRocket();
  await page.keyboard.press('z');
  await delay(3000);
  // 1. Utrustningen och gästgrupperna i rummet (spelets 24 m).
  report.steps.room = { camDistance: await ds('camDistance'), roomEquipment: await ds('roomEquipment'), guestGroups: await ds('guestGroups'), focus: await ds('focus') };
  await shot('rummet-utrustning-och-grupper');
  // 2. Statusläget.
  await page.keyboard.press('s');
  await delay(900);
  report.steps.status = {
    pressed: await page.$eval('[data-testid=status-mode]', (e) => e.getAttribute('aria-pressed')).catch(() => null),
    orkRings: await ds('orkRings'), wellbeingPlates: await ds('wellbeingPlates'), guestGroups: await ds('guestGroups'), panels: await panels()
  };
  await shot('statuslaget');
  // 3. Kortet för personal och gäst.
  const staff = await clickFigure('staff');
  report.steps.staffCard = staff ? {
    figure: staff,
    card: await page.$eval('[data-testid=staff-card]', (e) => ({ state: e.getAttribute('data-state'), text: e.innerText, x: +e.dataset.x, y: +e.dataset.y })).catch(() => null),
    panels: await panels()
  } : null;
  if (staff) await shot('kortet-personal');
  await page.keyboard.press('Escape');
  await delay(400);
  report.steps.staffCardClosed = !(await page.$('[data-testid=staff-card]'));
  await page.keyboard.press('z');
  await delay(1500);
  const guest = await clickFigure('guest');
  report.steps.guestCard = guest ? {
    figure: guest,
    card: await page.$eval('[data-testid=guest-card]', (e) => ({ state: e.getAttribute('data-state'), text: e.innerText })).catch(() => null),
    panels: await panels()
  } : null;
  if (guest) await shot('kortet-gast');
  await page.keyboard.press('Escape');
  await delay(300);
  await page.keyboard.press('z');
  await page.keyboard.press('s');
  await delay(1500);
  // 4. Fokusläget med H.
  await noRocket();
  await page.keyboard.press('h');
  await delay(900);
  report.steps.focusKey = { focus: await ds('focus'), panels: await panels(), pressed: await page.$eval('[data-testid=focus-mode]', (e) => e.getAttribute('aria-pressed')).catch(() => null) };
  await shot('fokuslaget-h');
  await page.keyboard.press('h');
  await delay(900);
  report.steps.focusOff = await ds('focus');
  // 5. Kameran under 14 m: fokusläget slås på av sig självt, och gästgrupperna närmare.
  const box = await page.$eval('canvas', (c) => { const r = c.getBoundingClientRect(); return { x: r.left + r.width * 0.62, y: r.top + r.height * 0.5 }; });
  await page.mouse.move(box.x, box.y);
  for (let i = 0; i < 30; i++) {
    const d = Number(await ds('camDistance'));
    if (d && d < 12.5) break;
    await page.mouse.wheel(0, -240);
    await delay(250);
  }
  await delay(1500);
  report.steps.focusNear = { camDistance: await ds('camDistance'), focus: await ds('focus'), panels: await panels(), guestGroups: await ds('guestGroups'), roomEquipment: await ds('roomEquipment') };
  await shot('fokuslaget-under-14m-grupperna');
  await page.keyboard.press('z');
  await delay(2500);
  report.steps.focusBackOut = { camDistance: await ds('camDistance'), focus: await ds('focus') };
  if (process.env.CHECK_PART === 'evening') throw Object.assign(new Error('stop'), { stop: true });
  // 6. Till nästa morgon i 4×: Recensioner i morse.
  await page.locator('[data-testid=speed-toggle] button').nth(2).click().catch(() => {});
  const untilMorning = Date.now() + 14 * 60000;
  while (Date.now() < untilMorning) {
    await answerOpen();
    for (const sel of ['[data-testid=waste-continue]', '[data-testid=transfer-do]', '[data-testid=compare-continue]', '[data-testid=result-continue]', '[data-testid=lesson-continue]', '[data-testid=next-day]', '[data-testid=story-continue]']) {
      const b = await page.$(sel); if (b) await b.click().catch(() => {});
    }
    if (await page.$('[data-testid=morning-review]')) break;
    await delay(500);
  }
  await delay(1500);
  report.steps.review = await page.$eval('[data-testid=morning-review]', (e) => ({
    change: e.getAttribute('data-change'),
    rep: (() => { const r = e.querySelector('[data-testid=morning-review-rep]'); return r ? { from: r.getAttribute('data-from'), to: r.getAttribute('data-to') } : null; })(),
    lines: [...e.querySelectorAll('[data-testid=morning-review-line]')].map((l) => ({ kind: l.getAttribute('data-kind'), delta: +l.getAttribute('data-delta'), voice: l.getAttribute('data-voice'), text: l.innerText }))
  })).catch(() => null);
  await shot('recensioner-i-morse');
  if (report.steps.review) {
    await page.click('[data-testid=morning-review-next]');
    await delay(1200);
    report.steps.reviewNext = { buyOpen: !!(await page.$('[data-testid=screen-M1]')), cardGone: !(await page.$('[data-testid=morning-review]')) };
  }
} catch (e) {
  if (!e?.stop) report.error = String(e?.message ?? e);
  await shot('fel').catch(() => {});
} finally {
  writeFileSync(resolve(OUT, process.env.CHECK_OUT ?? 'check.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify(report, null, 1).slice(0, 6000));
