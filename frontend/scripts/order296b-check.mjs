// ORDER 296/296b — kärnan i produktionsbygget, i spelarens flöde (sparfilen
// måndag i vinbaren, fredag med SAVE_DAY_OFFSET=4, på svenska):
//   - morgonen: förberedelsen (buy-prep: behov, hinns, eftersläp) och den
//     extra handen (prep-hand);
//   - servicen: bandet i byn (rival-band: plats, krogar), ryktet i HUD:en
//     (hud-reputation), hovmästarens nålar (host-pin-*; kortet öppnas, svaret
//     med tangenten 1, guldpillen host-pin-done), Sälj in vid ett bord
//     (host-table → host-upsell-wine), och Flytta personal (klick på en ring →
//     host-move-bar);
//   - kvällen: överföringen, resultatet, berättelsen, byn i kväll (screen-J1)
//     och butiken (screen-shop: krediter, köp av en öppen sten, facket).
// ORDER 296c: raketräkningen (rocket-count) och satsningarnas knapp (back-why).
// Raketerna besvaras rätt. Utdata: reports/<order>/check.json och check-*.png.
//
// Avvikelse mot spelarens flöde: sparfilen är skriven före ORDER 296 (kassan
// och medaljerna som den står där), och dagen flyttas till fredag.
//
//   REPORT_ORDER=order296b [SKIP_BUILD=1] [PORT=4192] node scripts/order296b-check.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const PORT = Number(process.env.PORT ?? 4192);
const URL = `http://localhost:${PORT}`;
const OUT = resolve(FRONTEND, 'reports', process.env.REPORT_ORDER ?? 'order296b');
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
// Krediter till butiken (sparfilen har för få för att köpa en sten).
save.sim.knowledgeCredits = { episteme: 60, techne: 40, phronesis: 30 };
save.sim.knowledgeTracks = { episteme: { untagged: 60, sommellerie: 0, kok: 0 }, techne: { untagged: 40, sommellerie: 0, kok: 0 }, phronesis: { untagged: 30, sommellerie: 0, kok: 0 } };
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(([k, v]) => {
  if (!sessionStorage.getItem('n-seeded')) { localStorage.setItem(k, v); localStorage.setItem('nexus.lang', 'sv'); sessionStorage.setItem('n-seeded', '1'); }
}, ['nexus.v1.slot1', JSON.stringify(save)]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const report = { errors, pins: { seen: {}, answered: 0, done: null } };
const shot = (name) => page.screenshot({ path: resolve(OUT, `check-${name}.png`) });
const attr = (sel, a) => page.getAttribute(sel, a).catch(() => null);
try {
  await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid=start-screen]', { timeout: 120000 });
  await page.click('[data-testid=continue-saved]');
  await page.waitForSelector('[data-testid=load-slot-1]', { timeout: 30000 }).then(() => page.click('[data-testid=load-slot-1]')).catch(() => {});
  await page.waitForSelector('[data-testid=day-action-bar]', { timeout: 60000 });
  await delay(1500);
  // Morgonen: inköpet, förberedelsen och den extra handen.
  await page.click('[data-testid=open-buy-foot]');
  await page.waitForSelector('[data-testid=screen-M1]', { timeout: 20000 });
  await page.click('[data-testid=buy-base]').catch(() => {});
  await delay(800);
  report.prep = { need: await attr('[data-testid=buy-prep]', 'data-need'), capacity: await attr('[data-testid=buy-prep]', 'data-capacity'), backlog: await attr('[data-testid=buy-prep]', 'data-backlog') };
  await shot('morgon-forberedelsen');
  if (await page.$('[data-testid=prep-hand]')) { await page.click('[data-testid=prep-hand]'); await delay(500); }
  report.prep.handHired = !!(await page.$('[data-testid=prep-hand-hired]'));
  report.prep.capacityAfter = await attr('[data-testid=buy-prep]', 'data-capacity');
  await page.click('[data-testid=open-doors]');
  await delay(500);
  if (await page.$('[data-testid=open-short-open]')) await page.click('[data-testid=open-short-open]');
  await page.waitForSelector('[data-testid=mentor-close-service]', { timeout: 15000 }).then(() => page.click('[data-testid=mentor-close-service]')).catch(() => {});
  const until = Date.now() + 10 * 60000;
  let shotPin = false, shotCard = false, upsold = false, moved = false;
  while (Date.now() < until) {
    if (await page.$('[data-testid=waste-continue], [data-testid=screen-T2], [data-testid=transfer-do]')) break;
    const card = await page.$('[data-testid=incident-card]');
    // ORDER 296c — raketräkningen ("Raket n i kväll"), läst innan raketen besvaras,
    // och knappen för satsningarna när dörrarna har öppnat.
    const rc = await page.$('[data-testid=rocket-count]');
    if (rc) { const txt = await rc.textContent(); (report.rocketCounts ??= []); if (!report.rocketCounts.includes(txt)) report.rocketCounts.push(txt); }
    if (card) { const id = await card.getAttribute('data-incident-id'); (report.rocketIds ??= []); if (!report.rocketIds.some((r) => r.id === id)) report.rocketIds.push({ id, at: await page.textContent('[data-testid=service-clock-time]').catch(() => null) }); }
    const clk = await page.textContent('[data-testid=service-clock-time]').catch(() => null);
    if (!report.backWhy && clk && clk >= '19.30') report.backWhy = await page.textContent('[data-testid=back-why]').catch(() => null);
    if (card && !(await page.$('[data-testid=incident-band]'))) {
      const o = bestOf(await card.getAttribute('data-incident-id'), Number(await card.getAttribute('data-step')));
      if (o) await page.click(`[data-testid=incident-option-${o}]`).catch(() => {});
      await delay(400);
      continue;
    }
    if (!report.band && await page.$('[data-testid=rival-band]')) {
      report.band = { rank: await attr('[data-testid=rival-band]', 'data-rank'), venues: await attr('[data-testid=rival-band]', 'data-venues'), rankText: await page.textContent('[data-testid=rival-rank]').catch(() => null), reputation: await attr('[data-testid=hud-reputation]', 'data-rep') };
    }
    // Nålarna: öppna den första och svara med tangenten 1.
    const pins = await page.$$('[data-testid^=host-pin-]:not([data-testid=host-pin-card]):not([data-testid=host-pin-done]):not([data-testid^=host-pin-answer])');
    for (const p of pins) { const k = (await p.getAttribute('data-testid'))?.replace('host-pin-', ''); if (k) report.pins.seen[k] = (report.pins.seen[k] ?? 0) + 0; }
    if (pins.length > 0) {
      if (!shotPin) { shotPin = true; await shot('servicen-nalarna'); }
      const head = await pins[0].$('.nx-pin-head');
      const kind = (await pins[0].getAttribute('data-testid'))?.replace('host-pin-', '');
      if (head) {
        await head.click().catch(() => {});
        await delay(250);
        if (await page.$('[data-testid=host-pin-card]')) {
          if (!shotCard) { shotCard = true; await shot('en-nal-oppnas'); }
          await page.keyboard.press('1');
          report.pins.answered++;
          if (kind) report.pins.seen[kind] = (report.pins.seen[kind] ?? 0) + 1;
          await delay(300);
          const d = await page.$('[data-testid=host-pin-done]');
          if (d && !report.pins.done) report.pins.done = await d.textContent();
        }
      }
    }
    // Sälj in vid ett bord.
    if (!upsold && await page.$('[data-testid=host-table]')) {
      await page.click('[data-testid=host-table]').catch(() => {});
      await delay(250);
      if (await page.$('[data-testid=host-upsell-wine]')) { await shot('bjuda-salja-in'); await page.click('[data-testid=host-upsell-wine]'); upsold = true; report.upsell = true; }
    }
    // Flytta personal: muspekaren över rummet tills en ring hittas, klick, Till baren.
    if (!moved && report.pins.answered >= 2) {
      moved = true;
      for (let y = 300; y <= 900 && !report.move; y += 50) {
        for (let x = 500; x <= 1500 && !report.move; x += 50) {
          await page.mouse.move(x, y);
          await delay(50);
          if (await page.$('[data-testid=ring-tag]')) {
            await page.mouse.click(x, y);
            await delay(250);
            if (await page.$('[data-testid=host-move-bar]')) { await shot('flytta-personal'); await page.click('[data-testid=host-move-bar]'); report.move = { at: [x, y] }; }
          }
        }
      }
    }
    await delay(400);
  }
  report.clockAtEnd = await page.textContent('[data-testid=service-clock-time]').catch(() => null);
  // Kvällen: sopbilen, överföringen, resultatet, lärdomen/berättelsen, byn i kväll och butiken.
  for (let k = 0; k < 30; k++) {
    if (await page.$('[data-testid=screen-shop]')) break;
    for (const id of ['waste-continue', 'transfer-do', 'transfer-continue', 'result-continue', 'end-evening']) {
      const el = await page.$(`[data-testid=${id}]`);
      if (el) { await el.click().catch(() => {}); await delay(900); }
    }
    if (await page.$('[data-testid=screen-J1]')) {
      report.compare = { rows: (await page.$$('[data-testid=compare-row]')).length, rank: await attr('[data-testid=compare-place]', 'data-rank') };
      await shot('byn-i-kvall');
      await page.click('[data-testid=compare-continue]');
      await delay(900);
    }
    await delay(500);
  }
  if (await page.$('[data-testid=screen-shop]')) {
    report.shop = { credits: await attr('[data-testid=screen-shop]', 'data-credits'), slotsBefore: await attr('[data-testid=shop-slot]', 'data-used') };
    await shot('butiken');
    const open = await page.$('[data-testid^=shop-stone-][data-state=open]');
    if (open) {
      report.shop.bought = (await open.getAttribute('data-testid'))?.replace('shop-stone-', '');
      report.shop.stoneBox = await open.evaluate((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), display: cs.display, visibility: cs.visibility, opacity: cs.opacity }; });
      await open.click({ timeout: 10000 });
      await delay(300);
      await page.click('[data-testid=shop-action]');
      await delay(500);
      report.shop.stateAfter = await attr(`[data-testid=shop-stone-${report.shop.bought}]`, 'data-state');
      report.shop.slotsAfter = await attr('[data-testid=shop-slot]', 'data-used');
      report.shop.creditsAfter = await attr('[data-testid=screen-shop]', 'data-credits');
      await shot('butiken-kopt');
    }
    const locked = await page.$('[data-testid^=shop-stone-][data-state=locked]');
    if (locked) { await locked.click(); await delay(300); await shot('butiken-last-sten'); }
    await page.click('[data-testid=shop-done]');
    await delay(1500);
    report.afterShop = !!(await page.$('[data-testid=day-action-bar]'));
  }
} catch (e) {
  report.error = String(e?.message ?? e);
  await shot('99-fel').catch(() => {});
} finally {
  writeFileSync(resolve(OUT, 'check.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  try { process.kill(-proc.pid, 'SIGTERM'); } catch { proc.kill('SIGTERM'); }
}
console.log(JSON.stringify(report, null, 2));
