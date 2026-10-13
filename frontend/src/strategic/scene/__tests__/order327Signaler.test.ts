// ORDER 327 (Anders 2026-10-11) — A. halvt grepp bara när gästen och maten är säkra (vb14, vb21; vb06 oförändrad);
// B. signalerna för stegen blick → hand → vinkning (wantSignals.ts): mer i glaset, notan, något från luckan, och
// blickkontakten. Mätningen i en kväll i vinbaren med spelets rum och regissör, matade med simuleringen tick för
// tick som i WineBarFigures.tsx, skriver reports/order327/signaler.json (WRITE_REPORTS=1; REPORT_DIR=order328 skriver dit).
// ORDER 328 C — en nick per steg, högst en omstart, Y = 25 s; mätningen räknar nickarna per sällskap.

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';
import vinbarMeta from '../../../content/incidents/vinbar.meta.json';
import vinbarSv from '../../../content/incidents/vinbar.text.sv.draft.json';
import vinbarEn from '../../../content/incidents/vinbar.text.en.json';
import { FOODTRUCK, GESTURE_BALANCE, GUESTS, TRUCK_SEATING } from '../../../sim/balance';
import { firstDayOfWeek } from '../../../sim/calendar';
import { incidentById } from '../../../sim/incidentBank';
import { rankedStepOption } from '../../../sim/incidents';
import { giveUpSatisfaction, queuePatienceSeconds } from '../../../sim/knowledgeInService';
import { makeNewGameState } from '../../simulation/model';
import { reducer } from '../../simulation/reducer';
import { UNHAPPY_THRESHOLD } from '../../simulation/reputation';
import { stocked } from '../../testHarness/stocked';
import { mountRoomLikeScene } from '../../testHarness/roomParity';
import { createRoom } from '../businessRoom';
import { computePlayerBusinessInterior } from '../../business/interiorLayout';
import { createRoomDirector } from '../WineBarFigures';
import { MoodGestures } from '../moodGestures';
import { CLIPS } from '../figureClips';
import { eatTotalSFor } from '../village/PlayerTruckCrew';
import { NOD_S, TRUCK_CHEAPEST_SEK, eyeContact, situationFor, stepWant, wantStep, wantsHatch, type StaffGlance, type WantKind } from '../wantSignals';
import type { WineBarRoom } from '../wineBarRoom';
import type { SimulationState } from '../../types';

type Opt = { id: string; quality: string; grip?: string };
type Meta = { incidents: { id: string; steps: { options: Opt[] }[] }[] };
type Texts = { texts: Record<string, { steps: { options: Record<string, { label: string; explanation?: string }> }[]; halfGrip?: Record<string, string> }> };
const META = vinbarMeta as unknown as Meta;
const step3 = (id: string) => META.incidents.find((i) => i.id === id)!.steps[2].options;
const B = GESTURE_BALANCE;

