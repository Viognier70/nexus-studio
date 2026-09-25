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

import { strings } from '../content/strings.sv';
import { NEWSPAPER, HOLIDAYS, SEASON, type BusinessClassId } from './balance';
import { calendarFor } from './calendar';
import { BUSINESS_CLASSES } from './balance';
import { classOptions, classSpec, meetsRequirement, requirementsFor, type EveningRecord } from './economy';
import type { SimulationState } from '../strategic/types';

const t = strings.newspaper;

export interface NewspaperSection {
  id: 'review' | 'market' | 'bank' | 'holiday';
  heading: string;
  title?: string;
  lines: string[];
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
  const who = cls ? strings.economy.classesDefinite[cls] : strings.economy.bankNone;
  const capitalised = who.charAt(0).toUpperCase() + who.slice(1);
  return { id: 'market', heading: t.marketHeading, lines: [t.market[shareWord(cap > 0 ? guests / cap : 0)](capitalised)] };
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
  return {
    masthead: t.masthead,
    subhead: t.subhead(s.week),
    sections: [
      review(reviewedEvening(evenings), businessName),
      market(evenings, sim),
      { id: 'bank', heading: t.bankHeading, lines: [...bankLines, ...(missing ? [t.bankNext(missing)] : [])] },
      holiday(sim)
    ]
  };
}
