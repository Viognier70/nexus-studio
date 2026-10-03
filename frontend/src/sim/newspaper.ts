// ORDER 267 (Nexus v1 etapp 5) — söndagstidningen.
//
// Speldesign > Ramar för version 1 > Veckoavräkningen: "Veckoavräkningen
// visas som söndagsnumret av en lokaltidning i Grythyttan. Den har en
// recension av veckans bästa eller sämsta kväll, hur det gick på
// marknaden, vad banken säger och vilken högtid som kommer. Tidningen gör
// siffrorna till en berättelse och håller spelet fritt från stat-paneler."
//
// Tidningen läser avräkningen (economy.lastSettlement) och veckans kvällar
// (EveningRecord, skrivna när servicen stänger). Recensionen gäller den
// kväll som flyttade ryktet mest (F34): uppåt blir den veckans bästa,
// nedåt veckans sämsta.

import { strings } from '../content/strings';
import { NEWSPAPER, HOLIDAYS, REPUTATION, SEASON, STAR, type BusinessClassId } from './balance';
import { calendarFor } from './calendar';
import { BUSINESS_CLASSES } from './balance';
import { classOptions, classSpec, meetsRequirement, requirementsFor, type EveningRecord } from './economy';
import type { GuestType, SimulationState } from '../strategic/types';
import { socialName } from '../strategic/simulation/guestTypes';
import { PLAYER_VENUE, weekRanking } from './village';
import { t as tt } from '../content/nexusStrings';
import { getLanguage } from '../content/language';

// ORDER 288 — byns krogar rankade efter veckans gäster (speldesign >
// Rivalerna: "Tidningen får en rankning av byns krogar efter veckans
// ställning, med spelarens plats och en rad om den som steg eller föll
// mest"). Spelarens krog står med sitt namn.
function ranking(evenings: readonly EveningRecord[], name: string): NewspaperSection | null {
  const rows = weekRanking(evenings);
  // En rankning kräver minst två krogar.
  if (rows.length <= 1) return null;
  const v = strings.village;
  const label = (id: string) => (id === PLAYER_VENUE ? name : v.venues[id] ?? id);
  const items = rows.map((r, i) => v.newspaper.row(i + 1, label(r.id), r.guests, String(r.guests > 0 ? Math.round(r.revenueSek / r.guests) : 0)));
  const lines: string[] = [];
  const byChange = [...rows].sort((a, b) => b.reputationChange - a.reputationChange);
  if (byChange[0].reputationChange > 0) lines.push(v.newspaper.rose(label(byChange[0].id)));
  const worst = byChange[byChange.length - 1];
  if (worst.reputationChange < 0) lines.push(v.newspaper.fell(label(worst.id)));
  return { id: 'ranking', heading: v.newspaper.kicker, title: v.newspaper.title, items, lines };
}

const t = strings.newspaper;

export interface NewspaperSection {
  id: 'review' | 'market' | 'ranking' | 'bank' | 'holiday' | 'seen' | 'star';
  heading: string;
  title?: string;
  lines: string[];
  // ORDER 288 — en lista (tidningens rankning), före raderna.
  items?: string[];
}

export interface Newspaper {
  masthead: string;
  subhead: string;
  sections: NewspaperSection[];
}

// Kvällen som flyttade ryktet mest; vid lika, den med flest gäster.
export function reviewedEvening(evenings: readonly EveningRecord[]): EveningRecord | null {
  if (evenings.length === 0) return null;
  return [...evenings].sort(
    (a, b) => Math.abs(b.reputationDelta) - Math.abs(a.reputationDelta) || b.guests - a.guests
  )[0];
}

function shareWord(share: number): keyof typeof t.market {
  const w = NEWSPAPER.marketShareWords;
  if (share >= w.full) return 'full';
  if (share >= w.most) return 'most';
  if (share >= w.half) return 'half';
  return 'few';
}

