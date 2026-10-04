// ORDER 299 (och 299b: mätaren till höger om kassan) — Raketen och rummet i produktionsbygget, i spelarens flöde:
// sparfilen måndag i vinbaren flyttad till fredag (SAVE_DAY_OFFSET, förvalt 4),
// på svenska, baspaketet, spelaren kör 4×. Körs i 1280 × 720 och 1440 × 900.
// - Raketen: hur stor del av bildens mitt som är rummet (elementsFromPoint längs
//   två rader, 50 % och 62 % av höjden: canvas överst = rummet syns), kortets
//   och listens plats, och bilder.
// - Konsekvensögonblicket: var 100:e ms i 6 s efter svaret: spelets hastighet
//   (body.dataset.speedNow), sekunderna i ögonblicket (moment), kamerans
//   faktiska avstånd och vinkel (camDist, camPitch), raden som binder ihop svaret
//   med reaktionen, notiserna och mätaren. Bilder vid 1,5 s och 3,6 s.
// - Notiserna: hur många som står samtidigt och hur länge (fram till 10 s).
// - Kameran: knapparna (zooma in, vrid, återställ), dra med vänster knapp i
//   krogen, klick mitt i rummet (bordet), med camDist/camYaw före och efter.
// Utdata: reports/<order>/check-<w>x<h>.json och bilder.
//
//   REPORT_ORDER=order299 [SKIP_BUILD=1] [PORT=4196] node scripts/order299-check.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4196);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order299');
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
save.sim.day.dayNumber += Number(process.env.SAVE_DAY_OFFSET ?? 4);
const meta = JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/vinbar.meta.json'), 'utf8'));
const menuMeta = JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/menu.meta.json'), 'utf8'));
const optionOf = (id, step, quality) => [...meta.incidents, ...menuMeta.incidents].find((i) => i.id === id)?.steps[step]?.options.find((o) => o.quality === quality)?.id;

