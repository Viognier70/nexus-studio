// figureInteractions — samspel: två figurer som gör något tillsammans.
//
// Leverans 2 efter tredje provspelet (teaterns grund), 2026-09-29.
// Bygger på figureClips.ts. Varje samspel är två (eller fler) klippföljder, var de står i
// förhållande till en gemensam punkt, när var och en börjar, och vad som går från hand till hand.
//
// Tiderna står i sekunder vid normalt tempo. Klippen i ett samspel skalas lika med tempot
// (längd = base / rate), så förskjutningarna skalas på samma sätt: scheduleInteraction()
// delar med TEMPO.rate. Undantaget är mötet i gången, där två figurer går mot varandra.
// Där räknas starten ur avståndet och gångfarten.

import { CLIPS, TEMPO, clipSeconds } from './figureClips';
import type { TempoId, ClipEventType } from './figureClips';
import type { HandSide } from './tableware';

// #region types

export type Anchor = 'seat' | 'table' | 'pass' | 'corridor' | 'dropCounter';

export interface InteractionRole {
  /** Vem i rummet: rollnamn ur figureClips (waiter, cook, guest …). */
  role: string;
  /** Klippen i ordning. Ett klipp med `until` spelas (loopas) fram till den tiden. */
  clips: { id: string; until?: number; hand?: HandSide; side?: number }[];
  /** Start i sekunder efter samspelets början, vid normalt tempo. */
  start: number;
  /** Plats i ankarets ram: [x åt höger hands sida, z framåt, vridning]. */
  place: [number, number, number];
  /** Vart figuren vänder huvud och bål (ctx.yaw). */
  looksAt: 'partner' | 'anchor' | 'none';
}

export interface Transfer {
  /** Händelsen som gör överlämningen: [roll, klippindex, händelsetyp]. */
  at: [string, number, ClipEventType];
  from: [string, HandSide] | 'surface';
  to: [string, HandSide] | 'surface';
  what: string;
}

export interface Sync {
  /** Två händelser som ska inträffa med `gap` sekunders mellanrum (normalt tempo). */
  a: [string, number, ClipEventType | 'start' | 'u'];
  b: [string, number, ClipEventType | 'start' | 'u'];
  gap: number;
  /** För 'u': var i klippet. */
  ua?: number;
  ub?: number;
  why: string;
}

export interface InteractionSpec {
  id: string;
  anchor: Anchor;
  roles: Record<string, InteractionRole>;
  transfers: Transfer[];
  syncs: Sync[];
  /** Mötet i gången: två som går mot varandra längs ankarets z. */
  corridor?: { length: number; gapAtDodge: number; walker: string; yielder: string };
}

// #endregion types

