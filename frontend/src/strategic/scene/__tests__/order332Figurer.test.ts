// ORDER 332 B — Designs D12 (levande figurer, leverans 2026-10-11): ryggsäckarna, ansiktenas övergångar, temperamentet,
// de tre intensiteterna, varianterna, svaren och kopplingen i spelet (figureLife.liveFrame). Grillvagnen (D12 §4) prövas
// inte här (del C).
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FIGURE_LIFE } from '../../../sim/balance';
import { createFigureRig } from '../figureRig';
import { CLIPS, sampleClip, validateClips } from '../figureClips';
import { FACE_INTENSITY, FACE_SHAPES, faceShape, shapeOf, type FaceHandle, type FaceState } from '../figureFace';
import { FigureLives, ampOf, faceAt, faceKOf, intensityOfGuest, lifeAt, lifeTimeline, lifeWindow, liveFrame, passNodTarget, pressureOf, scalePose, restPose, type FaceBeat } from '../figureLife';
import { INTENSITY, REACTIONS, TEMPERAMENT, VARIANTS, intensityFor, pickGesture, pickVariant, pickVariantApart, temperamentOf } from '../gestureMap';
import { BACKPACK, CARRY_RULES, checkCarried, dressGroup } from '../guestGroups';
import { MoodGestures, baseOf, conversationAt, partyPlan } from '../moodGestures';
import type { MoodId } from '../guestMood';

const here = dirname(fileURLToPath(import.meta.url));
const src = (p: string) => readFileSync(resolve(here, '..', p), 'utf8');
const MOODS: MoodId[] = ['delighted', 'content', 'waiting', 'impatient', 'displeased'];

describe('ORDER 332 B §1 — det de bär (guestGroups.ts BACKPACK, checkCarried)', () => {
  it('ryggsäcken sitter högt på ryggen: checkCarried godkänner studenternas rigg i båda varianterna', () => {
    for (const variant of [0, 1]) {
      const rig = createFigureRig({ variant: 'guest' });
      dressGroup(rig, 'student', variant);
      const pack = rig.joints.chest.children.find((o) => o.name === 'sign.backpack') as THREE.Mesh;
      expect(pack).toBeTruthy();
      expect(checkCarried(rig)).toEqual([]);
      const top = pack.position.y + BACKPACK.h / 2;
      expect(top).toBeGreaterThanOrEqual(CARRY_RULES.backpack.topY[0]);
      expect(top).toBeLessThanOrEqual(CARRY_RULES.backpack.topY[1]);
      // Remmarna över axlarna och luvan på axlarna (0,6), inte i bröstet (0,49).
      expect(rig.joints.chest.children.filter((o) => o.name === 'sign.strapTop').length).toBe(2);
      expect(rig.joints.chest.children.find((o) => o.name === 'sign.hood')!.position.y).toBeCloseTo(0.6, 3);
    }
  });

  it('checkCarried hittar en ryggsäck på rumpan (D11:s läge, chest-y −0,05)', () => {
    const rig = createFigureRig({ variant: 'guest' });
    dressGroup(rig, 'student', 0);
    rig.joints.chest.getObjectByName('sign.backpack')!.position.y = -0.05;
    expect(checkCarried(rig).length).toBeGreaterThan(0);
  });

  it('turistens kamera hänger framför höften, inte under höftlinjen', () => {
    const rig = createFigureRig({ variant: 'guest' });
    dressGroup(rig, 'tourist', 0);
    const cam = rig.joints.chest.getObjectByName('sign.camera');
    if (cam) expect(cam.position.y).toBeGreaterThan(0.15);
  });
});

