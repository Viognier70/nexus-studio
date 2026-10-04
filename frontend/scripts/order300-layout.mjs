// ORDER 300 §1 (Anders 2026-10-04) — alla skärmar ryms i fönstret utan
// scroll, också i ett webbläsarfönster som inte är i helskärm. Texten skalar
// ned i mindre fönster men inte under en undre gräns. Bara långa listor får
// scrolla, och då inom sin egen panel.
//
// Produktionsbygget (vite build + preview). Två flöden:
//   1. Spelarens flöde från början: startskärmen → Nytt spel → namn och
//      samtycke → regelkortet → mentorn → första morgonen, och sidan Spelets
//      regler i menyn.
//   2. Sparfilen måndag morgon vecka 2 i vinbaren (reports/order284/
//      save-mandag-vinbaren.json): morgonen, inköpen, byn före öppning och
//      servicen.
// För varje skärm och storlek mäts:
//   - pageScroll: dokumentet är större än fönstret (scrollWidth/scrollHeight);
//   - scrollers: element som scrollar (overflow auto/scroll och innehållet
//     större än rutan), med rutans andel av fönstret. En scroller som täcker
//     mer än SCREEN_SHARE av fönstret är en hel skärm som scrollar: fel. En
//     mindre är en lista i sin panel: tillåten;
//   - minFontPx: den minsta teckenstorleken bland synlig text (getComputedStyle),
//     mot golvet MIN_FONT_PX;
//   - shelfHidden: paviljongerna i morgonens lista som inte syns utan att listan rullas (§3);
//   - clipped: knappar vars text radbryts eller skärs (scrollWidth > clientWidth
//     eller två rader), bland dem som anges per skärm.
// Utdata: reports/<REPORT_ORDER|order300>/layout.json och layout-*.png.
//
//   [REPORT_ORDER=order300] [SKIP_BUILD=1] [LAYOUT_SIZES=1280x720,...] node scripts/order300-layout.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order300');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4176);
const URL = `http://localhost:${PORT}`;
const SIZES = (process.env.LAYOUT_SIZES ?? '1280x720,1366x768,1440x900,1512x982,1500x950').split(',').map((x) => x.split('x').map(Number));
const SCREEN_SHARE = 0.6;
const MIN_FONT_PX = 12;
const ONLY = process.env.LAYOUT_ONLY ? process.env.LAYOUT_ONLY.split(',') : null;

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const SAVE = readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8');
const report = { build: 'produktion (vite build + preview)', sizes: SIZES.map(([w, h]) => `${w}×${h}`), screenShare: SCREEN_SHARE, minFontPx: MIN_FONT_PX, screens: {}, errors: [] };

async function probe(page, buttons) {
  return page.evaluate(([share, buttons]) => {
    const W = window.innerWidth, H = window.innerHeight;
    const de = document.scrollingElement || document.documentElement;
    const pageScroll = de.scrollHeight > H + 1 || de.scrollWidth > W + 1;
    const name = (el) => el.getAttribute('data-testid') || `${el.tagName.toLowerCase()}.${String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.')}`;
    const visibleEl = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05 && r.bottom > 0 && r.right > 0 && r.top < H && r.left < W; };
    const scrollers = [];
    let minFont = Infinity, minFontAt = null;
    for (const el of document.querySelectorAll('body *')) {
      if (!visibleEl(el)) continue;
      const cs = getComputedStyle(el);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 2) {
        const r = el.getBoundingClientRect();
        const a = (Math.min(r.right, W) - Math.max(r.left, 0)) * (Math.min(r.bottom, H) - Math.max(r.top, 0)) / (W * H);
        scrollers.push({ el: name(el), share: +a.toFixed(2), over: el.scrollHeight - el.clientHeight, screen: a > share });
      }
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      // Bara text som spelaren ser: överst i sin mittpunkt (inte under en skärm).
      const rr = el.getBoundingClientRect();
      const top = document.elementFromPoint(Math.min(W - 1, Math.max(0, rr.left + rr.width / 2)), Math.min(H - 1, Math.max(0, rr.top + rr.height / 2)));
      const onTop = !!top && (top === el || el.contains(top) || top.contains(el));
      if (hasText && onTop) {
        const f = parseFloat(cs.fontSize);
        if (f < minFont) { minFont = f; minFontAt = `${name(el)}: ${el.textContent.trim().slice(0, 30)}`; }
      }
    }
    const clipped = [];
    for (const sel of buttons) {
      for (const el of document.querySelectorAll(sel)) {
        if (!visibleEl(el)) continue;
        const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.25;
        const wraps = el.getBoundingClientRect().height > lh * 2.2 && el.innerText.trim().split('\n').length > 1;
        if (el.scrollWidth > el.clientWidth + 1 || wraps) clipped.push({ el: name(el), text: el.innerText.trim().slice(0, 40) });
      }
    }
    // ORDER 300 §3 — alla paviljongerna syns utan att listan rullas.
    const shelf = [...document.querySelectorAll('[data-testid^=shelf-]')];
    const shelfHidden = shelf.filter((el) => {
      const r = el.getBoundingClientRect();
      const box = (el.closest('.nxs-list-scroll') ?? document.body).getBoundingClientRect();
      return !(r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5 && r.bottom <= H);
    }).map((el) => el.getAttribute('data-testid'));
    return { pageScroll, scrollers, shelfRows: shelf.length, shelfHidden, screenScroll: scrollers.filter((s) => s.screen).map((s) => s.el), minFontPx: minFont === Infinity ? null : +minFont.toFixed(1), minFontAt, clipped };
  }, [SCREEN_SHARE, buttons]);
}

