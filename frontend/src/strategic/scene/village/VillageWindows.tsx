// ORDER 297 — byns fönster i kvällsljuset (Designs leverans Byn i kvällsljus,
// byKvall.js och villageEvening.ts LIGHTS/COLOURS). "Varje ljus som tänds
// eller släcks har en anledning i byn."
//   - Bostadshusen tänds i skymningen, var och en på sitt eget e
//     (LIGHTS.homes.on). Ett hus vars sällskap är ute (på väg, på krogen,
//     på väg hem; VillageLife, villageLive.outHomes) är släckt och tänds när
//     sällskapet är hemma igen. Sänggåendet släcker husen mot slutet
//     (LIGHTS.homes.bed). Teve i en del hus (tvShare).
//   - Måltidens hus och campus släcks medan studenterna går ut
//     (LIGHTS.school.off), en del kök sent (lateKitchen).
//   - Hotellets rum tänds när gästerna går upp (LIGHTS.hotelRooms).
//   - Krogarnas fönster: matsalen när krogen har öppet, köket också före
//     öppning och under städningen (venueLight.ts).
// Fönstren sitter på husens väggar som de ritas (OsmBuildings osmWallHeight,
// bara hus som OsmBuildings ritar: isRenderedByOsmBuildings),
// en rad på 1,6 m och en till på 4,4 m i höga hus. Vår krog har rummets skal
// och egna fönster. Bara under servicen och kvällen.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { WORLD_RAW_BUILDINGS, type RawBuilding } from '../../content/world';
import { VENUE_BUILDINGS } from '../../content/villagePlaces';
import { useSimState } from '../../simulation/SimulationProvider';
import { eveningProgress } from '../../../sim/clock';
import { useOpeningEvening } from '../../opening/openingStage';
import { venuesTonight, PLAYER_VENUE } from '../../../sim/village';
import { COLOURS, LIGHTS } from '../../village/villageEvening';
import { isRenderedByOsmBuildings, osmWallHeight } from '../OsmBuildings';
import { villageLive } from './villageLive';
import { venueLightTargets } from './venueLight';

type Vec2 = [number, number];
type Kind = 'home' | 'school' | 'rooms' | 'venue';
interface Win { x: number; y: number; z: number; ry: number; w: number; h: number; kind: Kind; owner: string; role: 'dining' | 'kitchen' | null; j: number }

const HOME_KINDS = new Set(['house', 'residential', 'apartments', 'detached', 'terrace']);
// Byggnader av sorten 'yes' räknas som bostadshus på 40–320 m² (Designs byKvallPlats.js).
const YES_HOME_M2: [number, number] = [40, 320];
const RAMP_PER_S = 2.2;
const LIT_GAIN = { home: 2.2, venue: 2.8 };

const hash = (i: number, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function area(poly: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < poly.length - 1; i++) a += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1];
  return Math.abs(a) / 2;
}

/** Husets kanter med normalen utåt (bort från mitten). */
function edges(poly: Vec2[]) {
  const n = poly.length - 1;
  const cx = poly.slice(0, n).reduce((a, p) => a + p[0], 0) / n;
  const cz = poly.slice(0, n).reduce((a, p) => a + p[1], 0) / n;
  const out: { a: Vec2; L: number; t: Vec2; n: Vec2 }[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[i + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 0.01) continue;
    const t: Vec2 = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    let nn: Vec2 = [-t[1], t[0]];
    const mx = (a[0] + b[0]) / 2;
    const mz = (a[1] + b[1]) / 2;
    if (nn[0] * (mx - cx) + nn[1] * (mz - cz) < 0) nn = [-nn[0], -nn[1]];
    out.push({ a, L, t, n: nn });
  }
  return out;
}

