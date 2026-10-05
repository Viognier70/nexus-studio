// ORDER 303 C (Anders 2026-10-04): "Recensioner i morse: varje morgon visas
// en kort rad om vad byn säger om gårdagens kväll, och hur ryktet ändrades
// och varför. Exempel: 'Ryktet −4: två bord fick fel vin till fisken.'"
// Byggs när dagen byts (reducer.ts), efter nattens självläkning: ryktets
// ändring från kvällens början till morgonen, kvällens svar (day.answerReviews)
// med händelsernas namn, och resten som gästernas egen kväll.
//
// ORDER 309 — Designs D5 (morningReviews.ts REVIEW_CARD): kortet har rader,
// högst fyra, den största ändringen först. Varje rad är en följd av ett svar
// eller av personalen: en röst (gästgruppen vid bordet, byn eller
// personalen), ändringen och skälet. Raderna byggs här ur samma tal som
// raden förut (svarens ryktespoäng och resten), så att summan är ändringen.

import type { GuestType, SimulationState } from '../strategic/types';
import { CONSEQUENCES, GUEST_TYPES, REPUTATION } from './balance';
import { reputationByTier, type Tier } from './goods';
import { incidentById } from './incidentBank';
import { REVIEW_CARD } from '../strategic/ui/morningReviews';
import { staminaOf } from './staffCondition';
import { staminaOf as staminaBand } from '../strategic/scene/staffStatus';

export type ReviewVoice = 'student' | 'villager' | 'tourist' | 'gourmet' | 'business' | 'village' | 'staff';
export type ReviewKind = 'wrong' | 'grave' | 'cleared' | 'rest' | 'staff' | 'quiet';

export interface ReviewEntry {
  kind: ReviewKind;
  voice: ReviewVoice;
  /** Ryktets ändring, poäng 0–100, avrundad. */
  delta: number;
  /** Antal bord (svarens rader). */
  tables: number;
  titles: string[];
  /** Personalen som var slut (rollerna, för skälet). */
  staff?: string[];
  /** Väljer citatet, stabilt för samma kväll och rad. */
  seed: number;
}

export interface MorningReview {
  dayNumber: number;
  // Poäng 0–100, avrundade.
  change: number;
  fromAnswers: number;
  wrongTables: number;
  rightTables: number;
  grave: number;
  wrongTitles: string[];
  rightTitles: string[];
  // ORDER 309 — ryktet före och efter (0–100), kvällens koncept och raderna.
  from?: number;
  to?: number;
  tier?: string | null;
  lines?: ReviewEntry[];
  // ORDER 309b — vems rykte kortet visar: konceptets (reputationByTier) när
  // kvällen hade ett koncept och dess startvärde sparades, annars krogens.
  scope?: 'concept' | 'restaurant';
}

// ORDER 309b — ett svars poäng i det rykte kortet visar. Konceptet: poängen
// som flyttade konceptets rykte (sim/incidents.ts, felen gånger förlåtelsen);
// äldre svar utan fältet räknas om på samma sätt.
type ReviewScope = 'concept' | 'restaurant';
function answerPoints(r: { right: boolean; reputation: number; guestType?: GuestType | null; conceptReputation?: number | null }, scope: ReviewScope): number {
  if (scope === 'restaurant') return r.reputation;
  if (typeof r.conceptReputation === 'number') return r.conceptReputation;
  return !r.right && r.guestType ? r.reputation * GUEST_TYPES.forgiveness[r.guestType] : r.reputation;
}

/** Kvällens koncept (bokningen, låst när dörrarna öppnade), eller null. */
export function reviewTier(evening: SimulationState): Tier | null {
  const b = evening.day.booking;
  return b && b.dayNumber === evening.day.dayNumber ? b.concept ?? null : null;
}

// Slut: D5:s gräns i staffStatus.ts staminaOf (samma som orkringen).
export const isSpent = (stamina: number): boolean => staminaBand(stamina) === 'spent';

const VOICE_OF: Record<GuestType, ReviewVoice> = {
  student: 'student', middle: 'villager', social: 'villager', tourist: 'tourist', gourmet: 'gourmet', business: 'business', high: 'business', billionaire: 'business'
};

// Citatets frö: teckenkodernas summa (stabilt för samma kväll och rad).
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h += s.charCodeAt(i);
  return h;
}

/** Den vanligaste rösten bland borden (byn när ingen typ finns). */
function voiceOf(types: (GuestType | null | undefined)[]): ReviewVoice {
  const n = new Map<ReviewVoice, number>();
  for (const t of types) if (t) n.set(VOICE_OF[t], (n.get(VOICE_OF[t]) ?? 0) + 1);
  let best: ReviewVoice = 'village';
  let k = 0;
  for (const [v, c] of n) if (c > k) { best = v; k = c; }
  return best;
}

