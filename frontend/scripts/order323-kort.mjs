// ORDER 323 §2, §7 och §10 (Anders 2026-10-09) — korten som inte får plats, Byn i kväll efter kvällen och
// panelerna vid Krogen (Z), i produktionsbygget (vite build + preview), på svenska, i 1024 × 600, 1180 × 660,
// 1280 × 720 och 1440 × 900 (LAYOUT_SIZES).
//
// Spelarens flöde: sparfilen måndag vecka 2 i vinbaren (reports/order284/save-mandag-vinbaren.json, som
// order300-layout och order316-fika-flow), baspaketet, förberedelserna, servicen i 4× (första svaret på varje
// fråga) och kvällens skärmar i 1× till morgonen. Mäts:
//   - krogen-forberedelser, krogen-servicen: spelaren trycker Z. HUD:ens paneler (.gb-topleft, .nx-hud-stack
//     …) får inte ligga i rummets mitt: rektangeln CENTRE (40 % × 40 % mitt i bilden). `centreHits` listar
//     panelerna som skär den; `hudShare` är panelernas andel av bilden (unionen räknas inte, bara summan).
//   - fragekortet (raketen, .nx-rocket), resultatet (R1), lardomen (L1), berattelsen (K1), fikat (frågan och
//     svaret), byn-i-kvall (J1): för varje kort
//       covered:   text i kortet som något annat ligger över (elementFromPoint i tre punkter, bara där texten
//                  syns inom sina rullande föräldrar): knapparna, HUD:en (kassarutan) eller annat;
//       footFixed: knapparna nederst (FOOT) står i bild och ligger inte inuti det som rullar;
//       scrolls:   kortets rullande del (overflow auto, innehållet större än rutan) och hur mycket den rullar;
//       pageScroll: dokumentet rullar.
//   - byn-i-kvall också: förklaringens radbredd (noteLines: raderna i förklaringen; ett ord per rad är fel),
//     kolumnernas bredd (colWidths, px) och om rubriken, förklaringen och placeringen delar rad.
// Utdata: reports/order323/kort/<tag>/kort.json och <skärm>-<storlek>.png (KORT_TAG, förvalt efter).
//
//   [KORT_TAG=fore] [SKIP_BUILD=1] node scripts/order323-kort.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = process.env.FRONTEND_DIR ? resolve(process.env.FRONTEND_DIR) : resolve(HERE, '..');
const TAG = process.env.KORT_TAG ?? 'efter';
const OUT = process.env.OUT_DIR ? resolve(process.env.OUT_DIR) : resolve(HERE, '..', 'reports', 'order323', 'kort', TAG);
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4198);
const URL = `http://localhost:${PORT}`;
const SIZES = (process.env.LAYOUT_SIZES ?? '1024x600,1180x660,1280x720,1440x900').split(',').map((x) => x.split('x').map(Number));
const DEADLINE = Date.now() + Number(process.env.DEADLINE_MIN ?? 25) * 60000;
const CENTRE = 0.4;

// Kortens rot och knapparna nederst.
const CARDS = {
  fragekortet: { root: '.nx-rocket', foot: '.nx-rocket-foot, .nx-rocket-band, .nx-rocket-locked' },
  resultatet: { root: '[data-testid=screen-R1]', foot: '.nx-result-foot' },
  lardomen: { root: '[data-testid=screen-L1]', foot: '.nx-evening-foot, .nx-lesson-foot, footer' },
  berattelsen: { root: '[data-testid=screen-K1]', foot: '.nx-evening-foot' },
  'fikat-fragan': { root: '[data-testid=screen-fika]', foot: '.nx-evening-foot' },
  'fikat-svaret': { root: '[data-testid=screen-fika]', foot: '.nx-evening-foot' },
  'byn-i-kvall': { root: '[data-testid=screen-J1]', foot: '.nx-cmp-foot' },
  'vagnen-fikat-fragan': { root: '[data-testid=screen-fika]', foot: '.nx-evening-foot' },
  'vagnen-fikat-svaret': { root: '[data-testid=screen-fika]', foot: '.nx-evening-foot' }
};

