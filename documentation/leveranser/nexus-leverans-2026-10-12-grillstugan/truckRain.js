// truckRain.js — D13 (2026-10-12): regnet vid grillstugan, med och utan markis. Samma ram som grillstugan.js.
// Regnet slutar på det som skyddar (stuganShelters): taket, luckans skiva, kylskåpet, menyns tak och markisen om den är köpt.
// Marken under är torr, och vattnet droppar från skivans och markisens kant. Den som står i kön utan skydd fäller upp
// ett paraply och kön glesnar (paraplyerna tar plats). Talen för tålamod och kölängd i regn sätter Code i balance.ts.

import { STUGAN, stuganShelters, flapEdge } from './grillstugan.js';

export const RAIN = {
  drops: 4200, speedMs: [7.2, 8.6], streakM: 0.34, windX: 0.06,
  box: { x0: -13, x1: 11, z0: -7, z1: 10, top: 9 },
  color: '#c9d6e6', opacity: 0.4, splashes: 180, splashS: 0.3, dripsPerM: 6, dripMs: 5.5
};
/** Ljuset i regn: himlen ljusare och kallare, solen nästan borta, marken mörk och blank. */
export const WET = { hemiK: 0.74, keyK: 0.28, hemiSky: '#c7cfdc', hemiSkyDry: '#ffe0b8', groundDark: 0.7, groundRough: 0.3 };
export const PUDDLES = [[-5.7, 4.1, 0.9, 0.4, 0.2], [-3.1, 3.55, 0.65, 0.28, -0.1], [-0.3, 4.3, 1.1, 0.42, 0.1], [3.0, 3.7, 0.8, 0.33, 0.5], [6.4, 2.4, 0.7, 0.3, 1.2], [-6.9, 0.7, 0.8, 0.36, -0.3], [2.4, -2.6, 0.9, 0.38, 0.3], [-1.9, 6.4, 0.9, 0.35, -0.2]];

/** Kön i regn. withAwning: alla under markisen, 0,55 m mellan (som D10). withoutAwning: den som beställer och en till under
 *  luckans skiva, sedan paraplyer, 0,9 m mellan. sheltered = hur många som står torrt. helperZ = medhjälparens väg. */
export const RAIN_QUEUE = {
  dry: { order: [-0.5, 2.15], line: [[-1.4, 2.3], [-2.3, 2.3], [-3.2, 2.3], [-4.1, 2.3]], pitchM: 0.9, helperZ: 3.05, sheltered: null },
  withAwning: { order: [-0.5, 1.95], line: [[-1.25, 2.2], [-1.8, 2.2], [-2.35, 2.2], [-2.9, 2.2], [-3.45, 2.2], [-4.0, 2.2]], pitchM: 0.55, helperZ: 2.72, sheltered: 7 },
  withoutAwning: { order: [-0.5, 1.95], line: [[-1.12, 1.95], [-2.1, 2.35], [-3.0, 2.35], [-3.9, 2.35]], pitchM: 0.9, helperZ: 3.4, sheltered: 2, umbrellaFrom: 2 }
};
/** Platshållare: Code sätter dem. patienceRain = tålamodet i kön utan skydd mot tålamodet torrt, leaveAt = när den
 *  sista i kön går (antal i kön utan skydd). */
export const RAIN_QUEUE_BALANCE = { patienceRain: null, leaveAt: null };

export function shelterTop(x, z, list) { let y = 0; for (const r of list) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) y = Math.max(y, r.y); return y; }

// ---------- paraplyet ----------
export const UMBRELLA = { radius: 0.5, height: 0.2, shaftM: 0.84, ribs: 8, colors: ['#2b3a4e', '#7a6338', '#4c4a47', '#24477a', '#3d4a3a'] };
/** Höger arm håller skaftet framför bröstet: överarmen framåt, underarmen uppåt. Läggs på efter klippet och livet. */
export const UMBRELLA_HOLD = { armR: { swing: 0.62, lift: 0.14, elbow: 1.42 }, overHeadM: 0.5, maxTilt: 0.22 };