function review(e: EveningRecord | null, name: string): NewspaperSection {
  if (!e) return { id: 'review', heading: t.reviewHeading, lines: [t.noEvenings(name)] };
  const weekday = t.weekdaysLower[calendarFor(e.dayNumber).weekday];
  const good = e.reputationDelta >= 0;
  const share = e.marketCap > 0 ? e.guests / e.marketCap : 0;
  const lines: string[] = [];
  const room = shareWord(share);
  lines.push(room === 'full' ? t.reviewFull : room === 'few' ? t.reviewSparse : t.reviewSteady);
  if (e.gaveUp > 0) lines.push(t.reviewGaveUp);
  lines.push(e.reputationDelta > 0 ? t.reviewUp : e.reputationDelta < 0 ? t.reviewDown : t.reviewFlat);
  return {
    id: 'review',
    heading: t.reviewHeading,
    title: good ? t.reviewTitleGood(weekday, name) : t.reviewTitleBad(weekday, name),
    lines
  };
}

function market(evenings: readonly EveningRecord[], sim: SimulationState): NewspaperSection {
  const cls = sim.economy.businessClass;
  const guests = evenings.reduce((a, e) => a + e.guests, 0);
  const cap = evenings.reduce((a, e) => a + e.marketCap, 0);
  // ORDER 271 — utan verksamhet finns inga gäster att räkna.
  if (!cls) return { id: 'market', heading: t.marketHeading, lines: [t.marketNoBusiness] };
  const who = strings.economy.classesDefinite[cls];
  const capitalised = who.charAt(0).toUpperCase() + who.slice(1);
  return { id: 'market', heading: t.marketHeading, lines: [t.market[shareWord(cap > 0 ? guests / cap : 0)](capitalised), ...guestLines(evenings)] };
}

// ORDER 287a — veckans gäster efter typ, och vad gästerna med socialt
// kapital sa om krogen.
const TYPE_ORDER: readonly GuestType[] = ['student', 'middle', 'high', 'social', 'billionaire'];
const BOOKED_TYPES = ['student', 'middle', 'high'] as const;
function guestLines(evenings: readonly EveningRecord[]): string[] {
  const g = strings.guestTypes;
  const sum: Partial<Record<GuestType, number>> = {};
  for (const e of evenings) for (const k of TYPE_ORDER) sum[k] = (sum[k] ?? 0) + (e.typeGuests?.[k] ?? 0);
  const ranked = BOOKED_TYPES.filter((k) => (sum[k] ?? 0) > 0).sort((a, b) => (sum[b] ?? 0) - (sum[a] ?? 0));
  const lines = ranked.length > 0 ? [g.paper.guestsMost(g.paper.who[ranked[0]], ranked[1] ? g.paper.who[ranked[1]] : null)] : [];
  for (const e of evenings) {
    if (!e.social || (e.social.outcome !== 'good' && e.social.outcome !== 'bad')) continue;
    const name = socialName(e.social.nameIndex);
    lines.push(e.social.outcome === 'good' ? g.paper.socialGood(name) : g.paper.socialBad(name));
  }
  return lines;
}

// ORDER 287a — Sett på stan: mannen i guld (Designs paper.seen.*). Åt han
// hos spelaren står kvällen och notan här; annars gick han längs sjön och
// åt på hotellet. Promenaden i byn kommer med 288c.
function seen(evenings: readonly EveningRecord[], name: string): NewspaperSection | null {
  const g = strings.guestTypes.paper;
  const ours = evenings.find((e) => e.billionaire?.ours);
  if (ours && ours.billionaire) {
    const weekday = t.weekdaysLower[calendarFor(ours.dayNumber).weekday];
    const lines = [g.oursBody(weekday)];
    if (ours.billionaire.treated) lines.push(g.oursTreat);
    return { id: 'seen', heading: g.seenKicker, title: g.oursTitle(name), lines };
  }
  const inTown = [...evenings].reverse().find((e) => e.billionaire?.inTown);
  if (!inTown) return null;
  const weekday = t.weekdaysLower[calendarFor(inTown.dayNumber).weekday];
  return { id: 'seen', heading: g.seenKicker, title: g.elsewhereTitle, lines: [g.elsewhereBody(weekday, g.hotel)] };
}