describe('ORDER 327 A — halvt grepp bara när gästen och maten är säkra', () => {
  it('vb14 steg 3: svar 2 och 3 är fel, texterna för halvt grepp borta, förklaringarna kvar', () => {
    // Filens svar 2 [A] och 3 [U] är a och b i spelets ordning (ORDER 326 roterade svaren).
    expect(step3('vb14-surdegen').map((o) => [o.id, o.quality, o.grip ?? null])).toEqual([['a', 'wrong', null], ['b', 'wrong', null], ['c', 'wrong', null], ['d', 'best', null]]);
    for (const t of [vinbarSv, vinbarEn] as unknown as Texts[]) {
      const x = t.texts['vb14-surdegen'];
      expect(x.halfGrip).toBeUndefined();
      for (const id of ['a', 'b']) expect(x.steps[2].options[id].explanation, id).toBeTruthy();
    }
    expect((vinbarSv as unknown as Texts).texts['vb14-surdegen'].steps[2].options.a.explanation).toBe('Brödet är säkert, men gluten kan finnas i såser, frityr och krutonger i nästa rätt.');
  });

  it('vb21 steg 3: svar 3 är fel, texten mot upplevelsen borta; svar 2 är kvar som halvt grepp mot analysen', () => {
    expect(step3('vb21-skuren-hand').map((o) => [o.id, o.quality, o.grip ?? null])).toEqual([['a', 'wrong', null], ['b', 'wrong', null], ['c', 'best', null], ['d', 'ok', 'analysis']]);
    for (const t of [vinbarSv, vinbarEn] as unknown as Texts[]) {
      const h = t.texts['vb21-skuren-hand'].halfGrip!;
      expect(Object.keys(h).sort()).toEqual(['analysis', 'outcomeAnalysis']);
      expect(t.texts['vb21-skuren-hand'].steps[2].options.a.explanation).toBeTruthy();
    }
  });

  it('vb06 oförändrad: halvt grepp mot analysen och mot upplevelsen', () => {
    expect(step3('vb06-kylen').map((o) => [o.id, o.quality, o.grip ?? null])).toEqual([['a', 'best', null], ['b', 'ok', 'analysis'], ['c', 'ok', 'experience'], ['d', 'wrong', null]]);
  });
});

