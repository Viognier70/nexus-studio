#!/usr/bin/env node
// ORDER 172 — utredning: cam=24m i ölkrogen, vad rendas faktiskt?
//
// **Vad probe:n gör.** Startar Vite dev-server, öppnar spelaren med
// `#playtest=1&business=brewpub&preset=myBusiness&period=lunch` —
// samma URL-mönster som ORDER 149/150-scripten använde för att komma
// "in i rummet". Väntar tills scenen monteras och kameran har konvergerat
// mot preset:et (damping ~1-2 s). Snap:ar sedan:
//
//   1. `window.__nxSimState.businessClass` + `.day` (bekräftar ölkrogen)
//   2. `window.__nxBusinessRoomRef.current` (bekräftar att BrewpubScene
//      har monterat sitt rum via businessRoom-kontraktet — ORDER 150)
//   3. `window.__nxSeatSource` + `.__nxSeatSourceLength` (bekräftar att
//      InteriorGuests läser kontraktets platser — ORDER 150)
//   4. Kamerans faktiska tillstånd via THREE-scen-traversal
//      (frustum-check, distance, position) — vi injicerar en probe-hook
//      genom `page.evaluate` som söker `PerspectiveCamera` i scen-grafen
//   5. Visibility-flaggan på PlayerBusiness `interiorGroupRef`,
//      InteriorGuests-gruppen, InteriorStaff-gruppen — läses via
//      groupRef.visible + materials opacity
//   6. Screenshot (`view.png`) — det VO faktiskt ser
//
// Skriver `frontend/reports/order172/interior-probe.json` + `view.png`.

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPORT_DIR = resolve(FRONTEND, 'reports/order172');
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

const vite = await startVite();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const consoleLog = [];
page.on('console', (msg) => consoleLog.push(`${msg.type()}: ${msg.text()}`));
page.on('pageerror', (err) => consoleLog.push(`pageerror: ${err.message}`));

