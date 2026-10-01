// ORDER 292 — följden syns, i produktionsbygget på svenska, 1920 × 1080.
//
// Sparfilen måndag i vinbaren (reports/order284/save-mandag-vinbaren.json)
// flyttas till fredagen samma vecka (sim.day.dayNumber + 4), så att bilarna
// och bussen kommer. Morgonen: baspaketet. Kvällen:
//   - morgonen rullad: bild på att inget innehåll ligger under HUD:en;
//   - före öppning: bild på personalen (IDLE_RULE: ingen står still);
//   - raketerna: insatsen på kortet (incident-stake), första raketen rätt och
//     resten fel; beloppet i bandet (incident-band-amount) och händelsen över
//     bordet (room-reaction); kamerans avstånd under varje raket
//     (body.dataset.camDistance, CameraController.tsx);
//   - kön: vågornas avisering (wave-notice) och sällskapen (queue-party);
//     "Bord först" trycks för det sista sällskapet, och det noteras hur många
//     av de tidigare som lämnade kön innan det (bord eller gav upp);
//   - kvällskassan (till) före och efter ett rätt svar.
// Utdata: reports/<order>/scene.json och scene-*.png.
//
//   REPORT_ORDER=order292 [SKIP_BUILD=1] [PORT=4182] node scripts/order292-scene.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4182);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order292');
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
const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
save.sim.day.dayNumber += 4;
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(([k, v]) => {
  if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
}, ['nexus.v1.slot1', JSON.stringify(save)]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const report = { save: 'reports/order284/save-mandag-vinbaren.json, dag + 4 (fredag)', rockets: [], waves: [], queue: { maxParties: 0, chosen: null, goneBeforeChosen: null }, errors };
const t0 = Date.now();
const step = (n) => console.log(`${Math.round((Date.now() - t0) / 1000)}s ${n}`);
const attr = (sel, a) => page.getAttribute(sel, a).catch(() => null);
const cam = () => page.evaluate(() => Number(document.body.dataset.camDistance ?? NaN));

try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  report.weekday = await page.textContent('[data-testid=booking-book] .nx-mid').catch(() => null);
  await page.screenshot({ path: resolve(OUT, 'scene-00-morgonen.png') });
  // Morgonen rullad: inget innehåll under HUD:en (bandet i screens.css).
  await page.$eval('.nxs-morning', (e) => { e.scrollTop = 400; }).catch(() => {});
  await delay(400);
  report.morningScrolled = await page.$eval('.nxs-morning', (e) => e.scrollTop).catch(() => null);
  await page.screenshot({ path: resolve(OUT, 'scene-00b-morgonen-rullad.png') });
  await page.$eval('.nxs-morning', (e) => { e.scrollTop = 0; }).catch(() => {});
  await page.click('[data-testid=open-buy-foot]');
  await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
  await page.click('[data-testid=buy-base]').catch(() => {});
  await delay(800);
  await page.click('[data-testid=open-doors]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 15000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await delay(2500);
  await page.screenshot({ path: resolve(OUT, 'scene-01-fore-oppning.png') });
  step('servicen');
  let rocketN = 0;
  let lastRocket = null;
  let shotQueue = false;
  let chosenKey = null;
  let othersBefore = [];
  const until = Date.now() + 16 * 60000;
  while (Date.now() < until) {
    if (await page.$('[data-testid=waste-continue], [data-testid=screen-T2], [data-testid=screen-R1]')) break;
    // Vågorna och kön.
    const notice = await page.$('[data-testid=wave-notice]');
    if (notice) {
      const w = await notice.getAttribute('data-wave');
      if (!report.waves.find((x) => x.id === w)) {
        report.waves.push({ id: w, text: await notice.textContent(), atSec: Math.round((Date.now() - t0) / 1000) });
        await page.screenshot({ path: resolve(OUT, `scene-10-vagen-${w}.png`) });
      }
    }
    const parties = await page.$$eval('[data-testid=queue-party]', (els) => els.map((e) => ({ key: e.getAttribute('data-key'), size: Number(e.getAttribute('data-size')), impatient: e.getAttribute('data-impatient') === 'true' })));
    report.queue.maxParties = Math.max(report.queue.maxParties, parties.length);
    if (!shotQueue && parties.length >= 3) {
      shotQueue = true;
      await page.screenshot({ path: resolve(OUT, 'scene-11-kon.png') });
    }
    if (!chosenKey && parties.length >= 3) {
      chosenKey = parties[parties.length - 1].key;
      othersBefore = parties.slice(0, -1).map((p) => p.key);
      await page.click(`[data-testid="seat-first-${chosenKey}"]`).catch(() => {});
      report.queue.chosen = { key: chosenKey, parties: parties.length };
      await delay(400);
      await page.screenshot({ path: resolve(OUT, 'scene-12-bord-forst.png') });
    }
    // Hur många av de tidigare sällskapen som lämnade kön (fick bord eller gav
    // upp; sidan skiljer inte på dem) innan det valda gjorde det. Att det valda
    // får bord först prövas i simuleringen (order292Consequences.test.ts).
    if (chosenKey && report.queue.goneBeforeChosen === null) {
      const keys = parties.map((p) => p.key);
      if (!keys.includes(chosenKey)) report.queue.goneBeforeChosen = othersBefore.filter((k) => !keys.includes(k)).length;
    }
    // Raketerna.
    const card = await page.$('[data-testid=incident-card][data-mode=ask]');
    if (card && !(await page.$('[data-testid=incident-band]'))) {
      const id = await card.getAttribute('data-incident-id');
      const s = Number(await card.getAttribute('data-step'));
      const key = `${id}:${s}`;
      if (lastRocket !== key) {
        lastRocket = key;
        if (s === 0) rocketN += 1;
        await delay(1600);
        const stake = await page.textContent('[data-testid=incident-stake]').catch(() => null);
        const camAt = await cam();
        const tillBefore = Number(await attr('[data-testid=till]', 'data-value'));
        const want = rocketN === 1 ? 'best' : 'wrong';
        const o = rocketMeta.get(id)?.steps[s]?.options.find((x) => x.quality === want) ?? rocketMeta.get(id)?.steps[s]?.options[0];
        if (s === 0) await page.screenshot({ path: resolve(OUT, `scene-20-raket-${rocketN}-insatsen.png`) });
        await page.click(`[data-testid=incident-option-${o.id}]`).catch(() => {});
        await delay(700);
        const amount = await attr('[data-testid=incident-band-amount]', 'data-value');
        const reaction = await page.$eval('[data-testid=room-reaction]', (e) => ({ text: e.textContent, kind: e.getAttribute('data-kind'), visible: e.getBoundingClientRect().width > 0 })).catch(() => null);
        await page.screenshot({ path: resolve(OUT, `scene-21-raket-${rocketN}-steg-${s}-${want}.png`) });
        await delay(1800);
        const tillAfter = Number(await attr('[data-testid=till]', 'data-value'));
        report.rockets.push({ n: rocketN, id, step: s, answer: want, stake, camDistance: camAt, bandAmount: amount === null ? null : Number(amount), reaction, tillBefore, tillAfter });
      }
    }
    await delay(400);
  }
  step('stängt');
} catch (e) {
  report.error = String(e?.message ?? e);
  await page.screenshot({ path: resolve(OUT, 'scene-99-fel.png') }).catch(() => {});
} finally {
  writeFileSync(resolve(OUT, 'scene.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify({ waves: report.waves, queue: report.queue, rockets: report.rockets.map((r) => ({ n: r.n, step: r.step, answer: r.answer, stake: r.stake, cam: r.camDistance, amount: r.bandAmount, reaction: r.reaction?.text, till: [r.tillBefore, r.tillAfter] })), errors, error: report.error }, null, 2));
