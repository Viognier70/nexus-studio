#!/usr/bin/env node
// ORDER 261 (steg 2A) — mätning: en gäst, en position.
//
// Kontroll: sim.guest.position (efter ORDER 261 satt från
// businessRoomRef via roomSpawnPoint/roomEntrance/roomWaitingSlot) och
// renderarens ritade position (window.__nxGuestPositions map cx/cz) ska
// vara samma punkt inom 0.3 m i 99 % av tick.
//
// Samlar också:
//   - INTERIOR-fallback-räknare (window.__nxRoomSourceCounters). Krav: 0.
//   - completedGuests, revenue, cost, result per pass för före/efter-
//     jämförelse mot ORDER 260 (baseline oförändrad).
//
// Ren mätning. Ingen ändring i sim eller renderare. Rådata skrivs bara
// när WRITE_REPORTS=1 (ORDER 240-mönstret).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPO_ROOT = resolve(FRONTEND, '..');
const REPORT_DIR = resolve(REPO_ROOT, 'frontend/reports/order261');
if (process.env.WRITE_REPORTS === '1') mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1280, height: 720 };
const DINNER_SEC = 15 * 60; // 900 sim-sekunder
const CLOCK_STOP_MS = 300_000;

async function startVite() {
  const url = 'http://localhost:5173';
  try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc: null, url }; } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc, url }; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

const vite = await startVite();
console.log(`Vite: ${vite.url}`);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT });
const page = await context.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

const bust = Date.now();
await page.goto(
  `${vite.url}/?bust=${bust}#playtest=1&seed=42&start=dinner15&business=kvarterskrogen`,
  { waitUntil: 'domcontentloaded' }
);
await page.waitForFunction(
  () => typeof window.__nxSimDispatch === 'function'
    && document.querySelector('canvas') !== null
    && window.__nxGuestPositions !== undefined,
  null, { timeout: 60000 }
);
await delay(1500);
try {
  await page.fill('input[type=text]', 'ORDER 261');
  await page.click('button[type=submit]');
  await delay(2000);
} catch {}

// Speed 8× för att bränna igenom 900 sim-sek på ~113 real-sek.
await page.evaluate(() => window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 }));

console.log('Väntar på simTime > 130 (första fyra)...');
const startSimTime = await page.evaluate(() => window.__nxSimState.simTime);
console.log(`  init simTime=${startSimTime.toFixed(1)}s`);

// Per-tick sampling. Vi håller loopen tills simTime uppnått start+DINNER_SEC.
// Sampel struktur: { simTime, diffs: [{ guestId, state, simX, simZ, rendX, rendZ, dist }] }
const samples = [];
const seenFireIds = new Set();
const deadline = Date.now() + CLOCK_STOP_MS;
let lastSampleSimTime = -1;

