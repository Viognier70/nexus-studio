// ORDER 312 — ligger något i spelet på vägen? Rapporten och bilderna.
//
// 1. Mätningen: kör testet src/strategic/__tests__/order312PaVagen.test.ts med
//    ORDER312_OUT satt. Testet skriver då scene/onRoadAudit.ts auditOnRoad()
//    till reports/order312/<fil>. Mätningen läser samma källor som
//    renderingen (vägytan ur content/roadSurface.ts, bredden ur roadRoles.ts
//    ROLE_SPECS); scriptet räknar inget själv. Testets utfall (grönt/rött)
//    skrivs bredvid, men scriptet fortsätter även när testet faller (före
//    rättningen ska det falla).
// 2. Bilderna: produktionsbygget (vite build + vite preview), sparfilen måndag
//    i vinbaren flyttad till torsdag (grillvagnen på torget, tacovagnen vid
//    Måltidens hus), på svenska. Gatans nivå (tangenten X), sedan inzoomning
//    med hjulet till omkring 45 m (80 m nära vår krog, där kameran annars
//    hålls i rummet) och panorering med musen (spelarens egna
//    kontroller, ingen flagga) tills kamerans mål (body.dataset.camFocus) står
//    på konflikten. En röd ring i bildens mitt markerar punkten; texten under
//    säger vad och var. Kvällen startas som i spelarens flöde (baspaketet,
//    dörrarna öppnas) så att byn syns i stället för dagens skärm.
//
// Platserna: konflikterna i PHASE-filen, samlade inom 12 m. Med PHASE=efter
// fotograferas också platserna ur conflicts-fore.json, så att före och efter
// kan jämföras.
//
//   PHASE=fore|efter [SKIP_BUILD=1] [SKIP_AUDIT=1] [SKIP_SHOTS=1] [START_AT=n] [ONLY=n,m] [PORT=4312] node scripts/order312-on-road.mjs
//
// Utdata: reports/order312/conflicts.json (PHASE=efter) eller
// conflicts-fore.json (PHASE=fore), shots-<phase>.json och <phase>-NN-*.png.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order312');
mkdirSync(OUT, { recursive: true });
const PHASE = process.env.PHASE === 'fore' ? 'fore' : 'efter';
const AUDIT = resolve(OUT, PHASE === 'fore' ? 'conflicts-fore.json' : 'conflicts.json');
const PORT = Number(process.env.PORT ?? 4312);
const URL = `http://localhost:${PORT}`;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd, args, env = {}) => new Promise((res) => {
  const p = spawn(cmd, args, { cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } });
  let out = '';
  p.stdout.on('data', (d) => { out += d; });
  p.stderr.on('data', (d) => { out += d; });
  p.on('exit', (code) => res({ code, out }));
});

// ---------- 1. Mätningen ----------
// SKIP_AUDIT=1: mätningen i AUDIT finns redan (bara bilderna tas om).
if (process.env.SKIP_AUDIT !== '1') {
  const t0 = Date.now();
  const test = await run('npx', ['vitest', 'run', 'src/strategic/__tests__/order312PaVagen.test.ts'], { ORDER312_OUT: AUDIT });
  const a = JSON.parse(readFileSync(AUDIT, 'utf8'));
  a.phase = PHASE;
  a.test = { file: 'src/strategic/__tests__/order312PaVagen.test.ts', exitCode: test.code, summary: (test.out.match(/Tests\s+[^\n]+/) ?? [''])[0].trim(), seconds: Math.round((Date.now() - t0) / 100) / 10 };
  writeFileSync(AUDIT, JSON.stringify(a, null, 2) + '\n');
}
const audit = JSON.parse(readFileSync(AUDIT, 'utf8'));
console.log(PHASE, audit.counts, audit.test);
if (process.env.SKIP_SHOTS === '1') process.exit(0);

// ---------- 2. Platserna ----------
function places(report) {
  // En bild per plats: konflikterna samlade inom 12 m. Trafikens prov på 1 m
  // vid en vägbits slut tas med i JSON men inte som egen bild.
  const out = [];
  for (const c of report.conflicts) {
    if (c.kind === 'car-off-car-road' && (c.lengthM ?? 0) < 2 && c.subject.startsWith('trafik:')) continue;
    const near = out.find((p) => Math.hypot(p.at[0] - c.at[0], p.at[1] - c.at[1]) < 12);
    if (near) { if (!near.kinds.includes(c.kind)) near.kinds.push(c.kind); near.subjects.push(c.subject); continue; }
    out.push({ at: c.at, kinds: [c.kind], subjects: [c.subject] });
  }
  return out.slice(0, 30);
}
let targets = places(audit).map((p) => ({ ...p, from: PHASE }));
const forePath = resolve(OUT, 'conflicts-fore.json');
if (PHASE === 'efter' && existsSync(forePath)) {
  const fore = JSON.parse(readFileSync(forePath, 'utf8'));
  const old = places(fore).map((p) => ({ ...p, from: 'fore' }));
  targets = [...old, ...targets.filter((t) => !old.some((o) => Math.hypot(o.at[0] - t.at[0], o.at[1] - t.at[1]) < 12))];
}