describe('ORDER 327 B — stegen och blickkontakten (wantSignals.ts)', () => {
  const track = (kind: WantKind, since: number) => ({ kind, since, ackAt: null, ackBy: null, nodded: [], restarts: 0 });

  it('stegen från att viljan började: blicken, handen efter seekEyeS, vinkningen från waitWaveS − waitWatchS', () => {
    const w = track('refill', 100);
    expect(wantStep(w, 99)).toBeNull();
    expect(wantStep(w, 100)).toBe('eye');
    expect(wantStep(w, 100 + B.seekEyeS)).toBe('hand');
    expect(wantStep(w, 100 + B.waitWaveS - B.waitWatchS)).toBe('wave');
    expect(situationFor('refill', 'eye')).toBe('wantsRefill');
    expect(situationFor('bill', 'eye')).toBe('wantsBill');
    expect(situationFor('hatch', 'eye')).toBe('wantsHatch');
    expect(situationFor('order', 'hand')).toBe('readyToOrder');
  });

  it('blickkontakt: bara den som går förbi inom eyeContactM med ansiktet mot bordet', () => {
    const at = { x: 0, z: 0 };
    const g = (o: Partial<StaffGlance>): StaffGlance => ({ key: 'server', x: 0, z: -3, facing: 0, walking: true, visible: true, ...o });
    expect(eyeContact([g({})], at)).toBe('server');
    expect(eyeContact([g({ z: -(B.eyeContactM + 0.1) })], at)).toBeNull();
    expect(eyeContact([g({ facing: Math.PI })], at)).toBeNull();
    expect(eyeContact([g({ facing: B.eyeContactConeRad + 0.05 })], at)).toBeNull();
    expect(eyeContact([g({ walking: false })], at)).toBeNull();
    expect(eyeContact([g({ visible: false })], at)).toBeNull();
  });

  it('stegen stannar vid blickkontakten, gästen nickar, och börjar om om ingen kommer inom eyeContactComeS', () => {
    let w = stepWant(null, { kind: 'order', since: 10 }, 12, null)!;
    expect(wantStep(w, 12)).toBe('eye');
    w = stepWant(w, { kind: 'order', since: 10 }, 14, 'server')!;
    expect([w.ackAt, w.ackBy, wantStep(w, 14), wantStep(w, 14 + NOD_S + 0.01)]).toEqual([14, 'server', 'nod', null]);
    w = stepWant(w, { kind: 'order', since: 10 }, 14 + B.eyeContactComeS, null)!;
    expect(w.ackAt).toBe(14);
    const r1 = 14 + B.eyeContactComeS + 0.1;
    w = stepWant(w, { kind: 'order', since: 10 }, r1, null)!;
    expect([w.ackAt, w.since, wantStep(w, w.since), w.restarts]).toEqual([null, r1, 'eye', 1]);
    // ORDER 328 C — en nick per steg: i blicken har gästen redan nickat, så stegen går vidare till handen.
    w = stepWant(w, { kind: 'order', since: 10 }, r1 + 1, 'server2')!;
    expect(w.ackAt).toBeNull();
    const hand = r1 + B.seekEyeS + 0.1;
    w = stepWant(w, { kind: 'order', since: 10 }, hand, 'server2')!;
    expect([w.ackAt, w.nodded]).toEqual([hand, ['eye', 'hand']]);
    // Högst en omstart: efter Y står stegen stilla tills personalen är framme.
    w = stepWant(w, { kind: 'order', since: 10 }, hand + B.eyeContactComeS + 5, null)!;
    expect([w.ackAt, w.restarts, wantStep(w, hand + B.eyeContactComeS + 5)]).toEqual([hand, 1, null]);
    expect(B.eyeContactComeS).toBe(25);
    // Personalen är framme: viljan är borta.
    expect(stepWant(w, null, 90, null)).toBeNull();
  });

  it('gesterna: blicken efter viljan, nicken vid blickkontakt (guest.nodApprove), och stegen om från blicken', () => {
    const content = 0.7;
    const g = new MoodGestures(1);
    const info = (since: number, step: ReturnType<typeof wantStep>) => ({ state: 'dining' as const, stateSinceS: 0, partyId: 'p', partySize: 2, seekYaw: 0.4, want: { kind: 'refill' as const, since, step } });
    g.sample(0, 'a', 'guest.seatedIdle', content, 0, 'chair', null, 1, info(50, null));
    expect(g.sample(0, 'a', 'guest.seatedIdle', content, 50, 'chair', null, 1, info(50, 'eye'))?.base).toBe('guest.seekEye');
    expect(g.situationOf(0)).toBe('wantsRefill');
    // Mitt i blicken kommer kontakten: när klippet är slut nickar gästen, utan att vänta ut paustiden.
    // ORDER 332 B — tempot kommer ur intensiteten (D12 INTENSITY): gästen som just börjat söka blicken gör det svagt,
    // i lugnt tempo, så klippet är slut efter seconds.calm.
    const end = 50 + CLIPS['guest.seekEye'].seconds.calm;
    g.sample(0, 'a', 'guest.seatedIdle', content, end + 0.1, 'chair', null, 1, info(50, 'nod'));
    expect(g.sample(0, 'a', 'guest.seatedIdle', content, end + 0.3, 'chair', null, 1, info(50, 'nod'))?.base).toBe('guest.nodApprove');
    expect(g.faceFor(0)).toBe('content');
  });

  it('vagnen: vid ståbordet, ätit klart och pengar kvar (plånboken minus notan räcker till det billigaste)', () => {
    expect(TRUCK_CHEAPEST_SEK).toBe(20);
    expect(wantsHatch(true, true, GUESTS.walletSek.tight)).toBe(true);
    expect(wantsHatch(true, false, GUESTS.walletSek.tight)).toBe(false);
    expect(wantsHatch(false, true, GUESTS.walletSek.tight)).toBe(false);
    expect(wantsHatch(true, true, FOODTRUCK.billSek + TRUCK_CHEAPEST_SEK - 1)).toBe(false);
  });
});

// ---------- mätningen: en kväll i vinbaren ----------

function wineBarRoom(): WineBarRoom {
  mountRoomLikeScene('vinbaren', 'winebar');
  const layout = computePlayerBusinessInterior('vinbaren')!;
  return createRoom('vinbaren', { width: layout.width, depth: layout.depth, layout: 'winebar' }).raw as WineBarRoom;
}