while (Date.now() < deadline) {
  const snap = await page.evaluate(() => {
    const st = window.__nxSimState;
    if (!st) return null;
    const rendMap = window.__nxGuestPositions ?? new Map();
    const diffs = [];
    for (const g of st.guests) {
      const rend = rendMap.get?.(g.id) ?? null;
      // Renderaren kanske inte hunnit skapa position för nyspawnad gäst
      // första framet. Räkna endast diff när båda existerar.
      if (!rend) continue;
      const dx = g.position.x - rend.cx;
      const dz = g.position.z - rend.cz;
      diffs.push({
        guestId: g.id,
        state: g.state,
        simX: g.position.x, simZ: g.position.z,
        rendX: rend.cx, rendZ: rend.cz,
        dist: Math.hypot(dx, dz)
      });
    }
    const pq = st.scenario?.pendingQuestion;
    return {
      simTime: st.simTime,
      period: st.day?.period,
      completedGuests: st.completedGuests ?? 0,
      revenue: st.revenue ?? 0,
      cost: st.cost ?? 0,
      revenueThisService: (st.revenue ?? 0) - (st.day?.revenueAtServiceStart ?? 0),
      costThisService: (st.cost ?? 0) - (st.day?.costAtServiceStart ?? 0),
      resultThisService: ((st.revenue ?? 0) - (st.day?.revenueAtServiceStart ?? 0))
        - ((st.cost ?? 0) - (st.day?.costAtServiceStart ?? 0)),
      guestCount: st.guests.length,
      pending: pq ? {
        id: pq.sourceBankId ?? null,
        anchorId: pq.anchorId ?? null,
        askerRole: pq.askerRole ?? null
      } : null,
      // ORDER 261 §DoD-hook — fallback-räknare
      sourceCounters: window.__nxRoomSourceCounters ?? null,
      diffs
    };
  });
  if (!snap) { await delay(50); continue; }

  // Sampla ~var 0.2 sim-sek (varje sim-tick vid 5 Hz).
  if (snap.simTime >= lastSampleSimTime + 0.2) {
    samples.push({
      simTime: snap.simTime,
      period: snap.period,
      completedGuests: snap.completedGuests,
      revenueThisService: snap.revenueThisService,
      costThisService: snap.costThisService,
      resultThisService: snap.resultThisService,
      guestCount: snap.guestCount,
      sourceCounters: snap.sourceCounters,
      diffs: snap.diffs
    });
    lastSampleSimTime = snap.simTime;
  }

  // Auto-svara anchor-frågor så pickern kan cyklera vidare.
  if (snap.pending && snap.pending.id && !seenFireIds.has(snap.pending.id)) {
    seenFireIds.add(snap.pending.id);
    await page.evaluate(() => {
      const s = window.__nxSimState;
      const idx = s.scenario.pendingQuestion.options.findIndex((o) => o.correct);
      window.__nxSimDispatch({ type: 'ANSWER_QUESTION', index: idx >= 0 ? idx : 0 });
    });
    await delay(150);
    await page.evaluate(() => window.__nxSimDispatch({ type: 'ACK_QUESTION_EXPLANATION' }));
  }

  if (snap.simTime - startSimTime >= DINNER_SEC) {
    console.log(`  ✓ nådde 900s sim-tid (${snap.simTime.toFixed(1)}s), stoppar.`);
    break;
  }
  await delay(30);
}

console.log(`\nSamlat ${samples.length} tick-samplar.`);

// ================= AGGREGERA =================

// 1. Diff-fördelning per tick (alla gäster).
const allDiffs = samples.flatMap((s) => s.diffs.map((d) => d.dist));
const totalGuestTicks = allDiffs.length;
const under_030 = allDiffs.filter((d) => d < 0.3).length;
const under_050 = allDiffs.filter((d) => d < 0.5).length;
const under_100 = allDiffs.filter((d) => d < 1.0).length;
const over_100 = allDiffs.filter((d) => d >= 1.0).length;
const sortedDiffs = [...allDiffs].sort((a, b) => a - b);
function pct(p) {
  if (sortedDiffs.length === 0) return null;
  const idx = Math.min(sortedDiffs.length - 1, Math.floor(sortedDiffs.length * p));
  return sortedDiffs[idx];
}
const p50 = pct(0.5);
const p90 = pct(0.9);
const p95 = pct(0.95);
const p99 = pct(0.99);
const pMax = sortedDiffs[sortedDiffs.length - 1] ?? null;

// 2. Fallback-räknare vid slutet av passet
const lastCounters = samples.length > 0 ? samples[samples.length - 1].sourceCounters : null;
const maxCounters = { entrance: 0, waitingSlot: 0, spawnPoint: 0, arrivalSlot: 0 };
for (const s of samples) {
  if (!s.sourceCounters) continue;
  for (const k of Object.keys(maxCounters)) {
    maxCounters[k] = Math.max(maxCounters[k], s.sourceCounters[k] ?? 0);
  }
}

// 3. Ekonomi vid pass-slut
const finalSample = samples[samples.length - 1] ?? {};

// 4. Per-state distribution av avvikelser (för att se om vissa states är sämre)
const perState = {};
for (const s of samples) {
  for (const d of s.diffs) {
    if (!perState[d.state]) perState[d.state] = { n: 0, sumDist: 0, maxDist: 0, over_030: 0 };
    const bucket = perState[d.state];
    bucket.n += 1;
    bucket.sumDist += d.dist;
    bucket.maxDist = Math.max(bucket.maxDist, d.dist);
    if (d.dist >= 0.3) bucket.over_030 += 1;
  }
}
for (const k of Object.keys(perState)) {
  const b = perState[k];
  b.meanDist = Math.round((b.sumDist / b.n) * 1000) / 1000;
  b.maxDist = Math.round(b.maxDist * 1000) / 1000;
  b.over_030_pct = Math.round(b.over_030 / b.n * 10000) / 100;
  delete b.sumDist;
}

