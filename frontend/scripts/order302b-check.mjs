// ORDER 302b — gatans folk i Designs D5-grupper, i spelarens flöde,
// produktionsbygget (vite build + preview), 1440 × 900 och 1280 × 720.
//
// Sparfilen måndag i vinbaren flyttad till fredag (dayNumber + 4, som
// ORDER 302:s kontroll scripts/order297-check.mjs), på svenska, baspaketet,
// dörrarna öppnas och kvällen går i 2×. Vid klockslagen i CHECK_CLOCKS
// (förvalt 19.00, 19.30, 20.15, 21.00, 21.45) på gatans nivå (X) och kvarterets (C), i 1×:
//   - body.dataset.villageStreet (VillageLife.tsx): groups = figurerna per
//     D5-grupp, screen = sällskapen (grupp:antal:stilla@x,y i bildens andelar);
//   - en bild av hela skärmen och utsnitt kring sällskapen i bild (160 × 160
//     bildpunkter, skärmens egna bildpunkter, ingen förstoring), ett per grupp;
//   - finns ett sällskap av en grupp som ännu inget utsnitt har, drar skriptet
//     kameran dit med musen (spelarens panorering) och tar en bild till
//     (-panorerad). Nivåknappen sätter tillbaka kameran vid nästa stopp.
// Bildfrekvensen mäts inte här utan i scripts/order297-check.mjs
// (REPORT_ORDER=order302b), som ORDER 302 gjorde.
//
// Utdata: reports/order302b/closeup-<w>x<h>.json och closeup-*.png.
//
//   [SKIP_BUILD=1] [CHECK_CLOCKS=19.00,19.30] [CHECK_SIZES=1440x900] node scripts/order302b-check.mjs
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4183);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', 'order302b');
mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const CLOCKS = (process.env.CHECK_CLOCKS ?? '19.00,19.30,20.15,21.00,21.45').split(',');
const SIZES = (process.env.CHECK_SIZES ?? '1440x900,1280x720').split(',').map((s) => s.split('x').map(Number));
const CROP = 160;
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
save.sim.day.dayNumber += 4;
const toMin = (c) => { const [h, m] = c.split('.').map(Number); return h * 60 + m; };

