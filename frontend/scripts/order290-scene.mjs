// ORDER 290 — scenen och kvällens ekonomi i produktionsbygget (Vision Owner
// 2026-09-30, provspel av cae53c9). Från sparfilen måndag i vinbaren
// (reports/order284/save-mandag-vinbaren.json), 1920 × 1080:
//   - startrutan i den varma formen;
//   - kvällens insats när dörrarna öppnas (stake-card, stake-*);
//   - serviceläget: panelerna ihopfällda, bara klockan och kvällskassan med
//     linjen för break-even; panelerna öppnade med knappen;
//   - byn och tillbaka (knappen), kamerans avstånd (body data-cam-distance);
//   - bilder från 24 m (tangenten 4, myBusiness): ringarna och linjerna under
//     personalen, rekvisitan;
//   - raketen: kameran glider in (data-cam-distance mot THEATRE.camera 12 m),
//     rätt svar (grön glöd, pyramidens våning), fel svar (rött);
//   - efter servicen: överföringen (screen-T2) och kvällens pyramider i R1.
//
//   REPORT_ORDER=order290 [SKIP_BUILD=1] [PORT=4178] node scripts/order290-scene.mjs
//
// Skriver reports/<REPORT_ORDER>/scene.json och scene-*.png.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4178);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order290');
mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const rocketMeta = new Map(JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/vinbar.meta.json'), 'utf8')).incidents.map((i) => [i.id, i]));
for (const i of JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/menu.meta.json'), 'utf8')).incidents) rocketMeta.set(i.id, i);

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const SAVE = readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8');
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(([key, value]) => {
  if (!sessionStorage.getItem('scene-seeded')) { localStorage.setItem(key, value); sessionStorage.setItem('scene-seeded', '1'); }
}, ['nexus.v1.slot1', SAVE]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}\n${(e.stack ?? '').slice(0, 400)}`));
const report = { url: URL, build: 'produktion (vite build + preview)', save: 'reports/order284/save-mandag-vinbaren.json', viewport: '1920×1080', steps: [], shots: [], errors };
const t0 = Date.now();
const step = (name, extra = {}) => { report.steps.push({ name, atSeconds: Math.round((Date.now() - t0) / 1000), ...extra }); console.log(`${Math.round((Date.now() - t0) / 1000)}s ${name}`); };
const shot = async (file, what) => { await page.screenshot({ path: resolve(OUT, file) }); report.shots.push({ file, what }); };
const cam = () => page.evaluate(() => Number(document.body.dataset.camDistance ?? NaN));
const attr = (sel, a) => page.getAttribute(sel, a).catch(() => null);

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await delay(800);
  await shot('scene-00-startrutan.png', 'startrutan i den varma formen');
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  step('morgonen');

  // DJ:n som satsning, så att raden syns i insatsen.
  await page.click('[data-testid=activity-book-dj]').catch(() => {});
  report.djPicked = await attr('[data-testid=activity-book-dj]', 'aria-pressed');
  if (await page.$('[data-testid=open-buy-foot]')) {
    await page.click('[data-testid=open-buy-foot]');
    await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
    await page.click('[data-testid=buy-base]').catch(() => {});
    await delay(600);
    await page.click('[data-testid=open-doors]');
  } else {
    await page.click('[data-testid=start-service]');
  }
  // Mentorn vid första servicen, sedan kvällens insats när dörrarna öppnas.
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 15000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await page.waitForSelector('[data-testid=stake-card]', { timeout: 120000 });
  await delay(500);
  report.stake = await page.$$eval('[data-testid^=stake-]', (els) => els.map((e) => ({ id: e.getAttribute('data-testid'), value: e.getAttribute('data-value'), text: e.textContent })));
  await shot('scene-10-insatsen.png', 'kvällens insats när dörrarna öppnas');
  step('insatsen');
  await delay(9000);

  // Serviceläget: panelerna ihopfällda.
  report.drawerClosed = {
    stock: !!(await page.$('[data-testid=service-stock]')),
    prep: !!(await page.$('[data-testid=prep-panel]')),
    meters: !!(await page.$('[data-testid=service-meters]')),
    feedRows: (await page.$$('[data-testid=feed-row]')).length,
    till: await attr('[data-testid=cash-counter]', 'data-mode'),
    tillValue: await attr('[data-testid=cash-counter]', 'data-value'),
    breakEven: await attr('[data-testid=cash-counter]', 'data-break-even'),
    villageText: await page.$eval('.gb-hint', (e) => getComputedStyle(e).display).catch(() => 'saknas')
  };
  await shot('scene-20-servicelaget.png', 'servicen med panelerna ihopfällda: klockan och kvällskassan mot break-even');
  await page.click('[data-testid=service-drawer]');
  await delay(700);
  report.drawerOpen = {
    stock: !!(await page.$('[data-testid=service-stock]')),
    prep: !!(await page.$('[data-testid=prep-panel]')),
    meters: !!(await page.$('[data-testid=service-meters]')),
    amounts: (await page.$$('.nx-feed-amount')).length
  };
  await shot('scene-21-panelerna.png', 'panelerna öppnade med knappen, händelselistan utan belopp');
  await page.click('[data-testid=service-drawer]');
  step('serviceläget');

  // Byn och tillbaka.
  report.village = { before: await cam() };
  await page.click('[data-testid=village-toggle]');
  await delay(7000);
  report.village.out = await cam();
  await shot('scene-30-byn.png', 'byn under servicen (knappen Byn)');
  await page.click('[data-testid=village-toggle]');
  await delay(7000);
  report.village.back = await cam();
  step('byn');

  // Från 24 m (myBusiness): ringarna, linjerna och rekvisitan.
  await page.mouse.click(960, 600);
  await page.keyboard.press('4');
  await delay(6000);
  report.at24 = await cam();
  await shot('scene-40-24m-1.png', 'från 24 m: personalen med ring och linje, rekvisitan på borden');
  await delay(8000);
  await shot('scene-41-24m-2.png', 'från 24 m, åtta sekunder senare');
  step('24 m');

  // Raketen: kameran glider in; rätt svar, sedan fel svar.
  report.rockets = [];
  const until = Date.now() + 8 * 60000;
  let answeredRight = false;
  let answeredWrong = false;
  while (Date.now() < until && !(answeredRight && answeredWrong)) {
    if (await page.$('[data-testid=screen-S1], [data-testid=screen-T2], [data-testid=screen-R1]')) break;
    const card = await page.$('[data-testid=incident-card][data-mode=ask]');
    if (!card || (await page.$('[data-testid=incident-band]'))) { await delay(400); continue; }
    const id = await card.getAttribute('data-incident-id');
    const s = Number(await card.getAttribute('data-step'));
    const r = { id, step: s, camAtOpen: await cam(), cam: [] };
    for (let i = 0; i < 8; i++) { await delay(500); r.cam.push(await cam()); }
    const want = answeredRight ? 'wrong' : 'best';
    const opts = rocketMeta.get(id)?.steps[s]?.options ?? [];
    const o = opts.find((x) => x.quality === want) ?? opts.find((x) => x.quality !== 'best');
    if (o) await page.click(`[data-testid=incident-option-${o.id}]`).catch(() => {});
    await delay(450);
    r.answer = want;
    r.look = await attr(`[data-testid=incident-option-${o?.id}]`, 'data-look');
    r.pyramid = await page.$$eval('[data-testid^=incident-pyramid-]', (els) => els.map((e) => e.getAttribute('data-state')));
    await shot(`scene-5${report.rockets.length}-raket-${want}.png`, want === 'best' ? 'rätt svar: grön glöd, svaret lyfter, pyramidens våning fylls' : 'fel svar: röd markering, skakning, våningen spricker');
    report.rockets.push(r);
    if (want === 'best') answeredRight = true; else answeredWrong = true;
    await delay(2500);
  }
  step('raketerna');

  // Efter servicen: överföringen och kvällens pyramider.
  const end = Date.now() + 12 * 60000;
  while (Date.now() < end) {
    if (await page.$('[data-testid=waste-continue]')) { await delay(900); await page.click('[data-testid=waste-continue]').catch(() => {}); }
    if (await page.$('[data-testid=screen-T2]')) break;
    const card = await page.$('[data-testid=incident-card][data-mode=ask]');
    if (card && !(await page.$('[data-testid=incident-band]'))) {
      const id = await card.getAttribute('data-incident-id');
      const s = Number(await card.getAttribute('data-step'));
      const o = rocketMeta.get(id)?.steps[s]?.options.find((x) => x.quality === 'best');
      if (o) await page.click(`[data-testid=incident-option-${o.id}]`).catch(() => {});
    }
    await delay(600);
  }
  await page.waitForSelector('[data-testid=screen-T2]', { timeout: 30000 });
  await delay(2500);
  report.transfer = {
    revenue: await attr('[data-testid=transfer-revenue]', 'data-value'),
    contribution: await attr('[data-testid=transfer-contribution]', 'data-value'),
    ratio: await attr('[data-testid=transfer-ratio]', 'data-value'),
    result: await attr('[data-testid=transfer-result]', 'data-value'),
    move: await attr('[data-testid=transfer-move]', 'data-value'),
    account: await attr('[data-testid=transfer-account]', 'data-value'),
    forecast: await page.textContent('[data-testid=transfer-forecast]').catch(() => null)
  };
  await shot('scene-60-overforingen.png', 'överföringen: täckningsbidrag, täckningsgrad, resultat och prognos');
  await delay(900);
  await page.click('[data-testid=transfer-continue]');
  await page.waitForSelector('[data-testid=screen-R1]', { timeout: 10000 });
  await delay(2500);
  report.r1Pyramids = await page.$$eval('[data-testid^=result-pyramid-]', (els) => els.filter((e) => e.classList.contains('nx-pyramid')).map((e) => e.getAttribute('data-full')));
  await shot('scene-61-R1-pyramiderna.png', 'kvällens resultat med kvällens pyramider');
  report.hudAfter = { mode: await attr('[data-testid=cash-counter]', 'data-mode'), value: await attr('[data-testid=cash-counter]', 'data-value') };
  step('överföringen');
} catch (e) {
  step('FEL', { error: String(e?.message ?? e) });
  await shot('scene-99-fel.png', 'läget vid felet').catch(() => {});
} finally {
  writeFileSync(resolve(OUT, 'scene.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify({ steps: report.steps.map((s) => `${s.atSeconds}s ${s.name}${s.error ? ' ' + s.error : ''}`), errors: errors.length }));