async function measure(page, name, buttons = []) {
  if (ONLY && !ONLY.includes(name)) return;
  const rows = [];
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await delay(500);
    const p = await probe(page, buttons);
    const ok = !p.pageScroll && p.shelfHidden.length === 0 && p.screenScroll.length === 0 && (p.minFontPx ?? 99) >= MIN_FONT_PX && p.clipped.length === 0;
    rows.push({ size: `${w}×${h}`, ok, ...p });
    await page.screenshot({ path: resolve(OUT, `layout-${name}-${w}x${h}.png`) });
  }
  report.screens[name] = { ok: rows.every((r) => r.ok), rows };
  console.log(name, rows.map((r) => `${r.size}:${r.ok ? 'ok' : 'FEL'}`).join(' '));
}

async function newPage(seed) {
  const ctx = await browser.newContext({ viewport: { width: SIZES[0][0], height: SIZES[0][1] } });
  await ctx.addInitScript(([key, value, seed]) => {
    if (!sessionStorage.getItem('o300')) { if (seed) localStorage.setItem(key, value); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o300', '1'); }
  }, ['nexus.v1.slot1', SAVE, seed]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  return { ctx, page };
}

try {
  // 1. Från början.
  {
    const { ctx, page } = await newPage(false);
    await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
    await delay(800);
    await measure(page, 'start', ['[data-testid=new-game]']);
    await page.click('[data-testid=new-game]');
    await page.waitForSelector('[data-testid=register-screen]');
    await page.fill('[data-testid=register-name]', 'Anders');
    await measure(page, 'registrering', ['[data-testid=register-sign]', '[data-testid=register-skip]']);
    await page.click('[data-testid=register-sign]');
    await page.waitForSelector('[data-testid=rules-card]', { timeout: 60000 });
    await delay(800);
    await measure(page, 'regelkortet', ['[data-testid=rules-close]']);
    await page.click('[data-testid=rules-close]');
    await page.waitForSelector('[data-testid=screen-M1]', { timeout: 30000 }).catch(() => {});
    await delay(600);
    await measure(page, 'mentorn', ['[data-testid=mentor-next]', '[data-testid=mentor-skip]']);
    await page.click('[data-testid=mentor-next]').catch(() => {});
    await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 30000 }).catch(() => {});
    await delay(1200);
    await measure(page, 'morgonen-dag1', ['[data-testid=schedule-slots]']);
    await page.click('[data-testid=menu-button]');
    await page.click('[data-testid=menu-rules]');
    await page.waitForSelector('[data-testid=rules-page]');
    await delay(400);
    await measure(page, 'reglerna', ['[data-testid=rules-close]']);
    await page.click('[data-testid=rules-close]');
    await ctx.close();
  }
  // 2. Sparfilen.
  {
    const { ctx, page } = await newPage(true);
    await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
    await page.click('[data-testid=continue-saved]');
    await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
    await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
    await delay(1500);
    await measure(page, 'morgonen', ['[data-testid=schedule-slots]', '[data-testid=open-buy-foot]']);
    await page.click('[data-testid=open-buy-foot]');
    await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
    await delay(600);
    await measure(page, 'inkopen', ['[data-testid=open-doors]', '[data-testid=buy-back]']);
    await page.click('[data-testid=buy-base]').catch(() => {});
    await delay(600);
    await page.click('[data-testid=open-doors]');
    await delay(500);
    if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
    await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 8000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
    await delay(800);
    await page.keyboard.press('v');
    await delay(3000);
    await measure(page, 'byn-fore-oppning', ['[data-testid=level-bar] button', '[data-testid=back-start]']);
    await page.keyboard.press('x');
    await delay(3000);
    await measure(page, 'gatan-fore-oppning', ['[data-testid=level-bar] button']);
    // Till efter dörröppningen.
    const until = Date.now() + 5 * 60000;
    while (Date.now() < until) {
      const opt = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
      if (opt) await opt.click().catch(() => {});
      const c = await page.$eval('[data-testid=service-clock-time]', (el) => el.textContent).catch(() => null);
      if (c && c >= '19.15') break;
      await delay(300);
    }
    await page.keyboard.press('z');
    await delay(3000);
    await measure(page, 'servicen', ['[data-testid=level-bar] button', '[data-testid=back-start]']);
    await ctx.close();
  }
} catch (e) {
  report.error = String(e?.message ?? e);
  console.log('FEL', report.error);
} finally {
  writeFileSync(resolve(OUT, 'layout.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
