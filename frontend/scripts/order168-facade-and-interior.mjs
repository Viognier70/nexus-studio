#!/usr/bin/env node
// ORDER 168 §DoD 2 — verifiera att både fasaden syns OCH interiören
// (gäster + personal) syns samtidigt vid myBusiness-preset (dist 24 m).
//
// VO-krav 2026-09-01: skalet får inte skymma interiören vid den vy där
// man spelar. Om båda inte går samtidigt är det ett fynd — rapportera
// med skärmdumpar innan val.
//
// Skriptet:
//   1. Startar Vite med myBusiness-preset.
//   2. Sätter business-namn via `__nxSetBusinessName` så NameEntryOverlay
//      avmonteras (annars täcker overlayen canvas).
//   3. Väntar in `__nxProjectToScreen` + `__nxReadCanvasPixel` från
//      WallSurfaceAuditProbe.
//   4. Väntar 6 s så simulation har hunnit spawn:a gäster in i lokalen.
//   5. Läser `__nxGuestPositions` (Map<id, {cx, cz}>) från
//      InteriorGuests.tsx:250.
//   6. Projicerar (a) player-centre vid ground-Y till skärm för fasad-
//      pixel; (b) första inne-gästen (hjärthöjd 1.0 m) till skärm för
//      interior-pixel.
//   7. Läser båda pixlarna, jämför mot förväntade färger.
//   8. Bedömer `facadeVisible` och `interiorVisible`, skriver JSON.
//   9. Skärmdump vid samma pose för öga-verifiering.
//
// Färg-jämförelse:
//   Wall Falu-red `#7c2e24` ≈ R124 G46 B36. En pixel som ligger nära den
//   färgen räknas som väggpixel. Wall gäller för sockeln också
//   (`#8a8478` ≈ R138 G132 B120) — vi fångar fasad så länge något av
//   dessa värden ligger nära pixel-provet, inte terräng/skugga.
//   Terräng vid ground-Y ligger typiskt mörkt (R30-60) — precis vad
//   ORDER 162:s reports/order162/wallSurfaceAudit.json visade före
//   fixen. Så FASAD-close om R > 80 (Falu-red dominant kanal) ELLER
//   R ≈ G ≈ B > 100 (sockelns grå).
//
//   Guest-material är restaurang-guest-puck, färger enligt Vision Owner
//   författade i `InteriorGuests.tsx` (puck-materialens color = per-guest
//   hash, spektrum burgundy-navy-forest). En pixel som varken är väggens
//   Falu-red NOR floor's `#a08462` ≈ R160 G132 B98 räknas som guest-hit.
//   Egentligen räcker det med: pixel är INTE Falu-röd. Om vi ser
//   `#7c2e24` där guesten borde vara — då blockerar väggen.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order168');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };

// Falu-red wall color (`WALL_COLOUR = '#7c2e24'` i PlayerBusiness.tsx).
const WALL_RGB = { r: 0x7c, g: 0x2e, b: 0x24 };
// Plinth grey (`PLINTH_COLOUR = '#8a8478'`).
const PLINTH_RGB = { r: 0x8a, g: 0x84, b: 0x78 };

