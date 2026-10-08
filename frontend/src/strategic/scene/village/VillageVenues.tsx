// ORDER 288 — byns krogar på kartan (Vision Owner 2026-10-01): "krogar som
// lyser när de har öppet" och "Varje nivå visar det som är viktigt på den
// höjden: krogarna och grupperna i byn".
//
// Varje krog (spelarens och rivalerna, sim/village.ts venuesTonight) får
//   - ett varmt sken vid dörren när den har öppet i kväll (en lykta och en
//     gloria som syns från byns höjd), och mörkt när den är stängd;
//   - en etikett i HUD-lagret (Designs leveransnot §4: namnen i HUD:en, inte
//     i bilden) med namn, mat, stjärnor, öppet och kvällens gäster. Den syns
//     i byn och kvarteret, inte nära krogen där rummet tar över.
// Vagnarna står på kvällens plats (paket 2:s tre platser) med markis och
// upplyst lucka, som i Designs byTruckar.js.

import { conceptTonight } from '../../simulation/guestTypes';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { useCamera } from '../../camera/CameraContext';
import { useSimState } from '../../simulation/SimulationProvider';
import { skyState } from '../../../lib/lighting/skyState';
import { PLAYER_VENUE, venuesTonight } from '../../../sim/village';
import { makePlayerTrailer } from '../playerTruck';
import { PlayerTruckCrew } from './PlayerTruckCrew';
import { OwnerAtDoor } from './OwnerAtDoor';
import { FikaAtTable } from '../FikaAtTable';
import { DecanterAtLounge } from '../DecanterAtLounge';
const TIER_PIPS: Record<string, number> = { enkel: 1, bistro: 2, soigne: 3 };
import { ladderStep } from '../../../sim/ladderStep';
import { PATH_KEY } from '../../ui/DinVag';
import { t as tt, type StringKey } from '../../../content/nexusStrings';
import { useLanguage } from '../../../content/language';
import { playerTruckPlacement, truckPlacement, truckSpotPlace, venueLampPoint, venuePlaces } from '../../content/villagePlaces';
import { readabilityScale } from '../../util/readability';
import { subscribeVillageLive, villageLive } from './villageLive';
import { VenueLabel } from '../../ui/VillageLabels';
import { computePlayerBusinessInterior } from '../../business/interiorLayout';
import { roofAt } from '../../village/roofBlend';
import { useBusiness } from '../../business/BusinessContext';
import { strings } from '../../../content/strings';
import { BLEND, LIGHTS } from '../../village/villageEvening';
import { venueLightTargets } from './venueLight';

// ORDER 297 — glorian: grundstorleken och "fullt hus" för skenets styrka (Designs byKvall.js: 14 m, 14 gäster).
const HALO_BASE_M = 14;
const FULL_HOUSE_GUESTS = 14;
const smoothRange = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const approach = (v: number, target: number, step: number) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));

export const LABELS_FROM_M = 110;
// ORDER 300 §7 — vår skylt nära: så länge taket står nästan helt (roofBlend.ts),
// ovanför dörren.
const NEAR_SIGN_ROOF = 0.9;
const NEAR_SIGN_Y_M = 6;
const COMPACT_FROM_M = 450;
const TRUCK_COLOURS: Record<string, { body: string; awning: [string, string] }> = {
  grillvagnen: { body: '#8a3f2c', awning: ['#e9c46a', '#8a3f2c'] },
  tacovagnen: { body: '#2f6b5a', awning: ['#f0e2c4', '#2f6b5a'] },
  // ORDER 315b — spelarens svenska grill: blå och gul, skild från de två andra
  // (formen kommer från Designs D7).
  [PLAYER_VENUE]: { body: '#2c4f86', awning: ['#f2c94c', '#2c4f86'] }
};

