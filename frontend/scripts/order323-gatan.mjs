// ORDER 323 §6 (Anders 2026-10-09: "människor i byn går med gångrörelse (inte glidande) och stannar ibland.
// Bilar kör längs vägarna, saktar in i korsningar och stannar vid övergångsställen. Inget står stilla och glider").
//
// Spelarens flöde i vite-dev-servern (räknarna finns bara där): provspelet i vinbaren (?prov), på svenska,
// kvällen öppnad. Spelaren trycker C (Kvarteret). Under SAMPLE_S sekunder läses var 500:e ms:
//   - window.__nxTraffic (OsmTraffic.tsx): bilarna, hur många som står vid ett övergångsställe (waiting) och
//     hur många som saktar in före en korsning, ett övergångsställe eller vägens ände (slowed);
//   - window.__nxPeds (OsmPedestrians.tsx): de gående, hur många som står still (standing) och går (walking).
// Bilderna: Kvarteret (C), Gatan (X), tre bilder nära (16 m) vid krogen, och tre bilder i följd nära (8 m) av en
// gående på gatan på CLOSE_M (window.__nxPeds.walkingAt), så att benen syns i olika lägen. Utdata: reports/order323/gatan/gatan.json och *.png.
//
//   node scripts/order323-gatan.mjs

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const OUT = resolve(FRONTEND, 'reports', 'order323', 'gatan');
mkdirSync(OUT, { recursive: true });
const PORT = Number(process.env.PORT ?? 4199);
const URL = `http://localhost:${PORT}`;
const SAMPLE_S = Number(process.env.SAMPLE_S ?? 60);
// Närbilden av en gående: närmare låser kameran fokus till rummet (roomBounds), 22 m är gatans nivå.
const CLOSE_M = Number(process.env.CLOSE_M ?? 22);

const proc = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', detached: true });
for (let i = 0; i < 120; i++) { try { const r = await fetch(URL); if (r.ok) break; } catch { /* väntar */ } await delay(500); }
const { chromium } = await import('playwright');
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const result = { server: 'dev', sampleS: SAMPLE_S, samples: [], summary: null, errors: [] };
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('nexus.lang', 'sv'); } catch { /* ingen lagring */ } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => result.errors.push(`pageerror: ${e.message}`));
  await p.goto(`${URL}/?prov`);
  await p.waitForSelector('[data-testid=prov-start]', { timeout: 120000 });
  await p.click('[data-testid=prov-place-vinbar]');
  await p.click('[data-testid=prov-begin]');
  await p.waitForSelector('[data-testid=prov-badge]', { state: 'attached', timeout: 120000 });
  await delay(3000);
  const vidare = p.getByRole('button', { name: 'Vidare' });
  for (let i = 0; i < 5 && (await vidare.count()) > 0; i++) { await vidare.first().click(); await delay(400); }
  if (await p.$('[data-testid=open-buy-foot]')) { await p.click('[data-testid=open-buy-foot]'); await p.waitForSelector('[data-testid=screen-M1]', { timeout: 8000 }).catch(() => {}); await p.click('[data-testid=buy-base]').catch(() => {}); await delay(600); }
  await p.click('[data-testid=open-doors]').catch(() => {});
  await delay(500);
  if (await p.$('[data-testid=open-short-open]')) await p.click('[data-testid=open-short-open]');
  await p.waitForSelector('[data-testid=mentor-close-service]', { timeout: 8000 }).then(() => p.click('[data-testid=mentor-close-service]')).catch(() => {});
  await p.keyboard.press('c');
  await delay(6000);
  await p.screenshot({ path: resolve(OUT, 'kvarteret.png') });
  for (let i = 0; i < SAMPLE_S * 2; i++) {
    const s = await p.evaluate(() => ({ t: performance.now(), traffic: window.__nxTraffic ?? null, peds: window.__nxPeds ?? null }));
    result.samples.push(s);
    await delay(500);
  }
  await p.keyboard.press('x');
  await delay(6000);
  await p.screenshot({ path: resolve(OUT, 'gatan.png') });
  // Nära, vid krogen: kvällens sällskap och byns gående.
  await p.evaluate(() => { const c = window.__nxCamera; const f = c.actualRef.current.focus; c.focusOn({ x: f.x, z: f.z }, 16); c.targetRef.current.pitch = 0.5; });
  await delay(5000);
  for (let i = 0; i < 3; i++) { await p.screenshot({ path: resolve(OUT, `nara-${i + 1}.png`) }); await delay(250); }
  // En gående på gatan, nära (CLOSE_M), i tre bilder 250 ms isär: benen i olika lägen.
  const at = await p.evaluate(() => window.__nxPeds?.walkingAt?.[0] ?? null);
  result.walkerShot = at;
  if (at) {
    await p.evaluate(([x, z, d]) => { const c = window.__nxCamera; c.focusOn({ x, z }, d); c.targetRef.current.pitch = 0.42; }, [at[0], at[1], CLOSE_M]);
    await delay(3500);
    for (let i = 0; i < 3; i++) { await p.screenshot({ path: resolve(OUT, `gaende-${i + 1}.png`) }); await delay(250); }
  }
  await ctx.close();
} catch (e) {
  result.errors.push(`FEL ${e.message}`);
} finally {
  await browser.close();
  try { process.kill(-proc.pid); } catch { /* redan stängd */ }
}
const tr = result.samples.map((s) => s.traffic).filter(Boolean);
const pe = result.samples.map((s) => s.peds).filter(Boolean);
const mean = (a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null);
result.summary = {
  samples: result.samples.length,
  vehicles: tr[0]?.total ?? null,
  waitingAtCrossingMax: tr.length ? Math.max(...tr.map((x) => x.waiting)) : null,
  waitingAtCrossingMean: mean(tr.map((x) => x.waiting)),
  samplesWithWaiting: tr.filter((x) => x.waiting > 0).length,
  slowedMean: mean(tr.map((x) => x.slowed)),
  walkers: pe[0]?.total ?? null,
  standingMean: mean(pe.map((x) => x.standing)),
  standingMin: pe.length ? Math.min(...pe.map((x) => x.standing)) : null,
  standingMax: pe.length ? Math.max(...pe.map((x) => x.standing)) : null
};
writeFileSync(resolve(OUT, SAMPLE_S >= 60 ? 'gatan.json' : 'gatan-bilder.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.summary, null, 1), result.errors);