// Distans mellan två färger i sqrt-sum-of-squares (euclidisk i RGB).
function colourDist(a, b) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function startVite() {
  const url = 'http://localhost:5173';
  try {
    const res = await fetch(url + '/');
    if (res.ok || res.status === 304) return { proc: null, url };
  } catch {}
  const proc = spawn('npx', ['vite', '--port', '5173', '--strictPort'], {
    cwd: FRONTEND, stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stdout.on('data', () => {});
  proc.stderr.on('data', () => {});
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error('vite exited early');
    try {
      const r = await fetch(url + '/');
      if (r.ok || r.status === 304) return { proc, url };
    } catch {}
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

async function waitForCanvas(page) {
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  await delay(2000);
}

async function waitForProbes(page) {
  await page.waitForFunction(
    () => typeof window.__nxProjectToScreen === 'function'
      && typeof window.__nxReadCanvasPixel === 'function',
    null, { timeout: 120000 }
  );
}

async function waitForGuestPositions(page) {
  // InteriorGuests exponerar en Map<id, {cx, cz}>. Vi behöver minst en
  // guest med definierad position för att kunna projektera och läsa en
  // pixel som "borde vara" gäst. Sim-tick spawnar gäster; det tar
  // några sekunder i lunch-perioden.
  await page.waitForFunction(
    () => {
      const m = window.__nxGuestPositions;
      if (!m || typeof m.size !== 'number') return false;
      return m.size > 0;
    },
    null, { timeout: 60000 }
  );
}

async function main() {
  const vite = await startVite();
  console.log(`Vite på ${vite.url}`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  const consoleLog = [];
  page.on('console', (msg) => consoleLog.push({ type: msg.type(), text: msg.text() }));
  try {
    const bust = Date.now();
    await page.goto(
      `http://localhost:5173/?bust=${bust}#preset=myBusiness&playtest=1&business=restaurant&period=lunch`,
      { waitUntil: 'domcontentloaded' }
    );
    await waitForCanvas(page);

    await page.evaluate(() => {
      const fn = window.__nxSetBusinessName;
      if (typeof fn === 'function') fn('Provspel');
    });

    await waitForProbes(page);
    // Sim behöver tid att spawn:a gäster — playtest=1 kör snabbare tick.
    await waitForGuestPositions(page);
    await delay(1500);

    // Fasad-pixel: läs pixel vid player-centre projicerad till ground-Y.
    // Vi hämtar player-centrum ur PLAYER_BUSINESS_CENTROID via ny dev-hook?
    // Nej — enklaste: läs första guest-positionens spawn-plats och räkna
    // baklänges. Eller: hårdkoda från PLAYER_BUSINESS_CENTROID (kända
    // koordinater från world.ts). ORDER 162:s rapport har `playerCentroidXZ`
    // men den kommer från `__nxWallSurfaceAudit()` som inte finns i denna
    // subset. Läs i stället en approximation: centrum av alla gäster
    // (positionerna ligger inne i lokalen så deras XZ-medel är player-
    // centre inom några meter).
    const guestPositions = await page.evaluate(() => {
      const m = window.__nxGuestPositions;
      if (!m) return [];
      const out = [];
      m.forEach((v, k) => {
        if (v && typeof v.cx === 'number' && typeof v.cz === 'number') {
          out.push({ id: k, cx: v.cx, cz: v.cz });
        }
      });
      return out;
    });

    if (guestPositions.length === 0) {
      throw new Error('Inga gäster i lokalen efter spawn-vänta — sim/preset fungerar inte som väntat');
    }

    // Player-centre approximation: gästernas XZ-medel.
    const meanCx = guestPositions.reduce((a, g) => a + g.cx, 0) / guestPositions.length;
    const meanCz = guestPositions.reduce((a, g) => a + g.cz, 0) / guestPositions.length;

    // Fasad-provet ska ligga vid ytterkant av byggnaden vid ground-Y, INTE
    // vid centrum. Centrum vid ground-Y ligger under interiörgolvet =
    // interior-pixel. Vi vill hitta en pixel som är väggen SETT UTIFRÅN.
    // Grovt: gå ~5 m västerut från player-centrum (mot kameran vid yaw=0.4)
    // och sample vid y=1 (halvvägs upp längs väggen så vi träffar Falu-
    // röd, inte sockelns grå eller taket). Detta är samma tanke som ORDER
    // 162:s ground-Y sample men flyttad för att träffa själva
    // vägg-vertikalen istället för polygon-centre-under-golvet.

    // Enklare + mer korrekt: projicera själva PLAYER_BUSINESS_CENTROID
    // (som är känd konstant) till ground-Y (y=0.02). Vi läser konstanten
    // ur en ny liten dev-hook eller ur PLAYER_BUSINESS_CENTROID via
    // page.evaluate på world.ts import. Enklast: injicera via URL.
    // Men detta script vill jobba utan ny hook — så vi använder
    // guest-mean som proxy för player-centre (fel ~4 m i XZ).

    // Två prover per krav:
    //   fasadProvet: (meanCx - 8, 1.0, meanCz) — 8 m västerut, vid halv
    //     vägghöjd. På myBusiness-vinkeln (yaw 0.4, pitch 50°) ligger
    //     detta på ytterväggen, i pixelrutan.
    //   interiorProvet: gäst-position projicerad vid y=1.0 (hjärthöjd).
    //     Ska INTE vara Falu-röd om interiören syns.

    const facadeWorld = { x: meanCx - 8, y: 1.0, z: meanCz };
    const facadeScreen = await page.evaluate(
      ([x, y, z]) => window.__nxProjectToScreen(x, y, z),
      [facadeWorld.x, facadeWorld.y, facadeWorld.z]
    );
    const facadePixel = facadeScreen && !facadeScreen.behindCamera
      ? await page.evaluate(
          ([x, y]) => window.__nxReadCanvasPixel(x, y),
          [facadeScreen.xCss, facadeScreen.yCss]
        )
      : null;

    // För interior: välj gästen närmast player-centre (mest sannolikt
    // väl inne i lokalen, inte precis vid dörren).
    const centralGuest = guestPositions
      .map((g) => ({ ...g, d: Math.hypot(g.cx - meanCx, g.cz - meanCz) }))
      .sort((a, b) => a.d - b.d)[0];
    const interiorWorld = { x: centralGuest.cx, y: 1.0, z: centralGuest.cz };
    const interiorScreen = await page.evaluate(
      ([x, y, z]) => window.__nxProjectToScreen(x, y, z),
      [interiorWorld.x, interiorWorld.y, interiorWorld.z]
    );
    const interiorPixel = interiorScreen && !interiorScreen.behindCamera
      ? await page.evaluate(
          ([x, y]) => window.__nxReadCanvasPixel(x, y),
          [interiorScreen.xCss, interiorScreen.yCss]
        )
      : null;

    // Klassificering:
    // facadeVisible: fasad-provet ligger nära WALL_RGB eller PLINTH_RGB.
    //   Tröskel: colourDist < 40 (empirisk — R124G46B36 är distinkt nog
    //   mot terräng-grå/skugga att en 40-enhets radie i RGB räcker för
    //   klassificering).
    // interiorVisible: interior-provet ligger INTE nära WALL_RGB
    //   (dvs väggen står inte i vägen för gästen).
    const WALL_DIST_THRESHOLD = 40;
    const facadeIsWall = facadePixel
      ? colourDist(facadePixel, WALL_RGB) < WALL_DIST_THRESHOLD
      : false;
    const facadeIsPlinth = facadePixel
      ? colourDist(facadePixel, PLINTH_RGB) < WALL_DIST_THRESHOLD
      : false;
    const facadeVisible = facadeIsWall || facadeIsPlinth;

    const interiorBlockedByWall = interiorPixel
      ? colourDist(interiorPixel, WALL_RGB) < WALL_DIST_THRESHOLD
      : true;
    const interiorVisible = !interiorBlockedByWall && interiorPixel !== null;

    let finding;
    if (facadeVisible && interiorVisible) {
      finding = 'OK — fasad + interior syns samtidigt vid cam=24m';
    } else if (facadeVisible && !interiorVisible) {
      finding = 'FYND — fasad syns men interior skyms av väggarna';
    } else if (!facadeVisible && interiorVisible) {
      finding = 'FYND — interior syns men fasad saknas';
    } else {
      finding = 'FYND — varken fasad eller interior syns';
    }

    const out = {
      cameraPreset: 'myBusiness',
      cameraPresetTargetDistanceM: 24,
      cameraPresetPitchRad: (50 * Math.PI) / 180,
      wallColorHex: '#7c2e24',
      plinthColorHex: '#8a8478',
      wallDistThreshold: WALL_DIST_THRESHOLD,
      guestPositionsSampled: guestPositions.length,
      centralGuestId: centralGuest.id,
      centralGuestXZ: [centralGuest.cx, centralGuest.cz],
      meanGuestXZ: [meanCx, meanCz],
      facadeSample: {
        worldPos: [facadeWorld.x, facadeWorld.y, facadeWorld.z],
        screen: facadeScreen,
        pixel: facadePixel,
        distToWall: facadePixel ? colourDist(facadePixel, WALL_RGB) : null,
        distToPlinth: facadePixel ? colourDist(facadePixel, PLINTH_RGB) : null,
        isWall: facadeIsWall,
        isPlinth: facadeIsPlinth
      },
      interiorSample: {
        worldPos: [interiorWorld.x, interiorWorld.y, interiorWorld.z],
        screen: interiorScreen,
        pixel: interiorPixel,
        distToWall: interiorPixel ? colourDist(interiorPixel, WALL_RGB) : null,
        blockedByWall: interiorBlockedByWall
      },
      facadeVisible,
      interiorVisible,
      finding
    };

    writeFileSync(
      resolve(REPORT_DIR, 'facadeAndInterior.json'),
      JSON.stringify(out, null, 2)
    );
    console.log('  saved facadeAndInterior.json');
    console.log('  finding:', finding);

    await page.screenshot({
      path: resolve(REPORT_DIR, 'myBusiness-view.png'),
      fullPage: false
    });

    if (consoleLog.length > 0) {
      writeFileSync(
        resolve(REPORT_DIR, 'consoleLog.json'),
        JSON.stringify(consoleLog.slice(-40), null, 2)
      );
    }
  } finally {
    await browser.close();
    await stopVite(vite.proc);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