describe('ORDER 332 B §2 — ansiktet går över (figureFace.ts)', () => {
  it('lika många hörn i alla fem uttrycken och det vilande, i båda skalen', () => {
    for (const lod of ['near', 'far'] as const) {
      const n = FACE_SHAPES[lod].neutral;
      for (const m of MOODS) {
        const f = FACE_SHAPES[lod][m];
        expect([f.eye.length, f.brow.length, f.mouth.length], `${lod} ${m}`).toEqual([n.eye.length, n.brow.length, n.mouth.length]);
        expect([f.eye.length, f.brow.length, f.mouth.length]).toEqual([6, 4, 6]);
      }
    }
  });

  it('övergången nöjd → glad interpolerar hörn för hörn: mitten ligger mellan början och slutet', () => {
    const at = (t: number): FaceState => ({ from: { mood: 'content', k: 1 }, to: { mood: 'delighted', k: 1 }, t, blink: 0, gaze: 0 });
    const a = shapeOf('far', at(0)), m = shapeOf('far', at(0.5)), b = shapeOf('far', at(1));
    expect(a.mouth).toEqual(faceShape('far', 'content').mouth);
    expect(b.mouth).toEqual(faceShape('far', 'delighted').mouth);
    m.mouth.forEach((p, i) => {
      expect(p[1]).toBeCloseTo((a.mouth[i][1] + b.mouth[i][1]) / 2, 6);
    });
  });

  it('blinkningen sluter ögonen och intensiteten flyttar formen från det vilande ansiktet', () => {
    const open = shapeOf('near', { from: { mood: 'content', k: 1 }, to: { mood: 'content', k: 1 }, t: 1, blink: 0, gaze: 0 });
    const shut = shapeOf('near', { from: { mood: 'content', k: 1 }, to: { mood: 'content', k: 1 }, t: 1, blink: 1, gaze: 0 });
    const h = (s: typeof open) => s.eye[5][1] - s.eye[0][1];
    expect(h(shut)).toBeLessThan(h(open) * 0.2);
    const span = (k: number) => { const f = faceShape('far', 'delighted', k); return f.mouth[3][1] - f.mouth[0][1]; };
    expect(span(FACE_INTENSITY.weak)).toBeLessThan(span(FACE_INTENSITY.clear));
    expect(span(FACE_INTENSITY.clear)).toBeLessThan(span(FACE_INTENSITY.strong));
  });

  it('faceAt: ett nytt uttryck går över på temperamentets faceTransS och stannar sedan', () => {
    const beats: FaceBeat[] = [{ t: 10, mood: 'delighted', k: 1 }];
    const T = TEMPERAMENT.calm.faceTransS;
    expect(faceAt(beats, { mood: 'content', k: 1 }, 9, T).t).toBe(1);
    expect(faceAt(beats, { mood: 'content', k: 1 }, 10 + T / 2, T).t).toBeCloseTo(0.5, 6);
    const end = faceAt(beats, { mood: 'content', k: 1 }, 30, T);
    expect([end.to.mood, end.t]).toEqual(['delighted', 1]);
    expect(TEMPERAMENT.lively.faceTransS).toBeGreaterThanOrEqual(FIGURE_LIFE.face.transitionS.min);
    expect(TEMPERAMENT.reserved.faceTransS).toBeLessThanOrEqual(FIGURE_LIFE.face.transitionS.max);
  });
});

describe('ORDER 332 B §2 — livet i vila (figureLife.ts)', () => {
  it('samma frö och samma t ger samma bild; blinkningar och blickar finns', () => {
    const a = lifeTimeline(7, 'lively', 60), b = lifeTimeline(7, 'lively', 60);
    expect(a).toEqual(b);
    expect(a.blinks.length).toBeGreaterThan(10);
    expect(a.glances.length).toBeGreaterThan(5);
    expect(lifeAt(a, 12.3, 0, true)).toEqual(lifeAt(b, 12.3, 0, true));
  });

  it('under en gest dämpas blickarna och driften till busyK', () => {
    const tl = lifeTimeline(3, 'calm', 60);
    let maxFree = 0, maxBusy = 0;
    for (let t = 0; t < 60; t += 0.1) { maxFree = Math.max(maxFree, Math.abs(lifeAt(tl, t, 0).headYaw)); maxBusy = Math.max(maxBusy, Math.abs(lifeAt(tl, t, 1).headYaw)); }
    expect(maxBusy).toBeLessThan(maxFree * (FIGURE_LIFE.life.busyK + 0.05));
  });

  it('fönstren: huvudets drift hoppar inte vid fönstrets gräns', () => {
    const W = FIGURE_LIFE.windowS;
    const a = lifeAt(lifeWindow(11, 'calm', 0), W - 0.001), b = lifeAt(lifeWindow(11, 'calm', 1), W + 0.001);
    expect(Math.abs(a.headRoll - b.headRoll)).toBeLessThan(0.01);
  });
});