function evening(seed: number) {
  let s: SimulationState = makeNewGameState(seed);
  s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, speed: 2, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
  s = reducer(stocked(s), { type: 'START_SERVICE' });
  const d = createRoomDirector(wineBarRoom());
  const seatedS: number[] = [];
  let ladder326 = 0;
  const since = new Map<string, [string, number]>();
  // Per sällskap och vilja: stegen som nåddes, blickkontakten och om stegen började om.
  const seen = new Map<string, { kind: WantKind; party: string; steps: Set<string>; acks: number; restarts: number; from: number; to: number; lastSince: number; whileDining: boolean }>();
  for (let i = 0; i < 40000 && s.day.period !== 'evening' && s.day.period !== 'morning'; i++) {
    const a = s.incidents.active;
    if (a?.choosing) s = reducer(s, { type: 'INCIDENT_GO' });
    else if (a && !a.pending && (a.introLeft ?? 0) <= 0 && (a.revealLeft ?? 0) <= 0) s = reducer(s, { type: 'ANSWER_INCIDENT', optionId: rankedStepOption(incidentById('vinbar', a.id)!.steps[a.step], 'best', a.struck, a.situation) });
    s = reducer(s, { type: 'TICK', dt: 0.2 });
    d.update({ t: s.simTime, guests: s.guests, patienceSeconds: queuePatienceSeconds(s), giveUpSatisfaction: giveUpSatisfaction(s), unhappyThreshold: UNHAPPY_THRESHOLD, takeover: null });
    for (const g of s.guests) {
      const p = since.get(g.id);
      if (!p || p[0] !== g.state) { if (p?.[0] === 'seated') seatedS.push(s.simTime - p[1]); since.set(g.id, [g.state, s.simTime]); }
      // ORDER 326:s stege läste Guest.state 'seated' från waitWatchS.
      if (g.state === 'seated' && s.simTime - g.stateTime >= B.waitWatchS) ladder326++;
      const w = d.wantOf(g.id, s.simTime);
      if (!w) continue;
      const key = `${g.partyId ?? g.id}|${w.kind}`;
      let r = seen.get(key);
      if (!r) { r = { kind: w.kind, party: g.partyId ?? g.id, steps: new Set(), acks: 0, restarts: 0, from: s.simTime, to: s.simTime, lastSince: w.since, whileDining: false }; seen.set(key, r); }
      if (w.kind === 'bill' && g.state === 'dining') r.whileDining = true;
      if (w.since !== r.lastSince) { r.restarts++; r.lastSince = w.since; }
      if (w.step) { if (w.step === 'nod' && !r.steps.has(`nod@${w.since}`)) { r.acks++; r.steps.add(`nod@${w.since}`); } r.steps.add(w.step); }
      r.to = s.simTime;
    }
  }
  const rows = [...seen.values()];
  return { s, seatedS, ladder326, rows };
}

const q = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b.length ? { n: b.length, median: +b[Math.floor(b.length / 2)].toFixed(1), max: +b[b.length - 1].toFixed(1) } : { n: 0, median: null, max: null }; };