export function buildUmbrella(THREE, color) {
  const g = new THREE.Group(), U = UMBRELLA;
  const fab = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.05, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(U.radius, U.height, U.ribs, 1, true), fab); cone.position.y = U.shaftM - U.height / 2 + 0.06; cone.castShadow = true; g.add(cone);
  const rib = new THREE.MeshStandardMaterial({ color: '#2a2724', roughness: 0.5, metalness: 0.5 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, U.shaftM + 0.1, 6), rib); shaft.position.y = (U.shaftM + 0.1) / 2 - 0.04; g.add(shaft);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 10, Math.PI), M2(THREE, '#3b2a1e')); hook.position.set(0.04, -0.04, 0); hook.rotation.z = Math.PI; g.add(hook);
  for (let i = 0; i < U.ribs; i++) { const a = (i + 0.5) / U.ribs * Math.PI * 2, tip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), rib); tip.position.set(Math.cos(a) * U.radius, U.shaftM - U.height + 0.06, Math.sin(a) * U.radius); g.add(tip); }
  g.userData.fabric = fab;
  return g;
}
function M2(THREE, c) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }); }

/** Lägger armen och ställer paraplyet i handen, lodrätt och lite bakåt. rig.root måste vara uppdaterad. */
export function holdUmbrella(rig, umbrella, V) {
  const j = rig.joints, a = UMBRELLA_HOLD.armR, V2 = umbrella.userData.v2 || (umbrella.userData.v2 = V.clone()), UP = umbrella.userData.up || (umbrella.userData.up = V.clone().set(0, 1, 0));
  j.shoulderR.rotation.set(-a.swing, 0, a.lift); j.elbowR.rotation.x = -a.elbow; rig.root.updateMatrixWorld(true);
  j.handAnchorR.getWorldPosition(V); umbrella.position.copy(V);
  // Skaftet lutar från handen mot en punkt över huvudet, så att duken sitter över den som håller det.
  j.head.getWorldPosition(V2); V2.y += UMBRELLA_HOLD.overHeadM; V2.sub(V);
  const hz = Math.hypot(V2.x, V2.z), lim = Math.tan(UMBRELLA_HOLD.maxTilt) * V2.y; if (hz > lim && hz > 0) { V2.x *= lim / hz; V2.z *= lim / hz; } V2.normalize();
  umbrella.quaternion.setFromUnitVectors(UP, V2);
}