// Bilden och utsnitten: väntar på att skärmpunkterna skrivs om (var 0,4 s),
// tar hela skärmen direkt och skär ett utsnitt per grupp ur den (sips, macOS),
// de sällskap som står stilla först. På 1× går ett sällskap omkring 6 m per
// sekund, så punkten ligger några bildpunkter efter.
async function shootWith(page, OUTTAG, tag, width, height, cropped, report, suffix, stop, name) {
  const probe = await page.evaluate(() => ({ level: document.body.dataset.level ?? null, camDistance: document.body.dataset.camDistance ?? null, clock: document.querySelector('[data-testid=service-clock-time]')?.textContent ?? null }));
  const file = `closeup-${tag}-${suffix}.png`;
  const fresh = await page.evaluate(() => new Promise((res) => {
    const before = document.body.dataset.villageStreet;
    const t0 = performance.now();
    const tick = () => { const now = document.body.dataset.villageStreet; if (now !== before || performance.now() - t0 > 2000) res(now ? JSON.parse(now) : null); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }));
  await page.screenshot({ path: resolve(OUT, file) });
  const crops = [];
  const seen = new Set();
  const items = [...(fresh?.screen ?? [])].sort((a, b) => Number(b.split('@')[0].split(':')[2]) - Number(a.split('@')[0].split(':')[2]));
  for (const item of items) {
    const [who, at] = item.split('@');
    const group = who.split(':')[0];
    if (seen.has(group)) continue;
    const [ix, iy] = at.split(',').map(Number);
    if (ix < 0.03 || ix > 0.97 || iy < 0.03 || iy > 0.97) continue;
    const [fx, fy] = at.split(',').map(Number);
    const x = Math.round(fx * width), y = Math.round(fy * height);
    const clip = { x: Math.max(0, Math.min(width - CROP, x - CROP / 2)), y: Math.max(0, Math.min(height - CROP, y - CROP / 2)), width: CROP, height: CROP };
    // Fritt: inget synligt element över duken nära sällskapet (40 × 40
    // bildpunkter kring punkten). HUD:en och etiketterna har pointer-events
    // none, så elementFromPoint räcker inte; rutorna jämförs i stället.
    const over = await page.evaluate((c) => {
      const canvas = document.querySelector('canvas');
      const hits = [];
      for (const el of document.querySelectorAll('body *')) {
        if (el === canvas || el.contains(canvas) || canvas?.contains(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || r.right <= c.x || r.left >= c.x + c.width || r.bottom <= c.y || r.top >= c.y + c.height) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) continue;
        const bg = cs.backgroundColor;
        const hasBg = bg && bg !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(bg);
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (hasBg || hasText || el.tagName === 'svg' || el.tagName === 'IMG') hits.push(el.getAttribute('data-testid') || `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`);
      }
      return hits;
    }, { x: x - 20, y: y - 20, width: 40, height: 40 });
    if (over.length > 0) { (report.blocked ??= []).push({ stop, level: name, item, over: over.slice(0, 4) }); continue; }
    seen.add(group);
    cropped.add(group);
    const cropFile = `closeup-${tag}-${suffix}-${group}.png`;
    spawnSync('sips', ['-c', String(CROP), String(CROP), '--cropOffset', String(clip.y), String(clip.x), resolve(OUT, file), '--out', resolve(OUT, cropFile)], { stdio: 'ignore' });
    crops.push({ group, item, x, y, file: cropFile });
  }
  return { ...probe, street: fresh, file, crops };
}

async function run(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('o302b')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o302b', '1'); }
  }, ['nexus.v1.slot1', JSON.stringify(save)]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const tag = `${width}x${height}`;
  const report = { viewport: tag, save: 'reports/order284/save-mandag-vinbaren.json, dayNumber + 4 (fredag)', errors, stops: [] };
  const cropped = new Set();
  const shoot = (suffix, stop, name) => shootWith(page, OUT, tag, width, height, cropped, report, suffix, stop, name);
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
    await page.locator('[data-testid=speed-toggle] button').nth(1).click().catch(() => {});
    for (const stop of CLOCKS) {
      const until = Date.now() + 8 * 60000;
      while (Date.now() < until) {
        const opt = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
        if (opt) await opt.click().catch(() => {});
        const c = await page.$eval('[data-testid=service-clock-time]', (el) => el.textContent).catch(() => null);
        if (c && toMin(c) >= toMin(stop)) break;
        await delay(200);
      }
      for (let i = 0; i < 100; i++) {
        const opt = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
        if (opt) await opt.click().catch(() => {});
        const busy = await page.evaluate(() => !!document.querySelector('[data-testid=incident-card]') || (document.body.dataset.moment ?? '') !== '');
        if (!busy) break;
        await delay(300);
      }
      await page.locator('[data-testid=speed-toggle] button').nth(0).click().catch(() => {});
      const levels = [];
      for (const [key, name] of [['x', 'gatan'], ['c', 'kvarteret']]) {
        await page.keyboard.press(key);
        await delay(3500);
        const shot = await shoot(`${stop.replace('.', '')}-${name}`, stop, name);
        levels.push({ level: name, ...shot });
        // Ett sällskap av en grupp som inte har fått något utsnitt än, men som
        // står bakom HUD:en eller långt ut i kanten: kameran dras med musen
        // (spelarens panorering, vänster knapp) så att sällskapet hamnar i mitten.
        const want = (shot.street?.screen ?? []).find((it) => !cropped.has(it.split(':')[0]))?.split(':')[0];
        if (want) {
          // Upp till tre drag: punkten följer musen i sidled och går emot den
          // i höjdled (kamerans lutning), uppmätt i kontrollen; varje drag läser
          // sällskapets nya punkt.
          let street = shot.street;
          for (let pass = 0; pass < 3; pass++) {
            const it = (street?.screen ?? []).find((x) => x.startsWith(`${want}:`));
            if (!it) break;
            const [fx, fy] = it.split('@')[1].split(',').map(Number);
            const dx = (0.5 - fx) * width, dy = (0.55 - fy) * height;
            if (Math.abs(dx) < 60 && Math.abs(dy) < 60) break;
            const cx = Math.round(width / 2), cy = Math.round(height / 2);
            const mx = Math.max(-width * 0.4, Math.min(width * 0.4, dx / 1.15)), my = Math.max(-height * 0.35, Math.min(height * 0.35, -dy / 1.3));
            await page.mouse.move(cx - mx / 2, cy - my / 2);
            await page.mouse.down();
            for (let i = 1; i <= 8; i++) await page.mouse.move(cx - mx / 2 + (mx * i) / 8, cy - my / 2 + (my * i) / 8);
            await page.mouse.up();
            await delay(500);
            street = await page.evaluate(() => new Promise((res) => {
              const before = document.body.dataset.villageStreet;
              const t0 = performance.now();
              const tick = () => { const now = document.body.dataset.villageStreet; if (now !== before || performance.now() - t0 > 2000) res(now ? JSON.parse(now) : null); else requestAnimationFrame(tick); };
              requestAnimationFrame(tick);
            }));
          }
          const panned = await shoot(`${stop.replace('.', '')}-${name}-panorerad`, stop, `${name} (panorerad)`);
          levels.push({ level: `${name}-panorerad`, target: want, ...panned });
        }
      }
      report.stops.push({ stop, levels });
      await page.locator('[data-testid=speed-toggle] button').nth(1).click().catch(() => {});
    }
  } catch (e) {
    report.error = String(e?.message ?? e);
    await page.screenshot({ path: resolve(OUT, `closeup-${tag}-fel.png`) }).catch(() => {});
  } finally {
    writeFileSync(resolve(OUT, `closeup-${tag}.json`), JSON.stringify(report, null, 2) + '\n');
    await ctx.close();
  }
  return report;
}
const results = [];
try { for (const [w, h] of SIZES) results.push(await run(w, h)); } finally {
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
for (const r of results) {
  console.log(r.viewport, 'errors', r.errors.length, r.error ?? '', 'grupper med utsnitt', [...new Set(r.stops.flatMap((s) => s.levels.flatMap((l) => l.crops.map((c) => c.group))))].join(','));
  for (const s of r.stops) for (const l of s.levels) console.log(' ', s.stop, l.level, 'clock', l.clock, 'dist', l.camDistance, 'groups', JSON.stringify(l.street?.groups ?? null), 'crops', l.crops.map((c) => c.group).join(','));
}
