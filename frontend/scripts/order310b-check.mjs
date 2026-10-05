// ORDER 310b — låset och väntan före avgörandet, i spelarens flöde på
// produktionsbygget. Sparfilen måndag vecka 2 i vinbaren
// (reports/order284/save-mandag-vinbaren.json): baspaketet, dörrarna öppnas,
// och spelaren svarar på raketerna (alternativen i tur och ordning, eftersom
// det rätta svaret inte går att läsa ur sidan i produktion).
//
// Vad som mäts (allt ur sidan, ingen flagga, ingen dev-krok):
//   - i sidan loggar en rAF-slinga varje ändring av kortets data-mode och
//     data-locked och kolumnens data-phase, med performance.now(); trycket
//     loggas i capture-fasen (klick, tryck eller tangent 1–4);
//   - lockMs: från trycket till att kortet visar data-locked="wait" (låset
//     har slagit igen, motorns pending.lockLeft = 0);
//   - verdictMs: från trycket till att kortet lämnar läget ask (rätt: 'right'
//     eller 'done', fel: 'wrong'), alltså avgörandet;
//   - underWait: om något av svarets följd syntes före avgörandet: bandet
//     (incident-band), beloppet (incident-band-amount), rätt/fel i kortet
//     (data-look chosen/wrong/correct) eller mätarnas betoning (data-emph).
// Talen INCIDENTS.lockSeconds (0,9) och verdictSeconds (3,8) står i
// src/sim/balance.ts; scriptet kan inte importera TypeScript och jämför
// därför mot dem som de står där (LOCK_S, VERDICT_S nedan, replikerade).
// Motorn räknar väntan i verklig tid som dt / state.speed per tick
// (sim/incidents.ts countDown); en tick är 200 ms speltid och kommer i takt
// med rAF, så mätningen kan ligga upp till en tick (100 ms vid farten 2) och
// en bildruta efter.
//
// Tre körningar: 1440 × 900 med mus och tangentbord, 1280 × 720 med
// pekskärm (tap), och 1440 × 900 med reducerad rörelse.
// Utdata: reports/order310b/check.json och bilder per körning.
//
//   [SKIP_BUILD=1] node scripts/order310b-check.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const LOCK_S = 0.9;      // balance.ts INCIDENTS.lockSeconds (replikerat)
const VERDICT_S = 3.8;   // balance.ts INCIDENTS.verdictSeconds (replikerat)

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order310b');
mkdirSync(OUT, { recursive: true });
const PORT = 4184;
const URL = `http://localhost:${PORT}`;
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const SAVE = readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8');
const report = { expected: { lockMs: LOCK_S * 1000, verdictMs: VERDICT_S * 1000 }, runs: {} };

// I sidan: loggen över trycken och kortets lägen.
function installProbe() {
  const log = [];
  window.__o310b = log;
  const now = () => performance.now();
  const pressed = (id, how) => log.push({ t: now(), ev: 'press', id, how });
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-testid^=incident-option-]');
    if (b && !b.disabled) pressed(b.getAttribute('data-option-id'), 'click');
  }, true);
  window.addEventListener('keydown', (e) => {
    const card = document.querySelector('[data-testid=incident-card][data-mode=ask]:not([data-locked]):not([data-choosing])');
    if (card && ['1', '2', '3', '4'].includes(e.key)) {
      const b = card.querySelectorAll('[data-testid^=incident-option-]')[Number(e.key) - 1];
      if (b && !b.disabled) pressed(b.getAttribute('data-option-id'), 'key');
    }
  }, true);
  let last = '';
  const scan = () => {
    const card = document.querySelector('[data-testid=incident-card]');
    const col = document.querySelector('[data-testid=pyramid-moment]');
    const st = {
      mode: card?.getAttribute('data-mode') ?? null,
      locked: card?.getAttribute('data-locked') ?? null,
      phase: col?.getAttribute('data-phase') ?? null,
      reduced: col?.getAttribute('data-reduced') === 'true',
      band: !!document.querySelector('[data-testid=incident-band]'),
      amount: !!document.querySelector('[data-testid=incident-band-amount]'),
      verdictLook: !!document.querySelector('[data-testid=incident-card] [data-look=chosen], [data-testid=incident-card] [data-look=wrong], [data-testid=incident-card] [data-look=correct]'),
      emph: document.querySelector('[data-testid=service-meters]')?.getAttribute('data-emph') === 'true',
      lockedText: document.querySelector('[data-testid=incident-locked]')?.textContent ?? null,
      tokenShut: document.querySelector('[data-testid=stake-lock]')?.getAttribute('data-shut') === 'true'
    };
    const key = JSON.stringify(st);
    if (key !== last) { last = key; log.push({ t: now(), ev: 'state', ...st }); }
    requestAnimationFrame(scan);
  };
  requestAnimationFrame(scan);
}