try {
  const bust = Date.now();
  await page.goto(
    `http://localhost:5173/?bust=${bust}#playtest=1&business=brewpub&preset=myBusiness&period=lunch`,
    { waitUntil: 'domcontentloaded' }
  );
  await page.waitForFunction(
    () => typeof window.__nxSimDispatch === 'function' && document.querySelector('canvas') !== null,
    null, { timeout: 60000 }
  );
  // NameEntryOverlay pausar sim tills spelaren fyller i namn. ORDER
  // 149/150-scripten skippar den via `window.__nxSetBusinessName`.
  // Utan det renderar canvas inte, kameran fastnar på 0, och screenshot
  // visar bara modalen ovanpå en oanimerad bakgrund.
  await page.waitForFunction(() => typeof window.__nxSetBusinessName === 'function', null, { timeout: 20000 });
  await page.evaluate(() => window.__nxSetBusinessName('Ölkrogen'));
  // Vänta så kameran hinner damp:a mot myBusiness-preset (distance 24 m)
  // OCH canvas hinner tick:a första frame. Empiriskt: 8 s räcker.
  await delay(8000);

  const probe = await page.evaluate(() => {
    // Hitta three.js-scenen via r3f-internals. R3F 9.x attacherar
    // ett `__r3f`-fält på canvas som pekar på fiber-container. `store`
    // är en zustand-store med getState()-scenen.
    const canvas = document.querySelector('canvas');
    const r3fRoot = canvas && canvas.__r3f;
    // Prova flera vägar tills en fungerar (versionskänslig).
    let store = null;
    if (r3fRoot) {
      store = r3fRoot.root || r3fRoot.store || r3fRoot;
    }
    let state = null;
    if (store) {
      if (typeof store.getState === 'function') state = store.getState();
      else if (store.store && typeof store.store.getState === 'function') state = store.store.getState();
    }
    const scene = state && state.scene;
    const cameraNode = state && state.camera;

    // Traversera scen: räkna visible-flaggan på nyckelgrupper, hitta
    // material-opacities för PlayerBusiness roof/wall/plinth.
    let interiorGroupVisible = null;
    let interiorGuestGroupVisible = null;
    let interiorStaffGroupVisible = null;
    let brewpubRoomGroupVisible = null;
    let roofOpacity = null;
    let wallOpacity = null;
    let plinthOpacity = null;
    let sceneChildrenCount = 0;
    const namedGroups = [];

    if (scene) {
      sceneChildrenCount = scene.children.length;
      scene.traverse((obj) => {
        if (obj.name) namedGroups.push({ name: obj.name, type: obj.type, visible: obj.visible });
        // PlayerBusiness interiorGroup har inte namn men innehåller
        // pointLight + planeGeometry-golv med INTERIOR_FLOOR_COLOUR.
        // Ölkrogens BrewpubScene har `businessRoomRef.current` som
        // spårar rummets grupp; dess parent kan hittas via traversering.
        if (obj.isMesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (m.color) {
              const hex = '#' + m.color.getHexString();
              if (hex === '#8a7a5c' || hex === '#7a6a52') {
                roofOpacity = m.opacity;
              }
              if (hex === '#c8a878' || hex === '#b09468') {
                wallOpacity = m.opacity;
              }
            }
          }
        }
      });
    }

    const s = window.__nxSimState || {};
    const roomChan = window.__nxBusinessRoomRef && window.__nxBusinessRoomRef.current;

    return {
      simState: {
        businessClass: s.businessClass,
        simTime: s.simTime,
        period: s.day && s.day.period,
        doorsOpenAt: s.day && s.day.doorsOpenAt,
        periodStartAt: s.day && s.day.periodStartAt
      },
      businessRoomRef: roomChan ? {
        businessClass: roomChan.businessClass,
        capacity: roomChan.capacity,
        seatsCount: (roomChan.seats || []).length,
        standingCount: (roomChan.standing || []).length,
        entrance: roomChan.entrance
      } : null,
      seatSource: {
        source: window.__nxSeatSource ?? null,
        length: window.__nxSeatSourceLength ?? null
      },
      camera: cameraNode ? {
        position: {
          x: cameraNode.position.x,
          y: cameraNode.position.y,
          z: cameraNode.position.z
        },
        near: cameraNode.near,
        far: cameraNode.far
      } : null,
      scene: {
        sceneChildrenCount,
        namedGroupsCount: namedGroups.length,
        namedGroupsSample: namedGroups.slice(0, 20)
      },
      materials: {
        roofOpacity,
        wallOpacity,
        plinthOpacity
      },
      // DevPanel-strängen ur DOM
      devPanelText: (() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        while (walker.nextNode()) {
          const t = walker.currentNode.textContent || '';
          if (t.includes('day=') && t.includes('cam=')) return t;
        }
        return null;
      })()
    };
  });

  // Screenshot: det VO faktiskt ser
  await page.screenshot({
    path: resolve(REPORT_DIR, 'view.png'),
    fullPage: false
  });

  const report = {
    order: 172,
    title: 'On break — cam=24m i ölkrogen, vad rendas',
    setup: {
      url: `#playtest=1&business=brewpub&preset=myBusiness&period=lunch`,
      waitAfterMountMs: 3500,
      viewport: { width: 1920, height: 1080 }
    },
    probe,
    consoleTail: consoleLog.slice(-20)
  };

  const out = resolve(REPORT_DIR, 'interior-probe.json');
  writeFileSync(out, JSON.stringify(report, null, 2));

  console.log('=== ORDER 172 — interior-probe ===\n');
  console.log('simState.businessClass:', probe.simState.businessClass);
  console.log('simState.period       :', probe.simState.period);
  console.log('businessRoomRef       :', probe.businessRoomRef);
  console.log('seatSource            :', probe.seatSource);
  console.log('camera.position       :', probe.camera && probe.camera.position);
  console.log('materials             :', probe.materials);
  console.log('scene.childrenCount   :', probe.scene.sceneChildrenCount);
  console.log('scene.namedGroups     :', probe.scene.namedGroupsCount, '(sample:', probe.scene.namedGroupsSample.map((g) => g.name).slice(0, 10), ')');
  console.log('devPanel              :', (probe.devPanelText || '').split('\n').slice(0, 3).join(' | '));
  console.log(`\nRapport: ${out}`);
  console.log(`Screenshot: ${resolve(REPORT_DIR, 'view.png')}`);
} finally {
  await browser.close();
  await new Promise((r) => { vite.on('exit', r); vite.kill('SIGTERM'); setTimeout(() => { vite.kill('SIGKILL'); r(); }, 3000); });
}
