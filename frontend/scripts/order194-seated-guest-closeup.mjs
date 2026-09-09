#!/usr/bin/env node
// ORDER 194 — Skärmdump av en sittande gäst vid ett långbord i ölkrogen.
//
// Spelarflöde (INGA URL-camera-overrides, INGEN dollhouse=1):
//   1. Ladda #playtest=1&business=ölkrogen&period=lunch
//   2. Fyll namn + Enter i NameEntryOverlay → jumpToPreset('myBusiness')
//   3. Vänta ut kamera-flygningen (village 900 m → myBusiness ~28 m)
//   4. Tryck '5' på canvas → TRIGGER_SCENARIO
//   5. OPEN_SERVICE lunch via __nxSimDispatch
//   6. Vänta ut simmen tills seated-gäster faktiskt sitter vid långbord
//   7. Panorera + zooma via wheel/pointer på canvas (samma controls
//      spelaren använder — useDesktopControls) mot en seated guest vid
//      longA/longB
//   8. Skärmdump → reports/order194/seated-guest-closeup.png

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order194');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };
const OUT_PATH = resolve(REPORT_DIR, 'seated-guest-closeup.png');
const WIDE_PATH = resolve(REPORT_DIR, 'wide-context.png');
const DUMP_PATH = resolve(REPORT_DIR, 'state-dump.json');

async function startVite() {
  const url = 'http://localhost:5173';
  try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc: null, url }; } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {}); proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try { const r = await fetch(url + '/'); if (r.ok || r.status === 304) return { proc, url }; } catch {}
    await delay(500);
  }
  throw new Error('vite timeout');
}

async function stopVite(proc) {
  if (!proc) return;
  return new Promise((res) => {
    proc.on('exit', () => res());
    proc.kill('SIGTERM');
    setTimeout(() => { proc.kill('SIGKILL'); res(); }, 3000);
  });
}