function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,214,150,1)');
  g.addColorStop(0.35, 'rgba(255,170,90,0.45)');
  g.addColorStop(1, 'rgba(255,140,60,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeTruck(id: string): THREE.Group {
  const col = TRUCK_COLOURS[id] ?? TRUCK_COLOURS.grillvagnen;
  const g = new THREE.Group();
  const m = (c: string, e?: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: e ? new THREE.Color(e) : undefined, emissiveIntensity: e ? 1.2 : 0 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  add(new THREE.BoxGeometry(2.4, 2.5, 5.6), m(col.body), 0, 1.65, -0.4);
  add(new THREE.BoxGeometry(2.3, 1.7, 1.4), m(new THREE.Color(col.body).multiplyScalar(0.6).getStyle()), 0, 1.25, 2.9);
  for (const wz of [-2.2, 1.0, 2.9]) for (const wx of [-1.15, 1.15]) {
    const wh = add(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12), m('#1c1a19'), wx, 0.45, wz);
    wh.rotation.z = Math.PI / 2;
  }
  add(new THREE.BoxGeometry(0.06, 0.9, 3.6), m('#ffe2a0', '#ffb050'), 1.22, 2.0, -0.6);
  for (let i = 0; i < 6; i++) {
    const st = add(new THREE.BoxGeometry(1.2, 0.06, 0.62), m(col.awning[i % 2]), 1.8, 2.6, -2.2 + i * 0.64);
    st.rotation.z = -0.25;
  }
  // ORDER 315b del 2 — spelarens vagn är Designs släpvagn (makePlayerTrailer), med trädäcket.
  return g;
}

