// careerPath.ts — Din väg: karriärstegen med åtta steg. D7, 2026-10-06.
//
// Steget är verksamheten (vagn, vinbar, bistro …). Nivån (venueTier.ts) är priset och gästerna inom steget.
// Kraven för nästa steg är tre: kassa, rykte och medalj. Kassa och rykte är platshållare i balance.ts
// (CAREER_STEPS). Medaljerna är speldesignens (NEXUS_SPELDESIGN_V1, klasserna), utom bistron och stjärnkrogen,
// som är förslag. Ordningen är ett förslag: ölkrogen är i speldesignen ett sidosteg från vinbaren.
//
// Bara steg med available: true går att nå i den här versionen. Övriga visas med Kommer senare och utan krav.

export type StepId = 'truck' | 'winebar' | 'bistro' | 'brewpub' | 'restaurant' | 'club' | 'inn' | 'star';
export type Pavilion = 'maltidsbiblioteket' | 'metodkoket' | 'stensota' | 'kalastorget' | 'teatern';
export type Medal = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface MedalReq { pavilion: Pavilion | 'any'; level: Medal; count?: number; note?: string }

export interface CareerStep {
  id: StepId;
  nameKey: string;
  /** Rummet som steget spelas i. */
  room: string;
  available: boolean;
  /** Nycklar i balance.ts. Kassan räknas efter veckoavräkningen, ryktet inom nivån. */
  cash?: string;
  reputation?: string;
  medals?: MedalReq[];
  /** Hur steget erbjuds. 'bank' = bankmötet, 'owner' = Åsa (ownerOffer.ts). */
  offeredBy?: 'bank' | 'owner';
}

export const CAREER_STEPS: CareerStep[] = [
  { id: 'truck', nameKey: 'path.step.truck', room: 'playerTruck', available: true, offeredBy: 'bank', cash: 'CAREER.truck.cash', medals: [{ pavilion: 'any', level: 'bronze', count: 1 }] },
  { id: 'winebar', nameKey: 'path.step.winebar', room: 'wineBarRoom', available: true, offeredBy: 'bank', cash: 'CAREER.winebar.cash', reputation: 'CAREER.winebar.rep', medals: [{ pavilion: 'any', level: 'bronze', count: 3, note: 'varav Stensöta' }] },
  { id: 'bistro', nameKey: 'path.step.bistro', room: 'bistroRoom (bistroRefit.ts)', available: true, offeredBy: 'owner', cash: 'CAREER.bistro.cash', reputation: 'CAREER.bistro.rep', medals: [{ pavilion: 'metodkoket', level: 'silver' }] },
  { id: 'brewpub', nameKey: 'path.step.brewpub', room: 'brewpubRoom', available: false },
  { id: 'restaurant', nameKey: 'path.step.restaurant', room: 'restaurantRoom', available: false },
  { id: 'club', nameKey: 'path.step.club', room: 'nightClubRoom', available: false },
  { id: 'inn', nameKey: 'path.step.inn', room: 'innRoom', available: false },
  { id: 'star', nameKey: 'path.step.star', room: '—', available: false }
];

export type StepState = 'done' | 'here' | 'next' | 'later';

/** Tillståndet per steg för skärmen. `here` är spelarens nuvarande steg. Allt efter nästa steg är 'later'. */
export function stepStates(here: StepId): { id: StepId; state: StepState }[] {
  const i = CAREER_STEPS.findIndex((s) => s.id === here);
  return CAREER_STEPS.map((s, k) => ({ id: s.id, state: k < i ? 'done' : k === i ? 'here' : k === i + 1 && s.available ? 'next' : 'later' }));
}

export interface ReqRow { kind: 'cash' | 'rep' | 'medal'; have: number | string; need: number | string; met: boolean; progress: number }

/** Raderna i kortet Nästa steg. progress 0..1 fyller stapeln. Medaljen fyller till hälften när nivån under finns. */
export function requirementRows(step: CareerStep, p: { cash: number; rep: number; medals: Record<string, Medal | null> }, bal: (k: string) => number): ReqRow[] {
  const rows: ReqRow[] = [];
  if (step.cash) { const need = bal(step.cash); rows.push({ kind: 'cash', have: p.cash, need, met: p.cash >= need, progress: Math.min(1, p.cash / need) }); }
  if (step.reputation) { const need = bal(step.reputation); rows.push({ kind: 'rep', have: p.rep, need, met: p.rep >= need, progress: Math.min(1, p.rep / need) }); }
  const order: Medal[] = ['bronze', 'silver', 'gold', 'platinum'];
  (step.medals ?? []).forEach((m) => {
    if (m.pavilion === 'any') return; // räknas av banken som förut
    const has = p.medals[m.pavilion], hi = has ? order.indexOf(has) : -1, want = order.indexOf(m.level);
    rows.push({ kind: 'medal', have: has ?? '—', need: m.level, met: hi >= want, progress: Math.max(0, Math.min(1, (hi + 1) / (want + 1))) });
  });
  return rows;
}

/** Åsa kommer förbi när alla krav för nästa steg är uppfyllda (ownerOffer.ts). */
export function offerReady(rows: ReqRow[]): boolean { return rows.length > 0 && rows.every((r) => r.met); }