if (!process.env.SKIP_BUILD) {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const SAVE = readFileSync(resolve(HERE, '..', 'reports/order284/save-mandag-vinbaren.json'), 'utf8');
const report = { tag: TAG, build: 'produktion (vite build + preview)', sizes: SIZES.map(([w, h]) => `${w}×${h}`), centre: CENTRE, screens: {}, errors: [], ok: true };

function probeCard([rootSel, footSel]) {
  const W = innerWidth, H = innerHeight;
  const root = document.querySelector(rootSel);
  if (!root) return { missing: true };
  const de = document.scrollingElement || document.documentElement;
  const name = (el) => el.getAttribute('data-testid') || `${el.tagName.toLowerCase()}.${String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.')}`;
  const shown = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  // Den del av elementet som syns inom de rullande föräldrarna och fönstret.
  const clip = (el) => {
    const r = el.getBoundingClientRect();
    let x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(W, r.right), y1 = Math.min(H, r.bottom);
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') {
        const q = p.getBoundingClientRect();
        x0 = Math.max(x0, q.left); y0 = Math.max(y0, q.top); x1 = Math.min(x1, q.right); y1 = Math.min(y1, q.bottom);
      }
    }
    return x1 - x0 > 2 && y1 - y0 > 2 ? { x0, y0, x1, y1 } : null;
  };
  const feet = [...document.querySelectorAll(footSel)].filter((f) => root.contains(f) && shown(f));
  const covered = [];
  // Texten själv (textnodernas rader, Range.getClientRects), inte elementets ruta: en rubrik i ett brett
  // element kan vara täckt där texten står fast elementets mitt är fri (resultatet i 1024 × 600).
  for (const el of root.querySelectorAll('*')) {
    if (!shown(el) || feet.some((f) => f.contains(el))) continue;
    const texts = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!texts.length) continue;
    const c = clip(el);
    if (!c) continue;
    const pts = [];
    for (const n of texts) {
      const rg = document.createRange();
      rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) for (const fx of [0.1, 0.5, 0.9]) pts.push([r.left + r.width * fx, r.top + r.height / 2]);
    }
    for (const [x, y] of pts) {
      if (x < c.x0 || x > c.x1 || y < c.y0 || y > c.y1) continue;
      const top = document.elementFromPoint(x, y);
      if (!top || top === el || el.contains(top) || top.contains(el)) continue;
      const foot = feet.find((f) => f.contains(top));
      covered.push({ el: name(el), text: el.textContent.trim().slice(0, 40), by: foot ? `knapparna (${name(foot)})` : root.contains(top) ? name(top) : `utanför kortet: ${name(top.closest('.gb-topright, .gb-topleft, .nx-hud-stack, .nx-hud-tools') ?? top)}` });
      break;
    }
  }
  const scrollers = [root, ...root.querySelectorAll('*')].filter((el) => { const cs = getComputedStyle(el); return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 2; });
  const footFixed = feet.length > 0 && feet.every((f) => { const r = f.getBoundingClientRect(); return r.top >= -0.5 && r.bottom <= H + 0.5 && !scrollers.some((s) => s.contains(f)); });
  return {
    pageScroll: de.scrollHeight > H + 1 || de.scrollWidth > W + 1,
    covered: covered.slice(0, 20), coveredCount: covered.length,
    feet: feet.map(name), footFixed,
    scrolls: scrollers.map((s) => ({ el: name(s), over: s.scrollHeight - s.clientHeight }))
  };
}

function probeCompare() {
  const note = document.querySelector('[data-testid=compare-note], .nx-cmp-head p');
  if (!note) return null;
  const range = document.createRange();
  range.selectNodeContents(note);
  const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
  const words = note.textContent.trim().split(/\s+/).length;
  const head = note.closest('.nx-cmp-head');
  const title = head.querySelector('h1').getBoundingClientRect();
  const place = head.querySelector('[data-testid=compare-place]')?.getBoundingClientRect();
  const nr = note.getBoundingClientRect();
  const sameRow = (a, b) => !!a && !!b && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 4;
  const cols = [...document.querySelectorAll('.nx-cmp-table thead th')].map((th) => Math.round(th.getBoundingClientRect().width));
  const tag = document.querySelector('.nx-cmp-table tr.is-player .nx-cmp-tag')?.textContent ?? null;
  return { noteLines: lines, noteWords: words, wordPerLine: lines >= words - 1, noteOnTitleRow: sameRow(title, nr), noteOnPlaceRow: sameRow(place, nr), colWidths: cols, playerTag: tag, note: note.textContent.trim() };
}

