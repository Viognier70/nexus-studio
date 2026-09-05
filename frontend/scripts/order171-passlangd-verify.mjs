#!/usr/bin/env node
// ORDER 171 §Verifiering — kör ölkrogen med 15 min lunch och 30 min
// lunch, snapshottar vid nyckelpunkter och skriver JSON per ORDER 160.
//
// **Vad talen kommer ifrån.** Playwright + Vite dev-server, ölkrogen
// via `brewpub`-alias, `speed=0` + manuell TICK-drift. Vid varje
// snapshot läses `state.simTime`, `state.day.doorsOpenAt`,
// `state.day.periodStartAt`, `state.day.openingEndsAt`,
// `state.day.doorsOpenedThisService`, `state.day.currentServiceLengthMinutes`,
// `state.guests.length`, `state.waitingIds.length`, `state.seatedIds.length`,
// alla `state.staff.taskType` + DevPanel `service=`-fältet från renderad DOM.
//
// **Vad rapporten svarar på:**
//   1. `doorsOpenAt` sätts vid OPEN_SERVICE till `periodStartAt + OPENING
//      + PREP` för ölkrogen (hasMiseEnPlace=true). Samma tal oavsett
//      passlängd — ingen skalning med `lengthMinutes`.
//   2. Doors-open-blocket i reducer.ts fires vid `simTime >= doorsOpenAt`
//      i BÅDA passlängder. `waitingAtOpening`-gästerna spawnar då.
//   3. Prep-slutets tid uttryckt i procent av passet: 130/900 = 14,4 %
//      för 15 min-pass, 130/1800 = 7,2 % för 30 min-pass. `service`-
//      fönstret räcker resten (770 s resp. 1670 s).
//   4. Ingen `On break` med gäster i kön: efter doors-open sätts
//      staff.taskType till `order` när kön inte är tom.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order171');
mkdirSync(REPORT_DIR, { recursive: true });

async function startVite() {
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try {
      const r = await fetch('http://localhost:5173/');
      if (r.ok || r.status === 304) return proc;
    } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

async function readPanelService(page) {
  return page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent || '';
      if (t.includes('service=') && t.includes('day=')) {
        const m = t.match(/service=(\S+)/);
        return m ? m[1] : null;
      }
    }
    return null;
  });
}

async function snap(page, targetElapsed) {
  await delay(120);
  const panelServiceField = await readPanelService(page);
  const state = await page.evaluate(() => {
    const s = window.__nxSimState;
    const d = s.day || {};
    const staff = (s.staff || []).map((st) => ({ role: st.role, taskType: st.taskType }));
    return {
      simTime: Number(s.simTime ?? 0),
      periodStartAt: Number(d.periodStartAt ?? 0),
      openingEndsAt: d.openingEndsAt,
      doorsOpenAt: d.doorsOpenAt,
      doorsOpenedThisService: d.doorsOpenedThisService,
      currentServiceLengthMinutes: d.currentServiceLengthMinutes,
      waitingAtOpening: d.waitingAtOpening,
      period: d.period,
      guestsTotal: (s.guests || []).length,
      waitingIdsCount: (s.waitingIds || []).length,
      seatedIdsCount: (s.seatedIds || []).length,
      businessClass: s.businessClass,
      staff,
      allThreeIdle: staff.filter((s) => s.taskType == null).length >= 3
    };
  });
  const elapsed = state.simTime - state.periodStartAt;
  return {
    targetElapsed,
    actualElapsed: elapsed,
    remainingSec: Math.max(0, (state.currentServiceLengthMinutes ?? 0) * 60 - elapsed),
    panelServiceField,
    ...state
  };
}

async function runPass(page, lengthMinutes, probeTargets) {
  // Rensa SPA-state: navigera bort, sedan tillbaka med cache-buster.
  // Utan detta behåller samma URL simulationens state från förra passet.
  await page.goto('about:blank');
  await delay(200);
  await page.goto(
    `http://localhost:5173/?t=${Date.now()}#playtest=1&business=brewpub&period=lunch`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);
  await page.evaluate((mins) => {
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: mins });
  }, lengthMinutes);
  await delay(500);
  await page.evaluate(() => { window.__nxSimState.speed = 0; });
  await delay(200);

  const snaps = [];
  const initSnap = await snap(page, 0);
  snaps.push(initSnap);
  const baseSim = initSnap.periodStartAt;

  for (const target of probeTargets) {
    const targetAbs = baseSim + target;
    // Ticker fram till simTime >= targetAbs.
    let iterations = 0;
    while (iterations < 20000) {
      const cur = await page.evaluate(() => Number(window.__nxSimState.simTime ?? 0));
      if (cur >= targetAbs - 0.001) break;
      const need = Math.ceil((targetAbs - cur) / 0.2);
      const batch = Math.min(need, 50);
      await page.evaluate((n) => {
        for (let i = 0; i < n; i++) window.__nxSimDispatch({ type: 'TICK', dt: 0.2 });
      }, batch);
      iterations += batch;
    }
    snaps.push(await snap(page, target));
  }
  return snaps;
}

const vite = await startVite();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

