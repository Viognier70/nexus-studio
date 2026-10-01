// ORDER 292 — rusningarna (Vision Owner 2026-10-01): "Gäster i sällskap kommer
// i vågor (bilarna 19.30, bussen), en kö bildas vid dörren med tålamod som
// sjunker, och spelaren väljer vem som får bord först."
//
// En våg (balance.ts RUSH.waves) kommer på sitt klockslag de veckodagar den
// gäller: kvällens tak gånger vågens andel gånger rummets dragningskraft
// (arrivals.ts arrivalAttraction), som sällskap inom några spelsekunder. Det
// jämna flödet minskas med samma andel (waveShareTonight), så att kvällens
// gäster blir lika många men kommer i vågor. Sällskapen ställer sig i kön vid
// dörren (service.ts); den som kom först får bord först, utom sällskapet
// spelaren valt (day.queuePriority).

import { GAME_MINUTES_PER_SIM_SECOND, INCIDENTS, RUSH, SITTING } from '../../sim/balance';
import { calendarFor } from '../../sim/calendar';
import { dailyGuestCap } from '../../sim/economy';
import { strings } from '../../content/strings';
import type { Guest, SimulationState } from '../types';
import type { Rng } from '../util/rng';
import { makeGuest, nextPartyId } from './model';
import { busTonight, PLAYER_VENUE, poolArrivals } from '../../sim/village';
import { VILLAGE } from '../../sim/balance';
import { formatClock } from '../../sim/clock';

export type Wave = (typeof RUSH.waves)[number];

// Klockslaget i minuter efter midnatt (samma räkning som raketernas klocka,
// sim/incidents.ts clockMinutes).
function clockNow(state: SimulationState): number {
  const since = Math.max(0, state.simTime - state.day.periodStartAt);
  return SITTING.serviceStartHour * INCIDENTS.minutesPerHour + Math.floor(since * GAME_MINUTES_PER_SIM_SECOND);
}

export function wavesTonight(state: SimulationState): Wave[] {
  if (!RUSH.classes.includes(state.businessClass)) return [];
  const cal = calendarFor(state.day.dayNumber);
  if (!cal.isServiceDay) return [];
  return RUSH.waves.filter((w) => w.weekdays.includes(cal.weekday));
}

export function waveShareTonight(state: SimulationState): number {
  if (state.day.period !== 'dinner') return 0;
  return wavesTonight(state).reduce((a, w) => a + w.share, 0);
}

export function waveLabel(id: string): string {
  return (strings.rush.waves as Record<string, string>)[id] ?? id;
}

// Vågorna som börjar nu: sällskapen läggs i day.wavePending med sina
// ankomsttider, och strömmen och aviseringen säger att gruppen kommer.
function startWaves(draft: SimulationState, rng: Rng, attraction: number): void {
  const now = clockNow(draft);
  const started = draft.day.wavesStarted ?? [];
  for (const w of wavesTonight(draft)) {
    if (started.includes(w.id) || now < w.atMinute) continue;
    const cap = dailyGuestCap(draft);
    const room = Number.isFinite(cap) ? Math.max(0, cap - poolArrivals(draft.day)) : 0;
    // ORDER 288 — bussen: turisterna har valt krog efter rykte. Väljer de
    // spelarens krog kommer alla, utöver poolen; annars ingen.
    const bus = w.village ? busTonight(draft) : null;
    let guests = w.village
      ? (bus && bus.venueId === PLAYER_VENUE ? bus.tourists : 0)
      : Math.min(room, Math.round((Number.isFinite(cap) ? cap : 0) * w.share * attraction));
    if (w.village) {
      draft.day = { ...draft.day, touristsToday: (draft.day.touristsToday ?? 0) + guests };
    }
    const pending = [...(draft.day.wavePending ?? [])];
    let parties = 0;
    while (guests > 0) {
      const [lo, hi] = w.partySizes;
      const size = Math.min(guests, lo + Math.floor(rng.next() * (hi - lo + 1)));
      pending.push({ waveId: w.id, size, type: w.type, at: draft.simTime + rng.next() * RUSH.spreadSimSeconds });
      guests -= size;
      parties += 1;
    }
    const total = pending.filter((p) => p.waveId === w.id).reduce((a, p) => a + p.size, 0);
    draft.day = {
      ...draft.day,
      wavesStarted: [...(draft.day.wavesStarted ?? []), w.id],
      wavePending: pending,
      waveNotice: total > 0 ? { waveId: w.id, at: draft.simTime, guests: total, parties } : draft.day.waveNotice ?? null
    };
    if (total > 0) {
      draft.eventStream = [...draft.eventStream, {
        at: draft.simTime, text: strings.rush.arrives(waveLabel(w.id), total), category: 'ambient',
        causeTag: null, causeChainId: null, sustainability: 'social', kind: 'rush_wave', scenarioId: null
      }];
    }
  }
}