// ---------- 3. Bilderna i produktionsbygget ----------
if (process.env.SKIP_BUILD !== '1') {
  const b = await run('npm', ['run', 'build']);
  if (b.code !== 0) { console.error(b.out.slice(-3000)); process.exit(1); }
}
const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 240; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const save = JSON.parse(readFileSync(resolve(FRONTEND, 'reports/order284/save-mandag-vinbaren.json'), 'utf8'));
save.sim.day.dayNumber += 3;
const W = 1440;
const H = 900;
const shots = { phase: PHASE, viewport: `${W}x${H}`, save: 'reports/order284/save-mandag-vinbaren.json (+3 dagar, torsdag)', errors: [], shots: [] };
// Kvällen går fram också på 1× och spelaren kan inte pausa. När klockan
// passerat 22.15 (eller kvällen är slut) startas kvällen om i ett nytt fönster
// och nästa plats fotograferas där.
let ctx = null;
let page = null;
async function startEvening() {
  if (ctx) await ctx.close().catch(() => {});
  ctx = await browser.newContext({ viewport: { width: W, height: H } });
  await ctx.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('o312')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('o312', '1'); }
  }, ['nexus.v1.slot1', JSON.stringify(save)]);
  page = await ctx.newPage();
  page.on('pageerror', (e) => shots.errors.push(e.message));
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 180000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 120000 });
  await delay(1500);
  // Dagens skärm täcker byn. Som i spelarens flöde: baspaketet, öppna dörrarna
  // (kvällen börjar och byn syns), hastigheten 1×.
  await page.click('[data-testid=open-buy-foot]');
  await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
  await page.click('[data-testid=buy-base]').catch(() => {});
  await delay(800);
  await page.click('[data-testid=open-doors]');
  await delay(500);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 15000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  await page.locator('[data-testid=speed-toggle] button').nth(0).click().catch(() => {});
  await delay(1500);
  await page.keyboard.press('x');
  await delay(3500);
  J = null;
}
async function lateEvening() {
  const t = await page.$eval('[data-testid=service-clock-time]', (el) => el.textContent).catch(() => null);
  if (!t) return true;
  const [h, m] = t.split('.').map(Number);
  return h * 60 + m >= 22 * 60 + 15;
}
const cam = () => page.evaluate(() => {
  const d = document.body.dataset;
  const [x, z] = (d.camFocus ?? '0,0').split(',').map(Number);
  return { x, z, distance: Number(d.camDistance ?? 0), target: Number(d.camTarget ?? 0) };
});
async function settle() {
  let last = null;
  for (let i = 0; i < 30; i++) {
    await delay(250);
    const c = await cam();
    if (last && Math.hypot(c.x - last.x, c.z - last.z) < 0.05 && c.distance === c.target) return c;
    last = c;
  }
  return cam();
}
async function drag(dx, dy) {
  const cx = W / 2;
  const cy = H / 2 + 60;
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'left' });
  const n = 8;
  for (let i = 1; i <= n; i++) await page.mouse.move(cx + (dx * i) / n, cy + (dy * i) / n);
  await page.mouse.up({ button: 'left' });
}
async function zoomTo(dist) {
  for (let i = 0; i < 40; i++) {
    const c = await settle();
    if (Math.abs(c.distance - dist) < 6) return c;
    await page.mouse.move(W / 2, H / 2 + 60);
    await page.mouse.wheel(0, c.distance > dist ? -120 : 120);
  }
  return settle();
}
// Jacobianen (meter per pixel) skattas med två drag och används för att
// räkna nästa drag; några varv tills målet står inom 1,5 m.
// Skattas en gång per kväll på 90 m; panoreringen skalar med avståndet
// (CameraContext pan: distance × 0,0015), så J × avståndet / 90 gäller på 45 m.
let J = null;
async function panTo(x, z) {
  let c = await settle();
  if (!J) {
    await drag(120, 0);
    const a = await settle();
    await drag(0, 120);
    const b = await settle();
    const k = 90 / Math.max(1, c.distance);
    J = [[k * (a.x - c.x) / 120, k * (b.x - a.x) / 120], [k * (a.z - c.z) / 120, k * (b.z - a.z) / 120]];
    c = b;
  }
  const s = c.distance / 90;
  const Jd = [[J[0][0] * s, J[0][1] * s], [J[1][0] * s, J[1][1] * s]];
  const det = Jd[0][0] * Jd[1][1] - Jd[0][1] * Jd[1][0];
  for (let i = 0; i < 14 && Math.abs(det) > 1e-9; i++) {
    const ex = x - c.x;
    const ez = z - c.z;
    if (Math.hypot(ex, ez) < 1.5) break;
    let px = (Jd[1][1] * ex - Jd[0][1] * ez) / det;
    let py = (-Jd[1][0] * ex + Jd[0][0] * ez) / det;
    const m = Math.max(Math.abs(px), Math.abs(py));
    if (m > 380) { px *= 380 / m; py *= 380 / m; }
    await drag(px, py);
    c = await settle();
  }
  return c;
}
try {
  await startEvening();
  // START_AT=n: platserna före n är redan fotograferade (shots-<phase>.json
  // läses in och fylls på).
  // ONLY=6,24: bara de platserna tas om (övriga rader i shots-<phase>.json står kvar).
  const START = Number(process.env.START_AT ?? 1);
  const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean).map(Number);
  if ((START > 1 || ONLY.length) && existsSync(resolve(OUT, `shots-${PHASE}.json`))) {
    shots.shots = JSON.parse(readFileSync(resolve(OUT, `shots-${PHASE}.json`), 'utf8')).shots
      .filter((x) => { const k = Number(x.file.split('-')[1]); return ONLY.length ? !ONLY.includes(k) : k < START; });
  }
  let n = 0;
  for (const t of targets) {
    n++;
    if (n < START || (ONLY.length && !ONLY.includes(n))) continue;
    // Inom 75 m (camera/roomBounds.ts ROOM_CAMERA.belowM) och nära krogen
    // håller kameran fokus i rummet; där tas bilden på 80 m.
    const nearRoom = Math.hypot(t.at[0] - 31.6, t.at[1] + 16.7) < 50;
    const shotDist = nearRoom ? 80 : 45;
    // Raketkort besvaras med första svaret och hyrpersonalen avböjs, så att
    // inget ögonblick tar kameran. Tar något ändå kameran tillbaka till krogen
    // mitt i panoreringen görs den om (högst fyra gånger).
    async function calm() {
      for (let i = 0; i < 40; i++) {
        const opt = await page.$('[data-testid=incident-card][data-mode=ask] [data-testid^=incident-option-]');
        if (opt) await opt.click().catch(() => {});
        const agency = await page.$('[data-testid=agency-offer] button:last-of-type');
        if (agency) await agency.click().catch(() => {});
        const busy = await page.evaluate(() => !!document.querySelector('[data-testid=incident-card]') || (document.body.dataset.moment ?? '') !== '');
        if (!busy) break;
        await delay(300);
      }
    }
    // Nära krogen vrider vänsterdraget kameran och fokus hålls i rummet
    // (camera/roomBounds.ts atRoom), så panoreringen görs på gatans höjd
    // (90 m), sedan zoomas in till 45 m och målet rättas.
    let c = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (await lateEvening()) await startEvening();
      await calm();
      await zoomTo(90);
      await panTo(t.at[0], t.at[1]);
      await zoomTo(shotDist);
      c = await panTo(t.at[0], t.at[1]);
      if (Math.hypot(c.x - t.at[0], c.z - t.at[1]) < 3) break;
    }
    await delay(800);
    const label = `${t.from === 'fore' ? 'före-platsen' : 'konflikt'} ${t.kinds.join(', ')} · (${t.at[0]}, ${t.at[1]}) m · ${t.subjects.slice(0, 3).join(', ')}${t.subjects.length > 3 ? ' …' : ''}`;
    await page.evaluate((txt) => {
      document.getElementById('o312-mark')?.remove();
      const d = document.createElement('div');
      d.id = 'o312-mark';
      d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999';
      d.innerHTML = `<div style="position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border:3px solid #e02020;border-radius:50%"></div>` +
        `<div style="position:absolute;left:12px;bottom:12px;max-width:80%;background:rgba(0,0,0,.72);color:#fff;font:13px/1.35 sans-serif;padding:6px 9px;border-radius:4px">${txt}</div>`;
      document.body.appendChild(d);
    }, label);
    const file = `${PHASE}-${String(n).padStart(2, '0')}-${t.kinds[0]}.png`;
    await page.screenshot({ path: resolve(OUT, file) });
    await page.evaluate(() => document.getElementById('o312-mark')?.remove());
    shots.shots.push({ file, target: t.at, kinds: t.kinds, subjects: t.subjects, from: t.from, camFocus: [c.x, c.z], camDistance: c.distance, focusErrorM: Math.round(Math.hypot(c.x - t.at[0], c.z - t.at[1]) * 10) / 10 });
    console.log(file, shots.shots[shots.shots.length - 1].focusErrorM, 'm');
    shots.shots.sort((a, b) => a.file.localeCompare(b.file));
    writeFileSync(resolve(OUT, `shots-${PHASE}.json`), JSON.stringify(shots, null, 2) + '\n');
  }
} catch (e) {
  shots.error = String(e?.message ?? e);
  await page.screenshot({ path: resolve(OUT, `${PHASE}-fel.png`) }).catch(() => {});
} finally {
  writeFileSync(resolve(OUT, `shots-${PHASE}.json`), JSON.stringify(shots, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
