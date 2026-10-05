// ORDER 309 — Designs D5 (följderna och konceptet) i spelet: orkringen och
// trivseln, kortet och dess plats, fokusläget, Recensioner i morse,
// gästgrupperna per gästtyp, utrustningen i rummet och klippen.
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkPaletteAgainstFloors } from '../scene/wineBarRoom';
import * as THREE from 'three';
import { ORK_RING, staminaOf, wellbeingOf, wellbeingSvg, WELLBEING_SYMBOL, STAMINA } from '../scene/staffStatus';
import { orkArcs, orkFacing, orkFilled, orkRingShown, parseRgba, createOrkRing } from '../scene/orkRing';
import { checkAll, checkOverlaps, layout, placeCard, type Rect } from '../ui/hudLayout';
import { placeCardAmong, threadEnd } from '../ui/cardPlacement';
import { focusStep, focusToggle } from '../ui/focusState';
import { reviewLines, buildMorningReview, SPENT_BELOW } from '../../sim/morningReview';
import { REVIEW_CARD } from '../ui/morningReviews';
import { GROUP_IDS, groupOfGuestType, lookForGuestType, forgivesOf, dressAllGroups, showGroup, BILLIONAIRE_GOLD, HEAD_SIGNS } from '../scene/guestLooks';
import { GUEST_GROUPS } from '../scene/guestGroups';
import { createFigureRig } from '../scene/figureRig';
import { RoomEquipment, equipmentInRoom, D5_EQUIPMENT_OF } from '../scene/roomEquipment';
import { EQUIPMENT, createEquipment, type EquipmentHandle, type EquipmentId } from '../scene/equipment';
import { EQUIPMENT_IDS } from '../../sim/goods';
import { conditionClip, hesitationElapsed, HESITATE_SECONDS, HESITATOR_OF } from '../scene/conditionClips';
import { CLIPS, validateClips } from '../scene/figureClips';
import { makeNewGameState } from '../simulation/model';
import { CONSEQUENCES } from '../../sim/balance';
import { GUEST_TYPE_IDS, type GuestType, type SimulationState } from '../types';
import { STAFF_CONDITION } from '../../sim/balance';

describe('ORDER 309 — orken och trivseln (D5 staffStatus.ts)', () => {
  it('orkens tre lägen ur D5:s gränser, och bågarna per läge', () => {
    expect(staminaOf(1)).toBe('fresh');
    expect(staminaOf(0.66)).toBe('fresh');
    expect(staminaOf(0.65)).toBe('tired');
    expect(staminaOf(0.33)).toBe('tired');
    expect(staminaOf(0.32)).toBe('spent');
    expect(staminaOf(0)).toBe('spent');
    expect(STAMINA.map(orkFilled)).toEqual([3, 2, 1]);
    // Kvällens start (balance.ts STAFF_CONDITION) är pigg.
    expect(staminaOf(STAFF_CONDITION.stamina.start)).toBe('fresh');
  });

  it('ringen syns för alla i statusläget, annars bara för den som är slut', () => {
    expect(orkRingShown('fresh', true)).toBe(true);
    expect(orkRingShown('tired', true)).toBe(true);
    expect(orkRingShown('fresh', false)).toBe(false);
    expect(orkRingShown('tired', false)).toBe(false);
    expect(orkRingShown('spent', false)).toBe(true);
  });

  it('tre bågar à 108° med 12° glipa, den första centrerad mot kameran', () => {
    const arcs = orkArcs();
    expect(arcs).toHaveLength(ORK_RING.segments);
    for (const a of arcs) expect(((a.a1 - a.a0) * 180) / Math.PI).toBeCloseTo(108, 6);
    expect((arcs[0].a0 + arcs[0].a1) / 2).toBeCloseTo(0, 9);
    expect(((arcs[1].a0 - arcs[0].a1) * 180) / Math.PI).toBeCloseTo(12, 6);
    // Vridningen pekar den första bågen (lokal +x) mot kameran.
    const yaw = orkFacing(0, -3);
    const dir = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    expect(dir.x).toBeCloseTo(0, 6);
    expect(dir.z).toBeCloseTo(-1, 6);
  });

  it('ringen i rummet: bläck och papper ur D5, utanför rollringen, ingen skugga', () => {
    expect(parseRgba(ORK_RING.filled.fill)).toEqual({ colour: '#2a1c13', alpha: 0.88 });
    const r = createOrkRing();
    r.set('tired');
    const meshes: THREE.Mesh[] = [];
    r.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    expect(meshes).toHaveLength(3);
    expect(meshes.every((m) => !m.castShadow)).toBe(true);
    const filled = meshes.filter((m) => (m.material as THREE.MeshBasicMaterial).opacity === 0.88).length;
    expect(filled).toBe(2);
    const box = new THREE.Box3().setFromObject(r.group);
    expect(box.max.x).toBeCloseTo(ORK_RING.outerM, 2);
    r.dispose();
  });

  it('trivselns tre lägen och plattan', () => {
    expect(wellbeingOf(0.8)).toBe('thriving');
    expect(wellbeingOf(STAFF_CONDITION.wellbeing.restingValue)).toBe('thriving');
    expect(wellbeingOf(0.5)).toBe('okay');
    expect(wellbeingOf(0.2)).toBe('low');
    const svgs = (['thriving', 'okay', 'low'] as const).map((id) => wellbeingSvg(id));
    for (const s of svgs) { expect(s).toContain(WELLBEING_SYMBOL.plate); expect(s).toContain(WELLBEING_SYMBOL.rim); }
    expect(new Set(svgs).size).toBe(3);
  });
});

