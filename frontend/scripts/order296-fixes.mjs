// ORDER 296 punkt 6 — felen från provspelet av 64b27c0, i produktionsbygget:
//   - DJ:n som spelaren betalat för syns (body.dataset.djShown) och båset lyser efter 21.00;
//   - tallrikarna står på borden där sällskapen sitter (bild);
//   - ringarna har en förklaring vid hovring ([data-testid=ring-tag]);
//   - kvällens överföring vid förlust säger "Dras från kontot" ([data-testid=transfer-do]).
// Sparfilen måndag i vinbaren, fredag (SAVE_DAY_OFFSET=4), på svenska, DJ:n vald på morgonen.
// Utdata: reports/<order>/fixes.json och fixes-*.png.
//
//   REPORT_ORDER=order296 [SKIP_BUILD=1] [PORT=4191] node scripts/order296-fixes.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4191);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order296');
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
save.sim.day.dayNumber += Number(process.env.SAVE_DAY_OFFSET ?? 4);
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(([k, v]) => {
  if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
}, ['nexus.v1.slot1', JSON.stringify(save)]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const report = { errors };
const clock = () => page.textContent('[data-testid=service-clock-time]').catch(() => null);
try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  report.djPicked = !!(await page.$('[data-testid=activity-book-dj]'));
  if (report.djPicked) await page.click('[data-testid=activity-book-dj]');
  await delay(600);
  await page.click('[data-testid=open-buy-foot]');
  await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
  await page.click('[data-testid=buy-base]').catch(() => {});
  await delay(800);
  await page.click('[data-testid=open-doors]');
  report.askedAfterBase = !!(await page.$('[data-testid=open-short]'));
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 15000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  const until = Date.now() + 10 * 60000;
  let shotDj = false;
  let shotRing = false;
  while (Date.now() < until) {
    if (await page.$('[data-testid=waste-continue], [data-testid=screen-T2], [data-testid=transfer-do]')) break;
    const card = await page.$('[data-testid=incident-card]');
    // Raketerna besvaras rätt (som veckan från bussen), så att kvällen går hela vägen.
    if (card && !(await page.$('[data-testid=incident-band]'))) {
      const o = bestOf(await card.getAttribute('data-incident-id'), Number(await card.getAttribute('data-step')));
      if (o) await page.click(`[data-testid=incident-option-${o}]`).catch(() => {});
    }
    const c = await clock();
    if (!report.djAtOpen && c && c >= '19.20' && !card) {
      report.djAtOpen = await page.evaluate(() => document.body.dataset.djShown ?? null);
      await page.screenshot({ path: resolve(OUT, 'fixes-dj-efter-oppning.png') });
    }
    if (!shotDj && c && c >= '21.10' && !card) {
      shotDj = true;
      report.djAt2110 = await page.evaluate(() => document.body.dataset.djShown ?? null);
      // DJ:n i bild: båset beskuret ur skärmdumpen kring hennes läge.
      const scr = await page.evaluate(() => document.body.dataset.djScreen ?? null);
      report.djScreen = scr;
      if (scr) {
        const [fx, fy] = scr.split(',').map(Number);
        const vp = page.viewportSize();
        const w = 360; const h = 300;
        const x = Math.max(0, Math.min(vp.width - w, fx * vp.width - w / 2));
        const y = Math.max(0, Math.min(vp.height - h, fy * vp.height - h / 2));
        await page.screenshot({ path: resolve(OUT, 'fixes-dj-narbild.png'), clip: { x, y, width: w, height: h } });
      }
      report.clockAtDj = c;
      await page.screenshot({ path: resolve(OUT, 'fixes-dj-och-tallrikarna.png') });
    }
    if (!shotRing && c && c >= '20.00' && !card) {
      // Muspekaren över rummet i ett rutnät tills ringens etikett syns.
      for (let y = 300; y <= 900 && !shotRing; y += 40) {
        for (let x = 500; x <= 1500 && !shotRing; x += 40) {
          await page.mouse.move(x, y);
          await delay(60);
          const tag = await page.$('[data-testid=ring-tag]');
          if (tag) { shotRing = true; report.ringTag = await tag.textContent(); report.ringAt = [x, y]; await page.screenshot({ path: resolve(OUT, 'fixes-ringens-etikett.png') }); }
        }
      }
      if (!shotRing) shotRing = true, report.ringTag = null;
    }
    await delay(500);
  }
  for (let k = 0; k < 8 && !(await page.$('[data-testid=transfer-do]')); k++) {
    const next = await page.$('[data-testid=waste-continue]');
    if (next) await next.click().catch(() => {});
    await delay(1500);
  }
  report.transferText = await page.textContent('[data-testid=transfer-do]').catch(() => null);
  await page.screenshot({ path: resolve(OUT, 'fixes-overforingen.png') });
} catch (e) {
  report.error = String(e?.message ?? e);
  await page.screenshot({ path: resolve(OUT, 'fixes-99-fel.png') }).catch(() => {});
} finally {
  writeFileSync(resolve(OUT, 'fixes.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify(report, null, 2));