const summary = {
  order: 'ORDER 261 (steg 2A)',
  seed: 42,
  business: 'kvarterskrogen',
  script: 'start=dinner15',
  totalTickSamples: samples.length,
  totalGuestTicks,
  diffMeters: {
    p50: p50 !== null ? Math.round(p50 * 1000) / 1000 : null,
    p90: p90 !== null ? Math.round(p90 * 1000) / 1000 : null,
    p95: p95 !== null ? Math.round(p95 * 1000) / 1000 : null,
    p99: p99 !== null ? Math.round(p99 * 1000) / 1000 : null,
    max: pMax !== null ? Math.round(pMax * 1000) / 1000 : null,
    under_030_ratio: totalGuestTicks > 0 ? Math.round(under_030 / totalGuestTicks * 10000) / 10000 : null,
    under_050_ratio: totalGuestTicks > 0 ? Math.round(under_050 / totalGuestTicks * 10000) / 10000 : null,
    under_100_ratio: totalGuestTicks > 0 ? Math.round(under_100 / totalGuestTicks * 10000) / 10000 : null,
    over_100_count: over_100
  },
  fallbackCounters: {
    finalObserved: lastCounters,
    maxObserved: maxCounters
  },
  passEconomics: {
    completedGuests: finalSample.completedGuests,
    revenueThisService: Math.round(finalSample.revenueThisService ?? 0),
    costThisService: Math.round(finalSample.costThisService ?? 0),
    resultThisService: Math.round(finalSample.resultThisService ?? 0)
  },
  perState,
  order260Baseline: {
    completedGuests: 49,
    revenue: 9770,
    cost: 2777,
    result: 6993,
    note: 'ORDER 260 rev.3, seed=42 kvarterskrogen dinner15 — via runHarness'
  }
};

// ================= UTSKRIFT =================
console.log('\n===== DIFF sim vs render (världs-XZ, meter) =====');
console.log(`  totala guest-tick: ${totalGuestTicks} (över ${samples.length} tick-sampel)`);
console.log(`  p50=${summary.diffMeters.p50}  p90=${summary.diffMeters.p90}  p95=${summary.diffMeters.p95}  p99=${summary.diffMeters.p99}  max=${summary.diffMeters.max}`);
console.log(`  < 0.3 m: ${(summary.diffMeters.under_030_ratio * 100).toFixed(2)}%  (DoD krav: ≥ 99%)`);
console.log(`  < 0.5 m: ${(summary.diffMeters.under_050_ratio * 100).toFixed(2)}%`);
console.log(`  < 1.0 m: ${(summary.diffMeters.under_100_ratio * 100).toFixed(2)}%`);
console.log(`  ≥ 1.0 m: ${summary.diffMeters.over_100_count} tick-diffs`);

console.log('\n===== INTERIOR-FALLBACK =====');
console.log(`  final: entrance=${lastCounters?.entrance ?? 'n/a'} waitingSlot=${lastCounters?.waitingSlot ?? 'n/a'} spawnPoint=${lastCounters?.spawnPoint ?? 'n/a'}`);
console.log(`  max:   entrance=${maxCounters.entrance} waitingSlot=${maxCounters.waitingSlot} spawnPoint=${maxCounters.spawnPoint}`);
console.log(`  DoD krav: alla 0 med monterad scen`);

console.log('\n===== PASS-EKONOMI =====');
console.log(`  completedGuests=${summary.passEconomics.completedGuests}  rev=${summary.passEconomics.revenueThisService} cost=${summary.passEconomics.costThisService} result=${summary.passEconomics.resultThisService} SEK`);
console.log(`  ORDER 260 baseline: guests=49 rev=9770 cost=2777 result=6993 (runHarness — Playwright kan avvika pga scenario/tid-plot)`);

console.log('\n===== PER STATE =====');
for (const [state, m] of Object.entries(perState)) {
  console.log(`  ${state.padEnd(10)}  n=${String(m.n).padStart(5)}  mean=${m.meanDist}m  max=${m.maxDist}m  ≥0.3m=${m.over_030_pct}%`);
}

// ================= WRITE (WRITE_REPORTS=1) =================
if (process.env.WRITE_REPORTS === '1') {
  writeFileSync(
    resolve(REPORT_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
  console.log(`\n📁 rapport skriven: ${REPORT_DIR}/summary.json`);
} else {
  console.log(`\n(rapport inte skriven — kör med WRITE_REPORTS=1 för att spara)`);
}

await browser.close();
if (vite.proc) vite.proc.kill('SIGTERM');