describe('ORDER 309 — kortets plats och panelerna (D5 hudLayout.ts)', () => {
  it('D5:s kontroll: 0 överlapp i båda storlekarna och lägena', () => {
    for (const row of checkAll()) expect(row.overlaps).toEqual([]);
  });

  it('kortet läggs aldrig över en panel, varken mot D5:s HUD eller spelets', () => {
    // Spelets paneler i 1440 × 900 (ungefär som layoutkörningen mäter dem):
    // klockan, kassan och bandet uppe till vänster, menyn uppe till höger,
    // raketkortet till vänster, flikarna nere till vänster och knapparna nere till höger.
    const game: Rect[] = [
      { id: 'topleft', x: 54, y: 38, w: 1064, h: 174 },
      { id: 'topright', x: 1206, y: 38, w: 180, h: 32 },
      { id: 'rocket', x: 67, y: 224, w: 557, h: 636 },
      { id: 'tabs', x: 28, y: 822, w: 366, h: 56 },
      { id: 'tools', x: 606, y: 834, w: 676, h: 46 }
    ];
    for (const [W, H, panels] of [[1440, 900, game], [1440, 900, layout(1440, 900, 'normal')], [1280, 720, layout(1280, 720, 'normal')], [1280, 720, layout(1280, 720, 'focus')]] as [number, number, Rect[]][]) {
      for (let ax = 0.05; ax < 1; ax += 0.1) {
        for (let ay = 0.3; ay < 0.9; ay += 0.1) {
          const card = placeCardAmong(W, H, [ax * W, ay * H], Math.max(260, 0.34 * H), 0.42 * H, panels);
          expect(checkOverlaps(panels, [card]).filter((p) => p.includes('statusCard'))).toEqual([]);
          expect(card.x).toBeGreaterThanOrEqual(0);
          expect(card.y).toBeGreaterThanOrEqual(0);
          expect(card.x + card.w).toBeLessThanOrEqual(W);
          expect(card.y + card.h).toBeLessThanOrEqual(H);
        }
      }
    }
  });

  it('kortet öppnas åt den sida som har plats, och tråden går till kortets kant', () => {
    const panels = layout(1440, 900, 'normal').filter((r) => r.id !== 'rocket');
    const left = placeCardAmong(1440, 900, [500, 500], 306, 360, panels);
    expect(left.x).toBeGreaterThan(500);
    const right = placeCardAmong(1440, 900, [1100, 500], 306, 360, panels);
    expect(right.x + right.w).toBeLessThan(1100);
    // Samma sida som D5:s placeCard.
    expect(Math.sign(placeCard(1440, 900, 'normal', [500, 500], 306, 360).x - 500)).toBe(Math.sign(left.x - 500));
    const [ex] = threadEnd(left, [500, 500]);
    expect(ex).toBe(left.x);
  });
});