/** Kortets rader: svaren grupperade (fel, grovt fel, rätt hela vägen), och resten; största ändringen först, högst REVIEW_CARD.maxLines. */
export function reviewLines(evening: SimulationState, change: number, dayNumber: number, scope: ReviewScope = 'restaurant'): ReviewEntry[] {
  const reviews = evening.day.answerReviews ?? [];
  const title = (id: string) => incidentById(evening.economy.businessClass, id)?.text.title ?? id;
  const uniq = (xs: string[]) => [...new Set(xs)];
  const out: ReviewEntry[] = [];
  const group = (kind: 'wrong' | 'grave' | 'cleared', rs: typeof reviews) => {
    if (rs.length === 0) return;
    const delta = Math.round(rs.reduce((a, r) => a + answerPoints(r, scope), 0));
    const titles = uniq(rs.map((r) => title(r.incidentId)));
    out.push({ kind, voice: voiceOf(rs.map((r) => r.guestType)), delta, tables: rs.length, titles, seed: hash(`${dayNumber}:${kind}:${titles.join('|')}`) });
  };
  const wrong = reviews.filter((r) => !r.right);
  group('grave', wrong.filter((r) => r.severity === 'grave'));
  group('wrong', wrong.filter((r) => r.severity !== 'grave'));
  // Rätt hela vägen: svaren som också bar raketens ryktesdel. Klarade steg
  // utan att raketen klarades räknas i resten (som raden förut).
  group('cleared', reviews.filter((r) => r.right && r.reputation >= CONSEQUENCES.right.clearedReputation));
  const counted = out.reduce((a, l) => a + l.delta, 0);
  const rest = change - counted;
  // Personalen som var slut när kvällen tog slut (före nattens vila).
  const spent = evening.staff.filter((s) => isSpent(staminaOf(s))).map((s) => s.role as string);
  if (rest !== 0) {
    const staffLine = rest < 0 && spent.length > 0;
    out.push({ kind: staffLine ? 'staff' : 'rest', voice: staffLine ? 'staff' : 'village', delta: rest, tables: 0, titles: [], staff: staffLine ? spent : undefined, seed: hash(`${dayNumber}:rest`) });
  }
  const lines = out.filter((l) => l.delta !== 0 || l.kind !== 'rest');
  lines.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  if (lines.length === 0) return [{ kind: 'quiet', voice: 'village', delta: 0, tables: 0, titles: [], seed: hash(`${dayNumber}:quiet`) }];
  return lines.slice(0, REVIEW_CARD.maxLines);
}

export function buildMorningReview(evening: SimulationState, morning: SimulationState): MorningReview | null {
  // Ryktet när gårdagen började (servicens startvärde nollställs när den stänger).
  const restaurantStart = evening.day.reputationAtServiceStart ?? evening.day.reputationAtDayStart;
  const served = (evening.day.seatedTonight ?? 0) > 0 || (evening.day.answerReviews?.length ?? 0) > 0;
  if (restaurantStart === undefined || restaurantStart === null || !served) return null;
  // ORDER 309b — kvällens koncept: konceptets rykte när servicen öppnade
  // (day.conceptReputationAtServiceStart) och på morgonen, efter nattens drift.
  const tier = reviewTier(evening);
  const conceptStart = evening.day.conceptReputationAtServiceStart;
  const scope: ReviewScope = tier && typeof conceptStart === 'number' ? 'concept' : 'restaurant';
  const start = scope === 'concept' ? (conceptStart as number) : restaurantStart;
  const end = scope === 'concept' ? reputationByTier(morning)[tier as Tier] : morning.reputation;
  const reviews = evening.day.answerReviews ?? [];
  const title = (id: string) => incidentById(evening.economy.businessClass, id)?.text.title ?? id;
  const wrong = reviews.filter((r) => !r.right);
  // Raketer klarade hela vägen: svaret som också bar raketens ryktesdel.
  const cleared = reviews.filter((r) => r.right && r.reputation >= CONSEQUENCES.right.clearedReputation);
  const uniq = (xs: string[]) => [...new Set(xs)];
  const change = Math.round((end - start) * REPUTATION.scale);
  return {
    dayNumber: evening.day.dayNumber,
    change,
    fromAnswers: Math.round(reviews.reduce((a, r) => a + answerPoints(r, scope), 0)),
    wrongTables: wrong.length,
    rightTables: cleared.length,
    grave: wrong.filter((r) => r.severity === 'grave').length,
    wrongTitles: uniq(wrong.map((r) => title(r.incidentId))),
    rightTitles: uniq(cleared.map((r) => title(r.incidentId))),
    from: Math.round(start * REPUTATION.scale),
    to: Math.round(end * REPUTATION.scale),
    tier,
    scope,
    lines: reviewLines(evening, change, evening.day.dayNumber, scope)
  };
}