function probeHud(centre) {
  const W = innerWidth, H = innerHeight;
  const cx0 = W * (0.5 - centre / 2), cx1 = W * (0.5 + centre / 2), cy0 = H * (0.5 - centre / 2), cy1 = H * (0.5 + centre / 2);
  const name = (el) => el.getAttribute('data-testid') || `${el.tagName.toLowerCase()}.${String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.')}`;
  const sel = '.gb-topleft > *, .nx-hud-stack > *, .nx-hud-row > *, .nx-prep-hint, .nx-rival-band, [data-testid=village-now], .gb-topright > *';
  const els = [...new Set(document.querySelectorAll(sel))].filter((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && !el.matches('.nx-hud-stack, .nx-hud-row'); });
  const leaf = els.filter((a) => !els.some((b) => b !== a && a.contains(b)));
  const hits = [];
  let area = 0;
  const panels = leaf.map((el) => { const r = el.getBoundingClientRect(); area += r.width * r.height; return { el: name(el), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; });
  for (const el of leaf) {
    const r = el.getBoundingClientRect();
    const w = Math.min(r.right, cx1) - Math.max(r.left, cx0), h = Math.min(r.bottom, cy1) - Math.max(r.top, cy0);
    if (w > 0 && h > 0) hits.push({ el: name(el), px: Math.round(w * h) });
  }
  return { level: document.body.dataset.level ?? null, centreHits: hits, hudShare: +(area / (W * H)).toFixed(3), panels, prepHint: panels.find((p) => p.el === 'prep-hint') ?? null, rivalBand: panels.find((p) => p.el === 'rival-band') ?? null };
}

const fail = (msg) => { report.ok = false; report.errors.push(msg); };

async function measure(page, name, kind) {
  const rows = [];
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await delay(450);
    const size = `${w}x${h}`;
    let row;
    if (kind === 'hud') {
      row = { size, ...(await page.evaluate(probeHud, CENTRE)) };
      if (row.centreHits.length) fail(`${name} ${size}: paneler i rummets mitt: ${row.centreHits.map((x) => x.el).join(', ')}`);
    } else {
      const c = CARDS[name];
      row = { size, ...(await page.evaluate(probeCard, [c.root, c.foot])) };
      if (name === 'byn-i-kvall') {
        row.compare = await page.evaluate(probeCompare);
        if (row.compare && (row.compare.wordPerLine || row.compare.noteOnTitleRow || row.compare.noteOnPlaceRow)) fail(`${name} ${size}: förklaringen (${row.compare.noteLines} rader, ${row.compare.noteWords} ord) eller på rubrikens rad`);
      }
      if (row.missing) fail(`${name} ${size}: kortet saknas`);
      else {
        if (row.coveredCount) fail(`${name} ${size}: ${row.coveredCount} täckta (${row.covered.slice(0, 3).map((x) => `${x.text} av ${x.by}`).join('; ')})`);
        if (!row.footFixed) fail(`${name} ${size}: knapparna står inte fast nederst (${row.feet.join(', ') || 'inga'})`);
        if (row.pageScroll) fail(`${name} ${size}: sidan rullar`);
      }
    }
    rows.push(row);
    await page.screenshot({ path: resolve(OUT, `${name}-${size}.png`) });
  }
  report.screens[name] = rows;
  console.log(name, rows.map((r) => `${r.size}:${r.coveredCount ?? r.centreHits?.length ?? '?'}${r.footFixed === false ? ' fot' : ''}`).join(' '));
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function truckPass() {
  // Foodtrucken (§2 kassarutan och §5 Nils): provspelet i vagnen, kvällen i 2× (fartknapparna är dolda under
  // överföringen, och kvällens skärmar har sin egen tid), fikat mäts.
    const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await c2.addInitScript(() => { try { localStorage.setItem('nexus.lang', 'sv'); } catch { /* ingen lagring */ } });
    const p2 = await c2.newPage();
    p2.on('pageerror', (e) => report.errors.push(`pageerror vagnen: ${e.message}`));
    const has2 = async (sel) => !!(await p2.$(sel));
    await p2.goto(`${URL}/?prov`);
    await p2.waitForSelector('[data-testid=prov-start]', { timeout: 60000 });
    await p2.click('[data-testid=prov-place-foodtruck]');
    await p2.click('[data-testid=prov-begin]');
    await p2.waitForSelector('[data-testid=prov-badge]', { state: 'attached', timeout: 60000 });
    await delay(2500);
    const vidare = p2.getByRole('button', { name: 'Vidare' });
    for (let i = 0; i < 5 && (await vidare.count()) > 0; i++) { await vidare.first().click(); await delay(400); }
    if (await has2('[data-testid=open-buy-foot]')) { await p2.click('[data-testid=open-buy-foot]'); await p2.waitForSelector('[data-testid=screen-M1]', { timeout: 8000 }).catch(() => {}); }
    if (!(await has2('[data-testid=screen-M1]'))) await p2.click('[data-testid=open-buy]').catch(() => {});
    await p2.click('[data-testid=buy-base]').catch(() => {});
    await delay(800);
    await p2.click('[data-testid=open-doors]').catch(() => {});
    await delay(500);
    if (await has2('[data-testid=open-short-open]')) await p2.click('[data-testid=open-short-open]');
    await p2.waitForSelector('[data-testid=mentor-close-service]', { timeout: 8000 }).then(() => p2.click('[data-testid=mentor-close-service]')).catch(() => {});
    await p2.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
    report.truck = { asker: null, dilemma: null, sequence: [] };
    for (let i = 0; i < 2000; i++) {
      if (Date.now() > DEADLINE) { fail('vagnen: tidsgränsen'); break; }
      if (i % 100 === 0) await p2.screenshot({ path: resolve(OUT, `vagnen-forlopp-${String(i).padStart(4, '0')}.png`) });
      // Morgonen i vagnen: inköpen (open-buy-foot) eller Öppna för kvällen (start-service), och dörrarna, som spelaren.
      if (!report.truck.opened) {
        if (await has2('[data-testid=screen-M1]')) { await p2.click('[data-testid=buy-base]').catch(() => {}); await delay(500); await p2.click('[data-testid=open-doors]').catch(() => {}); await delay(500); }
        else if (await has2('[data-testid=open-buy-foot]')) { await p2.click('[data-testid=open-buy-foot]').catch(() => {}); await delay(800); continue; }
        else if (await has2('[data-testid=start-service]:not([disabled])')) { await p2.click('[data-testid=start-service]').catch(() => {}); await delay(800); }
        if (await has2('[data-testid=open-short-open]')) await p2.click('[data-testid=open-short-open]').catch(() => {});
        if (await has2('[data-testid=mentor-close-service]')) await p2.click('[data-testid=mentor-close-service]').catch(() => {});
        if (!(await has2('[data-testid=open-buy-foot], [data-testid=screen-M1], [data-testid=start-service]'))) { report.truck.opened = true; await p2.click('[data-testid=speed-toggle] button:nth-child(2)').catch(() => {}); }
      }
      if (await has2('[data-testid=screen-fika]')) {
        await p2.click('[data-testid=speed-toggle] button:nth-child(1)').catch(() => {});
        report.truck.asker = await p2.textContent('[data-testid=fika-asker]');
        report.truck.dilemma = await p2.getAttribute('[data-testid=screen-fika]', 'data-dilemma');
        await measure(p2, 'vagnen-fikat-fragan', 'card');
        await p2.click('[data-testid=fika-option-A]').catch(() => {});
        await delay(800);
        await measure(p2, 'vagnen-fikat-svaret', 'card');
        break;
      }
      const eveningGone = async () => !(await has2('[data-testid=evening-bar], [data-testid=screen-K1], [data-testid=transfer-continue], [data-testid=transfer-do], [data-testid=screen-R1], [data-testid=screen-J1], [data-testid=shop-done]'));
      if (report.truck.sequence.length > 0 && (await eveningGone()) && (await has2('[data-testid=day-action-bar]'))) { await delay(2000); if (await eveningGone()) { report.truck.sequence.push('morgonen utan fika'); await p2.screenshot({ path: resolve(OUT, 'vagnen-morgonen.png') }); break; } }
      const card = await p2.$('[data-testid=incident-card]');
      if (card && !(await has2('[data-testid=incident-band]'))) { const opt = await p2.$('[data-testid^=incident-option-]:not([disabled])'); if (opt) await opt.click().catch(() => {}); }
      for (const [sel, btn] of [['[data-testid=waste-continue]', '[data-testid=waste-continue]'], ['[data-testid=transfer-do]', '[data-testid=transfer-do]'], ['[data-testid=transfer-continue]', '[data-testid=transfer-continue]'], ['[data-testid=screen-R1]', '[data-testid=result-continue]'], ['[data-testid=screen-L1]', '[data-testid=to-evening-story]'], ['[data-testid=screen-K1]', '[data-testid=end-evening]'], ['[data-testid=screen-J1]', '[data-testid=compare-continue]'], ['[data-testid=shop-done]', '[data-testid=shop-done]']]) {
        if (await has2(sel)) { await p2.click('[data-testid=speed-toggle] button:nth-child(1)').catch(() => {}); report.truck.sequence.push(sel); await delay(600); await p2.screenshot({ path: resolve(OUT, `vagnen-steg-${report.truck.sequence.length}.png`) }); await p2.click(btn).catch(() => {}); break; }
      }
      await delay(300);
    }
    if (!report.truck.asker) fail('vagnen: fikat kom inte');
    else if (!/Nils/.test(report.truck.asker)) fail(`vagnen: fikat frågas av ${report.truck.asker}, inte Nils`);
    await c2.close();
}

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(([key, value]) => {
  if (!sessionStorage.getItem('o323')) { localStorage.setItem(key, value); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o323', '1'); }
}, ['nexus.v1.slot1', SAVE]);
const page = await ctx.newPage();
page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`));
const has = async (sel) => !!(await page.$(sel));
try {
  if (process.env.ONLY_TRUCK) { await truckPass(); throw Object.assign(new Error('bara vagnen'), { only: true }); }
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  if (!(await has('[data-testid=screen-M1]'))) await page.click('[data-testid=open-buy]');
  await page.waitForSelector('[data-testid=screen-M1]');
  await page.click('[data-testid=buy-base]');
  await delay(1200);
  await page.click('[data-testid=open-doors]');
  await delay(500);
  if (await has('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 8000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await delay(1500);
  // Förberedelserna: Krogen (Z).
  await page.click('[data-testid=speed-toggle] button:nth-child(1)').catch(() => {});
  await page.keyboard.press('z');
  await delay(5000);
  if (await has('[data-testid=prep-hint]')) await measure(page, 'krogen-forberedelser', 'hud');
  else report.errors.push('förberedelseraden syntes inte vid Krogen');
  await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
  let askedCard = false;
  let servicedZ = false;
  while (!(await has('[data-testid=waste-continue], [data-testid=screen-R1], [data-testid=screen-L1], [data-testid=screen-K1]'))) {
    if (Date.now() > DEADLINE) throw new Error('tidsgränsen för skriptet');
    if (!servicedZ && !(await has('[data-testid=prep-hint]')) && !(await has('.nx-rocket'))) {
      await page.keyboard.press('z');
      await delay(4000);
      if (!(await has('.nx-rocket'))) { await measure(page, 'krogen-servicen', 'hud'); servicedZ = true; }
    }
    const card = await page.$('[data-testid=incident-card]');
    if (card && !(await has('[data-testid=incident-band]'))) {
      const opt = await page.$('[data-testid^=incident-option-]:not([disabled])');
      if (!askedCard && opt) {
        await page.click('[data-testid=speed-toggle] button:nth-child(1)').catch(() => {});
        await measure(page, 'fragekortet', 'card');
        askedCard = true;
        await page.click('[data-testid=speed-toggle] button:nth-child(3)').catch(() => {});
      }
      if (opt) await opt.click().catch(() => {});
      if ((await card.getAttribute('data-backed')) === 'true') await page.click('[data-testid=back-lock]').catch(() => {});
    }
    await delay(400);
  }
  await page.click('[data-testid=speed-toggle] button:nth-child(1)').catch(() => {});
  const seen = async () => {
    if (await has('[data-testid=waste-continue]')) return 'S1';
    if (await has('[data-testid=transfer-do], [data-testid=transfer-continue]')) return 'T1';
    for (const s of ['R1', 'L1', 'K1', 'fika', 'J1']) if (await has(`[data-testid=screen-${s}]`)) return s;
    if (await has('[data-testid=shop-done]')) return 'shop';
    return (await has('[data-testid=day-action-bar]')) ? 'morning' : null;
  };
  const done = new Set();
  for (let i = 0; i < 300; i++) {
    if (Date.now() > DEADLINE) throw new Error('tidsgränsen för skriptet');
    const s = await seen();
    if (s === 'morning') break;
    if (s === 'S1') { await delay(600); await page.click('[data-testid=waste-continue]').catch(() => {}); }
    else if (s === 'T1') { await delay(600); if (await has('[data-testid=transfer-do]')) { await page.click('[data-testid=transfer-do]'); await page.waitForSelector('[data-testid=transfer-continue]', { timeout: 15000 }).catch(() => {}); await delay(600); } await page.click('[data-testid=transfer-continue]').catch(() => {}); }
    else if (s === 'R1') { await delay(600); if (!done.has(s)) { await measure(page, 'resultatet', 'card'); done.add(s); } await page.click('[data-testid=result-continue]').catch(() => {}); }
    else if (s === 'L1') { await delay(600); if (!done.has(s)) { await measure(page, 'lardomen', 'card'); done.add(s); } await page.click('[data-testid=to-evening-story]').catch(() => {}); }
    else if (s === 'K1') { await delay(600); if (!done.has(s)) { await measure(page, 'berattelsen', 'card'); done.add(s); } await page.click('[data-testid=end-evening]').catch(() => {}); }
    else if (s === 'fika') {
      await delay(600);
      const answered = (await page.$eval('[data-testid=screen-fika]', (e) => e.getAttribute('data-answer')).catch(() => '')) !== '';
      if (!answered) { await measure(page, 'fikat-fragan', 'card'); await page.click('[data-testid=fika-option-A]').catch(() => {}); await delay(700); }
      if (!done.has('fika')) { await measure(page, 'fikat-svaret', 'card'); done.add('fika'); }
      await page.click('[data-testid=fika-continue]').catch(() => {});
    }
    else if (s === 'J1') { await delay(600); if (!done.has(s)) { await measure(page, 'byn-i-kvall', 'card'); done.add(s); } await page.click('[data-testid=compare-continue]').catch(() => {}); }
    else if (s === 'shop') { await delay(500); await page.click('[data-testid=shop-done]').catch(() => {}); }
    await delay(250);
  }
  await truckPass();
  for (const n of ['fragekortet', 'resultatet', 'berattelsen', 'fikat-fragan', 'byn-i-kvall', 'krogen-forberedelser', 'krogen-servicen']) if (!report.screens[n]) fail(`${n}: mättes inte`);
} catch (e) {
  if (!e.only) fail(`FEL ${e.message}`);
  await page.screenshot({ path: resolve(OUT, 'fel.png') }).catch(() => {});
} finally {
  await browser.close();
  try { process.kill(-proc.pid); } catch { /* redan stängd */ }
}
writeFileSync(resolve(OUT, 'kort.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.errors, null, 1), report.ok);