describe('ORDER 309 — fokusläget (D5 FOCUS_MODE)', () => {
  it('på under 14 m, av först över 15,5 m, och H växlar', () => {
    let s = { on: false, near: false };
    s = focusStep(s, 24); expect(s.on).toBe(false);
    s = focusStep(s, 13.9); expect(s.on).toBe(true);
    s = focusStep(s, 15); expect(s.on).toBe(true);
    s = focusStep(s, 15.6); expect(s.on).toBe(false);
    s = focusStep(s, 14.5); expect(s.on).toBe(false);
    s = focusToggle(s); expect(s.on).toBe(true);
    s = focusStep(s, 30); expect(s.on).toBe(true); // H slog på, kameran redan ute: står kvar
    s = focusStep(s, 10); expect(s.on).toBe(true);
    s = focusToggle(s); expect(s.on).toBe(false); // H slog av under 14 m
    s = focusStep(s, 12); expect(s.on).toBe(false);
  });
});

function evening(reviews: Array<{ incidentId: string; right: boolean; severity: 'mild' | 'medium' | 'grave' | null; reputation: number; guestType?: GuestType | null }>, staffStamina = 1): SimulationState {
  const s = makeNewGameState(1);
  s.staff = s.staff.map((m) => ({ ...m, stamina: staffStamina }));
  s.day = { ...s.day, reputationAtServiceStart: 0.6, seatedTonight: 10, answerReviews: reviews.map((r, i) => ({ ...r, table: i + 1 })) };
  return s;
}

describe('ORDER 309 — Recensioner i morse (D5 morningReviews.ts)', () => {
  const W = CONSEQUENCES.wrong;
  const cleared = CONSEQUENCES.right.stepReputation + CONSEQUENCES.right.clearedReputation;
  it('högst fyra rader, den största ändringen först, och summan är ändringen', () => {
    const ev = evening([
      { incidentId: 'vb01-korken', right: false, severity: 'grave', reputation: W.grave.reputation, guestType: 'gourmet' },
      { incidentId: 'vb01-korken', right: false, severity: 'mild', reputation: W.mild.reputation, guestType: 'student' },
      { incidentId: 'vb01-korken', right: true, severity: null, reputation: cleared, guestType: 'tourist' }
    ]);
    const lines = reviewLines(ev, -9, 3);
    expect(lines.length).toBeLessThanOrEqual(REVIEW_CARD.maxLines);
    for (let i = 1; i < lines.length; i++) expect(Math.abs(lines[i - 1].delta)).toBeGreaterThanOrEqual(Math.abs(lines[i].delta));
    expect(lines.reduce((a, l) => a + l.delta, 0)).toBe(-9);
    const kinds = lines.map((l) => l.kind);
    expect(kinds).toContain('grave');
    expect(kinds).toContain('cleared');
    // Rösten är bordets grupp.
    expect(lines.find((l) => l.kind === 'grave')!.voice).toBe('gourmet');
    expect(lines.find((l) => l.kind === 'cleared')!.voice).toBe('tourist');
  });

  it('personalen som var slut bär resten när kvällen i övrigt drog ned', () => {
    const ev = evening([{ incidentId: 'vb01-korken', right: false, severity: 'mild', reputation: W.mild.reputation, guestType: 'middle' }], SPENT_BELOW / 2);
    const lines = reviewLines(ev, -6, 3);
    const staff = lines.find((l) => l.kind === 'staff');
    expect(staff).toBeDefined();
    expect(staff!.voice).toBe('staff');
    expect(staff!.staff!.length).toBe(ev.staff.length);
    expect(lines.find((l) => l.kind === 'wrong')!.voice).toBe('villager');
  });

  it('en kväll utan svar och utan ändring är en lugn rad', () => {
    expect(reviewLines(evening([]), 0, 3).map((l) => l.kind)).toEqual(['quiet']);
  });

  it('morgonens recension bär ryktet före och efter och raderna', () => {
    const ev = evening([{ incidentId: 'vb01-korken', right: false, severity: 'medium', reputation: W.medium.reputation, guestType: 'business' }]);
    const r = buildMorningReview(ev, { ...ev, reputation: 0.56 })!;
    expect(r.from).toBe(60);
    expect(r.to).toBe(56);
    expect(r.lines!.reduce((a, l) => a + l.delta, 0)).toBe(r.change);
  });
});