// ORDER 288 — aviseringen om bussen en halvtimme före: "En buss med 30
// turister anländer 20.15. De väljer krog efter rykte." Gäller alla klasser.
function announceBus(draft: SimulationState): void {
  if (draft.day.villageEvents?.includes('bus-announce')) return;
  if (clockNow(draft) < VILLAGE.bus.announceMinute) return;
  const bus = busTonight(draft);
  draft.day = { ...draft.day, villageEvents: [...(draft.day.villageEvents ?? []), 'bus-announce'] };
  if (!bus) return;
  draft.day = { ...draft.day, villageNotice: { kind: 'busAnnounce', at: draft.simTime, tourists: bus.tourists, venueId: null, arriveMinute: VILLAGE.bus.arriveMinute } };
  draft.eventStream = [...draft.eventStream, {
    at: draft.simTime, text: strings.village.notice.busAnnounce(bus.tourists, formatClock(VILLAGE.bus.arriveMinute)), category: 'ambient',
    causeTag: null, causeChainId: null, sustainability: 'social', kind: 'village_bus', scenarioId: null
  }];
}

// ORDER 288 — när bussen kommer: vart turisterna gick (alla klasser).
function chooseBus(draft: SimulationState): void {
  if (draft.day.villageEvents?.includes('bus-chose')) return;
  if (clockNow(draft) < VILLAGE.bus.arriveMinute) return;
  const bus = busTonight(draft);
  draft.day = { ...draft.day, villageEvents: [...(draft.day.villageEvents ?? []), 'bus-chose'] };
  if (!bus) return;
  draft.day = { ...draft.day, villageNotice: { kind: 'busChose', at: draft.simTime, tourists: bus.tourists, venueId: bus.venueId, arriveMinute: VILLAGE.bus.arriveMinute } };
  const text = bus.venueId === PLAYER_VENUE
    ? strings.village.notice.busChoseYou(bus.tourists)
    : strings.village.notice.busChose(bus.tourists, strings.village.venues[bus.venueId] ?? bus.venueId);
  draft.eventStream = [...draft.eventStream, {
    at: draft.simTime, text, category: 'ambient',
    causeTag: null, causeChainId: null, sustainability: 'social', kind: 'village_bus', scenarioId: null
  }];
}

// Ett tick: vågor som börjar, och sällskap ur vågorna som når dörren.
export function tickRush(draft: SimulationState, rng: Rng, attraction: number): Guest[] {
  if (draft.day.period !== 'dinner' || !draft.day.doorsOpenedThisService) return [];
  announceBus(draft);
  chooseBus(draft);
  startWaves(draft, rng, attraction);
  const pending = draft.day.wavePending ?? [];
  const due = pending.filter((p) => p.at <= draft.simTime);
  if (due.length === 0) return [];
  const out: Guest[] = [];
  for (const p of due) {
    const party = p.size > 1 ? { id: nextPartyId(), size: p.size } : undefined;
    for (let i = 0; i < p.size; i++) {
      const g = makeGuest(draft.simTime, false, false, party);
      g.guestType = p.type;
      g.waveId = p.waveId;
      out.push(g);
    }
  }
  draft.day = { ...draft.day, wavePending: pending.filter((p) => p.at > draft.simTime) };
  return out;
}