// Ett tryck ur loggen: tiderna och vad som syntes under väntan.
function analyse(log, pressIndex) {
  const press = log[pressIndex];
  const after = log.slice(pressIndex + 1).filter((e) => e.ev === 'state');
  const rel = (e) => (e ? Math.round(e.t - press.t) : null);
  const lockEv = after.find((e) => e.locked === 'lock');
  const waitEv = after.find((e) => e.locked === 'wait');
  const verdictEv = after.find((e) => e.mode !== 'ask');
  const during = after.filter((e) => !verdictEv || e.t < verdictEv.t);
  // Lägena efter avgörandet (kortet kan stå tomt en bildruta innan det håller utfallet).
  const vi = verdictEv ? after.indexOf(verdictEv) : -1;
  const verdictSeq = vi >= 0 ? after.slice(vi, vi + 4).map((e) => ({ dt: Math.round(e.t - verdictEv.t), mode: e.mode, phase: e.phase })) : [];
  const settled = verdictSeq.find((e) => e.mode && e.mode !== 'ask') ?? verdictSeq[0];
  return {
    optionId: press.id, how: press.how,
    lockShownMs: rel(lockEv), lockMs: rel(waitEv), verdictMs: rel(verdictEv),
    verdict: settled ? (settled.mode ?? 'closed') : null,
    phaseAtVerdict: settled?.phase ?? null,
    verdictSeq,
    lockedText: (waitEv ?? lockEv)?.lockedText ?? null,
    lockShutInWait: waitEv ? waitEv.tokenShut : null,
    reduced: (waitEv ?? lockEv)?.reduced ?? null,
    underWait: {
      band: during.some((e) => e.band), amount: during.some((e) => e.amount),
      verdictLook: during.some((e) => e.verdictLook), meterEmphasis: during.some((e) => e.emph)
    }
  };
}

