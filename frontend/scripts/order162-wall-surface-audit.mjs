#!/usr/bin/env node
// ORDER 162 §DoD 1 — vad ritar grannarna vid ground-Y som PlayerBusiness
// inte ritar?
//
// Ordertext (documentation/architecture/ORDER_162_YTTERVAGGEN_MOT_MARKEN.md
// §2.1): jämför vertex-Y-fördelningen mellan grannens `OsmBuildings`
// wall-mesh (ExtrudeGeometry, med bottom-cap + top-cap + side-quads,
// alltid opak) och PlayerBusiness wall-mesh (`sideWallGeometry`, endast
// side-quads, `transparent` med opacity kopplad till kamera-distans).
// Sockeln jämförs på samma sätt: OsmBuildings.BuildingPlinth alltid opak,
// PlayerBusiness plinth följer wallOpacity per ORDER 159 §DoD 2.
//
// Skriptet läser via dev-hooken `window.__nxWallSurfaceAudit()`
// (WallSurfaceAuditProbe.tsx) och `window.__nxReadCanvasPixel()` för
// ground-Y-färgprov vid PlayerBusiness fot kontra grannens fot. Resultatet
// skrivs till `frontend/reports/order162/wallSurfaceAudit.json` per ORDER
// 160/161-reglerna: inget tal citeras i registerraden eller ordertexten.
//
// Kameran laddas med `#preset=myBusiness` — samma pose spelaren landar på
// enligt viewLevels.ts:105 (dist 24 m, pitch 50°). Det är där VO
// observerade "svävande låda" 2026-08-31 och den observation ORDER 161
// bekräftade att sockeln inte täckte.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order162');
mkdirSync(REPORT_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };

// Hur "syns" definieras för färgprovet: opacitet < denna räknas som osynlig.
// Samma tröskel som ORDER 161 (0,05). Om ground-Y-pixel skiljer sig
// mellan granne och player med minst denna kanal-differens läser vi det
// som "grannen har visuell fasad där player inte har".
const CHANNEL_DIFF_MIN = 20;

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
  // WallSurfaceAuditProbe sits inside <Suspense> so its useEffect only runs
  // once every Suspense child (OsmBuildings, OsmForest, etc.) has resolved.
  // Wait for the hook rather than gambling on a fixed delay.
  await page.waitForFunction(
    () => typeof window.__nxWallSurfaceAudit === 'function'
      && typeof window.__nxReadCanvasPixel === 'function'
      && typeof window.__nxProjectToScreen === 'function',
    null, { timeout: 120000 }
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

    // Sätt business-namn så NameEntryOverlay avmonteras (samma skäl som
    // ORDER 161-scriptet: overlay kan täcka canvas och blockera läsning).
    await page.evaluate(() => {
      const fn = window.__nxSetBusinessName;
      if (typeof fn === 'function') fn('Provspel');
    });
    // Vänta på att Suspense-boundary resolvar och WallSurfaceAuditProbe
    // hinner mounta sina dev-hookar (kan ta 5–20 s på kall vite-cache).
    try {
      await waitForProbes(page);
    } catch (e) {
      // Dump console on failure to help diagnose why the probe never mounted.
      writeFileSync(
        resolve(REPORT_DIR, 'consoleLog.json'),
        JSON.stringify(consoleLog.slice(-100), null, 2)
      );
      throw e;
    }
    // Extra frames så useFrame har skrivit material-opacity minst en gång
    // efter att kameran ease:at in på preset-poseringen.
    await delay(1500);

    const hooksAvailable = await page.evaluate(() => ({
      wallSurface: typeof window.__nxWallSurfaceAudit === 'function',
      readPixel: typeof window.__nxReadCanvasPixel === 'function',
      project: typeof window.__nxProjectToScreen === 'function'
    }));

    if (!hooksAvailable.wallSurface) {
      throw new Error('__nxWallSurfaceAudit saknas — WallSurfaceAuditProbe monterades inte (DEV-gate?)');
    }

    const audit = await page.evaluate(() => {
      const fn = window.__nxWallSurfaceAudit;
      return fn();
    });

    // Projicera ground-Y-punkter (y = 0,02 — precis över terrängen, samma
    // Y-offset ScaleReference använder) för både player-centre och grannens
    // centre, sedan läs pixel-färgen på skärmen där.
    let playerGroundPixel = null;
    let neighbourGroundPixel = null;
    let playerGroundScreen = null;
    let neighbourGroundScreen = null;
    if (
      audit.playerCentroidXZ && audit.neighbourCentroidXZ
      && hooksAvailable.project && hooksAvailable.readPixel
    ) {
      const [px, pz] = audit.playerCentroidXZ;
      const [nx, nz] = audit.neighbourCentroidXZ;
      // Provet tas mitt på fasadens ground-Y — projektera centrumpunkten
      // vid y=0.02. På 24 m / pitch 50° hamnar den mitt i "under-taket"-
      // regionen där VO såg mörk låda.
      playerGroundScreen = await page.evaluate(([x, y, z]) => window.__nxProjectToScreen(x, y, z), [px, 0.02, pz]);
      neighbourGroundScreen = await page.evaluate(([x, y, z]) => window.__nxProjectToScreen(x, y, z), [nx, 0.02, nz]);
      if (!playerGroundScreen.behindCamera) {
        playerGroundPixel = await page.evaluate(
          ([x, y]) => window.__nxReadCanvasPixel(x, y),
          [playerGroundScreen.xCss, playerGroundScreen.yCss]
        );
      }
      if (!neighbourGroundScreen.behindCamera) {
        neighbourGroundPixel = await page.evaluate(
          ([x, y]) => window.__nxReadCanvasPixel(x, y),
          [neighbourGroundScreen.xCss, neighbourGroundScreen.yCss]
        );
      }
    }

    // Bygg finding-strängen från de faktiska talen. Detta är kärnfrågan
    // i §2.1: har grannen non-zero vertex-count vid y=0-bandet OCH är
    // materialet opakt, kontra PlayerBusiness som saknar cap ELLER har
    // opacity=0? Slutsatsen ska följa av talen, inte klistras på dem.
    const nWall = audit.neighbourWall;
    const pWall = audit.playerWall;
    const nGround = nWall.yHistogram ? nWall.yHistogram[0].count : 0;
    const pGround = pWall.yHistogram ? pWall.yHistogram[0].count : 0;
    const nTop = nWall.yHistogram ? nWall.yHistogram[nWall.yHistogram.length - 1].count : 0;
    const pTop = pWall.yHistogram ? pWall.yHistogram[pWall.yHistogram.length - 1].count : 0;
    const nOpacity = nWall.material?.opacity ?? null;
    const pOpacity = pWall.material?.opacity ?? null;
    const nPlinthOpacity = audit.neighbourPlinth?.material?.opacity ?? null;
    const pPlinthOpacity = audit.playerPlinth?.material?.opacity ?? null;

    const pixelDiff =
      playerGroundPixel && neighbourGroundPixel
        ? {
            dR: Math.abs(playerGroundPixel.r - neighbourGroundPixel.r),
            dG: Math.abs(playerGroundPixel.g - neighbourGroundPixel.g),
            dB: Math.abs(playerGroundPixel.b - neighbourGroundPixel.b)
          }
        : null;
    const pixelChannelExceedsThreshold = pixelDiff
      ? pixelDiff.dR > CHANNEL_DIFF_MIN || pixelDiff.dG > CHANNEL_DIFF_MIN || pixelDiff.dB > CHANNEL_DIFF_MIN
      : null;

    // §2.1-frågorna, besvarade ur talen:
    //   1. Har grannen fler vertices vid ground-Y-bandet? → nGround > pGround.
    //   2. Har grannen opak wall vid mätögonblicket? → nOpacity ≈ 1.
    //   3. Har PlayerBusiness transparent wall vid mätögonblicket? → pOpacity nära 0.
    const neighbourHasMoreGroundVertices = nGround > pGround;
    const neighbourWallIsOpaque = nOpacity !== null && nOpacity >= 0.99 && nWall.material?.transparent === false;
    const playerWallIsInvisible = pOpacity !== null && pOpacity < 0.05;
    const playerPlinthIsInvisible = pPlinthOpacity !== null && pPlinthOpacity < 0.05;
    const neighbourPlinthIsOpaque = nPlinthOpacity !== null && nPlinthOpacity >= 0.99;

    // §2.2 kandidater — utesluts eller bekräftas av avläsningarna:
    //   - receiveShadow-skillnad: material.side är enda skillnad vi kan avläsa
    //     via probe; verklig receiveShadow-flag inspekteras inte här (den
    //     ingår inte i material-snapshot). Slutsatsen om denna kandidat lyfts
    //     till en förklarande sträng, inte ett tal.
    //   - depthWrite: avläses direkt (material.depthWrite).
    //   - OBB-rotation: ryms inte i denna prob — kandidaten avfärdas
    //     kvalitativt eftersom både wall-meshar följer samma polygon.
    //   - Y-fighting: vertex-Y-histogrammens minsta värde avslöjar om båda
    //     landar exakt på y=0.
    //   - Plinth-inset: plinth-AABB visar den 10 cm outward-differensen.

    const finding = (() => {
      if (!nWall.found) return 'Neighbour wall-mesh hittades inte i scenen — WallSurfaceAuditProbe måste kontrolleras.';
      if (!pWall.found) return 'PlayerBusiness wall-mesh hittades inte via userData — hooken kontrolleras.';
      const parts = [];
      if (neighbourHasMoreGroundVertices) {
        parts.push(`neighbour ExtrudeGeometry har ${nGround} vertices vid ground-Y-bandet mot PlayerBusiness sideWallGeometry ${pGround}`);
      } else {
        parts.push(`neighbour och PlayerBusiness har samma antal vertices vid ground-Y (${nGround} vs ${pGround})`);
      }
      if (nTop > pTop) {
        parts.push(`neighbour har top-cap-vertices (top-band ${nTop} vs ${pTop}) — top-cap döljs av RoofCap men existerar`);
      }
      if (neighbourWallIsOpaque && playerWallIsInvisible) {
        parts.push(`neighbour wall är opak (opacity ${nOpacity}, transparent false) medan PlayerBusiness wall är osynlig (opacity ${pOpacity}, transparent true) från myBusiness-preset`);
      }
      if (neighbourPlinthIsOpaque && playerPlinthIsInvisible) {
        parts.push(`sockeln på grannen är opak (${nPlinthOpacity}) medan PlayerBusiness sockel följer wallOpacity till (${pPlinthOpacity}) per ORDER 159 §DoD 2`);
      }
      if (pixelChannelExceedsThreshold) {
        parts.push(`ground-Y pixelprov skiljer sig (dR ${pixelDiff.dR}, dG ${pixelDiff.dG}, dB ${pixelDiff.dB} — över tröskeln ${CHANNEL_DIFF_MIN} på minst en kanal)`);
      } else if (pixelDiff) {
        parts.push(`ground-Y pixelprov skiljer sig UNDER tröskeln (dR ${pixelDiff.dR}, dG ${pixelDiff.dG}, dB ${pixelDiff.dB} ≤ ${CHANNEL_DIFF_MIN}) — pröva annan mätpunkt eller kamera-vinkel`);
      }
      // §2.3 rekommendation baserad på fynden — sätts som separat fält i JSON.
      return parts.join('; ');
    })();

    const recommendation = (() => {
      if (playerWallIsInvisible && neighbourWallIsOpaque) {
        return (
          'Minsta ändring: koppla loss wall-opacity från roof-opacity. Låt roofen fortsätta fejda (interiören behöver kunna visas), '
          + 'men behåll wall + plinth opaka som grannarna. ORDER 042 §3.2 tint-buggen gällde ExtrudeGeometry-cap (top-cap), inte '
          + 'sideWallGeometry — sideWallGeometry har ingen cap, så wall-materialet kan förbli opakt utan att återintroducera '
          + 'tint-buggen. En ExtrudeGeometry med bottom-cap är alternativ, men löser inte att den fejdar bort vid dollhouse-vy '
          + '— fade-kopplingen är den strukturella orsaken. Följdorder implementerar; denna order är utredning.'
        );
      }
      if (neighbourHasMoreGroundVertices && !playerWallIsInvisible) {
        return (
          'Bottom-cap är den mekaniska skillnaden vid ground-Y, men wall-opacity är opak i mätningen — svävande låda-observationen '
          + 'måste ha en annan orsak från just den vy VO såg. Följdorder undersöker rendering-pipeline eller pröva mätning från '
          + 'exakt myBusiness-preset igen.'
        );
      }
      return 'Ingen ytterligare rekommendation — inga tydliga skillnader mätta.';
    })();

    const out = {
      cameraPreset: 'myBusiness',
      cameraPresetTargetDistanceM: 24,
      cameraPresetPitchRad: (50 * Math.PI) / 180,
      hooksAvailable,
      channelDiffThreshold: CHANNEL_DIFF_MIN,
      neighbourWallMeshVertices: {
        matchTag: nWall.matchTag,
        found: nWall.found,
        neighbourId: audit.neighbourId,
        vertexCount: nWall.vertexCount,
        yHistogram: nWall.yHistogram,
        worldAABB: nWall.worldAABB,
        material: nWall.material
      },
      playerBusinessWallMeshVertices: {
        matchTag: pWall.matchTag,
        found: pWall.found,
        vertexCount: pWall.vertexCount,
        yHistogram: pWall.yHistogram,
        worldAABB: pWall.worldAABB,
        material: pWall.material
      },
      neighbourPlinth: audit.neighbourPlinth,
      playerPlinth: audit.playerPlinth,
      distanceToNeighbourM: audit.distanceToNeighbourM,
      cameraWorldPos: audit.cameraWorldPos,
      groundYScreenPointNeighbour: neighbourGroundScreen,
      groundYScreenPointPlayerBusiness: playerGroundScreen,
      groundYPixelSampleNeighbour: neighbourGroundPixel,
      groundYPixelSamplePlayerBusiness: playerGroundPixel,
      pixelChannelDiffs: pixelDiff,
      pixelChannelExceedsThreshold,
      neighbourHasMoreGroundVertices,
      neighbourWallIsOpaque,
      playerWallIsInvisible,
      neighbourPlinthIsOpaque,
      playerPlinthIsInvisible,
      finding,
      recommendationFor23: recommendation
    };

    writeFileSync(
      resolve(REPORT_DIR, 'wallSurfaceAudit.json'),
      JSON.stringify(out, null, 2)
    );
    console.log('  saved wallSurfaceAudit.json');
    console.log('  finding:', finding);

    // Skärmdump för öga-bekräftelse bredvid talen.
    await page.screenshot({
      path: resolve(REPORT_DIR, 'myBusiness-view.png'),
      fullPage: false
    });

    // Console-log för debug om något gick fel.
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
