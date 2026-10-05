// ORDER 310 — Designs kvitt eller dubbelt i spelarens flöde, produktionsbygget.
// Sparfilen måndag vecka 2 i vinbaren (reports/order284/save-mandag-vinbaren.json):
// baspaketet, dörrarna öppnas, och under kvällen svarar spelaren på raketerna
// (alternativen i tur och ordning, eftersom det rätta svaret inte går att läsa
// ur sidan i produktion) och startar egna raketer när det går.
//
// Vad som läses (allt ur sidan, ingen flagga):
//   - kolumnen (data-testid pyramid-moment) och dess läge data-phase:
//     right / choosing / done / wrong / stopped;
//   - raden: stake-step, stake-pot (etikett och värde), stake-if-right;
//   - valet: incident-kvitt-stop / -go med undertexterna, ringen
//     stake-countdown (data-value) och stake-note;
//   - pyramidens våningar i kolumnen: data-slot och data-axis;
//   - överlapp: kolumnens delar (pyramiden, raden, valet) mot raketkortet
//     (.nx-rocket) och HUD:en (.nx-hud-stack, .nx-hud-tools, .nx-hud-money).
// Potten i krediter: talen kommer från simuleringen (sim/incidents.ts growPot)
// och står som de visas; scriptet räknar dem inte själv.
// Utdata: reports/order310/check.json och bilder per storlek.
//
//   [SKIP_BUILD=1] node scripts/order310-check.mjs
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order310');
mkdirSync(OUT, { recursive: true });
const PORT = 4183;
const URL = `http://localhost:${PORT}`;
if (process.env.SKIP_BUILD !== '1') {
  await new Promise((res, rej) => { const b = spawn('npm', ['run', 'build'], { cwd: FRONTEND, stdio: 'ignore' }); b.on('exit', (c) => (c === 0 ? res() : rej(new Error(`build ${c}`)))); });
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const SAVE = readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8');
const report = { sizes: {} };

async function readStake(page) {
  return page.evaluate(() => {
    const q = (id) => document.querySelector(`[data-testid="${id}"]`);
    const col = q('pyramid-moment');
    if (!col) return null;
    const txt = (id) => q(id)?.textContent?.trim() ?? null;
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
    const floors = [...col.querySelectorAll('.nx-pyr-floor')].map((g) => ({ slot: g.getAttribute('data-slot'), axis: g.getAttribute('data-axis'), state: g.getAttribute('data-state') }));
    const parts = { stakePyramid: rect(col.querySelector('.nx-pyr-svg')), stakeRow: rect(col.querySelector('.nx-stake-row')), stakeChoice: rect(col.querySelector('.nx-stake-choice')) };
    const others = {};
    const card = document.querySelector('.nx-rocket');
    if (card) others.rocketCard = rect(card);
    for (const sel of ['.nx-hud-stack', '.nx-hud-tools', '.nx-hud-money']) { const el = document.querySelector(sel); if (el && el.getBoundingClientRect().width > 0) others[sel] = rect(el); }
    const hit = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const overlaps = [];
    const names = Object.keys(parts);
    for (const [n, r] of Object.entries(parts)) {
      for (const [m, o] of Object.entries(others)) if (hit(r, o)) overlaps.push(`${n}×${m}`);
      for (const m of names) if (m > n && hit(r, parts[m])) overlaps.push(`${n}×${m}`);
    }
    return {
      phase: col.getAttribute('data-phase'), step: col.getAttribute('data-step'), axis: col.getAttribute('data-axis'),
      row: { step: txt('stake-step'), pot: txt('stake-pot'), potValue: q('stake-pot')?.getAttribute('data-value') ?? null, ifRight: q('stake-if-right')?.getAttribute('data-value') ?? null },
      choice: q('incident-kvitt') ? { stop: txt('incident-kvitt-stop'), stopSub: txt('incident-kvitt-stop-sub'), go: txt('incident-kvitt-go'), goSub: txt('incident-kvitt-go-sub'), countdown: q('stake-countdown')?.getAttribute('data-value') ?? null, last: q('stake-countdown')?.getAttribute('data-last') === 'true', note: txt('stake-note') } : null,
      cardOptions: document.querySelectorAll('[data-testid=incident-card] [data-testid^=incident-option-]').length,
      floors, parts, others, overlaps
    };
  });
}

async function run(width, height, full, attempt = 0) {
  const tag = `${width}x${height}`;
  const rep = { attempt, errors: [], seen: [] };
  report.sizes[tag] = rep;
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(([k, v]) => { if (!sessionStorage.getItem('o310')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o310', '1'); } }, ['nexus.v1.slot1', SAVE]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => rep.errors.push(e.message));
  const shot = (n) => page.screenshot({ path: resolve(OUT, `${tag}-${n}.png`) });
  // Varje försök börjar på ett annat alternativ, så att ett rätt svar kommer.
  let clicks = attempt;
  let backs = 0;
  const shots = new Set();
  // Spelar tills `done(stake)` säger stopp. Svarar och startar egna raketer
  // med spelarens egna knappar; varje nytt läge i kolumnen läses och tas en bild av.
  async function play(ms, done) {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const st = await readStake(page);
      if (st) {
        const key = `${st.phase}@${st.step}`;
        if (!rep.seen.some((x) => `${x.phase}@${x.step}` === key)) rep.seen.push(st);
        if (!shots.has(st.phase) && (st.phase !== 'choosing' || full)) {
          shots.add(st.phase);
          await delay(st.phase === 'right' || st.phase === 'done' ? 900 : 300);
          await shot(`kvitt-${st.phase}`);
        }
        if (await done(st)) return st;
      }
      if (!st || st.phase !== 'choosing') {
        const opts = await page.$$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]:not([disabled])');
        if (opts.length) await opts[(clicks++) % opts.length].click().catch(() => {});
        else if (await page.$('[data-testid=back-start]:not([disabled])')) { await page.click('[data-testid=back-start]').catch(() => {}); backs++; }
      }
      await delay(200);
    }
    return null;
  }
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

    // 1. Första valet: bilden av valet, och raden.
    const first = await play(5 * 60000, (st) => st.phase === 'choosing');
    rep.firstChoice = first;
    if (first) {
      await shot('kvitt-valet');
      if (!full) { await page.keyboard.press('1'); await delay(400); await shot('kvitt-stannade'); }
    }
    if (full && first) {
      // 2. Gå vidare med tangenten 2 tills ett val efter steg 2 kommer (eller raketen slutar).
      await page.keyboard.press('2');
      rep.wentOn = true;
      const second = await play(8 * 60000, async (st) => {
        if (st.phase === 'choosing' && st.step === '0') { await page.keyboard.press('2'); return false; }
        return st.phase === 'choosing' && st.step === '1';
      });
      rep.secondChoice = second;
      if (second) {
        await shot('kvitt-valet-steg-2');
        // De sista sekunderna: ringen pulserar.
        for (let i = 0; i < 60; i++) { const s = await readStake(page); if (s?.choice?.last) { rep.lastSeconds = s.choice; break; } await delay(100); }
        await shot('kvitt-sista-sekunderna');
        await page.click('[data-testid=incident-kvitt-stop]');
        await delay(350);
        rep.stopped = await readStake(page);
        await shot('kvitt-stannade');
      }
      // 3. Ett fel (efter att ha gått vidare, om det går): kolumnen vid fel.
      if (!shots.has('wrong')) {
        rep.wrongSearch = await play(6 * 60000, async (st) => {
          if (st.phase === 'choosing') { await page.keyboard.press('2'); return false; }
          return st.phase === 'wrong';
        });
      }
    }
    rep.clicks = clicks;
    rep.backsStarted = backs;
  } catch (e) {
    rep.errors.push(String(e));
    await shot('fel').catch(() => {});
  }
  await ctx.close();
  return !!rep.firstChoice;
}

// Kvällen ger några raketer; kommer inget rätt svar provas ett nytt försök från sparfilen.
for (let a = 0; a < 4 && !(await run(1440, 900, true, a)); a++);
for (let a = 0; a < 4 && !(await run(1280, 720, false, a)); a++);
writeFileSync(resolve(OUT, 'check.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, (k, v) => (k === 'parts' || k === 'others' ? undefined : v), 2));
await browser.close();
try { process.kill(-proc.pid); } catch { /* redan stängd */ }
process.exit(0);