describe('ORDER 332 B §3 — temperament, intensitet och varianter (gestureMap.ts, balance.ts FIGURE_LIFE)', () => {
  it('talen läses ur balance.ts', () => {
    expect(TEMPERAMENT).toBe(FIGURE_LIFE.temperament);
    expect(INTENSITY.strong.faceK).toBe(FIGURE_LIFE.faceIntensity.strong);
    expect(FACE_INTENSITY).toBe(FIGURE_LIFE.faceIntensity);
  });

  it('temperamentet skalar gestens storlek: livlig större än lugn, lugn större än reserverad, benen skalas inte', () => {
    const rest = restPose('chair');
    const pose = sampleClip('guest.waveWaiter', 1.2, 'normal', { seatKind: 'chair', seated: true }).pose;
    const dev = (amp: number) => Math.abs((scalePose(rest, pose, amp).armR?.swing ?? 0) - (rest.armR?.swing ?? 0));
    expect(dev(TEMPERAMENT.lively.amp)).toBeGreaterThan(dev(TEMPERAMENT.calm.amp));
    expect(dev(TEMPERAMENT.calm.amp)).toBeGreaterThan(dev(TEMPERAMENT.reserved.amp));
    expect(scalePose(rest, pose, 1.3).legL).toEqual(pose.legL);
    expect(scalePose(rest, pose, 1.3).hipDrop).toBe(pose.hipDrop);
    expect(ampOf('strong', 'lively')).toBeCloseTo(TEMPERAMENT.lively.amp * INTENSITY.strong.amp, 9);
  });

  it('tre intensiteter, och intensityFor väljer nivån ur trycket', () => {
    expect(Object.keys(INTENSITY)).toEqual(['weak', 'clear', 'strong']);
    expect([INTENSITY.weak.tempo, INTENSITY.clear.tempo, INTENSITY.strong.tempo]).toEqual(['calm', 'normal', 'stressed']);
    expect(intensityFor(0)).toBe('weak');
    expect(intensityFor(0.5)).toBe('clear');
    expect(intensityFor(0.9)).toBe('strong');
    // Måttligt otålig = tydlig, mycket otålig = stark (MOOD_BALANCE.threshold otålig 0,40–0,55).
    // Precis under väntar (0,545) svag, mitt i (0,475) tydlig, nära missnöjd (0,405) stark.
    expect(intensityOfGuest(0.545)).toBe('weak');
    expect(intensityOfGuest(0.475)).toBe('clear');
    expect(intensityOfGuest(0.405)).toBe('strong');
    expect(pressureOf(0.7, { s: 40, waveS: 40 })).toBe(1);
    expect(faceKOf('strong', 'lively')).toBeGreaterThan(faceKOf('weak', 'reserved'));
  });

  it('temperamentOf är deterministiskt och ger alla tre', () => {
    const seen = new Set(Array.from({ length: 60 }, (_, i) => temperamentOf(i)));
    expect(seen).toEqual(new Set(['calm', 'lively', 'reserved']));
    expect(temperamentOf(17)).toBe(temperamentOf(17));
  });

  it('varianterna finns som klipp, A och B växlar, grannar gör aldrig samma variant samtidigt', () => {
    expect(validateClips()).toEqual([]);
    for (const [k, v] of Object.entries(VARIANTS)) {
      expect(v.length, k).toBeGreaterThanOrEqual(2);
      for (const c of v) expect(CLIPS[c], c).toBeTruthy();
    }
    expect(pickVariant('guest.laugh', 4, 0).clip).not.toBe(pickVariant('guest.laugh', 4, 1).clip);
    for (let i = 0; i < 20; i++) {
      const a = pickVariantApart('guest.laugh', i, 0, []);
      const b = pickVariantApart('guest.laugh', i, 0, [a.clip]);
      expect(b.clip).not.toBe(a.clip);
    }
    const hands = Array.from({ length: 100 }, (_, i) => pickVariant('guest.waveStaff', i, 0).hand);
    expect(hands.filter((h) => h === 'L').length).toBe(Math.round(100 * FIGURE_LIFE.leftHandShare));
    const g = pickGesture({ mood: 'impatient', posture: 'seated', active: ['waitedTooLong'], index: 0, sinceLastS: 99, cooldownS: 6, temperament: 'lively', intensity: 'strong', count: 1, nearby: ['guest.waveWaiterB'] });
    expect(g?.clip).toBe('guest.waveWaiter');
    expect(g?.amp).toBeCloseTo(TEMPERAMENT.lively.amp * INTENSITY.strong.amp, 9);
    expect(baseOf('guest.leanTalkB')).toBe('guest.leanTalk');
  });
});