// Nästa klass spelaren kan växa till, och vad som saknas (i ord).
function nextStep(sim: SimulationState): BusinessClassId | null {
  const current = sim.economy.businessClass;
  const rank = current ? classSpec(current).sizeRank : 0;
  const options = classOptions(sim);
  const next = BUSINESS_CLASSES.list
    .filter((c) => c.sizeRank > rank)
    .sort((a, b) => a.sizeRank - b.sizeRank || a.buildOrder - b.buildOrder)
    .find((c) => options.find((o) => o.id === c.id)?.status === 'requirements');
  if (!next) return null;
  const unmet = requirementsFor(sim, next.id).filter((r) => !meetsRequirement(r, sim.medals));
  return unmet.length > 0 ? next.id : null;
}

function holiday(sim: SimulationState): NewspaperSection {
  const cal = calendarFor(sim.day.dayNumber);
  const ahead = HOLIDAYS.list
    .filter((h) => h.week > cal.week && h.week <= SEASON.weeks)
    .sort((a, b) => a.week - b.week)[0];
  let line: string = t.holidayNone;
  if (ahead) {
    const name = strings.calendar.holidays[ahead.id as keyof typeof strings.calendar.holidays];
    const weeks = ahead.week - cal.week;
    line = weeks === 1 ? t.holidayNextWeek(name) : t.holidayInWeeks(name, strings.economy.counts[weeks] ?? String(weeks));
  }
  return { id: 'holiday', heading: t.holidayHeading, lines: [line] };
}

// ORDER 296c — stjärnan i söndagstidningen: delad, behållen eller förlorad,
// eller hur långt det är kvar (balance.ts STAR).
function starSection(sim: SimulationState, name: string): NewspaperSection | null {
  const st = sim.economy.lastSettlement?.star;
  if (!st) return null;
  const lang = getLanguage();
  const pct = (v: number) => Math.round(v * REPUTATION.scale);
  if (st.earnedNow) return { id: 'star', heading: tt(lang, 'star.heading'), title: tt(lang, 'star.earned.title', { name }), lines: [tt(lang, 'star.earned.body')] };
  if (st.lostNow) return { id: 'star', heading: tt(lang, 'star.heading'), title: tt(lang, 'star.lost.title', { name }), lines: [tt(lang, 'star.lost.body', { rep: pct(st.reputation), judgement: Math.round(st.judgement * REPUTATION.scale) })] };
  if (st.held) return { id: 'star', heading: tt(lang, 'star.heading'), lines: [tt(lang, 'star.kept', { name })] };
  if (st.weeksQualified > 0) return { id: 'star', heading: tt(lang, 'star.heading'), lines: [tt(lang, 'star.close', { name, n: STAR.weeksToEarn - st.weeksQualified })] };
  return null;
}

// Bankens rader skickas in av anroparen (economy/BankDialog.tsx
// settlementInWords, missingInWords) så att texten är densamma som i banken.
export function newspaperFor(
  sim: SimulationState,
  businessName: string,
  bankLines: string[],
  missingForNext: (classId: BusinessClassId) => string | null
): Newspaper | null {
  const s = sim.economy.lastSettlement;
  if (!s) return null;
  const evenings = s.evenings ?? [];
  const next = nextStep(sim);
  const missing = next ? missingForNext(next) : null;
  const seenSection = seen(evenings, businessName);
  const rankingSection = ranking(evenings, businessName);
  const starPart = starSection(sim, businessName);
  return {
    masthead: t.masthead,
    subhead: t.subhead(s.week),
    sections: [
      review(reviewedEvening(evenings), businessName),
      ...(starPart ? [starPart] : []),
      market(evenings, sim),
      ...(rankingSection ? [rankingSection] : []),
      { id: 'bank', heading: t.bankHeading, lines: [...bankLines, ...(missing ? [t.bankNext(missing)] : [])] },
      holiday(sim),
      ...(seenSection ? [seenSection] : [])
    ]
  };
}