describe('ORDER 309 — gästgrupperna per gästtyp (D5 guestGroups.ts)', () => {
  it('varje gästtyp har en grupp, och D5:s fem är sina egna', () => {
    for (const t of GUEST_TYPE_IDS) expect(GROUP_IDS).toContain(groupOfGuestType(t));
    expect(groupOfGuestType('student')).toBe('student');
    expect(groupOfGuestType('middle')).toBe('villager');
    expect(groupOfGuestType('tourist')).toBe('tourist');
    expect(groupOfGuestType('gourmet')).toBe('gourmet');
    expect(groupOfGuestType('business')).toBe('business');
    // Den äldre typen höginkomst (klasserna utan koncept) får affärsfolkets kavaj.
    expect(groupOfGuestType('high')).toBe('business');
  });

  it('kroppen och lemmarna ur gruppens utseende, två varianter; mannen i guld', () => {
    for (const t of ['student', 'middle', 'tourist', 'gourmet', 'business'] as GuestType[]) {
      const g = groupOfGuestType(t);
      expect(lookForGuestType(t, 0).body).toBe(GUEST_GROUPS[g].looks[0].body);
      expect(lookForGuestType(t, 1).limb).toBe(GUEST_GROUPS[g].looks[1].limb);
    }
    expect(lookForGuestType('billionaire', 0).body).toBe(BILLIONAIRE_GOLD);
  });

  // D5 §6: "Kroppsfärgerna … ska prövas med checkPaletteAgainstFloors när de är
  // inslagna." Prövat: åtta av tio ligger utanför bandet (de ljusa för ljusa, de
  // mörka för mörka); bara affärsfolkets två ligger inom. Det redovisas i
  // rapporten som en öppen fråga till Design; testet håller fast utfallet så
  // att en ändring av färgerna syns. Tecknen (hatt, keps, sjal, skjorta) bär läsningen.
  it('kroppsfärgerna mot vinbarens golv (checkPaletteAgainstFloors 1,8–3,6): utfallet i reports/order309/palett.json', () => {
    const bodies = GROUP_IDS.flatMap((g) => GUEST_GROUPS[g].looks.map((l) => l.body));
    const fails = checkPaletteAgainstFloors(undefined, undefined, bodies);
    const outside = [...new Set(fails.map((f) => f.figure))];
    mkdirSync(resolve(__dirname, '../../../reports/order309'), { recursive: true });
    writeFileSync(resolve(__dirname, '../../../reports/order309/palett.json'), JSON.stringify({ band: [1.8, 3.6], bodies, outside, fails }, null, 2) + '\n');
    expect(outside).toHaveLength(8);
    expect(GUEST_GROUPS.business.looks.every((l) => !outside.includes(l.body))).toBe(true);
  });

  it('förlåtelsen som ord följer balance.ts (studenter mycket, gourmeter lite)', () => {
    expect(forgivesOf('student')).toBe('much');
    expect(forgivesOf('middle')).toBe('some');
    expect(forgivesOf('tourist')).toBe('some');
    expect(forgivesOf('gourmet')).toBe('little');
    expect(forgivesOf('business')).toBe('little');
  });

  it('riggen bär bara gästens grupps tecken', () => {
    const rig = createFigureRig({ variant: 'guest' });
    const dressed = dressAllGroups(rig, 0);
    for (const t of ['tourist', 'student', 'business', null] as (GuestType | null)[]) {
      const g = showGroup(rig, dressed, t, 0, '#888888');
      for (const id of GROUP_IDS) for (const o of dressed.signs[id]) expect(o.visible).toBe(id === g);
      if (g) expect('#' + rig.garment.color.getHexString()).toBe(GUEST_GROUPS[g].looks[0].body);
      else expect('#' + rig.garment.color.getHexString()).toBe('#888888');
    }
    // Tecknen tonas med riggen (materialen i rig.materials).
    const mat = (dressed.signs.tourist[0] as THREE.Mesh).material as THREE.Material;
    expect(rig.materials).toContain(mat);
    expect(HEAD_SIGNS.has(GUEST_GROUPS.tourist.sign)).toBe(true);
  });
});