describe('ORDER 332 B §2 — svaren (REACTIONS, moodGestures.partyPlan)', () => {
  const sec = (c: string) => CLIPS[c].seconds.normal;
  const members = [{ id: 'a', temper: 'lively' as const, number: 1 }, { id: 'b', temper: 'calm' as const, number: 2 }, { id: 'c', temper: 'lively' as const, number: 3 }];

  it('alla svaren i kartan finns', () => {
    expect(REACTIONS.map((r) => r.id)).toEqual(['listen', 'jokeLands', 'smileSpreads', 'tellerReplies', 'staffSpeaks', 'badNews', 'passNod']);
  });

  it('skämtet: de andra lyssnar, den närmaste svarar vid poängen, leendet sprider sig och den som berättade småskrattar', () => {
    const dur = sec('guest.tellJoke');
    const plan = partyPlan(members, 'a', 'guest.tellJoke', 100, dur, sec);
    const b = plan.steps.get('b')!, c = plan.steps.get('c')!, a = plan.steps.get('a')!;
    expect(b[0].reaction).toBe('listen');
    expect(b[0].lookAt).toBe('a');
    expect(b[1].reaction).toBe('jokeLands');
    expect(b[1].at).toBeCloseTo(100 + FIGURE_LIFE.reaction.punchU * dur + TEMPERAMENT.calm.reactDelayS, 9);
    expect(b[1].clip).toBe(TEMPERAMENT.calm.jokeReply);
    expect(c[1].reaction).toBe('smileSpreads');
    expect(c[1].at - b[1].at).toBeCloseTo(TEMPERAMENT.lively.reactDelayS - TEMPERAMENT.calm.reactDelayS + FIGURE_LIFE.reaction.spreadS, 9);
    expect(a[0].reaction).toBe('tellerReplies');
    expect(a[0].clip).toBe('guest.chuckle');
  });

  it('i spelets vinbar: när en i sällskapet pratar lyssnar den andra mot hen (MoodGestures)', () => {
    const g = new MoodGestures(2);
    const info = (id: string) => ({ state: 'dining' as const, stateSinceS: 999, partyId: 'p', partySize: 2, partyIds: ['x', 'y'], yawTo: (o: string) => (o === id ? null : 0.5) });
    let heard = false;
    for (let t = 0; t < 600 && !heard; t += 0.25) {
      g.sample(0, 'x', 'guest.seatedIdle', 0.75, t, 'chair', null, 1, info('x'));
      g.sample(1, 'y', 'guest.seatedIdle', 0.75, t, 'chair', null, 1, info('y'));
      if (g.reactionOf(0) === 'listen' || g.reactionOf(1) === 'listen') heard = true;
    }
    expect(heard).toBe(true);
  });

  it('vid vagnens ståbord turas de om: en pratar och den andra lyssnar mot hen (conversationAt)', () => {
    const tbl = [{ id: 'a', temper: 'calm' as const, number: 1, glad: false }, { id: 'b', temper: 'calm' as const, number: 2, glad: false }];
    const x = conversationAt(tbl, 'a', 1, 0), y = conversationAt(tbl, 'b', 1, 0);
    expect(x?.clip).toMatch(/^guest\.leanTalkStand/);
    expect(y?.clip).toBe('guest.listenStand');
    expect(y?.lookAt).toBe('a');
  });

  it('passNod: personalen hittar gästen inom passNodRadiusM framför sig, inte bakom', () => {
    const R = FIGURE_LIFE.reaction.passNodRadiusM;
    expect(passNodTarget({ x: 0, z: 0, yaw: 0 }, [{ x: 0.3, z: R * 0.8 }])?.index).toBe(0);
    expect(passNodTarget({ x: 0, z: 0, yaw: 0 }, [{ x: 0, z: -R * 0.8 }])).toBeNull();
    expect(passNodTarget({ x: 0, z: 0, yaw: 0 }, [{ x: 0, z: R * 1.5 }])).toBeNull();
  });
});