async function run(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
  }, ['nexus.v1.slot1', JSON.stringify(save)]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tag = `${width}x${height}`;
  const report = { viewport: tag, errors, rockets: [], camera: {}, notices: null };
  const shot = (name) => page.screenshot({ path: resolve(OUT, `check-${tag}-${name}.png`) });
  const probe = () => page.evaluate(() => {
    const b = document.body.dataset;
    const q = (s) => document.querySelector(s);
    const meter = q('[data-testid=mood-meter]');
    return {
      clock: q('[data-testid=service-clock-time]')?.textContent ?? null,
      speedNow: b.speedNow ?? null, moment: b.moment ?? null, reactions: b.reactions ?? '', camDist: Number(b.camDist), camPitch: Number(b.camPitch), camYaw: Number(b.camYaw),
      card: !!q('[data-testid=incident-card]'), line: q('[data-testid=consequence-line]')?.textContent ?? null,
      notices: [...document.querySelectorAll('[data-testid=room-notice]')].map((n) => ({ at: n.getAttribute('data-at'), text: n.textContent, fading: n.getAttribute('data-fading'), guestsIn: n.getAttribute('data-guests-in') })),
      meter: meter ? { mood: meter.getAttribute('data-mood'), fill: meter.getAttribute('data-fill'), change: meter.getAttribute('data-change') } : null
    };
  });
  // Rummet i bildens mitt: punkter längs två rader där canvas är överst.
  const roomShare = () => page.evaluate(() => {
    const W = window.innerWidth; const H = window.innerHeight;
    const rows = [0.5, 0.62].map((fy) => {
      let room = 0; let n = 0;
      for (let x = 4; x < W; x += 8) { const el = document.elementFromPoint(x, H * fy); n++; if (el && el.tagName === 'CANVAS') room++; }
      return +(room / n).toFixed(3);
    });
    const card = document.querySelector('[data-testid=incident-card]')?.getBoundingClientRect();
    const strip = document.querySelector('[data-testid=incident-pyramid]')?.getBoundingClientRect();
    // ORDER 299b — mätaren till höger om kassan, i samma rad.
    const till = document.querySelector('.nx-till-box')?.getBoundingClientRect();
    const meter = document.querySelector('[data-testid=mood-meter]')?.getBoundingClientRect();
    const band = document.querySelector('[data-testid=rival-band]');
    return { rows, card: card ? { left: Math.round(card.left), right: Math.round(card.right), leftShare: +(card.left / W).toFixed(3), rightShare: +(card.right / W).toFixed(3) } : null, stripHeight: strip ? Math.round(strip.height) : null,
      meter: meter && till ? { left: Math.round(meter.left), top: Math.round(meter.top), tillRight: Math.round(till.right), tillTop: Math.round(till.top), width: Math.round(meter.width) } : null,
      bandShown: !!band && getComputedStyle(band).display !== 'none' };
  });
  try {
    await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
    await page.click('[data-testid=continue-saved]');
    await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
    await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
    await delay(1200);
    await page.click('[data-testid=open-buy-foot]');
    await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
    await page.click('[data-testid=buy-base]').catch(() => {});
    await delay(800);
    await page.click('[data-testid=open-doors]');
    await delay(500);
    if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
    await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 15000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
    // Spelaren kör 4×.
    await page.locator('[data-testid=speed-toggle] button').nth(2).click().catch(() => {});
    await delay(800);
    // Kameran före raketerna: knapparna, dra och klick i krogen.
    const cam = report.camera;
    cam.start = await probe();
    await page.click('[data-testid=camera-in]'); await delay(1500); cam.afterIn = await probe();
    await page.click('[data-testid=camera-left]'); await delay(1500); cam.afterLeft = await probe();
    const box = await page.locator('canvas').first().boundingBox();
    const cx = box.x + box.width * 0.62; const cy = box.y + box.height * 0.55;
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 160, cy, { steps: 8 }); await page.mouse.up(); await delay(1500);
    cam.afterDrag = await probe();
    await page.click('[data-testid=camera-reset]'); await delay(2500); cam.afterReset = await probe();
    // Klick på ett bord: punkter i ett rutnät över rummet tills kameran glider in (14 m).
    cam.tableClick = null;
    for (const fy of [0.45, 0.55, 0.65, 0.75]) {
      for (const fx of [0.4, 0.5, 0.6, 0.7, 0.8]) {
        await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy); await delay(1800);
        const p = await probe();
        if (p.camDist <= 14.5) { cam.tableClick = { fx, fy, ...p }; break; }
      }
      if (cam.tableClick) break;
    }
    await page.screenshot({ path: resolve(OUT, `check-${tag}-bordet.png`) });
    await page.click('[data-testid=camera-reset]'); await delay(2000);
    await shot('rummet');
    // Raketerna: två svar, ett rätt och ett fel.
    const until = Date.now() + 8 * 60000;
    let answered = 0;
    while (Date.now() < until && answered < 2) {
      if (await page.$('[data-testid=waste-continue], [data-testid=screen-T2], [data-testid=transfer-do]')) break;
      const card = await page.$('[data-testid=incident-card][data-mode=ask]');
      if (!card) { await delay(200); continue; }
      const id = await card.getAttribute('data-incident-id');
      const step = Number(await card.getAttribute('data-step'));
      await delay(600);
      const layout = await roomShare();
      await shot(`raket-${answered + 1}`);
      const quality = answered === 0 ? 'best' : 'wrong';
      const opt = optionOf(id, step, quality) ?? (await page.$eval('[data-testid^=incident-option-]', (el) => el.getAttribute('data-option-id')));
      const before = await probe();
      await page.click(`[data-testid=incident-option-${opt}]`);
      const t0 = Date.now();
      const samples = [];
      let shot1 = false; let shot2 = false;
      while (Date.now() - t0 < 6000) {
        const p = await probe();
        samples.push({ ms: Date.now() - t0, ...p });
        const m = Number(p.moment);
        if (!shot1 && m >= 1.5) { shot1 = true; await shot(`svar-${answered + 1}-7m`); }
        if (!shot2 && m >= 3.5) { shot2 = true; await shot(`svar-${answered + 1}-5m`); }
        await delay(100);
      }
      // Notiserna fram till 10 s efter svaret.
      const later = [];
      while (Date.now() - t0 < 10000) { later.push({ ms: Date.now() - t0, notices: (await probe()).notices.length }); await delay(250); }
      report.rockets.push({ incident: id, step, quality, layout, before, samples, later });
      answered++;
    }
  } catch (e) {
    report.error = String(e?.message ?? e);
    await shot('fel').catch(() => {});
  } finally {
    writeFileSync(resolve(OUT, `check-${tag}.json`), JSON.stringify(report, null, 2) + '\n');
    await ctx.close();
  }
  return report;
}

const results = [];
try {
  for (const [w, h] of [[1280, 720], [1440, 900]]) results.push(await run(w, h));
} finally {
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
for (const r of results) {
  console.log(r.viewport, 'errors', r.errors.length, r.error ?? '', 'rockets', r.rockets.length);
  for (const k of Object.keys(r.camera)) console.log('  cam', k, r.camera[k] ? `${r.camera[k].camDist} ${r.camera[k].camYaw}` : null);
  for (const x of r.rockets) {
    const speeds = [...new Set(x.samples.map((s) => s.speedNow))];
    const minDist = Math.min(...x.samples.map((s) => s.camDist));
    console.log(' ', x.incident, x.quality, 'room', JSON.stringify(x.layout), 'speeds', speeds.join('/'), 'minDist', minDist.toFixed(2), 'line', x.samples.find((s) => s.line)?.line ?? null, 'maxNotices', Math.max(...x.samples.map((s) => s.notices.length)), 'noticeLastMs', [...x.samples].reverse().find((s) => s.notices.length > 0)?.ms ?? null, 'noticesAt10s', x.later.at(-1)?.notices);
  }
}