describe('ORDER 327 B — mätningen: en kväll i vinbaren med spelets rum och regissör', () => {
  it('simuleringens seated är kort (ORDER 326:s stege startade aldrig), och signalerna ger stegen i spelets flöde', () => {
    const seeds = [7, 11, 23];
    const out = seeds.map((seed) => {
      const { seatedS, ladder326, rows } = evening(seed);
      const by = (k: WantKind) => rows.filter((r) => r.kind === k);
      const stat = (k: WantKind) => {
        const r = by(k);
        return {
          parties: r.length,
          reachedEye: r.filter((x) => x.steps.has('eye')).length,
          reachedHand: r.filter((x) => x.steps.has('hand')).length,
          reachedWave: r.filter((x) => x.steps.has('wave')).length,
          eyeContacts: r.reduce((n, x) => n + x.acks, 0),
          restarts: r.reduce((n, x) => n + x.restarts, 0),
          wantSeconds: q(r.map((x) => x.to - x.from))
        };
      };
      // ORDER 328 C — nickarna per sällskap (alla viljor), och notan medan gästen ännu äter (tallriken undan, A).
      const perParty = new Map<string, number>();
      for (const r of rows) perParty.set(r.party, (perParty.get(r.party) ?? 0) + r.acks);
      const nods = [...perParty.values()];
      const nodsPerParty = { parties: nods.length, mean: +(nods.reduce((a, b) => a + b, 0) / Math.max(1, nods.length)).toFixed(2), max: Math.max(0, ...nods), histogram: nods.reduce<Record<string, number>>((h, n) => { h[n] = (h[n] ?? 0) + 1; return h; }, {}) };
      return { seed, simSeatedSeconds: q(seatedS), ladder326Frames: ladder326, order: stat('order'), refill: stat('refill'), bill: { ...stat('bill'), whileDining: by('bill').filter((x) => x.whileDining).length }, nodsPerParty };
    });
    for (const o of out) {
      expect(o.simSeatedSeconds.max!).toBeLessThan(B.waitWatchS);
      expect(o.ladder326Frames).toBe(0);
      expect(o.order.parties).toBeGreaterThan(0);
      expect(o.refill.parties).toBeGreaterThan(0);
      expect(o.bill.parties).toBeGreaterThan(0);
      // ORDER 328 C — högst en omstart per sällskap och vilja.
      expect(o.order.restarts).toBeLessThanOrEqual(o.order.parties);
      expect(o.refill.restarts).toBeLessThanOrEqual(o.refill.parties);
    }
    expect(out.some((o) => o.refill.reachedHand > 0 || o.refill.eyeContacts > 0)).toBe(true);
    const truck = {
      eatSimSeconds: TRUCK_SEATING.eatSimSeconds,
      eatOrderSeconds: { bun: eatTotalSFor('bun', false), plate: eatTotalSFor('plate', false), bunHeater: eatTotalSFor('bun', true), plateHeater: eatTotalSFor('plate', true) },
      cheapestSek: TRUCK_CHEAPEST_SEK, billSek: FOODTRUCK.billSek, walletSek: GUESTS.walletSek
    };
    if (process.env.WRITE_REPORTS) {
      const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../reports', process.env.REPORT_DIR ?? 'order327');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'signaler.json'), JSON.stringify({
        definition: 'En kväll i vinbaren (vecka 2, brons i alla paviljonger, bästa svaret) per frö: spelets rum (createRoom vinbaren) och regissör (createRoomDirector), matade med simuleringens gäster var 0,2 s som i WineBarFigures.tsx. simSeatedSeconds = tiden i Guest.state seated; ladder326Frames = ticks där ORDER 326:s villkor (seated i minst waitWatchS) gällde; per vilja: sällskap, steg som nåddes, blickkontakter (nicken), omstarter och tiden viljan stod (s); bill.whileDining = sällskap som ville ha notan medan simuleringen ännu hade dem i dining (tallriken undan och glaset tomt, ORDER 328 A); nodsPerParty = nickar per sällskap över alla viljor (ORDER 328 C). truck: TRUCK_SEATING.eatSimSeconds mot ätordningen (PlayerTruckCrew eatTotalSFor).',
        balance: { plateEatenS: B.plateEatenS, eyeContactMaxRestarts: B.eyeContactMaxRestarts, seekEyeS: B.seekEyeS, waitWatchS: B.waitWatchS, waitWaveS: B.waitWaveS, glassEmptyS: B.glassEmptyS, billAfterEmptyS: B.billAfterEmptyS, eyeContactM: B.eyeContactM, eyeContactConeRad: B.eyeContactConeRad, eyeContactComeS: B.eyeContactComeS },
        evenings: out, truck
      }, null, 2));
    }
  }, 600000);
});
