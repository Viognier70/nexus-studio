// ORDER 273 — English sister of eveningAccount.sv.ts (same shape).
//
// ORDER 046 §3 — the evening's account paragraphs.
//
// Six branches, one paragraph each, in the observer's voice (ORDER
// 043 Addendum B). What a proprietor tells themselves after closing.
//
// Voice guidance:
//   - No numbers. Money is named as "covered the costs" / "ran at a
//     loss" / "came out ahead", not as a figure.
//   - Names what happened in the room, not what the state says.
//   - The mediocre branch is deliberately non-committal — the
//     Vision Owner: "the evening was just mediocre — not every
//     evening needs a point."
//   - Present tense reflecting; not past-recap.
//
// Each function takes a small shape of data pulled from state so the
// paragraph can name the specific thing that mattered (which axis
// collapsed, which capital the wager was on). Kept in content/ so
// the wording is edited without touching game code.

import type { SustainabilityKey } from '../strategic/types';
import type { pickParagraph as svPickParagraph, EveningAccountInputs } from './eveningAccount.sv';

export type { EveningAccountInputs } from './eveningAccount.sv';

const CAPITAL_NOUN: Record<SustainabilityKey, string> = {
  economic:   'the economic side',
  social:     'the social side',
  ecological: 'the ecological side'
};

const AXIS_ROOM: Record<'scientific' | 'cultural' | 'practical', string> = {
  scientific: 'the kitchen',
  cultural:   'the room',
  practical:  'the house'
};

// -------- branch templates ---------------------------------------------

function collapsedParagraph(axis: 'scientific' | 'cultural' | 'practical' | null): string {
  const room = axis ? AXIS_ROOM[axis] : 'the evening';
  return [
    'The evening ended before it should have.',
    `It was ${room} that did not hold — not bad luck, not the guests, but that someone was not in place where the knowledge should have been.`,
    'Tomorrow starts with a door that closed early, and a reputation that noticed.',
    'Take that with you into the morning. It will not be forgotten quickly.'
  ].join(' ');
}

function highWagerWinParagraph(capital: SustainabilityKey | null): string {
  const noun = capital ? CAPITAL_NOUN[capital] : 'what you bet on';
  return [
    `You bet on ${noun}, and the evening confirmed the reading.`,
    'It was not luck — you saw what was weak and dared to say it out loud before the table turned.',
    'Evenings like this are rare; take it in without building a formula out of it.'
  ].join(' ');
}

function highWagerLossParagraph(capital: SustainabilityKey | null, drew: SustainabilityKey | null): string {
  const staked = capital ? CAPITAL_NOUN[capital] : 'what you bet on';
  const real = drew ? CAPITAL_NOUN[drew] : 'something else';
  return [
    `You read the evening wrong, and it answered quickly.`,
    `You pointed at ${staked} and what came was ${real} — the hard part is knowing which one in advance, and you are not the first to miss there.`,
    'Read the room again tomorrow.'
  ].join(' ');
}

// ORDER 076 (M6) — capital-flavoured variants for the three
// non-collapsed / non-wager branches. Each variant names the
// dimension the day's last scenario moved so the paragraph reads
// as a consequence of the choice rather than an abstract summary.
// The first sentence carries the divergence; the rest is shared
// closing text so the paragraph still ends in the observer's
// usual cadence. Fall-through (drewCapital === null) uses the
// legacy generic paragraph.

const GOOD_LEAD_BY_CAPITAL: Record<SustainabilityKey, string> = {
  social:     'The evening read the team — and the team held it. What you chose this morning set the tone in the room.',
  economic:   'The evening paid — and it showed without anyone counting out loud. The price stood firm, and the guests said yes anyway.',
  ecological: 'The evening carried an ingredient that stood on its own — and it won. What you sourced this morning comes through on the plate.'
};

const THIN_LEAD_BY_CAPITAL: Record<SustainabilityKey, string> = {
  social:     'The room held its shape, but nothing happened between the tables to pull anyone further in. The social work never came.',
  economic:   'The price stood where it stood, and the guests counted once more before they ordered. What came in was not enough.',
  ecological: 'The ingredient was meant to say something — and it said nothing the guest had the energy to listen for. The echo never came.'
};

