// ORDER 293 — händelserna som teater i produktionsbygget (Designs leverans 3):
// varje händelse köas med provspelets flagga (#playtest=1&rocket=<id>, som
// QUEUE_INCIDENT; spelarens egen väg är veckan från bussen) och spelas med
// rätt svar, eller med fel i ett bestämt steg. För varje körning:
//   - bilder: uppbyggnaden, varje fråga, slutet och när kameran gått tillbaka;
//   - kamerans avstånd (body.dataset.camDistance) vid varje bild;
//   - figurvakten (body.dataset.figuresDown): ingen figur ligger ned eller
//     sitter utan sits, också händelsernas figurer;
//   - sidfel.
// Sparfilen måndag i vinbaren flyttas till fredag (SAVE_DAY_OFFSET=4).
// Utdata: reports/<order>/events.json och events-<händelse>-*.png.
//
//   REPORT_ORDER=order293 [SKIP_BUILD=1] [PORT=4190] [ONLY=vb32-fodelsedagen] node scripts/order293-events.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4190);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order293');
mkdirSync(OUT, { recursive: true });
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const meta = JSON.parse(readFileSync(resolve(FRONTEND, 'src/content/incidents/vinbar.meta.json'), 'utf8'));
const RUNS = [
  { id: 'vb32-fodelsedagen', wrongAt: null },
  { id: 'vb32-fodelsedagen', wrongAt: 1 },
  { id: 'vb33-vasen', wrongAt: null },
  { id: 'vb33-vasen', wrongAt: 0 },
  { id: 'vb34-vinglar', wrongAt: null },
  { id: 'vb35-tillsynen-c', wrongAt: null },
  { id: 'vb36-passet', wrongAt: null },
  { id: 'vb36-passet', wrongAt: 2 }
].filter((r) => !process.env.ONLY || r.id === process.env.ONLY);
// ORDER 295 — andra körningar: RUNS='[{"id":"vb32-fodelsedagen","wrongAt":0}]'.
if (process.env.RUNS) RUNS.splice(0, RUNS.length, ...JSON.parse(process.env.RUNS));

if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
save.sim.day.dayNumber += Number(process.env.SAVE_DAY_OFFSET ?? 4);
const report = { runs: [] };
const t0 = Date.now();
const step = (n) => console.log(`${Math.round((Date.now() - t0) / 1000)}s ${n}`);

for (const run of RUNS) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
  }, ['nexus.v1.slot1', JSON.stringify(save)]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const name = `${run.id.replace(/^vb\d+-/, '')}-${run.wrongAt === null ? 'ratt' : `fel${run.wrongAt + 1}`}`;
  const rec = { run: name, id: run.id, wrongAt: run.wrongAt, shots: [], maxDown: 0, faults: [], opened: false, finished: false, errors };
  const read = () => page.evaluate(() => ({ cam: Number(document.body.dataset.camDistance ?? NaN), down: document.body.dataset.figuresDown ?? null }));
  const shot = async (label) => {
    const r = await read();
    const file = `events-${name}-${String(rec.shots.length).padStart(2, '0')}-${label}.png`;
    await page.screenshot({ path: resolve(OUT, file) });
    rec.shots.push({ label, file, cam: Math.round(r.cam * 10) / 10 });
  };
  try {
    await page.goto(`${URL}/#playtest=1&rocket=${run.id}`, { waitUntil: 'domcontentloaded' });
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
    const inc = meta.incidents.find((i) => i.id === run.id);
    const until = Date.now() + 6 * 60000;
    let lastStep = -1;
    let built = false;
    let closedAt = null;
    while (Date.now() < until) {
      const r = await read();
      if (r.down) { const d = JSON.parse(r.down); rec.maxDown = Math.max(rec.maxDown, d.n); for (const f of d.faults) if (rec.faults.length < 8) rec.faults.push(f); }
      const card = await page.$('[data-testid=incident-card]');
      const id = card ? await card.getAttribute('data-incident-id') : null;
      if (card && id !== run.id) {
        // En annan raket: svara rätt och gå vidare.
        const s = Number(await card.getAttribute('data-step'));
        const other = meta.incidents.find((i) => i.id === id);
        const o = other?.steps[s]?.options.find((x) => x.quality === 'best');
        if (o && !(await page.$('[data-testid=incident-band]'))) await page.click(`[data-testid=incident-option-${o.id}]`).catch(() => {});
      } else if (card && id === run.id) {
        rec.opened = true;
        if (!built) { built = true; await delay(1500); await shot('uppbyggnaden'); }
        const s = Number(await card.getAttribute('data-step'));
        const option = await page.$(`[data-testid^=incident-option-]`);
        if (s !== lastStep && option && !(await page.$('[data-testid=incident-band]'))) {
          lastStep = s;
          await shot(`fraga-${s + 1}`);
          const want = run.wrongAt === s ? 'wrong' : 'best';
          const o = inc.steps[s].options.find((x) => x.quality === want);
          await page.click(`[data-testid=incident-option-${o.id}]`).catch(() => {});
          await delay(2500);
          await shot(`svar-${s + 1}-${want === 'best' ? 'ratt' : 'fel'}`);
        }
      } else if (rec.opened && !card) {
        if (closedAt === null) { closedAt = Date.now(); await delay(4000); await shot('slutet'); }
        else if (Date.now() - closedAt > 45000) { await shot('tillbaka'); rec.finished = true; break; }
      }
      await delay(400);
    }
  } catch (e) {
    rec.error = String(e?.message ?? e);
    await page.screenshot({ path: resolve(OUT, `events-${name}-99-fel.png`) }).catch(() => {});
  }
  report.runs.push(rec);
  step(`${name}: öppnad=${rec.opened} klar=${rec.finished} maxDown=${rec.maxDown} fel=${errors.length} ${rec.error ?? ''}`);
  await ctx.close();
}
writeFileSync(resolve(OUT, 'events.json'), JSON.stringify(report, null, 2) + '\n');
await browser.close();
try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
console.log(JSON.stringify(report.runs.map((r) => ({ run: r.run, opened: r.opened, finished: r.finished, maxDown: r.maxDown, faults: r.faults.slice(0, 3), shots: r.shots.map((s) => `${s.label}@${s.cam}`), errors: r.errors.slice(0, 2), error: r.error })), null, 2));