function buildWindows(): Win[] {
  const list: Win[] = [];
  const venueOf = new Map(Object.entries(VENUE_BUILDINGS).map(([id, bid]) => [bid, id]));
  const row = (_b: RawBuilding, e: ReturnType<typeof edges>[number], y: number, size: Vec2, kind: Kind, owner: string, step: number, role?: (i: number, n: number) => 'dining' | 'kitchen') => {
    const n = Math.floor((e.L - 1) / step);
    for (let i = 0; i < n; i++) {
      const s = ((i + 0.5) * e.L) / n;
      list.push({ x: e.a[0] + e.t[0] * s + e.n[0] * 0.06, y, z: e.a[1] + e.t[1] * s + e.n[1] * 0.06, ry: Math.atan2(e.n[0], e.n[1]), w: size[0], h: size[1], kind, owner, role: role ? role(i, n) : null, j: list.length });
    }
  };
  for (const b of WORLD_RAW_BUILDINGS) {
    // Bara hus som ritas med samma volym (OsmBuildings), så att inget fönster
    // hänger i luften där ett hus ritas på annat sätt eller inte alls.
    if (b.poly.length < 4 || !isRenderedByOsmBuildings(b)) continue;
    const poly = b.poly as Vec2[];
    const venue = venueOf.get(b.id);
    if (venue === PLAYER_VENUE) continue; // vårt rum har sitt skal och sina fönster
    const H = osmWallHeight(b);
    const kind = b.kind ?? '';
    const E = edges(poly);
    if (venue) {
      E.filter((e) => e.L > 3.5).forEach((e) => {
        row(b, e, 1.5, [1.4, 1.2], 'venue', venue, 2.6, (i, n) => (i === n - 1 ? 'kitchen' : 'dining'));
        if (venue === 'hotellets-matsal') [3.9, 5.7].forEach((y) => { if (y < H - 1) row(b, e, y, [0.9, 1.1], 'rooms', venue, 2.4); });
      });
    } else if (HOME_KINDS.has(kind) || (kind === 'yes' && area(poly) >= YES_HOME_M2[0] && area(poly) <= YES_HOME_M2[1])) {
      E.filter((e) => e.L > 3).forEach((e) => {
        row(b, e, 1.6, [0.8, 1.0], 'home', b.id, 3);
        if (H > 5.5) row(b, e, 4.4, [0.8, 1.0], 'home', b.id, 3);
      });
    } else if (kind === 'university' || kind === 'school') {
      E.filter((e) => e.L > 3).forEach((e) => [1.5, 3.9].forEach((y) => { if (y < H - 1) row(b, e, y, [1.0, 1.2], 'school', b.id, 2.8); }));
    }
  }
  return list;
}