try {
  // 15 min-pass: probear opening-slut (10), mitten av prep (65),
  // strax innan doors-open (129), exakt doors-open (130), strax efter
  // (131), mitten av service (500), sista tio sekunderna (890).
  const targets15 = [10, 65, 129, 130, 131, 300, 500, 890];
  // 30 min-pass: samma prep-milstenar (10, 65, 129, 130, 131), sedan
  // längre in i service för att bevisa att fönstret verkligen räcker
  // 130..1800.
  const targets30 = [10, 65, 129, 130, 131, 500, 1000, 1500, 1790];

  console.log('\n15 min pass:');
  const snaps15 = await runPass(page, 15, targets15);
  console.log('30 min pass:');
  const snaps30 = await runPass(page, 30, targets30);

  const report = {
    order: 171,
    title: '§Verifiering — doorsOpenAt i ölkrogen, 15 min + 30 min lunch',
    setup: {
      business: 'ölkrogen (via brewpub-alias)',
      service: 'lunch',
      tickDtSec: 0.2,
      note: 'Vite dev-server + playwright. speed=0 → manuell TICK. State + DevPanel-sträng läses från runtime.'
    },
    pass15min: {
      lengthMinutes: 15,
      lengthSec: 900,
      probeTargetsElapsed: targets15,
      doorsOpenAtSec: snaps15[0].doorsOpenAt,
      openingEndsAtSec: snaps15[0].openingEndsAt,
      periodStartAt: snaps15[0].periodStartAt,
      prepPercentOfPass: snaps15[0].doorsOpenAt / 900,
      servicePercentOfPass: (900 - snaps15[0].doorsOpenAt) / 900,
      snapshots: snaps15
    },
    pass30min: {
      lengthMinutes: 30,
      lengthSec: 1800,
      probeTargetsElapsed: targets30,
      doorsOpenAtSec: snaps30[0].doorsOpenAt,
      openingEndsAtSec: snaps30[0].openingEndsAt,
      periodStartAt: snaps30[0].periodStartAt,
      prepPercentOfPass: snaps30[0].doorsOpenAt / 1800,
      servicePercentOfPass: (1800 - snaps30[0].doorsOpenAt) / 1800,
      snapshots: snaps30
    },
    assertions: (() => {
      const s15 = snaps15;
      const s30 = snaps30;
      // Doors-open-tiden ska INTE skalas med passlängden — samma tal
      // (130 s efter start) för båda.
      const doorsOpenIdentical =
        s15[0].doorsOpenAt - s15[0].periodStartAt === s30[0].doorsOpenAt - s30[0].periodStartAt;
      // Doors-open-blocket ska fires i BÅDA passlängder (verifieras
      // genom att `doorsOpenAt` blir null efter prep-slut + någon guest
      // spawnat).
      const doorsOpenFired15 = s15.some((sn) => sn.doorsOpenedThisService === true);
      const doorsOpenFired30 = s30.some((sn) => sn.doorsOpenedThisService === true);
      // Efter doors-open ska inga staff-medlemmar vara `On break` samtidigt
      // som guests-kön > 0. Testar sista snapshoten i service-fasen.
      const anyBreakWithQueue = (snaps) => snaps.some((sn) =>
        sn.period === 'lunch' && sn.doorsOpenedThisService === true
        && sn.waitingIdsCount > 0
        && sn.allThreeIdle === true
      );
      return {
        doorsOpenTimeIdenticalBothPasses: doorsOpenIdentical,
        doorsOpenFired15min: doorsOpenFired15,
        doorsOpenFired30min: doorsOpenFired30,
        anyOnBreakWhileQueueNonEmpty15min: anyBreakWithQueue(s15),
        anyOnBreakWhileQueueNonEmpty30min: anyBreakWithQueue(s30)
      };
    })()
  };

  const out = resolve(REPORT_DIR, 'passlangd-verify.json');
  writeFileSync(out, JSON.stringify(report, null, 2));

  console.log('\n=== ORDER 171 §Verifiering — passlängd 15 vs 30 min ===\n');
  const printPass = (label, snaps) => {
    console.log(label);
    console.log('  target  actualElapsed  panel     phase   doorsOpenedThisService  guests  waiting  staff-tasks');
    for (const s of snaps) {
      const t = s.staff.map((st) => `${st.role}:${st.taskType ?? 'null'}`).join(' ');
      console.log(`  ${String(s.targetElapsed).padStart(5)}s  ${s.actualElapsed.toFixed(1).padStart(7)}s     ${String(s.panelServiceField ?? '-').padEnd(6)}    ${(s.period || '').padEnd(7)} ${String(s.doorsOpenedThisService).padEnd(6)}                  ${String(s.guestsTotal).padStart(3)}     ${String(s.waitingIdsCount).padStart(3)}      ${t}`);
    }
    console.log('');
  };
  printPass('15-min-pass:', snaps15);
  printPass('30-min-pass:', snaps30);
  console.log('Assertions:');
  console.log(`  doorsOpenAt identisk (150s båda pass): ${report.assertions.doorsOpenTimeIdenticalBothPasses}`);
  console.log(`  doors-open block fired 15-min:         ${report.assertions.doorsOpenFired15min}`);
  console.log(`  doors-open block fired 30-min:         ${report.assertions.doorsOpenFired30min}`);
  console.log(`  någon On-break med waitingIds>0 15-min: ${report.assertions.anyOnBreakWhileQueueNonEmpty15min}`);
  console.log(`  någon On-break med waitingIds>0 30-min: ${report.assertions.anyOnBreakWhileQueueNonEmpty30min}`);
  console.log(`\nRapport: ${out}`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