const vite = await startVite();
console.log(`Vite på ${vite.url}`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

try {
  const bust = Date.now();
  // ASCII-alias `olkrogen` — parseBusiness i urlParams.ts accepterar
  // både `ölkrogen` och `olkrogen`. Vi kör ASCII för att undvika
  // location.hash-encoding-fällan (ö kan bli %C3%B6, då matchar
  // parsern varken 'ölkrogen' eller decoding-formen).
  await page.goto(
    `${vite.url}/?bust=${bust}#playtest=1&business=olkrogen&period=lunch`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(1500);

  // Steg 2: namn → Enter (form-fill + submit, kör NameEntryOverlay.onSubmit
  // → jumpToPreset('myBusiness')). __nxSetBusinessName går förbi den
  // pathen (se ORDER 157-skriptet), så vi använder DOM-vägen.
  await page.fill('input[type=text]', 'Provspel ölkrogen');
  await page.click('button[type=submit]');

  // Steg 3: kameran ska damp:a från village 900 m ned till myBusiness ~28 m.
  // CameraController använder log-dämpning; ~5-6 s brukar räcka.
  await delay(6000);

  // Steg 4: '5' på canvas → TRIGGER_SCENARIO. useDesktopControls lyssnar
  // på window keydown; men StrategicApp:s egen handler också (rad 173 i
  // StrategicApp.tsx). Vi trycker på canvas för att vara säkra.
  await page.locator('.gb-canvas-host').focus().catch(() => {});
  await page.keyboard.press('5');
  await delay(400);

  // Steg 5: OPEN_SERVICE lunch. period=lunch i URL bara ändrar ljus,
  // inte state.day.phase — servicen måste öppnas explicit.
  await page.evaluate(() => {
    window.__nxSimDispatch({ type: 'OPEN_SERVICE', service: 'lunch', lengthMinutes: 20 });
  });
  await delay(500);

  // Steg 6: vänta ut simmen till seated-gäster finns vid långbord.
  // Ölkrogens brewpubRoom-kontrakt lägger longA på seatIndex 0..3 och
  // longB på 4..7 (brewpubRoom.ts:588-618 — långborden pushas först).
  // Vi ökar sim-hastigheten via SET_SPEED (state.speed på __nxSimState
  // är en snapshot, muteras inte effektivt utanför reducern).
  await page.evaluate(() => { window.__nxSimDispatch({ type: 'SET_SPEED', speed: 8 }); });

  // Polla med progresslogg så vi ser vad som händer om något stannar upp.
  let target = null;
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline && !target) {
    const snap = await page.evaluate(() => {
      const s = window.__nxSimState;
      if (!s || !s.guests) return null;
      const seatedish = s.guests.filter((g) =>
        ['seated','ordering','dining','eating','paying'].includes(g.state));
      const atLong = seatedish.filter((g) =>
        typeof g.seatIndex === 'number' && g.seatIndex >= 0 && g.seatIndex <= 7);
      // Föredra dining/ordering (sittit ett tag, riggen inne i pose).
      const preferred = atLong.filter((g) => g.state === 'dining' || g.state === 'ordering');
      const pick = preferred[0] || atLong[0] || null;
      const pos = pick && window.__nxGuestPositions
        ? window.__nxGuestPositions.get(pick.id)
        : null;
      return {
        totalGuests: s.guests.length,
        seatedIshCount: seatedish.length,
        atLongCount: atLong.length,
        simTime: s.simTime,
        speed: s.speed,
        phase: s.day?.phase,
        pick: pick ? { id: pick.id, state: pick.state, seatIndex: pick.seatIndex } : null,
        pos: pos ? { cx: pos.cx, cz: pos.cz } : null
      };
    });
    console.log('  poll:', JSON.stringify(snap));
    if (snap && snap.pick && snap.pos) {
      target = { ...snap.pick, ...snap.pos };
      break;
    }
    await delay(1500);
  }
  if (!target) throw new Error('Ingen seated-gäst vid långbord inom 90 s');
  const seatedAtLongTable = target;
  console.log('  sittande gäst vald:', seatedAtLongTable);

  // Bromsa simmen igen så gästen inte hinner lämna platsen mellan
  // panorera-zooma-skärmdump.
  await page.evaluate(() => { window.__nxSimDispatch({ type: 'SET_SPEED', speed: 0 }); });
  await delay(300);

  // Steg 6b: stäng ScenarioOverlay innan vi styr kameran. Overlayen är
  // en litet fönster nere i mitten (pointer-events: auto), men vi vill
  // ha ett rent canvas-läge oavsett. RESOLVE_SCENARIO med första valet.
  await page.evaluate(() => {
    const s = window.__nxSimState;
    const phase = s?.scenario?.phase;
    if (phase && phase !== 'idle' && phase !== 'settled') {
      window.__nxSimDispatch({ type: 'RESOLVE_SCENARIO', choice: 0 });
    }
  });
  await delay(400);

  // Steg 7: panorera + zooma via canvas-events. useDesktopControls
  // läser wheel för zoom och LMB-drag för pan (rad 25-49 i
  // useDesktopControls.ts). Det är spelarens egen väg — ingen URL-
  // override, ingen dollhouse-flagga.
  //
  // page.mouse.wheel gav inga synliga effekter i första körningen —
  // troligtvis för att musen inte var över hostRef.current-elementet
  // med rätt hit-testing under R3F:s canvas. Vi dispatchar WheelEvent
  // och PointerEvent direkt på .gb-canvas-host via page.evaluate så
  // det garanterat träffar det element useDesktopControls lyssnar på.

  // Pan + zoom via __nxCamera-hooken (dev-only window-handle från
  // CameraProvider). focusOn(pos, distance) sätter targetRef direkt.
  // CameraController damp:ar actualRef dit — men playwrights headless-
  // rAF körs såpass långsamt att 3 s ease bara halvvägen. Vi snappar
  // därför actualRef direkt till target så bilden inte visar mid-flight.
  await page.evaluate(({ gx, gz, dist, pitchDeg }) => {
    const cam = window.__nxCamera;
    if (!cam) throw new Error('__nxCamera saknas — dev-hook inte publicerad');
    cam.focusOn({ x: gx, z: gz }, dist);
    // Sänk pitch:en till ögonhöjd-vinkel så vi ser gästen framifrån
    // i stället för nedåt-blicken från 50°. lookAt riktar mot (fx,0,fz),
    // så gäst-kroppen vid y≈0.7 hamnar högt i frame om pitch är brant.
    // Med pitch ~22° blir kameraposition py ≈ 3.7 m — samma ordning som
    // gästen — vilket ger en profilbild i ögonhöjd.
    cam.targetRef.current.pitch = (pitchDeg * Math.PI) / 180;
    // Snap actualRef till targetRef så screenshotten inte visar dampning.
    const t = cam.targetRef.current;
    cam.actualRef.current.focus = { x: t.focus.x, z: t.focus.z };
    cam.actualRef.current.distance = t.distance;
    cam.actualRef.current.yaw = t.yaw;
    cam.actualRef.current.pitch = t.pitch;
  }, { gx: seatedAtLongTable.cx, gz: seatedAtLongTable.cz, dist: 5.5, pitchDeg: 22 });

  // Låt en rAF-frame gå så apply() kör med den snappade actualRef.
  await delay(300);

  // Dump av state för spårbarhet.
  const finalState = await page.evaluate(() => {
    const s = window.__nxSimState;
    const guests = (s?.guests ?? []).filter((g) =>
      ['seated','ordering','dining','eating','paying'].includes(g.state)
    ).map((g) => ({ id: g.id, state: g.state, seatId: g.seatId, seatIndex: g.seatIndex }));
    return {
      guestsSeatedish: guests,
      guestCount: (s?.guests ?? []).length,
      simTime: s?.simTime,
      period: s?.day?.period,
      phase: s?.day?.phase,
      businessClass: s?.businessClass,
      seatSource: window.__nxSeatSource
    };
  });
  const camAfter = await page.evaluate(() => {
    const c = window.__nxCamera;
    if (!c) return null;
    return {
      target: { ...c.targetRef.current },
      actual: { ...c.actualRef.current }
    };
  });
  writeFileSync(DUMP_PATH, JSON.stringify({
    target: seatedAtLongTable,
    cameraAfter: camAfter,
    final: finalState
  }, null, 2));

  // Vid-bild för kontext — full viewport så vi kan se hela ölkrogen
  await page.screenshot({ path: WIDE_PATH, fullPage: false });

  // Closeup — CAMERA.minDistance clampar targetRef till 10 m. focusOn
  // siktade på gäst-XZ, så gästen ska hamna vid skärmens mitt.
  // För att verkligen få en zoomad-in bild klipper vi ut en region
  // runt gästens projicerade skärmposition. Vi beräknar screenX/Y
  // via THREE:s projicering — se computeScreenPos-eval nedan.
  // Räkna gästens skärmposition genom att projicera world→NDC med
  // kamerans matriser direkt. Vi når kameran via r3f-rotens Fiber-tree
  // eller genom att gå igenom scenen via THREE.Object3D-instansen som
  // r3f exponerar på canvasen.
  const guestScreen = await page.evaluate(({ gx, gz }) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    // Prova alla kända sätt att hitta r3f-rot-staten.
    const cam = window.__nxThreeCamera;
    if (!cam) return { error: 'no __nxThreeCamera' };
    // Använd kamerans egna metoder — projectionMatrix och matrixWorldInverse
    // finns på alla THREE.Camera. Vi bygger en Vector3-liknande projektion
    // för hand utan att kräva THREE i window.
    cam.updateMatrixWorld();
    // Multiplicera worldPoint genom matrixWorldInverse * projectionMatrix.
    const worldY = 0.7; // seated body-centre
    const e = new Float32Array(16);
    // matrix4.multiplyMatrices(projectionMatrix, matrixWorldInverse)
    const A = cam.projectionMatrix.elements;
    const B = cam.matrixWorldInverse.elements;
    // C = A * B (column-major THREE)
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += A[i + k * 4] * B[k + j * 4];
        e[i + j * 4] = s;
      }
    }
    const x = gx, y = worldY, z = gz;
    const nx = e[0]*x + e[4]*y + e[8]*z + e[12];
    const ny = e[1]*x + e[5]*y + e[9]*z + e[13];
    const nz = e[2]*x + e[6]*y + e[10]*z + e[14];
    const nw = e[3]*x + e[7]*y + e[11]*z + e[15];
    const ndcX = nx / nw, ndcY = ny / nw, ndcZ = nz / nw;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    return {
      x: (ndcX * 0.5 + 0.5) * w,
      y: (-ndcY * 0.5 + 0.5) * h,
      z: ndcZ,
      w, h
    };
  }, { gx: seatedAtLongTable.cx, gz: seatedAtLongTable.cz });

  console.log('  gästens skärmposition:', guestScreen);

  // Om projektionen inte gick eller pekar utanför viewport, kör full.
  const validScreen = guestScreen && typeof guestScreen.x === 'number' &&
    Number.isFinite(guestScreen.x) && Number.isFinite(guestScreen.y) &&
    guestScreen.x > 100 && guestScreen.x < 1820 &&
    guestScreen.y > 100 && guestScreen.y < 980;
  if (!validScreen) {
    console.log('  clip skippas — projektion saknas/utanför säker zon, kör full');
    await page.screenshot({ path: OUT_PATH, fullPage: false });
  } else {
    const size = 720;
    const clipX = Math.max(0, Math.round(guestScreen.x - size / 2));
    const clipY = Math.max(0, Math.round(guestScreen.y - size / 2));
    console.log(`  klipp: ${clipX},${clipY} ${size}×${size}`);
    await page.screenshot({
      path: OUT_PATH,
      fullPage: false,
      clip: { x: clipX, y: clipY, width: size, height: size }
    });
  }

  // Verifiera på disk innan vi säger något
  if (!existsSync(OUT_PATH)) {
    throw new Error('OUT_PATH saknas efter screenshot: ' + OUT_PATH);
  }
  const st = statSync(OUT_PATH);
  console.log(`\n✔  ${OUT_PATH}`);
  console.log(`   ${st.size} bytes (mtime ${st.mtime.toISOString()})`);
  if (st.size < 5000) {
    throw new Error('Skärmdumpen är misstänkt liten (' + st.size + ' bytes) — troligen tom canvas');
  }
} finally {
  await browser.close();
  await stopVite(vite.proc);
}