function paneTexture(cols: number, rows: number): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#d8d0c4');
  g.addColorStop(1, '#ffffff');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#3a2a1e';
  x.fillRect(0, 0, 64, 5); x.fillRect(0, 59, 64, 5); x.fillRect(0, 0, 5, 64); x.fillRect(59, 0, 5, 64);
  for (let i = 1; i < cols; i++) x.fillRect((i * 64) / cols - 1.5, 0, 3, 64);
  for (let i = 1; i < rows; i++) x.fillRect(0, (i * 64) / rows - 1.5, 64, 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function VillageWindows() {
  const sim = useSimState();
  // ORDER 308 — under öppningen tänds ljusen efter manusets kväll (oppningManus EVENING).
  const opening = useOpeningEvening();
  const e = opening ?? eveningProgress(sim);
  const built = useMemo(() => {
    const all = buildWindows();
    const groups = { home: all.filter((w) => w.kind !== 'venue'), venue: all.filter((w) => w.kind === 'venue') };
    const geo = new THREE.PlaneGeometry(1, 1);
    const mats = { home: new THREE.MeshBasicMaterial({ map: paneTexture(2, 2) }), venue: new THREE.MeshBasicMaterial({ map: paneTexture(3, 2) }) };
    const off = new THREE.Color(COLOURS.windowOff);
    const dummy = new THREE.Object3D();
    const owners = [...new Set(all.filter((w) => w.kind === 'home').map((w) => w.owner))];
    const ownerIndex = new Map(owners.map((o, i) => [o, i]));
    const inst = (Object.keys(groups) as Array<keyof typeof groups>).map((k) => {
      const list = groups[k];
      const im = new THREE.InstancedMesh(geo, mats[k], Math.max(1, list.length));
      list.forEach((w, i) => {
        dummy.position.set(w.x, w.y, w.z);
        dummy.rotation.set(0, w.ry, 0);
        dummy.scale.set(w.w, w.h, 1);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        im.setColorAt(i, off);
      });
      im.count = list.length;
      // Varje fönster: sitt tändningsvärde, ton och regel.
      const meta = list.map((w, i) => {
        const n = ownerIndex.get(w.owner) ?? i;
        if (w.kind === 'home') {
          const tone = new THREE.Color(hash(n, 8) < LIGHTS.homes.tvShare ? COLOURS.tv : COLOURS.home[Math.floor(hash(n, 6) * 3)]);
          return { lit: w.j % 3 === 0 || hash(n * 7 + w.j, 9) > 0.35, on: lerp(LIGHTS.homes.on[0], LIGHTS.homes.on[1], hash(n, 11)), bed: lerp(LIGHTS.homes.bed[0], LIGHTS.homes.bed[1], hash(n, 12)), tone, c: 0 };
        }
        if (w.kind === 'school') {
          const late = hash(i, 32) < 0.12;
          return { lit: true, on: 0, bed: late ? LIGHTS.school.lateKitchen : lerp(LIGHTS.school.off[0], LIGHTS.school.off[1], hash(i, 31)), tone: new THREE.Color(COLOURS.home[1]), c: 0 };
        }
        if (w.kind === 'rooms') return { lit: hash(i, 35) > 0.3, on: lerp(LIGHTS.hotelRooms.on[0], LIGHTS.hotelRooms.on[1], hash(i, 33)), bed: lerp(LIGHTS.hotelRooms.off[0], LIGHTS.hotelRooms.off[1], hash(i, 34)), tone: new THREE.Color(COLOURS.home[2]), c: 0 };
        return { lit: true, on: 0, bed: 1, tone: new THREE.Color(COLOURS.venue), c: 0 };
      });
      // Det tända fönstrets färg: tonen förstärkt (krogar 2,8, hus 2,2).
      meta.forEach((m, i) => m.tone.multiplyScalar(list[i].kind === 'venue' ? LIT_GAIN.venue : LIT_GAIN.home));
      return { im, list, meta };
    });
    const group = new THREE.Group();
    inst.forEach((x) => group.add(x.im));
    return { group, inst, off, geo, mats, count: all.length };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') document.body.dataset.villageWindows = String(built.count);
    return () => { built.geo.dispose(); built.mats.home.map?.dispose(); built.mats.venue.map?.dispose(); built.mats.home.dispose(); built.mats.venue.dispose(); };
  }, [built]);

  const venues = useMemo(() => venuesTonight(sim), [sim.day.dayNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    built.group.visible = e !== null;
    if (e === null) return;
    const dt = Math.min(delta, 0.1);
    const out = new Set(villageLive().outHomes);
    const light: Record<string, { open: number; busy: number }> = {};
    const c = new THREE.Color();
    let lit = 0;
    for (const { im, list, meta } of built.inst) {
      list.forEach((w, i) => {
        const m = meta[i];
        let target = 0;
        if (w.kind === 'home') target = m.lit && e >= m.on && e < m.bed && !out.has(w.owner) ? 1 : 0;
        else if (w.kind === 'school') target = e < m.bed ? 1 : 0;
        else if (w.kind === 'rooms') target = m.lit && e >= m.on && e < m.bed ? 1 : 0;
        else {
          const v = light[w.owner] ?? (light[w.owner] = venueLightTargets(sim, w.owner, !!venues.find((x) => x.id === w.owner)?.open));
          target = w.role === 'kitchen' ? v.busy : v.open;
        }
        m.c = m.c < target ? Math.min(target, m.c + RAMP_PER_S * dt) : Math.max(target, m.c - RAMP_PER_S * dt);
        if (m.c > 0.5) lit++;
        im.setColorAt(i, c.copy(built.off).lerp(m.tone, m.c));
      });
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    if (typeof document !== 'undefined') document.body.dataset.villageWindowsLit = String(lit);
  });

  return <primitive object={built.group} />;
}