describe('ORDER 309 — utrustningen i rummet (D5 equipment.ts)', () => {
  const stub = (id: EquipmentId): EquipmentHandle => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(...EQUIPMENT[id].size)));
    return { id, group: g, spec: EQUIPMENT[id] };
  };

  it('alla spelets fem saker har en modell', () => {
    for (const id of EQUIPMENT_IDS) expect(EQUIPMENT[D5_EQUIPMENT_OF[id]]).toBeDefined();
    expect(equipmentInRoom(['vinkyl', 'okänd', 'vinkyl'])).toEqual(['wineFridge']);
  });

  it('det som ägs står på sin hemplats, och inget annat', () => {
    const eq = new RoomEquipment(0.1, stub);
    expect(eq.sync(undefined)).toEqual([]);
    expect(eq.shown()).toEqual([]);
    eq.sync(['vinkyl', 'ostvagn']);
    expect(eq.shown().sort()).toEqual(['cheeseCart', 'wineFridge']);
    expect(eq.group.children.every((c) => c.position.y === 0.1)).toBe(true);
    const home = EQUIPMENT.wineFridge.home.at;
    expect(eq.group.children.some((c) => c.position.x === home[0] && c.position.z === home[1])).toBe(true);
    eq.sync(['ostvagn']);
    expect(eq.shown()).toEqual(['cheeseCart']);
    eq.sync(EQUIPMENT_IDS);
    expect(eq.shown()).toHaveLength(5);
    eq.dispose();
  });

  it('vinkylen i verklig storlek (D5: 0,62 × 0,64 × 1,86 m)', () => {
    const h = createEquipment('wineFridge');
    const box = new THREE.Box3().setFromObject(h.group);
    const size = box.getSize(new THREE.Vector3());
    expect(size.y).toBeCloseTo(1.86, 1);
    expect(size.x).toBeCloseTo(0.62, 1);
  });
});

describe('ORDER 309 — klippen för personalens läge (D5 figureClips.ts §7)', () => {
  it('sju nya klipp, och leveransens kontroll är tom', () => {
    for (const id of ['trolley.push', 'trolley.present', 'cheese.cut', 'flambe.pour', 'flambe.tilt', 'staff.tiredIdle', 'staff.hesitate']) expect(CLIPS[id]).toBeDefined();
    expect(validateClips()).toEqual([]);
  });

  it('staff.tiredIdle när orken är slut och personen står still; staff.hesitate när området saknas', () => {
    expect(conditionClip('idle', false, { stamina: 'spent', hesitateAt: null })?.id).toBe('staff.tiredIdle');
    expect(conditionClip('walk', false, { stamina: 'spent', hesitateAt: null })).toBeNull();
    expect(conditionClip('idle', false, { stamina: 'tired', hesitateAt: null })).toBeNull();
    expect(conditionClip('idle', false, { stamina: 'fresh', hesitateAt: 0.5 })?.id).toBe('staff.hesitate');
    expect(conditionClip('pour', false, { stamina: 'spent', hesitateAt: 0.5 })?.id).toBe('staff.hesitate');
    expect(conditionClip('idle', false, { stamina: 'fresh', hesitateAt: HESITATE_SECONDS + 0.1 })).toBeNull();
    expect(conditionClip('walk', false, { stamina: 'fresh', hesitateAt: 0.5 })).toBeNull();
    const rocket = { secondsTotal: 20, secondsLeft: 19, introLeft: 0 };
    expect(hesitationElapsed('sommelier', rocket, 'vin', false)).toBeCloseTo(1);
    expect(hesitationElapsed('sommelier', rocket, 'vin', true)).toBeNull();
    expect(hesitationElapsed('cook', rocket, 'vin', false)).toBeNull();
    expect(hesitationElapsed('sommelier', { ...rocket, introLeft: 1 }, 'vin', false)).toBeNull();
    expect(Object.keys(HESITATOR_OF).sort()).toEqual(['mat', 'service', 'vin']);
  });
});