export function VillageVenues() {
  const sim = useSimState();
  const { business: playerBusiness } = useBusiness();
  const playerClass = sim.economy.businessClass;
  // ORDER 307 — klassen och kvällens koncept ur varukorgen: "Vinbar · Bistro".
  const playerConcept = conceptTonight(sim);
  // ORDER 315b del 2 — Designs D7 (venueTier.ts): skylten säger steget (Bistro är ett steg) och nivån.
  const lang = useLanguage();
  const step = ladderStep(sim);
  const stepName = step ? tt(lang, PATH_KEY[step] as StringKey) : playerClass ? strings.economy.classes[playerClass] : null;
  const playerStyle = stepName ? (playerConcept ? `${stepName} · ${strings.shopTabs.tier[playerConcept]}` : stepName) : null;
  const { actualRef } = useCamera();
  const venues = useMemo(() => venuesTonight(sim), [sim.day.dayNumber, sim.competition, sim.reputation, sim.economy?.businessClass]); // eslint-disable-line react-hooks/exhaustive-deps
  const places = useMemo(() => venuePlaces(), []);
  const live = useSyncExternalStore(subscribeVillageLive, villageLive, villageLive);
  const [labelsShown, setLabelsShown] = useState(false);
  // ORDER 300 §7 — vår krogs skylt på kvarterets och gatans nivå (närmare än
  // etiketterna i byn, så länge taket står), vid entrén.
  const [nearSign, setNearSign] = useState(false);
  const nearRef = useRef(false);
  const entrance = useMemo(() => computePlayerBusinessInterior()?.entrance ?? null, []);
  const ourVenue = venues.find((v) => v.kind === 'player') ?? null;
  // I byn (längre bort än kvarteret) är etiketterna korta: namn, stjärnor, gäster.
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const camera = useThree((x) => x.camera);
  const size = useThree((x) => x.size);
  const labelEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const frame = useRef(0);
  const proj = useMemo(() => new THREE.Vector3(), []);
  const shownRef = useRef(false);
  const tex = useMemo(() => glowTexture(), []);
  const root = useMemo(() => new THREE.Group(), []);
  const glows = useRef<Array<{ id: string; sprite: THREE.Sprite; lamp: THREE.Mesh }>>([]);
  const trucks = useRef<Map<string, THREE.Group>>(new Map());
  const venueK = useRef<Record<string, number>>({});

  // Skenet vid varje krog med dörr (vagnarna har sin lucka).
  useEffect(() => {
    const made: typeof glows.current = [];
    for (const [id, p] of Object.entries(places)) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const lampAt = venueLampPoint(p);
      sprite.position.set(lampAt[0], 5, lampAt[1]);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: '#4a3020', emissive: new THREE.Color('#ffb060'), emissiveIntensity: 0 }));
      lamp.position.copy(sprite.position).setY(3.2);
      root.add(sprite, lamp);
      made.push({ id, sprite, lamp });
    }
    glows.current = made;
    return () => {
      for (const gl of made) {
        root.remove(gl.sprite, gl.lamp);
        gl.sprite.material.dispose();
        gl.lamp.geometry.dispose();
        (gl.lamp.material as THREE.Material).dispose();
      }
    };
  }, [places, root, tex]);

  // Vagnarna på kvällens plats.
  useEffect(() => {
    // ORDER 315b — spelarens foodtruck (v.spot); del 2: på sin egen plats.
    const onSpot = (o: typeof venues[number]) => o.kind === 'truck' || (o.kind === 'player' && !!o.spot);
    for (const t of trucks.current.values()) t.visible = false;
    for (const v of venues) {
      if (!onSpot(v)) continue;
      let truck = trucks.current.get(v.id);
      if (!truck) {
        // ORDER 315b del 2 — spelarens egen släpvagn (Designs D7 playerTruck.ts).
        truck = v.kind === 'player' ? makePlayerTrailer(TIER_PIPS[conceptTonight(sim) ?? 'enkel'] ?? 1) : makeTruck(v.id);
        trucks.current.set(v.id, truck);
        root.add(truck);
      }
      truck.visible = v.open && !!v.spot;
      if (!v.spot) continue;
      // Två vagnar på samma plats står efter varandra (villagePlaces.ts truckPlacement).
      // ORDER 315b del 2 — spelarens vagn har en egen plats (playerTruckPlacement).
      const same = venues.filter((o) => o.kind === 'truck' && o.spot === v.spot);
      const at = v.kind === 'player' ? playerTruckPlacement() : truckPlacement(v.spot, same.findIndex((o) => o.id === v.id));
      truck.position.set(at.x, 0, at.z);
      truck.rotation.y = at.rotationY;
    }
  }, [venues, root]);

  useEffect(() => () => {
    for (const t of trucks.current.values()) {
      t.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
      root.remove(t);
    }
    trucks.current.clear();
    tex.dispose();
  }, [root, tex]);

  useFrame((_, delta) => {
    const dist = actualRef.current.distance;
    const night = Math.max(0.35, skyState.nightFactor);
    const scale = readabilityScale(dist, { rampStart: 150, rampEnd: 1200, maxScale: 6 });
    // ORDER 297 — krogens fyra lägen (venueLight.ts) och glorian som växer med
    // gästerna (Designs LIGHTS.venue: haloPerGuest, rampS; BLEND.halo).
    const halo = smoothRange(BLEND.halo[0], BLEND.halo[1], dist);
    const inside = villageLive().inside;
    const step = Math.min(delta, 0.1) / LIGHTS.venue.rampS;
    for (const gl of glows.current) {
      const v = venues.find((x) => x.id === gl.id);
      // ORDER 315b — spelaren i foodtrucken: huset är inte spelarens, och vagnen har sin lucka.
      const t = venueLightTargets(sim, gl.id, !!v?.open && !v?.spot);
      const k = (venueK.current[gl.id] = approach(venueK.current[gl.id] ?? 0, t.open, step));
      const n = gl.id === PLAYER_VENUE ? sim.seatedIds.length : inside[gl.id] ?? 0;
      const fill = Math.min(1, n / FULL_HOUSE_GUESTS);
      const opacity = 0.5 * k * halo * (0.5 + 0.5 * fill) * night;
      (gl.sprite.material as THREE.SpriteMaterial).opacity = opacity;
      gl.sprite.visible = opacity > 0.01;
      gl.sprite.scale.setScalar((HALO_BASE_M + LIGHTS.venue.haloPerGuest * Math.sqrt(n)) * scale);
      (gl.lamp.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6 * k * night;
    }
    const near = !!entrance && !!ourVenue && !ourVenue.spot && !!playerBusiness.name && dist <= LABELS_FROM_M && roofAt(dist) >= NEAR_SIGN_ROOF;
    if (near !== nearRef.current) {
      nearRef.current = near;
      setNearSign(near);
    }
    const want = dist > LABELS_FROM_M;
    if (want !== shownRef.current) {
      shownRef.current = want;
      setLabelsShown(want);
    }
    const c = dist > COMPACT_FROM_M;
    if (c !== compactRef.current) {
      compactRef.current = c;
      setCompact(c);
    }
    // Etiketterna får inte ligga över varandra: de som skulle överlappa på
    // skärmen flyttas uppåt, närmast först (några gånger i sekunden).
    if (want && ++frame.current % 6 === 0) {
      const placed: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
      const items = venues.flatMap((v) => {
        const el = labelEls.current.get(v.id);
        const p = v.spot ? truckSpotPlace(v.spot).doorPoint : places[v.id]?.centre;
        if (!el || !p) return [];
        proj.set(p[0], v.spot ? 6 : 14, p[1]).project(camera);
        return [{ el, ours: v.id === PLAYER_VENUE, x: (proj.x * 0.5 + 0.5) * size.width, y: (-proj.y * 0.5 + 0.5) * size.height, w: el.offsetWidth, h: el.offsetHeight }];
      // ORDER 297 (Designs Byn i kvällsljus omtag §9: "en regel för när namn
      // krockar, till exempel att vår krog alltid ligger överst"): vår krogs
      // namn placeras först och flyttas aldrig, och ritas överst.
      }).sort((a, b) => (a.ours === b.ours ? b.y - a.y : a.ours ? -1 : 1));
      // ORDER 300 §7 — HUD:ens rutor räknas som upptagna, så att en etikett
      // inte flyttas in under klockan, kassan eller nivåraden. Först uppåt;
      // når den HUD:en prövas nedåt från sin plats.
      const hud = [...document.querySelectorAll('.gb-topleft > *, .gb-topright, .nx-hud-tools, [data-testid=service-tabs], .nx-feed-back')].map((e) => {
        const r = e.getBoundingClientRect();
        return { x0: r.left, x1: r.right, y0: r.top, y1: r.bottom };
      }).filter((r) => r.x1 > r.x0 && r.y1 > r.y0);
      for (const it of items) {
        const start = it.y - it.h / 2;
        let y0 = start;
        const x0 = it.x - it.w / 2;
        const x1 = x0 + it.w;
        const hitAt = (y: number) => placed.find((r) => x0 < r.x1 && x1 > r.x0 && y < r.y1 && y + it.h > r.y0) ?? hud.find((r) => x0 < r.x1 && x1 > r.x0 && y < r.y1 && y + it.h > r.y0);
        let dir = -1;
        for (let guard = 0; guard < 16; guard++) {
          const hit = hitAt(y0);
          if (!hit) break;
          if (dir < 0 && hud.includes(hit)) { dir = 1; y0 = start; continue; }
          y0 = dir < 0 ? hit.y0 - it.h - 4 : hit.y1 + 4;
        }
        placed.push({ x0, x1, y0, y1: y0 + it.h });
        const dy = Math.round(y0 - (it.y - it.h / 2));
        it.el.style.transform = dy !== 0 ? `translateY(${dy}px)` : '';
        if (it.el.parentElement) it.el.parentElement.style.zIndex = it.ours ? '2' : '1';
      }
    }
  });

  return (
    <>
      <primitive object={root} />
      {/* ORDER 315b del 2 — besättningen i spelarens vagn (D7 truckClips.ts). */}
      <PlayerTruckCrew />
      {/* ORDER 315b del 2 — Åsa vid dörren med erbjudandet (D7 ownerOffer.ts). */}
      <OwnerAtDoor />
      {/* ORDER 315b del 2 — fikat vid bordet efter stängning (D7 afterHoursFika.ts). */}
      <FikaAtTable />
      {/* ORDER 306b — karaffen på loungebord B i Karaffen (D8 decanterProps.ts). */}
      <DecanterAtLounge />
      {nearSign && entrance && ourVenue && (
        <group position={[entrance[0], NEAR_SIGN_Y_M, entrance[1]]}>
          <Html center zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}>
            <VenueLabel v={ourVenue} guests={sim.day.arrivalsToday ?? 0} compact={false} near playerName={playerBusiness.name} playerStyle={playerStyle} playerTier={playerConcept} innerRef={() => {}} />
          </Html>
        </group>
      )}
      {labelsShown && venues.map((v) => {
        const p = v.spot ? truckSpotPlace(v.spot).doorPoint : places[v.id]?.centre;
        if (!p) return null;
        const guests = v.id === PLAYER_VENUE ? sim.day.arrivalsToday ?? 0 : live.arrived[v.id] ?? 0;
        return (
          <group key={v.id} position={[p[0], v.spot ? 6 : 14, p[1]]}>
            <Html center zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}>
              <VenueLabel v={v} guests={guests} compact={compact} playerName={playerBusiness.name} playerStyle={playerStyle} playerTier={playerConcept} innerRef={(el) => { if (el) labelEls.current.set(v.id, el); else labelEls.current.delete(v.id); }} />
            </Html>
          </group>
        );
      })}
    </>
  );
}