describe('ORDER 332 B — kopplingen i spelet (sampleClip → scalePose → applyPose → applyLife → face.show(faceAt))', () => {
  it('liveFrame lägger livet på leden och visar ansiktet; utan ny applyPose läggs livet inte på två gånger', () => {
    const rig = createFigureRig({ variant: 'guest' });
    const shown: FaceState[] = [];
    const face = { show: (s: FaceState) => { shown.push(s); } } as unknown as FaceHandle;
    const lives = new FigureLives();
    const st = lives.of('g42', 'lively', 'content', 1);
    rig.joints.head.rotation.set(0, 0, 0);
    const r1 = liveFrame(rig, face, st, { t: 5, busy: 0, standing: true, mood: 'delighted', k: 1 });
    expect(shown.length).toBe(1);
    expect(shown[0].to.mood).toBe('delighted');
    expect(rig.joints.head.rotation.y).toBeCloseTo(r1.life.headYaw, 9);
    // Ingen applyPose emellan: det förra livet tas bort innan det nya läggs på.
    const r2 = liveFrame(rig, face, st, { t: 5.5, busy: 0, standing: true, mood: 'delighted', k: 1 });
    expect(rig.joints.head.rotation.y).toBeCloseTo(r2.life.headYaw, 9);
    // Reducerad rörelse: leden lämnas som posen satte dem.
    rig.joints.head.rotation.set(0, 0, 0);
    liveFrame(rig, face, st, { t: 6, busy: 0, standing: true, mood: 'delighted', k: 1, reduced: true });
    expect(rig.joints.head.rotation.y).toBe(0);
  });

  it('vinbaren och vagnen kör liveFrame och temperamentets skala i spelets kod', () => {
    const wine = src('WineBarFigures.tsx'), truck = src('village/PlayerTruckCrew.tsx'), mood = src('moodGestures.ts');
    expect(wine).toMatch(/liveFrame\(cast\.guestRigs\[i\], face, st,/);
    expect(wine).toMatch(/liveFrame\(rig, face, cast\.lives\.of\(key, 'calm'\)/);
    expect(wine).toMatch(/applyPassNod\(rig, hit\.yaw/);
    expect(mood).toMatch(/scaleClip\(raw, slot\.amp, seatKind\)/);
    expect(truck).toMatch(/liveFrame\(r, face!, lifeState,/);
    expect(truck).toMatch(/applyPose\(r, scaleClip\(raw, lc\.amp, null\)\.pose\)/);
    expect(truck).toMatch(/conversationAt\(g\.talkers, w\.id, t,/);
    expect(truck).toMatch(/'staff\.walkNod'/);
    // Ansiktet byts inte längre med face.set för gästerna i vinbaren och vid vagnen (bara manusfigurerna).
    expect(wine).not.toMatch(/face\.set\(cast\.moodGestures\.faceFor/);
    expect(truck).not.toMatch(/face\.set\(gestureMood \?\? mood\)/);
  });
});