async function run(name, ctxOptions, how, wantPresses = 3) {
  const rep = { how, errors: [], presses: [], choiceAfterVerdict: null };
  report.runs[name] = rep;
  const ctx = await browser.newContext(ctxOptions);
  await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('o310b')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o310b', '1'); } }, ['nexus.v1.slot1', SAVE]);
  await ctx.addInitScript(installProbe);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => rep.errors.push(e.message));
  const shot = (n) => page.screenshot({ path: resolve(OUT, `${name}-${n}.png`) });
  const shots = new Set();
  try {
    await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
    await page.click('[data-testid=continue-saved]');
    await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
    await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
    await delay(1200);
    await page.click('[data-testid=open-buy-foot]');
    await page.waitForSelector('[data-testid=screen-M1]');
    await page.click('[data-testid=buy-base]').catch(() => {});
    await delay(600);
    await page.click('[data-testid=open-doors]');
    await delay(500);
    if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
    await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 8000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
    await page.keyboard.press('z');

    let clicks = 0;
    const until = Date.now() + 10 * 60000;
    // Minst wantPresses tryck, och fler (högst 12) tills ett rätt svar har gett valet.
    while (Date.now() < until && (rep.presses.length < wantPresses || (!rep.choiceAfterVerdict && rep.presses.length < 12))) {
      // Valet efter ett avgörande: bilden, och Gå vidare (2) så att nästa steg frågar.
      if (await page.$('[data-testid=incident-card][data-choosing=true]')) {
        if (!rep.choiceAfterVerdict) {
          rep.choiceAfterVerdict = await page.evaluate(() => ({ phase: document.querySelector('[data-testid=pyramid-moment]')?.getAttribute('data-phase'), countdown: document.querySelector('[data-testid=stake-countdown]')?.getAttribute('data-value') }));
          await shot('valet-efter-avgorandet');
        }
        await page.keyboard.press('2');
        await delay(300);
        continue;
      }
      const opts = await page.$$('[data-testid=incident-card][data-mode=ask]:not([data-locked]) [data-testid^=incident-option-]:not([disabled])');
      if (!opts.length) {
        const back = await page.$('[data-testid=back-start]:not([disabled])');
        if (back) await back.click().catch(() => {});
        await delay(250);
        continue;
      }
      const before = await page.evaluate(() => window.__o310b.length);
      const i = clicks++ % opts.length;
      // Mus, tangent eller pekskärm, efter körningen; tangenten varannan gång med mus.
      if (how === 'touch') await opts[i].tap().catch(() => {});
      else if (how === 'mouse+keys' && clicks % 2 === 0) await page.keyboard.press(String(i + 1));
      else await opts[i].click().catch(() => {});
      // Låset och väntan: bilder efter 300 ms och 2 s, sedan avgörandet.
      await delay(300);
      if (!shots.has('laset') && await page.$('[data-testid=incident-card][data-locked=lock]')) { shots.add('laset'); await shot('laset'); }
      await delay(1700);
      if (!shots.has('vantan') && await page.$('[data-testid=incident-card][data-locked=wait]')) { shots.add('vantan'); await shot('vantan'); }
      await page.waitForFunction(() => !document.querySelector('[data-testid=incident-card][data-locked]'), null, { timeout: 15000 }).catch(() => {});
      await delay(900);
      const log = await page.evaluate(() => window.__o310b);
      const idx = log.findIndex((e, k) => k >= before && e.ev === 'press');
      if (idx < 0) continue;
      const a = analyse(log, idx);
      rep.presses.push(a);
      const v = a.verdict === 'wrong' ? 'fel' : a.verdict === 'right' || a.verdict === 'done' ? 'ratt' : null;
      if (v && !shots.has(v)) { shots.add(v); await shot(`avgorandet-${v}`); }
    }
  } catch (e) {
    rep.errors.push(String(e));
    await shot('fel').catch(() => {});
  }
  await ctx.close();
}

await run('1440x900', { viewport: { width: 1440, height: 900 } }, 'mouse+keys', 4);
await run('1280x720-touch', { viewport: { width: 1280, height: 720 }, hasTouch: true }, 'touch', 2);
await run('1440x900-reduced', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }, 'mouse+keys', 2);

// Sammanfattning ur trycken: tiderna och om något syntes före avgörandet.
const all = Object.values(report.runs).flatMap((r) => r.presses);
const done = all.filter((p) => p.verdictMs !== null);
report.summary = {
  presses: all.length,
  withVerdict: done.length,
  lockMs: done.length ? [Math.min(...done.map((p) => p.lockMs ?? Infinity)), Math.max(...done.map((p) => p.lockMs ?? -Infinity))] : null,
  verdictMs: done.length ? [Math.min(...done.map((p) => p.verdictMs)), Math.max(...done.map((p) => p.verdictMs))] : null,
  shownBeforeVerdict: all.filter((p) => p.underWait.band || p.underWait.amount || p.underWait.verdictLook || p.underWait.meterEmphasis).length,
  verdicts: done.reduce((m, p) => ({ ...m, [p.verdict]: (m[p.verdict] ?? 0) + 1 }), {}),
  errors: Object.values(report.runs).flatMap((r) => r.errors)
};
writeFileSync(resolve(OUT, 'check.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary, null, 2));
await browser.close();
try { process.kill(-proc.pid); } catch { /* redan stängd */ }
process.exit(0);