// ---------- regnet ----------
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export function createRain(THREE, scene, o) {
  o = o || {};
  const R = RAIN, Bx = R.box, N = R.drops, r = rnd(12), group = new THREE.Group(); group.name = 'rain'; scene.add(group);
  const drops = Array.from({ length: N }, () => { const ux = r(), uz = r(); return { ux, uz, x: Bx.x0 + ux * (Bx.x1 - Bx.x0), z: Bx.z0 + uz * (Bx.z1 - Bx.z0), v: R.speedMs[0] + r() * (R.speedMs[1] - R.speedMs[0]), p: r(), floor: 0 }; });
  const pos = new Float32Array(N * 6), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: R.color, transparent: true, opacity: R.opacity, depthWrite: false })); lines.frustumCulled = false; group.add(lines);
  // stänken: ringar som växer på marken, bara där det inte är skyddat
  const ringGeo = new THREE.RingGeometry(0.02, 0.035, 12); ringGeo.rotateX(-Math.PI / 2);
  const splash = new THREE.InstancedMesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#dfe7f1', transparent: true, opacity: 0.2, depthWrite: false }), R.splashes); splash.frustumCulled = false; group.add(splash);
  const sp = Array.from({ length: R.splashes }, () => ({ x: 0, z: 0, p: r() })), m4 = new THREE.Matrix4();
  // pölarna: mörka och blanka, och de speglar lyktorna
  const pm = new THREE.MeshStandardMaterial({ color: '#4a4f57', roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.42, depthWrite: false });
  PUDDLES.forEach(([x, z, a, b, rot]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), pm); m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.scale.set(a, b, 1); m.position.set(x, 0.009, z); m.receiveShadow = true; group.add(m); });
  // dropparna från kanterna
  let drips = [], dGeo = new THREE.BufferGeometry(), dLines = new THREE.LineSegments(dGeo, new THREE.LineBasicMaterial({ color: '#dbe5f0', transparent: true, opacity: 0.6, depthWrite: false })); dLines.frustumCulled = false; group.add(dLines);
  // torr mark under skydden
  const dry = new THREE.Group(); group.add(dry);
  let list = [];
  function setShelters(awningOn, dryMat) {
    list = stuganShelters(awningOn);
    drops.forEach((d) => { d.floor = shelterTop(d.x, d.z, list); }); lastKey = '';
    sp.forEach((s) => { do { s.x = Bx.x0 + 2 + r() * (Bx.x1 - Bx.x0 - 4); s.z = Bx.z0 + 2 + r() * (Bx.z1 - Bx.z0 - 4); } while (shelterTop(s.x, s.z, list) > 0); });
    const fe = flapEdge(), a = STUGAN.awning, edges = [{ x0: STUGAN.hatch.x0 - 0.1, x1: STUGAN.hatch.x1 + 0.1, z: fe.z + 0.02, y: fe.y - 0.18 }];
    if (awningOn) edges.push({ x0: a.x0, x1: a.x1, z: a.z1 + 0.03, y: a.yOut - 0.18 });
    drips = []; edges.forEach((e) => { const n = Math.round((e.x1 - e.x0) * R.dripsPerM); for (let i = 0; i < n; i++) drips.push({ x: e.x0 + (i + r()) * (e.x1 - e.x0) / n, z: e.z, y: e.y, p: r() }); });
    dGeo.dispose(); dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(drips.length * 6), 3)); dLines.geometry = dGeo;
    while (dry.children.length) dry.remove(dry.children[0]);
    if (dryMat) list.forEach((s) => { if (s.id === 'menu') return; const m = new THREE.Mesh(new THREE.PlaneGeometry(s.x1 - s.x0 - 0.1, s.z1 - s.z0 - 0.1), dryMat); m.rotation.x = -Math.PI / 2; m.position.set((s.x0 + s.x1) / 2, 0.007, (s.z0 + s.z1) / 2); m.receiveShadow = true; dry.add(m); });
  }
  // Lådan med regn följer kamerans mål och växer med avståndet, så att kanten aldrig syns.
  let cx = 0, cz = 0, half = 1, lastKey = '';
  function place(cam) {
    const h = Math.max(13, cam.dist * 0.95), x = Math.round(cam.tx), z = Math.round(cam.tz), key = x + ',' + z + ',' + Math.round(h);
    if (key === lastKey) return; lastKey = key; cx = x; cz = z; half = h;
    drops.forEach((d) => { d.x = cx + (d.ux * 2 - 1) * half; d.z = cz + (d.uz * 2 - 1) * half * 0.8; d.floor = shelterTop(d.x, d.z, list); });
  }
  function update(t, cam) {
    if (cam) place(cam);
    const L = R.streakM * Math.max(1, half / 20);
    drops.forEach((d, i) => {
      const H = Bx.top - d.floor, y = d.floor + H - ((t * d.v + d.p * H) % H), dx = R.windX * (y - d.floor);
      pos[i * 6] = d.x + dx; pos[i * 6 + 1] = y; pos[i * 6 + 2] = d.z; pos[i * 6 + 3] = d.x + dx + R.windX * L; pos[i * 6 + 4] = Math.min(Bx.top, y + L); pos[i * 6 + 5] = d.z;
    });
    geo.attributes.position.needsUpdate = true;
    sp.forEach((s, i) => { const u = ((t / R.splashS) + s.p * 7) % 1, k = 0.3 + 1.4 * u; m4.makeScale(k, 1, k); m4.setPosition(s.x, 0.012, s.z); splash.setMatrixAt(i, m4); });
    splash.instanceMatrix.needsUpdate = true;
    const dp = dGeo.attributes.position; if (dp) { drips.forEach((d, i) => { const fall = d.y, u = ((t * R.dripMs / fall) + d.p) % 1, y = fall * (1 - u * u); dp.array.set([d.x, y, d.z, d.x, y + 0.07, d.z], i * 6); }); dp.needsUpdate = true; }
  }
  return { group, update, setShelters, get shelters() { return list; }, setVisible(v) { group.visible = v; }, dispose() { scene.remove(group); } };
}