export const INTERACTIONS: Record<string, InteractionSpec> = {
  /** Servitören tar upp beställningen. Gästen pekar i menyn, tittar upp och räcker över kortet. */
  order: {
    id: 'order', anchor: 'seat',
    roles: {
      waiter: { role: 'waiter', clips: [{ id: 'waiter.takeOrder', until: 4.4 }], start: 0, place: [0.55, 0.32, 0], looksAt: 'partner' },
      guest: { role: 'guest', clips: [{ id: 'guest.order' }], start: 0.4, place: [0, 0, 0], looksAt: 'partner' }
    },
    transfers: [{ at: ['guest', 0, 'give'], from: ['guest', 'L'], to: ['waiter', 'R'], what: 'menu' }],
    syncs: [{ a: ['guest', 0, 'u'], ua: 0.5, b: ['waiter', 0, 'u'], ub: 0.545, gap: 0, why: 'Gästen tittar upp i samma stund som servitören lyfter blicken från blocket.' }]
  },

  /** Kocken skjuter fram tallriken på passet och ringer. Servitören tar den. */
  passHandoff: {
    id: 'passHandoff', anchor: 'pass',
    roles: {
      cook: { role: 'cook', clips: [{ id: 'cook.toPass' }], start: 0, place: [0, -0.42, 0], looksAt: 'partner' },
      waiter: { role: 'waiter', clips: [{ id: 'waiter.pickUp' }], start: 0.65, place: [0, 0.45, Math.PI], looksAt: 'partner' }
    },
    transfers: [{ at: ['cook', 0, 'release'], from: ['cook', 'R'], to: 'surface', what: 'plate' }, { at: ['waiter', 0, 'grab'], from: 'surface', to: ['waiter', 'R'], what: 'plate' }],
    syncs: [{ a: ['cook', 0, 'release'], b: ['waiter', 0, 'grab'], gap: 0.35, why: 'Tallriken ligger stilla på passet en kort stund innan servitören tar den.' }]
  },

  /** Sommeliern visar, öppnar och låter värden smaka. Värden luktar, smakar och nickar. */
  wineService: {
    id: 'wineService', anchor: 'seat',
    roles: {
      sommelier: { role: 'sommelier', clips: [{ id: 'somm.present' }, { id: 'somm.open' }, { id: 'somm.hostTaste' }], start: 0, place: [0.62, 0.3, 0], looksAt: 'partner' },
      host: { role: 'guest', clips: [{ id: 'guest.seatedIdle', until: 8.85 }, { id: 'guest.tasteApprove' }], start: 0, place: [0, 0, 0], looksAt: 'partner' }
    },
    transfers: [],
    syncs: [{ a: ['sommelier', 2, 'u'], ua: 0.4, b: ['host', 1, 'grab'], gap: 0.3, why: 'Värden tar glaset först när sommeliern har rätat på flaskan.' }]
  },

  /** Två gäster skålar. Glasen möts över bordets mitt. */
  toast: {
    id: 'toast', anchor: 'table',
    roles: {
      a: { role: 'guest', clips: [{ id: 'guest.toast' }], start: 0, place: [0, -0.72, 0], looksAt: 'partner' },
      b: { role: 'guest', clips: [{ id: 'guest.toast' }], start: 0, place: [0, 0.72, Math.PI], looksAt: 'partner' }
    },
    transfers: [],
    syncs: [{ a: ['a', 0, 'clink'], b: ['b', 0, 'clink'], gap: 0, why: 'Klinket är samma bildruta för båda.' }]
  },

  /** Två gäster pratar. Den ena berättar med händerna, den andra lutar sig in. De byter. */
  talk: {
    id: 'talk', anchor: 'table',
    roles: {
      a: { role: 'guest', clips: [{ id: 'guest.gesture', until: 4 }, { id: 'guest.lean', until: 8 }, { id: 'guest.gesture', until: 12 }], start: 0, place: [0, -0.72, 0], looksAt: 'partner' },
      b: { role: 'guest', clips: [{ id: 'guest.lean', until: 4 }, { id: 'guest.gesture', until: 8 }, { id: 'guest.lean', until: 12 }], start: 0, place: [0, 0.72, Math.PI], looksAt: 'partner' }
    },
    transfers: [],
    syncs: [{ a: ['a', 1, 'start'], b: ['b', 1, 'start'], gap: 0, why: 'Turerna byts samtidigt.' }]
  },

  /** Två i personalen möts i gången. Den som bär går rakt; den andra kliver åt sidan och vrider axeln. */
  dodge: {
    id: 'dodge', anchor: 'corridor',
    roles: {
      carrier: { role: 'waiter', clips: [{ id: 'waiter.carryTwoPlates' }], start: 0, place: [0, -2.5, 0], looksAt: 'none' },
      yielder: { role: 'staff', clips: [{ id: 'staff.walk' }, { id: 'staff.dodge', side: 1 }, { id: 'staff.walk' }], start: 0, place: [0, 2.5, Math.PI], looksAt: 'partner' }
    },
    transfers: [],
    syncs: [],
    corridor: { length: 5, gapAtDodge: 1.6, walker: 'carrier', yielder: 'yielder' }
  },

  /** Notan. Servitören lägger mappen på bordet, gästen betalar, servitören tar mappen. */
  payment: {
    id: 'payment', anchor: 'seat',
    roles: {
      waiter: { role: 'waiter', clips: [{ id: 'waiter.presentBill' }], start: 0, place: [0.55, 0.32, 0], looksAt: 'partner' },
      guest: { role: 'guest', clips: [{ id: 'guest.pay' }], start: 0.5, place: [0, 0, 0], looksAt: 'partner' }
    },
    transfers: [{ at: ['waiter', 0, 'release'], from: ['waiter', 'R'], to: 'surface', what: 'billFolder' }, { at: ['waiter', 0, 'grab'], from: 'surface', to: ['waiter', 'R'], what: 'billFolder' }],
    syncs: [{ a: ['waiter', 0, 'release'], b: ['guest', 0, 'pay'], gap: 1.08, why: 'Gästen betalar när mappen ligger på bordet, innan servitören tar den.' }]
  },

  /** Servitören lämnar disk till diskaren över inlämningen. */
  dishHandoff: {
    id: 'dishHandoff', anchor: 'dropCounter',
    roles: {
      waiter: { role: 'waiter', clips: [{ id: 'waiter.serve' }], start: 0, place: [0, 0.5, Math.PI], looksAt: 'partner' },
      dishwasher: { role: 'dishwasher', clips: [{ id: 'dish.receive' }], start: 0.51, place: [0, -0.45, 0], looksAt: 'partner' }
    },
    transfers: [{ at: ['waiter', 0, 'release'], from: ['waiter', 'R'], to: ['dishwasher', 'R'], what: 'plate' }],
    syncs: [{ a: ['waiter', 0, 'release'], b: ['dishwasher', 0, 'grab'], gap: 0, why: 'Tallriken byter hand i en och samma bildruta.' }]
  }
};