const MEDIOCRE_LEAD_BY_CAPITAL: Record<SustainabilityKey, string> = {
  social:     'The team did what they usually do; nobody talked about it afterwards.',
  economic:   'The till kept moving, but moving empty; no column stood out.',
  ecological: 'The ingredient was there, untouched; nobody asked about it and nobody answered.'
};

function goodParagraph(drew: SustainabilityKey | null): string {
  const lead = drew ? GOOD_LEAD_BY_CAPITAL[drew] : 'The evening held together without anyone needing a reminder.';
  return [
    lead,
    'The room found its pulse, the team read each other, and the guests left happy without anyone throwing up their arms.',
    'Evenings like this build a reputation quietly — not the ones that sparkle but the ones that feel right.',
    'Write it into memory before the morning pushes it away.'
  ].join(' ');
}

function thinParagraph(drew: SustainabilityKey | null): string {
  const lead = drew ? THIN_LEAD_BY_CAPITAL[drew] : 'The room held its shape, but the orders never came quickly enough.';
  return [
    lead,
    'The costs stood where they did when the evening began; what came in did not cover what went out.',
    'This is not for the team to carry — something else decided who walked past the door tonight.',
    'Read the weather, read the town, and think through tomorrow\'s prices one more time.'
  ].join(' ');
}

function mediocreParagraph(drew: SustainabilityKey | null): string {
  const lead = drew ? MEDIOCRE_LEAD_BY_CAPITAL[drew] : 'The evening passed.';
  return [
    lead,
    'The room filled at its own pace, the team did what they usually do, and the guests left without anyone having a story to take away with them.',
    'There is nothing to learn from evenings like this one — nothing to celebrate, nothing to fix.',
    'Most evenings are like this, and that is why the rare ones are what they are.'
  ].join(' ');
}

// ORDER 076 (M6) — per-choice aside sentence. Keyed on the day's
// last resolved scenario choice (A/B/C). The three sentences are
// deliberately distinct in vocabulary — the divergence check in
// m6.test.ts measures Jaccard token distance across three parallel
// runs that differ only in strategy. The observer's voice per
// ORDER 048 §2 register: naming what the proprietor is telling
// themselves about how they met the day, not moralising it.
//
// Content deepening (naming the specific scenario textually) is a
// CONTINUATION order per §6 of the M6 report gate; these three
// asides carry the mechanism until then.
const CHOICE_ASIDE: Record<'A' | 'B' | 'C', string> = {
  A: 'You chose the harder reading, the one that needs a sharp eye and some uncomfortable talk — that road sharpens you, but it also costs.',
  B: 'You chose the more generous line; an open hand, a softer gesture, trust builds slowly but does not wear out as fast.',
  C: 'You chose to step aside tonight; no shame in that, but waiting also leaves a trace that comes back as a question tomorrow.'
};

function withChoiceAside(paragraph: string, choice: 'A' | 'B' | 'C' | null): string {
  if (!choice) return paragraph;
  return paragraph + ' ' + CHOICE_ASIDE[choice];
}

// -------- picker -------------------------------------------------------

export const pickParagraph: typeof svPickParagraph = (inputs: EveningAccountInputs): string => {
  const base = (() => {
    switch (inputs.branch) {
      case 'collapsed':        return collapsedParagraph(inputs.collapseAxis);
      case 'high_wager_win':   return highWagerWinParagraph(inputs.wagerCapital);
      case 'high_wager_loss':  return highWagerLossParagraph(inputs.wagerCapital, inputs.drewCapital);
      case 'good':             return goodParagraph(inputs.drewCapital);
      case 'thin':             return thinParagraph(inputs.drewCapital);
      case 'mediocre':         return mediocreParagraph(inputs.drewCapital);
      default: {
        // Exhaustive switch guard — if the branch union grows, this
        // path becomes unreachable at type-check time.
        const _exhaustive: never = inputs.branch;
        return _exhaustive;
      }
    }
  })();
  return withChoiceAside(base, inputs.lastChoice);
};
