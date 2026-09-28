// nexusStrings — every string the designed screens use, Swedish and English
// side by side. Provspel 2026-09-28: the game is now in English, and it can
// switch language. One key per string; `t(lang, key, vars)` fills {vars}.
//
// Names follow SVAR §26: the game's own words ("the Mentor", "The Grythyttan
// Local"), no invented people or banks. Rocket content is sample text — the
// real bank is frontend/src/content/incidents/vinbar.*.json.
//
// Merge target: frontend/src/content/strings.sv.ts. Keys here are new; where
// the repo already has a string for the same place, keep the repo's key and
// add the `en` value from here.

export type Lang = 'sv' | 'en';
type Entry = { sv: string; en: string };

export const STRINGS = {
  // ── HUD ───────────────────────────────────────────────────────
  'hud.day': { sv: '{weekday} · vecka {week} av 8', en: '{weekday} · week {week} of 8' },
  'hud.phase.service': { sv: 'Service', en: 'Service' },
  'hud.phase.morning': { sv: 'Morgon', en: 'Morning' },
  'hud.cash': { sv: 'Kassa', en: 'Cash' },
  'hud.cash.value': { sv: '{k} tkr', en: 'SEK {k}k' },
  'hud.speed': { sv: 'Tempo', en: 'Speed' },
  'hud.back': { sv: 'Tillbaka', en: 'Back' },
  'hud.menu': { sv: 'Meny', en: 'Menu' },
  'hud.clock.label': { sv: 'Servicen', en: 'Service' },
  'hud.clock.start': { sv: '18.00', en: '18:00' },
  'hud.clock.ends': { sv: 'Stänger 23.00', en: 'Closes 23:00' },
  'hud.clock.left': { sv: '{h} h {m} min kvar', en: '{h} h {m} min left' },
  'hud.clock.leftMin': { sv: '{m} min kvar', en: '{m} min left' },
  'hud.clock.last': { sv: 'Sista beställningen', en: 'Last orders' },
  'hud.meter.cash': { sv: 'Kassa', en: 'Takings' },
  'hud.meter.guests': { sv: 'Gästerna', en: 'Guests' },
  'hud.meter.staff': { sv: 'Personalen', en: 'Staff' },
  'hud.feed': { sv: 'Kvällen', en: 'Tonight' },
  'hud.feed.open': { sv: 'Dörrarna öppnas, servicen börjar.', en: 'Doors open. Service begins.' },
  'hud.feed.cold': { sv: 'Kylkedjan höll från lastbilen till kylrummet.', en: 'The cold chain held from the lorry to the cold room.' },
  'hud.feed.lamps': { sv: 'Lamporna i baren och över borden tänds samtidigt.', en: 'The lamps over the bar and tables go on together.' },
  'hud.mise': { sv: 'Mise en place', en: 'Mise en place' },
  'hud.mise.ice': { sv: 'Is', en: 'Ice' },
  'hud.mise.napkins': { sv: 'Servetter', en: 'Napkins' },
  'hud.mise.cutlery': { sv: 'Bestick', en: 'Cutlery' },
  'hud.mise.stations': { sv: 'Stationer', en: 'Stations' },
  'hud.mise.garnish': { sv: 'Garnityr', en: 'Garnish' },
  'hud.portions': { sv: 'Portioner kvar', en: 'Portions left' },

  // ── Roles (shown under a figure on hover) ─────────────────────
  'role.maitre': { sv: 'Hovmästare', en: 'Maître d’' },
  'role.waiter': { sv: 'Servitör', en: 'Waiter' },
  'role.runner': { sv: 'Runner', en: 'Runner' },
  'role.sommelier': { sv: 'Sommelier', en: 'Sommelier' },
  'role.bartender': { sv: 'Bartender', en: 'Bartender' },
  'role.cook': { sv: 'Kock', en: 'Cook' },
  'role.dish': { sv: 'Diskare', en: 'Kitchen porter' },
  'role.mentor': { sv: 'Mentorn', en: 'The Mentor' },

  // ── Rocket ───────────────────────────────────────────────────
  'rocket.no': { sv: 'Raket {n} av {of}', en: 'Rocket {n} of {of}' },
  'rocket.episteme': { sv: 'Episteme', en: 'Episteme' },
  'rocket.techne': { sv: 'Techne', en: 'Techne' },
  'rocket.phronesis': { sv: 'Phronesis', en: 'Phronesis' },
  'rocket.ask.episteme': { sv: 'Vad', en: 'What' },
  'rocket.ask.techne': { sv: 'Hur', en: 'How' },
  'rocket.ask.phronesis': { sv: 'När och varför', en: 'When and why' },
  'rocket.state.done': { sv: 'klar', en: 'done' },
  'rocket.state.now': { sv: 'pågår', en: 'now' },
  'rocket.state.wrong': { sv: 'fel', en: 'wrong' },
  'rocket.state.locked': { sv: 'nås inte', en: 'locked' },
  'rocket.right': { sv: 'Rätt · vidare till {step}', en: 'Right · on to {step}' },
  'rocket.rightDone': { sv: 'Rätt · raketen klar', en: 'Right · rocket complete' },
  'rocket.wrong': { sv: 'Fel · {role} tar över', en: 'Wrong · the {role} takes over' },
  'rocket.timeout': { sv: 'Tiden gick ut · {role} tar över', en: 'Out of time · the {role} takes over' },
  'rocket.foot': { sv: 'Rummet väntar inte. Går tiden ut räknas det som fel svar.', en: 'The room won’t wait. Running out of time counts as a wrong answer.' },
  'rocket.keys': { sv: 'Välj med 1–4', en: 'Choose with 1–4' },

  // ── Evening lesson ───────────────────────────────────────────
  'lesson.kicker': { sv: 'Stängt 23.00 · kvällens lärdom', en: 'Closed 23:00 · tonight’s lesson' },
  'lesson.wrong': { sv: 'Det som gick fel', en: 'What went wrong' },
  'lesson.also': { sv: 'Också', en: 'Also' },
  'lesson.grid': { sv: 'Kvällens raketer', en: 'Tonight’s rockets' },
  'lesson.legend.done': { sv: 'klarat', en: 'passed' },
  'lesson.legend.wrong': { sv: 'fel, personalen tog över', en: 'wrong, staff took over' },
  'lesson.legend.locked': { sv: 'nåddes inte', en: 'not reached' },
  'lesson.practise': { sv: 'Öva i {pavilion} i morgon', en: 'Practise in {pavilion} tomorrow' },
  'lesson.next': { sv: 'Till kvällsberättelsen', en: 'Tonight’s story' },

  // ── Practice (Måltidens hus) ─────────────────────────────────
  'house.name': { sv: 'Måltidens hus', en: 'The House of the Meal' },
  'practice.kicker': { sv: 'Övning · ingen medalj står på spel', en: 'Practice · no medal at stake' },
  'practice.exam': { sv: 'Prov', en: 'Exam' },
  'practice.again': { sv: 'Frågan kommer tillbaka senare i övningen.', en: 'This question comes back later in the practice.' },
  'practice.next': { sv: 'Nästa fråga', en: 'Next question' },
  'practice.yours': { sv: 'Ditt svar', en: 'Your answer' },
  'practice.almost': { sv: 'Nästan.', en: 'Almost.' },

  // ── Bank ─────────────────────────────────────────────────────
  'bank.kicker': { sv: 'Söndag 11.00 · banken', en: 'Sunday 11:00 · the bank' },
  'bank.title': { sv: 'Samtal med banken', en: 'A word with the bank' },
  'bank.banker': { sv: 'Banken', en: 'The bank' },
  'bank.you': { sv: 'Du', en: 'You' },
  'bank.diagnosis': { sv: 'Bankens diagnos', en: 'The bank’s view' },
  'bank.offer': { sv: 'Banken kan erbjuda', en: 'The bank can offer' },
  'bank.notNow': { sv: 'Inte nu', en: 'Not now' },
  'bank.toAccount': { sv: 'Ta med till avräkningen', en: 'Take it to the weekly account' },
  'bank.firstRule': { sv: 'Brons i Stensöta öppnar den första vinbaren.', en: 'Bronze in Stensöta opens your first wine bar.' },

  // ── Schedule ─────────────────────────────────────────────────
  'plan.kicker': { sv: '{weekday} morgon · vecka {week}', en: '{weekday} morning · week {week}' },
  'plan.title': { sv: 'Vad gör du i dag?', en: 'What will you do today?' },
  'plan.slots': { sv: '{n} platser att fylla före kvällen', en: '{n} slots to fill before tonight' },
  'plan.slot': { sv: 'Plats {n}', en: 'Slot {n}' },
  'plan.slotEmpty': { sv: 'Välj satsning eller paviljong', en: 'Choose an initiative or a pavilion' },
  'plan.initiatives': { sv: 'Satsningar', en: 'Initiatives' },
  'plan.pavilions': { sv: 'Paviljonger i Måltidens hus', en: 'Pavilions in the House of the Meal' },
  'plan.menu': { sv: 'Kvällens meny', en: 'Tonight’s menu' },
  'plan.buy': { sv: 'Inköp', en: 'Purchasing' },
  'plan.order': { sv: 'Beställ', en: 'Order' },
  'plan.enough': { sv: 'Räcker', en: 'Enough' },
  'plan.selected': { sv: 'Vald', en: 'Chosen' },
  'plan.locked': { sv: 'Låst', en: 'Locked' },
  'plan.open': { sv: 'Öppna för kvällen', en: 'Open for the evening' },

  // ── Newspaper ────────────────────────────────────────────────
  'paper.name': { sv: 'Lokaltidningen i Grythyttan', en: 'The Grythyttan Local' },
  'paper.date': { sv: 'Söndag 5 oktober · vecka 40', en: 'Sunday 5 October · week 40' },
  'paper.review': { sv: 'Recension', en: 'Review' },
  'paper.market': { sv: 'Marknaden', en: 'The market' },
  'paper.bankWord': { sv: 'Bankens ord', en: 'From the bank' },
  'paper.nextFeast': { sv: 'Nästa högtid', en: 'Coming up' },
  'paper.effect': { sv: 'Recensionen påverkar vem som kommer nästa vecka.', en: 'The review shapes who comes next week.' },
  'paper.toBank': { sv: 'Till banken', en: 'To the bank' },

  // ── Without business and money (X1) ──────────────────────────
  'stranded.kicker': { sv: 'Ingen verksamhet · ingen kassa', en: 'No business · no cash' },
  'stranded.title': { sv: 'Banken lånar inte ut i dag.', en: 'The bank won’t lend today.' },
  'stranded.body': { sv: 'Kassan räcker inte till en ny insats. Det som öppnar en ny lokal är det du kan: en vecka i Måltidens hus med minst ett prov, så lyssnar banken igen.', en: 'Your cash won’t cover a new stake. What opens a new venue is what you know: a week in the House of the Meal with at least one exam, and the bank will listen again.' },
  'stranded.medals': { sv: 'Dina medaljer finns kvar. Det du har lärt dig tas aldrig ifrån dig.', en: 'Your medals stay. What you have learned is never taken from you.' },
  'stranded.go': { sv: 'Gå till Måltidens hus', en: 'Go to the House of the Meal' },
  'stranded.bank': { sv: 'Gå till banken', en: 'Go to the bank' }
} satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;

export function t(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  let s = STRINGS[key][lang];
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

/** Clock for the service bar: 18:00–23:00 mapped from sim minutes. */
export function serviceClock(lang: Lang, minutesSince18: number) {
  const left = Math.max(0, 300 - minutesSince18);
  const h = Math.floor(left / 60), m = Math.round(left % 60);
  const now = 18 * 60 + minutesSince18;
  const hh = String(Math.floor(now / 60)).padStart(2, '0'), mm = String(Math.floor(now % 60)).padStart(2, '0');
  return {
    now: lang === 'en' ? hh + ':' + mm : hh + '.' + mm,
    left: h > 0 ? t(lang, 'hud.clock.left', { h, m }) : t(lang, 'hud.clock.leftMin', { m }),
    share: left / 300,
    lastOrders: left <= 30
  };
}