/** Start och längd för varje klipp i samspelet, i sekunder, vid ett tempo. */
export function scheduleInteraction(id: string, tempo: TempoId) {
  const spec = INTERACTIONS[id];
  const T = TEMPO[tempo];
  const out: Record<string, { id: string; start: number; seconds: number; hand?: HandSide; side?: number }[]> = {};
  let end = 0;
  Object.keys(spec.roles).forEach(function (name) {
    const r = spec.roles[name];
    let t = r.start / T.rate;
    const list: { id: string; start: number; seconds: number; hand?: HandSide; side?: number }[] = [];
    r.clips.forEach(function (c) {
      const sec = c.until !== undefined ? Math.max(0, c.until / T.rate - t) : clipSeconds(c.id, tempo);
      list.push({ id: c.id, start: t, seconds: sec, hand: c.hand, side: c.side });
      t += sec;
    });
    out[name] = list;
    end = Math.max(end, t);
  });
  if (spec.corridor) {
    // Två som går mot varandra med samma fart: väjningen börjar när avståndet är gapAtDodge.
    const v = T.walkSpeed;
    const tDodge = (spec.corridor.length - spec.corridor.gapAtDodge) / (2 * v);
    const y = out[spec.corridor.yielder];
    const dodgeSec = clipSeconds('staff.dodge', tempo);
    y[0].seconds = tDodge;
    y[1].start = tDodge;
    y[1].seconds = dodgeSec;
    y[2].start = tDodge + dodgeSec;
    y[2].seconds = spec.corridor.length / v - y[2].start;
    out[spec.corridor.walker][0].seconds = spec.corridor.length / v;
    end = spec.corridor.length / v;
  }
  return { roles: out, seconds: end };
}

/** Tidpunkten för en händelse i samspelet, sekunder efter början. */
function eventAt(sched: ReturnType<typeof scheduleInteraction>, ref: [string, number, string], u?: number): number {
  const clip = sched.roles[ref[0]][ref[1]];
  if (ref[2] === 'start') return clip.start;
  if (ref[2] === 'u') return clip.start + (u ?? 0) * clip.seconds;
  const c = CLIPS[clip.id];
  const e = c.events.find(function (x) { return x.type === ref[2]; });
  return e ? clip.start + e.u * clip.seconds : NaN;
}

/** Mäter varje sync i alla tre tempon. Felet ska vara under en bildruta (0,017 s) gånger
 *  tempots skalning av gapet. */
export function checkInteractions() {
  const rows: { id: string; tempo: TempoId; why: string; expected: number; actual: number; ok: boolean }[] = [];
  Object.keys(INTERACTIONS).forEach(function (id) {
    (['calm', 'normal', 'stressed'] as TempoId[]).forEach(function (tempo) {
      const sched = scheduleInteraction(id, tempo);
      INTERACTIONS[id].syncs.forEach(function (s) {
        const ta = eventAt(sched, s.a as any, s.ua);
        const tb = eventAt(sched, s.b as any, s.ub);
        const expected = s.gap / TEMPO[tempo].rate;
        rows.push({ id: id, tempo: tempo, why: s.why, expected: expected, actual: tb - ta, ok: Math.abs(tb - ta - expected) < 0.06 });
      });
    });
  });
  return rows;
}
