// ORDER 288 — byn och konkurrensen i produktionsbygget: en fredag i vinbaren
// (sparfilen måndag plus fyra dagar), på svenska, 1920 × 1080.
//   - de fyra nivåerna med knapparna och tangenterna (Z X C V): nivån ur
//     body.dataset.level och kamerans avstånd ur body.dataset.camDistance;
//   - krogarnas etiketter i byn (data-testid=village-venue), gatlyktorna
//     (body.dataset.streetLamps), sällskapen i byn (body.dataset.villageGroups)
//     och vem som är på väg in på gatan (street-arrival, level-onway);
//   - aviseringarna (village-notice): vagnarna när dörrarna öppnar, bussen
//     19.45 och vart turisterna gick 20.15;
//   - jämförelsen efter kvällen (screen-J1) och dess rader.
// Utdata: reports/<order>/village.json och village-*.png.
//
//   REPORT_ORDER=order288 [SKIP_BUILD=1] [PORT=4188] [SAVE_DAY_OFFSET=4] node scripts/order288-village.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4188);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order288');
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
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(([k, v]) => {
  if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
}, ['nexus.v1.slot1', JSON.stringify(save)]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const report = { levels: [], notices: [], samples: [], compare: null, errors };
const t0 = Date.now();
const step = (n) => console.log(`${Math.round((Date.now() - t0) / 1000)}s ${n}`);
const read = () => page.evaluate(() => ({
  level: document.body.dataset.level ?? null,
  cam: Number(document.body.dataset.camDistance ?? NaN),
  lamps: Number(document.body.dataset.streetLamps ?? NaN),
  groups: Number(document.body.dataset.villageGroups ?? NaN),
  onWay: Number(document.body.dataset.villageOnWay ?? NaN),
  venues: [...document.querySelectorAll('[data-testid=village-venue]')].map((e) => ({ id: e.getAttribute('data-venue'), text: e.textContent })),
  streetTags: [...document.querySelectorAll('[data-testid=street-arrival]')].map((e) => e.textContent),
  clock: document.querySelector('[data-testid=service-clock-time]')?.textContent ?? null
}));
const WANT = { v: 'village', c: 'district', x: 'street', z: 'room' };
async function level(key, name) {
  // V växlar (byn och tillbaka) och trycks en gång; de andra trycks igen om
  // en raket flög kameran till rummet (ServiceCamera, ORDER 292) innan
  // bilden togs.
  let r = null;
  for (let attempt = 0; attempt < (key === 'v' ? 1 : 4); attempt++) {
    await page.keyboard.press(key);
    for (let k = 0; k < 64; k++) { await delay(250); if ((await read()).level === WANT[key]) break; }
    await delay(1200);
    r = await read();
    if (r.level === WANT[key]) break;
  }
  await page.screenshot({ path: resolve(OUT, `village-${name}.png`) });
  report.levels.push({ key, name, ...r, venues: r.venues.length, venueTexts: r.venues });
  step(`${name}: level=${r.level} cam=${Math.round(r.cam)} groups=${r.groups} venues=${r.venues.length} tags=${r.streetTags.length}`);
}

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
  const seen = new Set();
  let shotLevels = false;
  const until = Date.now() + 16 * 60000;
  while (Date.now() < until) {
    if (await page.$('[data-testid=waste-continue], [data-testid=screen-T2], [data-testid=screen-J1], [data-testid=screen-R1]')) break;
    const n = await page.$('[data-testid=village-notice]');
    if (n) {
      const kind = await n.getAttribute('data-kind');
      const text = await n.textContent();
      if (!seen.has(kind)) {
        seen.add(kind);
        const r = await read();
        report.notices.push({ kind, text, clock: r.clock, level: r.level });
        await page.screenshot({ path: resolve(OUT, `village-avisering-${kind}.png`) });
        step(`avisering ${kind}: ${text}`);
      }
    }
    // Raketerna besvaras (första svaret), så att kameran inte står i rummet
    // när nivåerna fotograferas.
    if (await page.$('[data-testid=incident-card]') && !(await page.$('[data-testid=incident-band]'))) {
      const opt = await page.$('[data-testid^=incident-option-]');
      if (opt) await opt.click().catch(() => {});
    }
    const r = await read();
    report.samples.push({ atSec: Math.round((Date.now() - t0) / 1000), clock: r.clock, groups: r.groups, onWay: r.onWay, level: r.level, notice: n ? await n.getAttribute('data-kind').catch(() => null) : null });
    // Klockan 20.25 ungefär (efter bussen): nivåerna i tur och ordning (byn,
    // kvarteret, gatan, krogen), med tangenterna.
    if (!shotLevels && r.clock && r.clock >= '20.25' && !(await page.$('[data-testid=incident-card], .nx-rocket'))) {
      shotLevels = true;
      await level('v', 'byn');
      await level('c', 'kvarteret');
      await level('x', 'gatan');
      await level('z', 'krogen');
      // Knapparna: byn och tillbaka.
      await page.click('[data-testid=village-toggle]');
      await delay(3000);
      report.buttonVillage = (await read()).level;
      await page.click('[data-testid=village-toggle]');
      await delay(3000);
      report.buttonBack = (await read()).level;
    }
    await delay(500);
  }
  step('stängt');
  // Kvällens jämförelse (J1).
  for (let k = 0; k < 12; k++) {
    if (await page.$('[data-testid=screen-J1]')) break;
    if (await page.$('[data-testid=transfer-do]')) { await page.click('[data-testid=transfer-do]').catch(() => {}); await delay(1500); }
    const next = await page.$('[data-testid=waste-continue], [data-testid=transfer-continue], [data-testid=result-continue]');
    if (next) await next.click().catch(() => {});
    await delay(1500);
  }
  if (await page.$('[data-testid=screen-J1]')) {
    report.compare = await page.$$eval('[data-testid=compare-row]', (rows) => rows.map((r) => ({ venue: r.getAttribute('data-venue'), text: r.textContent })));
    report.compareLead = await page.textContent('[data-testid=compare-place]').catch(() => null);
    await page.screenshot({ path: resolve(OUT, 'village-jamforelsen.png') });
  }
} catch (e) {
  report.error = String(e?.message ?? e);
  await page.screenshot({ path: resolve(OUT, 'village-99-fel.png') }).catch(() => {});
} finally {
  writeFileSync(resolve(OUT, 'village.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify({ levels: report.levels.map((l) => ({ name: l.name, level: l.level, cam: Math.round(l.cam), groups: l.groups, venues: l.venues, lamps: l.lamps, tags: l.streetTags.length })), notices: report.notices, compare: report.compare, errors, error: report.error }, null, 2));
