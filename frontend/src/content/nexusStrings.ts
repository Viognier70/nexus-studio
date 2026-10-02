// ORDER 273 — strängtabellen: svenska och engelska sida vid sida.
//
// GENERERAD av scripts/order273-strings-table.mjs (kan köras om, se skriptets
// huvud). Vision Owner 2026-09-28: Designs nexusStrings.ts är grunden, spelets
// egna strängar är sammanslagna in, och Designs ordval gäller där de skiljer sig.
//
// Filen har två delar:
//   1. Designs tabell (leveransen nexus-leverans-2026-09-28/nexusStrings.ts)
//      ordagrant: STRINGS (platt, { sv, en } per nyckel), t(lang, key, vars),
//      Lang och serviceClock(lang, min).
//   2. Spelets tabell TABLE med samma nästlade form som de tidigare
//      strings.sv.ts / strings.en.ts; varje löv är { sv, en }. Funktioner,
//      tupler och `{…} as Record`-objekt är löv i sin helhet.
// pickLang(TABLE, lang) ger tabellen för ett språk; content/strings.ts
// exporterar `strings` för det aktuella språket (content/language.ts).
//
// Egennamn på platser och paviljonger står kvar på svenska också i de
// engelska löven (CLAUDE.md regel 7); "Måltidens hus" heter på engelska
// "the House of the Meal" (Designs house.name).

// ───────────────────────────────────────────────────────────────────
// 1. Designs tabell (leveransen 2026-09-28, ordagrant)
// ───────────────────────────────────────────────────────────────────

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

import { SERVICE_MODE_STRINGS } from './design/serviceModeStrings';
import { PYRAMID_STRINGS } from './design/pyramidStrings';
import { STAFF_RING_STRINGS } from './design/staffRingStrings';
import { EVENT_STRINGS } from './design/eventStrings';
import { THEATRE_STRINGS } from './design/theatreStrings';
import { EVERYDAY_STRINGS } from './design/everydayStrings';

export type Lang = 'sv' | 'en';
// ORDER 289 — singular eller plural efter antalet ("1 bottles" skulle vara
// "1 bottle", provspel av 285). Används i alla texter med antal.
// Talet kan vara skrivet som ord ("one", "en", "ett").
const pl = (n: number | string, one: string, many: string): string =>
  (n === 1 || (typeof n === 'string' && /^(1|one|en|ett)$/i.test(n.trim())) ? one : many);
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
  'stranded.bank': { sv: 'Gå till banken', en: 'Go to the bank' },
  // ORDER 296 (punkt 6) — vid förlust dras beloppet från kontot, det förs inte över.
  'settle.loss.do': { sv: 'Dras från kontot {n}', en: 'Deduct from the account {n}' },
  // ORDER 296 (punkt 6) — frågan innan dörrarna öppnas med för lite i lagret.
  'open.short.title': { sv: 'Lagret räcker inte', en: 'The stock won’t last' },
  'open.short.body': { sv: 'Lagret räcker till {covers} av {guests} väntade gäster. De andra får gå utan mat, och ryktet faller. Vill du öppna ändå?', en: 'The stock covers {covers} of {guests} expected guests. The others will leave without food, and your reputation will fall. Open anyway?' },
  'open.short.buy': { sv: 'Köp råvaror', en: 'Buy stock' },
  'open.short.open': { sv: 'Öppna ändå', en: 'Open anyway' },
  'open.short.cancel': { sv: 'Inte än', en: 'Not yet' },
  'settle.loss.done': { sv: 'Draget från kontot {time}', en: 'Deducted from the account at {time}' },
  // ORDER 296 (punkt 2) — risken: bankens villkor, veckomålet och stängningen.
  'risk.bank.terms': { sv: 'Under säsongen betalar du bara ränta på lånet. Banken vill se en intäkt på minst {target} i veckan. Missar du målet två veckor i rad förhandlar vi om lånet, och räntan blir dubbel. Står kassan under noll vid tre avräkningar i rad stänger krogen.', en: 'During the season you only pay interest on the loan. The bank wants to see at least {target} in takings each week. Miss the target two weeks running and we renegotiate the loan, at double the interest. If the account is below zero at three settlements in a row, the restaurant closes.' },
  'risk.week.progress': { sv: 'Veckans intäkt hittills: {n} av bankens mål {target}.', en: 'Takings this week so far: {n} of the bank’s target of {target}.' },
  'risk.settle.hit': { sv: 'Veckomålet är nått: {n} av {target}.', en: 'The weekly target is met: {n} of {target}.' },
  'risk.settle.miss': { sv: 'Veckomålet är missat: {n} av {target}.', en: 'The weekly target is missed: {n} of {target}.' },
  'risk.settle.renegotiated': { sv: 'Två missade veckor i rad. Banken har förhandlat om lånet, och räntan är dubbel resten av säsongen.', en: 'Two missed weeks running. The bank has renegotiated the loan, and the interest is doubled for the rest of the season.' },
  'risk.settle.below': { sv: 'Kassan är under noll efter avräkningen, {weeks} av {max} veckor i rad. Vid {max} stänger krogen.', en: 'The account is below zero after the settlement, {weeks} of {max} weeks in a row. At {max} the restaurant closes.' },
  'risk.closed.kicker': { sv: 'Säsongen är slut', en: 'The season is over' },
  'risk.closed.title': { sv: 'Krogen stänger', en: 'The restaurant closes' },
  'risk.closed.body': { sv: 'Kassan har stått under noll vid tre veckoavräkningar i rad. Banken säger upp lånet efter vecka {week}, och dörren förblir stängd.', en: 'The account has been below zero at three weekly settlements in a row. The bank calls in the loan after week {week}, and the door stays shut.' },
  'risk.closed.medals': { sv: 'Dina medaljer och det du lärt dig är kvar. En ny säsong börjar med samma kunskap.', en: 'Your medals and what you have learned remain. A new season starts with the same knowledge.' },
  // ORDER 296 (punkt 5) — förberedelsen på morgonen.
  'prep.label': { sv: 'Förberedelsen', en: 'The prep' },
  'prep.minutes': { sv: '{need} min · personalen hinner {capacity}', en: '{need} min · the team manages {capacity}' },
  'prep.ready': { sv: 'Allt hinns före öppning.', en: 'Everything is ready before opening.' },
  'prep.backlog': { sv: '{n} minuter görs efter öppning, och gästerna får vänta längre tills det är klart.', en: '{n} minutes are done after opening, and the guests wait longer until it is finished.' },
  'prep.hand': { sv: 'Ta in en extra hand · {price} · +{n} min', en: 'Bring in an extra pair of hands · {price} · +{n} min' },
  'prep.handHired': { sv: 'En extra hand förbereder med laget.', en: 'An extra pair of hands is prepping with the team.' },
  'risk.closed.again': { sv: 'Börja om', en: 'Start again' },
  // ORDER 290 — Designs leveranser 2026-09-30 (serviceläget, rätt och fel med
  // pyramiden, ringen), inslagna oförändrade.
  ...SERVICE_MODE_STRINGS,
  ...PYRAMID_STRINGS,
  ...STAFF_RING_STRINGS,
  // ORDER 293 — Designs leverans 3 (händelserna, teaterns namn) och vardagens
  // koreografi, inslagna oförändrade.
  ...THEATRE_STRINGS,
  ...EVENT_STRINGS,
  ...EVERYDAY_STRINGS
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

// ───────────────────────────────────────────────────────────────────
// 2. Spelets tabell
// ───────────────────────────────────────────────────────────────────

export const TABLE = {
  title: { sv: 'NEXUS', en: 'NEXUS' },
  subtitle: { sv: 'Grythyttan — The Origin', en: 'Grythyttan — The Origin' },
  busText: {
    sv: 'Alla kommer hit med drömmar.\nIngen vet ännu vem de kommer att bli.',
    en: 'Everyone comes here with dreams.\nNo one knows yet who they will become.'
  },
  npc: {
    prompt: { sv: 'Är du också här för antagningen?', en: 'Are you here for admissions too?' },
    choices: {
      A: {
        sv: 'Ja. Jag vet bara inte riktigt vad jag kan bli.',
        en: "Yes. I just don't really know what I could become."
      },
      B: { sv: 'Ja. Jag har drömt om att arbeta med gastronomi.', en: "Yes. I've dreamt of working with gastronomy." },
      C: {
        sv: 'Jag är mest nyfiken på varför den här platsen betyder så mycket.',
        en: "I'm mostly curious why this place means so much."
      }
    },
    responses: {
      A: {
        sv: 'Det är fler än du tror som säger så. Kanske är det just därför vi kommit hit.',
        en: 'More people say that than you think. Maybe that is exactly why we came here.'
      },
      B: {
        sv: 'Många vägar leder in i gastronomin. Se först vad platsen gör med dig.',
        en: 'Many paths lead into gastronomy. First, see what the place does to you.'
      },
      C: {
        sv: 'Det märks. Var uppmärksam idag — Grythyttan brukar svara den som frågar.',
        en: 'It shows. Pay attention today — Grythyttan tends to answer those who ask.'
      }
    }
  },
  objective: { sv: 'Hitta registreringen vid Sevillapaviljongen.', en: 'Find registration at the Sevilla Pavilion.' },
  end: {
    heading: { sv: 'Din initiation börjar här.', en: 'Your initiation begins here.' },
    continueButton: { sv: 'Utforska vidare', en: 'Explore further' },
    restartButton: { sv: 'Börja om', en: 'Start again' }
  },
  pause: {
    title: { sv: 'Paus', en: 'Pause' },
    resume: { sv: 'Fortsätt', en: 'Continue' },
    restart: { sv: 'Börja om', en: 'Start again' },
    muteOn: { sv: 'Ljud på', en: 'Sound on' },
    muteOff: { sv: 'Ljud av', en: 'Sound off' },
    controlsHeading: { sv: 'Kontroller', en: 'Controls' },
    aboutHeading: { sv: 'Om denna prototyp', en: 'About this prototype' },
    disclaimer: {
      sv: 'Vertikal skiva 001. Alla platser, byggnader och personer i denna prototyp är stiliserade platshållare. Inget anspråk görs på arkitektonisk trohet eller rättigheter. Grythyttan och Sevillapaviljongen är verkliga platser som här används enbart som narrativ inspiration.',
      en: 'Vertical slice 001. All places, buildings and people in this prototype are stylised placeholders. No claim is made to architectural accuracy or rights. Grythyttan and the Sevilla Pavilion are real places, used here purely as narrative inspiration.'
    }
  },
  controls: {
    desktop: {
      sv: [
          'W A S D eller pilar — gå',
          'Mus — se dig omkring',
          'Shift — gå fortare',
          'E — interagera',
          'Esc — paus'
        ],
      en: [
          'W A S D or arrows — walk',
          'Mouse — look around',
          'Shift — walk faster',
          'E — interact',
          'Esc — pause'
        ]
    },
    mobile: {
      sv: [
          'Vänster styrspak — gå',
          'Dra på skärmen — se dig omkring',
          'Knapp — interagera'
        ],
      en: [
          'Left joystick — walk',
          'Drag on the screen — look around',
          'Button — interact'
        ]
    }
  },
  prompts: {
    talkTo: { sv: 'Prata', en: 'Talk' },
    register: { sv: 'Registrera dig', en: 'Register' }
  },
  hud: {
    muteAria: { sv: 'Slå av ljudet', en: 'Mute sound' },
    unmuteAria: { sv: 'Slå på ljudet', en: 'Unmute sound' },
    pauseLabel: { sv: 'Paus', en: 'Pause' },
    soundLabel: { sv: 'Ljud', en: 'Sound' },
    beginPlay: { sv: 'Fortsätt', en: 'Continue' },
    speed: { sv: 'Tempo', en: 'Speed' },
    speedOption: { sv: (n: number) => `${n}× tempo`, en: (n: number) => `${n}× speed` }
  },
  webglFallback: {
    title: { sv: 'Grafiken kan inte visas', en: 'The graphics cannot be shown' },
    body: {
      sv: 'Din webbläsare eller enhet stöder inte WebGL. Prototypen kräver hårdvaruaccelererad 3D-grafik.',
      en: 'Your browser or device does not support WebGL. The prototype needs hardware-accelerated 3D graphics.'
    },
    quote: {
      sv: 'Alla kommer hit med drömmar. Ingen vet ännu vem de kommer att bli.',
      en: 'Everyone comes here with dreams. No one knows yet who they will become.'
    },
    restart: { sv: 'Försök igen', en: 'Try again' }
  },
  business: {
    firstRunHeading: { sv: 'Din verksamhet', en: 'Your business' },
    firstRunBody: {
      sv: 'Du äger en restaurang i Grythyttans historiska kärna. Vad heter den?',
      en: "You own a restaurant in Grythyttan's historic centre. What is it called?"
    },
    firstRunPlaceholder: { sv: 'Restaurangens namn', en: 'Name of the restaurant' },
    firstRunSubmit: { sv: 'Öppna verksamheten', en: 'Open the business' },
    firstRunHint: { sv: 'Namnet kan du inte ändra senare.', en: 'You cannot change the name later.' },
    labelPrefix: { sv: 'Restaurang', en: 'Restaurant' }
  },
  // ORDER 267 (Nexus v1 etapp 5) — söndagstidningen (sim/newspaper.ts).
  newspaper: {
    // ORDER 285 — bildtexten till tidningens foto (spelets egen rendering).
    photoCaption: { sv: 'Vår krog, fotograferad på söndagsmorgonen.', en: 'Our place, photographed on Sunday morning.' },
    masthead: { sv: 'Lokaltidningen i Grythyttan', en: 'The Grythyttan Local' },
    subhead: { sv: (week: number) => `Söndag · vecka ${week}`, en: (week: number) => `Sunday · week ${week}` },
    open: { sv: 'Söndagsnumret', en: 'The Sunday Edition' },
    close: { sv: 'Lägg ifrån dig tidningen', en: 'Put the paper down' },
    reviewHeading: { sv: 'Recension', en: 'Review' },
    marketHeading: { sv: 'Marknaden', en: 'The market' },
    bankHeading: { sv: 'Bankens ord', en: 'From the bank' },
    holidayHeading: { sv: 'Nästa högtid', en: 'Coming up' },
    reviewTitleGood: {
      sv: (weekday: string, name: string) => `En ${weekday}kväll hos ${name}`,
      en: (weekday: string, name: string) => `A ${weekday} evening at ${name}`
    },
    reviewTitleBad: {
      sv: (weekday: string, name: string) => `En ${weekday}kväll hos ${name} som inte höll`,
      en: (weekday: string, name: string) => `A ${weekday} evening at ${name} that did not hold`
    },
    reviewFull: {
      sv: 'Det var fullt, och kön ringlade ut mot torget.',
      en: 'It was full, and the queue wound out towards the square.'
    },
    reviewGaveUp: {
      sv: 'Några tröttnade i kön och gick innan de fick plats.',
      en: 'Some grew tired of the queue and left before they got a seat.'
    },
    reviewSparse: {
      sv: 'Rummet var glest, och det märktes i stämningen.',
      en: 'The room was sparse, and you could feel it in the mood.'
    },
    reviewSteady: { sv: 'Rummet fylldes i jämn takt.', en: 'The room filled at a steady pace.' },
    reviewUp: {
      sv: 'De som satt där talade gott om kvällen efteråt.',
      en: 'Those who were there spoke well of the evening afterwards.'
    },
    reviewDown: { sv: 'Ryktet fick sig en törn.', en: 'The reputation took a knock.' },
    reviewFlat: {
      sv: 'Kvällen gick som kvällar gör, utan att någon talade om den efteråt.',
      en: 'The evening went the way evenings do, and no one talked about it afterwards.'
    },
    noEvenings: {
      sv: (name: string) => `${name} höll stängt hela veckan. Tidningen har ingen kväll att recensera.`,
      en: (name: string) => `${name} was closed all week. The paper has no evening to review.`
    },
    market: {
      full: {
        sv: (cls: string) => `${cls} tog nästan varje gäst som marknaden gav den den här veckan.`,
        en: (cls: string) => `${cls} took almost every guest the market gave it this week.`
      },
      most: {
        sv: (cls: string) => `${cls} fick de flesta av gästerna den kunde få den här veckan.`,
        en: (cls: string) => `${cls} got most of the guests it could get this week.`
      },
      half: {
        sv: (cls: string) => `${cls} fick ungefär hälften av gästerna den kunde få den här veckan.`,
        en: (cls: string) => `${cls} got about half of the guests it could get this week.`
      },
      few: {
        sv: (cls: string) => `${cls} fick få av gästerna den kunde få den här veckan.`,
        en: (cls: string) => `${cls} got few of the guests it could get this week.`
      }
    },
    marketNoBusiness: {
      sv: 'Du hade ingen verksamhet den här veckan, och inga gäster att räkna.',
      en: 'You had no business this week, and no guests to count.'
    },
    bankNext: {
      sv: (missing: string) => `Banken om nästa steg: ${missing.charAt(0).toLowerCase()}${missing.slice(1)}`,
      en: (missing: string) => `The bank on the next step: ${missing.charAt(0).toLowerCase()}${missing.slice(1)}`
    },
    holidayNextWeek: { sv: (name: string) => `${name} nästa vecka.`, en: (name: string) => `${name} next week.` },
    holidayInWeeks: {
      sv: (name: string, weeks: string) => `${name} om ${weeks} ${pl(weeks, 'vecka', 'veckor')}.`,
      en: (name: string, weeks: string) => `${name} in ${weeks} ${pl(weeks, 'week', 'weeks')}.`
    },
    holidayNone: { sv: 'Ingen högtid före säsongens slut.', en: 'No holiday before the end of the season.' },
    weekdaysLower: {
      mon: { sv: 'måndags', en: 'Monday' },
      tue: { sv: 'tisdags', en: 'Tuesday' },
      wed: { sv: 'onsdags', en: 'Wednesday' },
      thu: { sv: 'torsdags', en: 'Thursday' },
      fri: { sv: 'fredags', en: 'Friday' },
      sat: { sv: 'lördags', en: 'Saturday' },
      sun: { sv: 'söndags', en: 'Sunday' }
    }
  },
  // ORDER 267 (Nexus v1 etapp 5) — startrutan, mentorn i introduktionen
  // och namnet på den första verksamheten.
  introduction: {
    startHeading: { sv: 'Nexus', en: 'Nexus' },
    startSubtitle: { sv: 'Grythyttan', en: 'Grythyttan' },
    newGame: { sv: 'Nytt spel', en: 'New game' },
    mentor: { sv: 'Mentorn', en: 'The Mentor' },
    steps: {
      practice: {
        sv: 'Välkommen till Grythyttan. Jag kommer från Campus och följer dig i dag. Banken lånar inte ut något förrän den har sett vad du kan, så vi börjar med att öva. Öppna Måltidens hus och öva i Stensöta, där sommelierna håller till. Inget står på spel.',
        en: "Welcome to Grythyttan. I'm from Campus and I'll be with you today. The bank won't lend you anything until it has seen what you can do, so we start by practising. Open the House of the Meal and practise in Stensöta, where the sommeliers are. Nothing is at stake."
      },
      exam: {
        sv: 'Bra. Nu provet i samma paviljong: åtta frågor, och sex rätt ger brons. Med brons i Stensöta kan banken låna ut till en vinbar. Går det inte, gör om det. I dag kostar besöken ingen plats i schemat.',
        en: "Good. Now the exam in the same pavilion: eight questions, and six right gives bronze. With bronze in Stensöta the bank can lend you enough for a wine bar. If it doesn't work, try again. Today the visits don't take a slot in the schedule."
      },
      bank: {
        sv: 'Brons. Gå till Banken i morgonraden. Där får du höra vad du har visat och vad du kan låna till.',
        en: "Bronze. Go to the Bank in the morning row. There you'll hear what you have shown and what you can borrow for."
      }
    },
    farewell: {
      sv: 'Nu är den din. I kväll öppnar du för första gången. Den här veckan kommer färre gäster än vanligt, så du hinner lära dig rummet. Jag finns på Campus om det går illa.',
      en: "Now it's yours. Tonight you open for the first time. This week fewer guests than usual will come, so you have time to learn the room. I'm at Campus if things go badly."
    },
    farewellClose: { sv: 'Tack', en: 'Thank you' },
    classesIndefinite: {
      vinbar: { sv: 'en vinbar', en: 'a wine bar' },
      foodtruck: { sv: 'en food truck', en: 'a food truck' },
      restaurang: { sv: 'en restaurang', en: 'a restaurant' },
      olkrog: { sv: 'en ölkrog', en: 'a brewpub' },
      gastgiveri: { sv: 'ett gästgiveri', en: 'an inn' },
      nattklubb: { sv: 'en nattklubb', en: 'a nightclub' }
    },
    chooseFirst: { sv: (cls: string) => `Öppna ${cls}`, en: (cls: string) => `Open ${cls}` },
    nameBody: {
      sv: (cls: string) => `Banken lånar ut till ${cls} vid torget. Vad ska den heta?`,
      en: (cls: string) => `The bank will lend you enough for ${cls} by the square. What should it be called?`
    },
    namePlaceholder: { sv: 'Verksamhetens namn', en: 'Name of the business' },
    endContinue: { sv: 'Fortsätt', en: 'Continue' }
  },
  day: {
    // ORDER 043 v3 §2 — day-period player-facing text. Cycle-1 scope:
    // morning + afternoon are the two picker phases; lunch/dinner/
    // evening are running or transitional.
    morning: {
      heading: { sv: 'Morgon', en: 'Morning' },
      body: { sv: 'Öppna lunch eller hoppa över.', en: 'Open for lunch or skip it.' },
      openLunch: { sv: 'Öppna lunch', en: 'Open for lunch' },
      skipLunch: { sv: 'Hoppa över lunch', en: 'Skip lunch' }
    },
    afternoon: {
      heading: { sv: 'Eftermiddag', en: 'Afternoon' },
      body: { sv: 'Öppna middag.', en: 'Open for dinner.' },
      openDinner: { sv: 'Öppna middag', en: 'Open for dinner' }
    },
    minutesSuffix: { sv: 'min', en: 'min' }
  },
  // ORDER 263 (Nexus v1 etapp 1) — tiden och sparandet. Svenska enligt
  // speldesignen > Språk och målgrupp (CLAUDE.md regel 7, F9).
  calendar: {
    weekdays: {
      mon: { sv: 'Måndag', en: 'Monday' },
      tue: { sv: 'Tisdag', en: 'Tuesday' },
      wed: { sv: 'Onsdag', en: 'Wednesday' },
      thu: { sv: 'Torsdag', en: 'Thursday' },
      fri: { sv: 'Fredag', en: 'Friday' },
      sat: { sv: 'Lördag', en: 'Saturday' },
      sun: { sv: 'Söndag', en: 'Sunday' }
    },
    weekdaysShort: {
      mon: { sv: 'Mån', en: 'Mon' },
      tue: { sv: 'Tis', en: 'Tue' },
      wed: { sv: 'Ons', en: 'Wed' },
      thu: { sv: 'Tor', en: 'Thu' },
      fri: { sv: 'Fre', en: 'Fri' },
      sat: { sv: 'Lör', en: 'Sat' },
      sun: { sv: 'Sön', en: 'Sun' }
    },
    week: {
      sv: (week: number, weeks: number) => `Vecka ${week} av ${weeks}`,
      en: (week: number, weeks: number) => `Week ${week} of ${weeks}`
    },
    weekShort: { sv: (week: number) => `v. ${week}`, en: (week: number) => `wk ${week}` },
    season: { sv: (season: number) => `Säsong ${season}`, en: (season: number) => `Season ${season}` },
    holidays: {
      midsommar: { sv: 'Midsommar', en: 'Midsummer' },
      grythyttedagarna: { sv: 'Grythyttedagarna', en: 'Grythyttan Days' },
      vinprovning: { sv: 'Vinprovning i Stensöta', en: 'Wine tasting in Stensöta' },
      kraftskiva: { sv: 'Kräftskiva', en: 'Crayfish party' }
    },
    holidayToday: { sv: (name: string) => `${name} i dag`, en: (name: string) => `${name} today` },
    holidayThisWeek: { sv: (name: string) => `${name} den här veckan`, en: (name: string) => `${name} this week` },
    phases: {
      morning: { sv: 'Morgon', en: 'Morning' },
      service: { sv: 'Service', en: 'Service' },
      evening: { sv: 'Kväll', en: 'Evening' }
    },
    closed: { sv: 'Stängt', en: 'Closed' }
  },
  morning: {
    heading: { sv: 'Morgon', en: 'Morning' },
    serviceDayBody: {
      sv: 'Fyll dagens schema och öppna för kvällen.',
      en: "Fill today's schedule and open for the evening."
    },
    sundayBody: {
      sv: 'Söndag. Krogen är stängd, och du har fyra platser i schemat.',
      en: 'Sunday. The restaurant is closed, and you have four slots in the schedule.'
    },
    slots: {
      sv: (used: number, total: number) => `Schemat: ${used} av ${total} ${pl(total, 'plats', 'platser')}`,
      en: (used: number, total: number) => `Schedule: ${used} of ${total} ${pl(total, 'slot', 'slots')}`
    },
    startService: { sv: 'Öppna för kvällen', en: 'Open for the evening' },
    closeSunday: { sv: 'Avsluta söndagen', en: 'End Sunday' },
    closeDay: { sv: 'Avsluta dagen utan service', en: 'End the day without service' },
    activitiesHeading: { sv: 'Satsningar i dag', en: 'Today’s initiatives' },
    weekly: { sv: 'en gång i veckan', en: 'once a week' }
  },
  // ORDER 264 (Nexus v1 etapp 2) — Måltidens hus, prov och kvällsquiz.
  knowledge: {
    houseButton: { sv: 'Måltidens hus', en: 'The House of the Meal' },
    houseHeading: { sv: 'Måltidens hus', en: 'The House of the Meal' },
    houseBody: {
      sv: 'Ett besök tar en plats i dagens schema. Öva för krediter, eller gör prov för nästa medalj.',
      en: 'A visit takes one slot in today’s schedule. Practise for credits, or take an exam for the next medal.'
    },
    close: { sv: 'Stäng', en: 'Close' },
    pavilions: {
      maltidbiblioteket: { sv: 'Måltidsbiblioteket', en: 'Måltidsbiblioteket' },
      kalastorget: { sv: 'Kalastorget', en: 'Kalastorget' },
      stensota: { sv: 'Stensöta', en: 'Stensöta' },
      metodkoket: { sv: 'Metodköket', en: 'Metodköket' },
      gastronomiskateatern: { sv: 'Gastronomiska Teatern', en: 'Gastronomiska Teatern' }
    },
    axes: {
      episteme: { sv: 'episteme', en: 'episteme' },
      techne: { sv: 'techne', en: 'techne' },
      phronesis: { sv: 'fronesis', en: 'phronesis' }
    },
    medals: {
      brons: { sv: 'brons', en: 'bronze' },
      silver: { sv: 'silver', en: 'silver' },
      guld: { sv: 'guld', en: 'gold' },
      platina: { sv: 'platina', en: 'platinum' }
    },
    noMedal: { sv: 'Ingen medalj ännu', en: 'No medal yet' },
    medalLine: { sv: (medal: string) => `Medalj: ${medal}`, en: (medal: string) => `Medal: ${medal}` },
    medalsHeading: { sv: 'Medaljer', en: 'Medals' },
    noMedalsYet: { sv: 'Inga medaljer ännu', en: 'No medals yet' },
    practice: { sv: 'Öva', en: 'Practise' },
    exam: { sv: (level: string) => `Prov: ${level}`, en: (level: string) => `Exam: ${level}` },
    examDone: { sv: 'Platina är taget', en: 'Platinum is taken' },
    theatreLocked: {
      sv: 'Öppnas när du har silver i två paviljonger',
      en: 'Opens when you have silver in two pavilions'
    },
    noSlotsLeft: { sv: 'Dagens schema är fullt', en: "Today's schedule is full" },
    askers: {
      kock: { sv: 'Kocken', en: 'The cook' },
      sommelier: { sv: 'Sommelieren', en: 'The sommelier' },
      gäst: { sv: 'Gästen', en: 'The guest' },
      värd: { sv: 'Värden', en: 'The host' },
      servitör: { sv: 'Servitören', en: 'The waiter' },
      lärling: { sv: 'Lärlingen', en: 'The apprentice' }
    },
    questionOf: {
      sv: (n: number, total: number) => `Fråga ${n} av ${total}`,
      en: (n: number, total: number) => `Question ${n} of ${total}`
    },
    right: { sv: 'Rätt.', en: 'Right.' },
    wrong: { sv: 'Inte riktigt.', en: 'Not quite.' },
    // ORDER 270 — provet på tid och referensen med förklaringen.
    timedOut: { sv: 'Tiden gick ut. Det räknas som fel.', en: 'Time ran out. It counts as wrong.' },
    secondsLeft: { sv: (sec: string) => `${sec} s`, en: (sec: string) => `${sec} s` },
    referenceLabel: { sv: 'Läs mer:', en: 'Read more:' },
    next: { sv: 'Nästa', en: 'Next' },
    seeResult: { sv: 'Se resultatet', en: 'See the result' },
    practiceResult: {
      sv: (correct: number, total: number) => `${correct} av ${total} rätt. Varje rätt svar gav en kredit.`,
      en: (correct: number, total: number) => `${correct} of ${total} right. Each right answer gave one credit.`
    },
    examPassed: {
      sv: (medal: string, pavilion: string, correct: number, total: number) =>
        `${correct} av ${total} rätt. Du har tagit ${medal} i ${pavilion}.`,
      en: (medal: string, pavilion: string, correct: number, total: number) =>
        `${correct} of ${total} right. You have taken ${medal} in ${pavilion}.`
    },
    examFailed: {
      sv: (correct: number, total: number, need: number) =>
        `${correct} av ${total} rätt. Det behövs ${need}. Ett nytt prov drar nya frågor.`,
      en: (correct: number, total: number, need: number) =>
        `${correct} of ${total} right. You need ${need}. A new exam draws new questions.`
    },
    back: { sv: 'Tillbaka', en: 'Back' },
    placeholderNote: {
      sv: 'Frågorna på den här nivån är tillfälliga tills de riktiga är skrivna.',
      en: 'The questions at this level are temporary until the real ones are written.'
    },
    nextQuestion: { sv: 'Nästa fråga', en: 'Next question' }
  },
  // ORDER 270 — kvällens lärdom ersätter quizen efter servicen.
  lesson: {
    heading: { sv: 'Kvällens lärdom', en: "Tonight's lesson" },
    eveningHeading: { sv: 'Kvällen', en: 'The evening' },
    intro: { sv: 'Det här gick fel i kväll, och varför.', en: 'This is what went wrong tonight, and why.' },
    none: {
      sv: 'Inga fel beslut i kväll. Varje raket höll hela vägen.',
      en: 'No wrong decisions tonight. Every rocket held all the way.'
    },
    noIncidents: { sv: 'Kvällen hade inga händelser att lära av.', en: 'The evening had no incidents to learn from.' },
    // ORDER 270 — raketen föll på ett steg.
    fellOn: {
      sv: (step: string, question: string) => `${step}: ${question}`,
      en: (step: string, question: string) => `${step}: ${question}`
    },
    youChose: { sv: (label: string) => `Du valde: ${label}`, en: (label: string) => `You chose: ${label}` },
    staffDecided: {
      sv: (outcome: string) => `Du svarade inte, och personalen beslutade själv. ${outcome}`,
      en: (outcome: string) => `You did not answer, and the staff decided for themselves. ${outcome}`
    },
    better: { sv: (label: string) => `Bättre: ${label}`, en: (label: string) => `Better: ${label}` },
    nextMorning: { sv: 'Till nästa morgon', en: 'On to the next morning' }
  },
  // ORDER 271 — skärmarna i paket 1 (mentorn M1/M2, morgonens schema
  // S1/S2, banken B0/B1, tidningen T1, Måltidens hus O1/O2/MD1/MD2).
  // Speldesignens text där den finns; övrigt är skärmarnas egna rader.
  screens: {
    mentor: {
      label: { sv: 'Mentorn · från Campus', en: 'The Mentor · from Campus' },
      campus: { sv: 'Campus', en: 'Campus' },
      stepOf: {
        sv: (n: number, total: number) => `Steg ${n} av ${total}`,
        en: (n: number, total: number) => `Step ${n} of ${total}`
      },
      skip: { sv: 'Jag klarar mig — hoppa över guiden', en: "I'll manage — skip the guide" },
      understood: { sv: 'Uppfattat', en: 'Understood' },
      service: {
        sv: 'Nu öppnar du. När något händer i rummet kommer ett kort upp: vad, hur och när, ett steg i taget och på tid. Svarar du inte tar personalen över. Mätarna visar kassan, gästerna och personalen, i riktning, inte i belopp.',
        en: 'Now you open. When something happens in the room, a card comes up: what, how and when, one step at a time and against the clock. If you do not answer, the staff take over. The meters show the cash, the guests and the staff, as direction, not as amounts.'
      }
    },
    morning: {
      label: {
        sv: (weekday: string, week: number, weeks: number) => `${weekday} morgon · vecka ${week} av ${weeks}`,
        en: (weekday: string, week: number, weeks: number) => `${weekday} morning · week ${week} of ${weeks}`
      },
      heading: { sv: 'Vad gör du i dag?', en: 'What will you do today?' },
      sundayHeading: { sv: 'Söndag. Fyra platser, en lång dag.', en: 'Sunday. Four slots, a long day.' },
      slot: { sv: (n: number) => `Plats ${n}`, en: (n: number) => `Slot ${n}` },
      slotPavilion: { sv: 'Paviljong', en: 'Pavilion' },
      slotActivity: { sv: 'Satsning', en: 'Initiative' },
      slotEmpty: { sv: 'Välj satsning eller paviljong', en: 'Choose an initiative or a pavilion' },
      newspaperArrived: { sv: 'Söndagstidningen har kommit', en: 'The Sunday paper has arrived' },
      newspaperBody: {
        sv: 'Recensionen, marknaden, banken och det som kommer.',
        en: 'The review, the market, the bank and what is coming.'
      },
      activities: { sv: 'Satsningar', en: 'Initiatives' },
      pavilions: { sv: 'Paviljonger i Måltidens hus', en: 'Pavilions in the House of the Meal' },
      picked: { sv: 'Vald', en: 'Chosen' },
      aside: { sv: 'Rummet och personalen', en: 'The room and the staff' },
      backToSchedule: { sv: 'Tillbaka till schemat', en: 'Back to the schedule' }
    },
    bank: {
      speaker: { sv: 'Banken', en: 'The bank' },
      diagnosis: { sv: 'Bankens diagnos', en: 'The bank’s view' },
      seen: { sv: 'Det banken ser', en: 'What the bank sees' },
      none: { sv: 'ingen än', en: 'none yet' },
      startLoan: { sv: 'Startlån', en: 'Start-up loan' },
      queue: { sv: 'Kö i stället för platser.', en: 'A queue instead of seats.' },
      seats: { sv: (n: number) => `${n} ${pl(n, 'plats', 'platser')}.`, en: (n: number) => `${n} ${pl(n, 'seat', 'seats')}.` },
      // Speldesign > Verksamhetsklasserna, kolumnen Särdrag.
      traits: {
        vinbar: { sv: 'Smårätter, lounger, DJ, vinlista.', en: 'Small plates, lounges, DJ, wine list.' },
        foodtruck: {
          sv: 'Lucka mot gatan, kö, väder, gatuläge, snabb omsättning.',
          en: 'Hatch onto the street, queue, weather, street location, fast turnover.'
        },
        restaurang: {
          sv: 'Matsal och bar, mise en place, flera rätter.',
          en: 'Dining room and bar, mise en place, several courses.'
        },
        olkrog: { sv: 'Bryggeri i lokalen, rejäl mat, få rätter.', en: 'Brewery on site, hearty food, few dishes.' },
        gastgiveri: {
          sv: 'Övernattning, frukost, soignée servering, dygnsstruktur.',
          en: 'Overnight stays, breakfast, soignée service, a round-the-clock rhythm.'
        },
        nattklubb: {
          sv: 'Flera barer, dans, volym och flöde, sena kvällar.',
          en: 'Several bars, dancing, volume and flow, late nights.'
        }
      },
      firstLabel: {
        sv: (weekday: string) => `${weekday} · dag 1 · banken`,
        en: (weekday: string) => `${weekday} · day 1 · the bank`
      },
      firstHeading: { sv: 'Första mötet med banken', en: 'First meeting with the bank' },
      firstOpening: {
        sv: 'Mentorn sa att du gjorde provet i dag. Låt mig se.',
        en: 'The Mentor said you took the exam today. Let me see.'
      },
      // ORDER 289 — repliken efter vad spelaren har gjort (provspel av 285).
      firstOpeningNoMedal: {
        sv: 'Mentorn sa att du gjorde ett prov i dag, men det räckte inte till en medalj. Låt mig se vad du har.',
        en: 'The Mentor said you took an exam today, but it did not earn a medal. Let me see what you have.'
      },
      firstOpeningNoExam: {
        sv: 'Du har inte gjort något prov än. Banken lånar ut på det du har visat, så låt mig se vad som finns.',
        en: 'You have not taken an exam yet. The bank lends on what you have shown, so let me see what there is.'
      },
      firstVerdict: {
        vinbar: {
          sv: 'Det räcker för ett rum med bord. Banken vågar vinbaren.',
          en: 'It is enough for a room with tables. The bank will risk the wine bar.'
        },
        foodtruck: {
          sv: 'Det räcker för att börja, men inte för ett rum med bord.',
          en: 'It is enough to start, but not for a room with tables.'
        },
        restaurang: { sv: 'Det räcker för att börja.', en: 'It is enough to start.' },
        olkrog: {
          sv: 'Det räcker för ett rum med bord. Banken vågar ölkrogen.',
          en: 'It is enough for a room with tables. The bank will risk the brewpub.'
        },
        gastgiveri: { sv: 'Det räcker för att börja.', en: 'It is enough to start.' },
        nattklubb: { sv: 'Det räcker för att börja.', en: 'It is enough to start.' }
      },
      firstNoteVinbar: {
        sv: 'Undantaget gäller bara första dagen. Därefter styr medaljerna, som för alla.',
        en: 'The exception only applies on the first day. After that, the medals decide, as for everyone.'
      },
      firstNoteLater: {
        sv: 'Banken ser på det vid varje veckoavräkning.',
        en: 'The bank looks at it at every weekly settlement.'
      },
      heading: { sv: 'Samtal med banken', en: 'A word with the bank' },
      canChange: { sv: 'Går att byta till nu', en: 'Can switch to now' },
      missing: { sv: 'Det som saknas', en: 'What is missing' },
      stay: { sv: (cls: string) => `Stanna i ${cls}`, en: (cls: string) => `Stay with ${cls}` }
    },
    newspaper: {
      toBank: { sv: 'Till banken', en: 'To the bank' }
    },
    house: {
      medals: { sv: 'Medaljerna', en: 'The medals' },
      today: { sv: (level: string) => `${level} i dag`, en: (level: string) => `${level} today` },
      practiceLabel: { sv: 'Övning · ingen medalj står på spel', en: 'Practice · no medal at stake' },
      yourAnswer: { sv: 'Ditt svar', en: 'Your answer' },
      practiceHeading: { sv: 'Övningen är klar', en: 'Practice is done' },
      examHeading: { sv: 'Provet är klart', en: 'The exam is done' },
      practiceDone: { sv: 'Bra övat.', en: 'Well practised.' },
      practiceCredits: { sv: 'Varje rätt svar gav en kredit.', en: 'Each right answer gave one credit.' },
      passed: {
        sv: (level: string, pavilion: string) => `Godkänt. ${level} i ${pavilion}.`,
        en: (level: string, pavilion: string) => `Passed. ${level} in ${pavilion}.`
      },
      almost: { sv: 'Nästan.', en: 'Almost.' },
      waited: {
        sv: (n: number, word: string) => `${word} ${n === 1 ? 'fråga fick' : 'frågor fick'} vänta.`,
        en: (n: number, word: string) => `${word} ${n === 1 ? 'question had' : 'questions had'} to wait.`
      },
      need: {
        sv: (need: string, total: string) => `Det behövs ${need} rätt av ${total}. Ett nytt prov drar nya frågor.`,
        en: (need: string, total: string) => `You need ${need} right out of ${total}. A new exam draws new questions.`
      },
      boxesAria: {
        sv: (correct: number, total: number) => `${correct} av ${total} rätt`,
        en: (correct: number, total: number) => `${correct} of ${total} right`
      },
      toMedals: { sv: 'Till medaljerna', en: 'To the medals' },
      newMedal: { sv: 'Ny medalj', en: 'New medal' },
      medalTitle: {
        sv: (level: string, pavilion: string) => `${level} i ${pavilion}`,
        en: (level: string, pavilion: string) => `${level} in ${pavilion}`
      },
      medalCaption: {
        sv: (level: string, pavilion: string) => `${level} · ${pavilion}`,
        en: (level: string, pavilion: string) => `${level} · ${pavilion}`
      },
      continue: { sv: 'Fortsätt', en: 'Continue' }
    }
  },
  // ORDER 265 (Nexus v1 etapp 3) — ekonomin och banken.
  economy: {
    ledger: {
      interest: { sv: 'Ränta på lånet', en: 'Interest on the loan' },
      floor: { sv: 'Golvet fyllde på veckan', en: 'The floor topped up the week' },
      amortisation: { sv: 'Amortering på lånet', en: 'Repayment on the loan' },
      rent: { sv: 'Veckohyra för lokalen', en: "The week's rent for the premises" },
      sale: { sv: 'Lokalen såld till banken', en: 'Premises sold to the bank' },
      deposit: { sv: 'Kontantinsats för den nya lokalen', en: 'Cash deposit for the new premises' },
      // ORDER 296 — den extra handen till förberedelsen.
      prepHand: { sv: 'En extra hand till förberedelsen', en: 'An extra pair of hands for the prep' }
    },
    classes: {
      vinbar: { sv: 'Vinbar', en: 'Wine bar' },
      foodtruck: { sv: 'Food truck', en: 'Food truck' },
      restaurang: { sv: 'Restaurang', en: 'Restaurant' },
      olkrog: { sv: 'Ölkrog', en: 'Brewpub' },
      gastgiveri: { sv: 'Gästgiveri', en: 'Inn' },
      nattklubb: { sv: 'Nattklubb', en: 'Nightclub' }
    },
    classesDefinite: {
      vinbar: { sv: 'vinbaren', en: 'the wine bar' },
      foodtruck: { sv: 'food trucken', en: 'the food truck' },
      restaurang: { sv: 'restaurangen', en: 'the restaurant' },
      olkrog: { sv: 'ölkrogen', en: 'the brewpub' },
      gastgiveri: { sv: 'gästgiveriet', en: 'the inn' },
      nattklubb: { sv: 'nattklubben', en: 'the nightclub' }
    },
    warnings: {
      first: {
        sv: 'Kassan är under det banken lånar ut mot ditt golv i kväll. Om den är det tre kvällar i rad tar banken lokalen vid veckoavräkningen.',
        en: 'Tonight your cash is below what the bank lends against your floor. If it stays there three evenings in a row, the bank takes the premises at the weekly settlement.'
      },
      second: {
        sv: 'Andra kvällen i rad under det banken lånar ut mot. En kväll till, och banken tar lokalen vid söndagens avräkning.',
        en: 'Second evening in a row below what the bank lends against. One more evening, and the bank takes the premises at Sunday\'s settlement.'
      },
      downgrade: {
        sv: 'Tredje kvällen i rad under det banken lånar ut mot. Vid söndagens avräkning går verksamheten ner en klass. Det du kan följer med.',
        en: 'Third evening in a row below what the bank lends against. At Sunday\'s settlement the business goes down one class. What you know comes with you.'
      }
    },
    noBusinessBody: {
      sv: 'Du har ingen verksamhet just nu. Öva och gör prov i Måltidens hus, och gå sedan till banken.',
      en: 'You have no business right now. Practise and take exams in the House of the Meal, then go to the bank.'
    },
    // ORDER 270 — rutan mitt på skärmen utan verksamhet och utan pengar.
    stranded: {
      heading: { sv: 'Du står utan verksamhet', en: 'You are without a business' },
      body: {
        sv: 'Det som öppnar en ny lokal är det du kan: en vecka i Måltidens hus med minst ett prov, så lyssnar banken igen.',
        en: 'What opens a new venue is what you know: a week in the House of the Meal with at least one exam, and the bank will listen again.'
      },
      readyBody: {
        sv: 'Du har visat vad du kan. Banken är beredd att pröva ett nytt lån.',
        en: 'You have shown what you can do. The bank is ready to try a new loan.'
      },
      progress: {
        sv: (days: number, of: number, exams: number, need: number) =>
          `Dag ${days} av ${of} i Måltidens hus · ${exams} av ${need} ${need === 1 ? 'prov' : 'prov'}`,
        en: (days: number, of: number, exams: number, need: number) =>
          `Day ${days} of ${of} in the House of the Meal · ${exams} of ${need} ${need === 1 ? 'exam' : 'exams'}`
      },
      toHouse: { sv: 'Till Måltidens hus', en: 'To the House of the Meal' },
      toBank: { sv: 'Gå till banken', en: 'Go to the bank' }
    },
    bankButton: { sv: 'Banken', en: 'The bank' },
    bankHeading: { sv: 'Banken', en: 'The bank' },
    bankCurrent: { sv: (name: string) => `Du driver ${name}.`, en: (name: string) => `You run ${name}.` },
    // ORDER 294 — introduktionshyran de två första veckorna.
    introRent: {
      sv: (intro: string, full: string) => `De två första veckorna har du introduktionshyra: ${intro} kr i veckan. Från vecka 3 är hyran ${full} kr.`,
      en: (intro: string, full: string) => `For your first two weeks you pay an introductory rent of ${intro} kr a week. From week 3 the rent is ${full} kr.`
    },
    bankNone: { sv: 'Du har ingen verksamhet.', en: 'You have no business.' },
    bankNoLoan: {
      sv: 'Banken ger inget lån utan en medalj. Gå och öva.',
      en: 'The bank gives no loan without a medal. Go and practise.'
    },
    shown: {
      sv: (topics: string) => `Du har visat att du kan ${topics}.`,
      en: (topics: string) => `You have shown that you know ${topics}.`
    },
    shownNothing: {
      sv: 'Du har inte visat något i Måltidens hus ännu.',
      en: 'You have not shown anything in the House of the Meal yet.'
    },
    missing: {
      sv: (cls: string, req: string) => `För ${cls} saknas ${req}.`,
      en: (cls: string, req: string) => `For ${cls}, you still need ${req}.`
    },
    reqLevelIn: {
      sv: (level: string, count: string) => `${level} i ${count}`,
      en: (level: string, count: string) => `${level} in ${count}`
    },
    reqIncluding: { sv: (names: string) => `, varav ${names}`, en: (names: string) => `, including ${names}` },
    cashShort: {
      sv: (cls: string) => `Kassan räcker inte till kontantinsatsen för ${cls}.`,
      en: (cls: string) => `There is not enough cash for the deposit for ${cls}.`
    },
    bankWait: {
      sv: 'Banken lånar ut igen när du har ägnat en hel vecka åt Måltidens hus och gjort minst ett prov.',
      en: 'The bank will lend again once you have spent a whole week in the House of the Meal and taken at least one exam.'
    },
    upgradeOnly: {
      sv: 'Nås bara genom att växa från en annan verksamhet.',
      en: 'Only reached by growing from another business.'
    },
    // ORDER 291 — ölkrogen byggs i etapp 8; den första verksamheten är vinbar eller food truck.
    notBuilt: { sv: 'Öppnar senare i säsongen.', en: 'Opens later in the season.' },
    notFirst: { sv: 'Den första verksamheten är en vinbar eller en food truck.', en: 'Your first business is a wine bar or a food truck.' },
    choose: {
      sv: (cls: string) => `Byt till ${cls.toLowerCase()}`,
      en: (cls: string) => `Switch to ${cls.toLowerCase()}`
    },
    current: { sv: 'Din verksamhet', en: 'Your business' },
    onlySunday: {
      sv: 'Byte av verksamhet görs på söndagen, vid veckoavräkningen.',
      en: 'Changing business happens on Sunday, at the weekly settlement.'
    },
    topics: {
      maltidbiblioteket: { sv: 'måltidens historia och begrepp', en: 'the history and concepts of the meal' },
      metodkoket: { sv: 'köket', en: 'the kitchen' },
      stensota: { sv: 'vin och dryck', en: 'wine and drinks' },
      kalastorget: { sv: 'bemötande och omdöme', en: 'hospitality and judgement' },
      gastronomiskateatern: { sv: 'helheten', en: 'the whole' }
    },
    counts: { sv: ['ingen', 'en', 'två', 'tre', 'fyra', 'fem'], en: ['no', 'one', 'two', 'three', 'four', 'five'] },
    pavilionOne: { sv: 'paviljong', en: 'pavilion' },
    pavilionMany: { sv: 'paviljonger', en: 'pavilions' },
    and: { sv: 'och', en: 'and' },
    settlement: {
      heading: { sv: 'Veckoavräkningen', en: 'The weekly settlement' },
      aboveFloor: { sv: 'Veckan gav mer än golvet.', en: 'The week gave more than the floor.' },
      topUp: {
        sv: 'Veckan blev svag, och golvet fyllde på skillnaden.',
        en: 'The week was weak, and the floor topped up the difference.'
      },
      noFloor: {
        sv: 'Du har inget golv ännu. Det växer med dina medaljer.',
        en: 'You have no floor yet. It grows with your medals.'
      },
      amortised: { sv: 'Banken drog veckans amortering.', en: "The bank took this week's repayment." },
      // ORDER 280 — hyran och veckans löner.
      rent: {
        sv: (sek: string) => `Veckans hyra för lokalen, ${sek}, är betald.`,
        en: (sek: string) => `The week's rent for the premises, ${sek}, has been paid.`
      },
      wages: {
        sv: (sek: string) => `Lönerna för veckan blev ${sek}.`,
        en: (sek: string) => `Wages for the week came to ${sek}.`
      },
      // ORDER 291 — kurserna är investeringar, inte kvällens kostnad.
      courses: {
        sv: (sek: string) => `Kurserna för laget kostade ${sek}, en investering i vad laget kan.`,
        en: (sek: string) => `Courses for the team cost ${sek}, an investment in what the team knows.`
      },
      downgraded: {
        sv: (from: string, to: string) => `Banken tog ${from} och köpte inventarierna. Det blir din kassa när du fortsätter med ${to}.`,
        en: (from: string, to: string) => `The bank took ${from} and bought the fittings. That becomes your cash as you carry on with ${to}.`
      },
      downgradedToNothing: {
        sv: (from: string) => `Banken tog ${from}. Nu gäller det att öva och komma tillbaka.`,
        en: (from: string) => `The bank took ${from}. Now it is time to practise and come back.`
      }
    }
  },
  // ORDER 266 (Nexus v1 etapp 4) — servicen: action-knappen, ryktet,
  // lagret och händelserna.
  service: {
    // ORDER 270 — händelserna i servicen och de tre mätarna.
    incident: {
      countdown: { sv: (sec: string) => `${sec} s`, en: (sec: string) => `${sec} s` },
      clock: { sv: (hhmm: string) => `Kl. ${hhmm}`, en: (hhmm: string) => `At ${hhmm}` },
      ongoingLabel: { sv: 'Pågår tills nästa händelse', en: 'Ongoing until the next incident' },
      struck: { sv: 'Strukits av dina kunskaper', en: 'Struck out by what you know' },
      medalTime: {
        sv: (pavilion: string) => `Mer tid tack vare ${pavilion}`,
        en: (pavilion: string) => `More time thanks to ${pavilion}`
      },
      staffDecides: {
        sv: 'Svarar du fel eller inte alls tar personalen över resten.',
        en: 'If you answer wrong or not at all, the staff take over the rest.'
      },
      // ORDER 270 (Vision Owner 2026-09-27) — raketens tre steg.
      stepName: {
        sv: { episteme: 'Episteme', techne: 'Techne', phronesis: 'Phronesis' } as Record<string, string>,
        en: { episteme: 'Episteme', techne: 'Techne', phronesis: 'Phronesis' } as Record<string, string>
      },
      stepAsks: {
        sv: { episteme: 'vad', techne: 'hur', phronesis: 'när och varför' } as Record<string, string>,
        en: { episteme: 'what', techne: 'how', phronesis: 'when and why' } as Record<string, string>
      },
      stepOf: {
        sv: (n: string, total: string) => `Steg ${n} av ${total}`,
        en: (n: string, total: string) => `Step ${n} of ${total}`
      },
      stepCleared: { sv: 'Klarat', en: 'Cleared' },
      staffDecided: { sv: 'Personalen beslutade själv.', en: 'The staff decided for themselves.' },
      chained: { sv: 'Följden av ett tidigare val', en: 'The result of an earlier choice' },
      phase: {
        sv: { opening: 'Öppning', rush: 'Rusning', crisis: 'Kris', closing: 'Avslut' } as Record<string, string>,
        en: { opening: 'Opening', rush: 'Rush', crisis: 'Crisis', closing: 'Closing' } as Record<string, string>
      },
      guests: {
        sv: ['ett par', 'en stamgäst', 'ett sällskap från Örebro', 'två kollegor från Campus', 'en turist från Hamburg', 'en gäst i ljus kavaj', 'ett par på bröllopsresa', 'en ensam gäst med en bok'],
        en: ['a couple', 'a regular', 'a party from Örebro', 'two colleagues from Campus', 'a tourist from Hamburg', 'a guest in a light jacket', 'a honeymooning couple', 'a lone guest with a book']
      },
      wines: {
        sv: ['Chablis', 'Sancerre', 'Barolo', 'Rioja Reserva', 'Riesling från Mosel', 'Côtes du Rhône', 'Grüner Veltliner'],
        en: ['Chablis', 'Sancerre', 'Barolo', 'Rioja Reserva', 'Riesling from the Mosel', 'Côtes du Rhône', 'Grüner Veltliner']
      },
      staffRoles: {
        sv: { värd: 'värden', servitör: 'servitören', kock: 'kocken', lärling: 'lärlingen' } as Record<string, string>,
        en: { värd: 'the host', servitör: 'the waiter', kock: 'the cook', lärling: 'the apprentice' } as Record<string, string>
      },
      staffFallback: { sv: 'servitören', en: 'the waiter' },
      ledger: { sv: (title: string) => `Händelse: ${title}`, en: (title: string) => `Incident: ${title}` }
    },
    meters: {
      heading: { sv: 'Kvällen', en: 'The evening' },
      cash: { sv: 'Kassa', en: 'Cash' },
      satisfaction: { sv: 'Gästernas nöjdhet', en: 'Guest satisfaction' },
      stamina: { sv: 'Personalens ork', en: 'Staff stamina' },
      noGuests: { sv: 'inga gäster', en: 'no guests' },
      // ORDER 280 — Designs money.kr: "SEK n" på engelska.
      sek: { sv: (amount: string) => `${amount} kr`, en: (amount: string) => `SEK ${amount}` }
    },
    // ORDER 274 — tiden kvar av servicen, hela kvällen.
    clock: {
      label: { sv: 'Servicen', en: 'Service' },
      now: { sv: (hhmm: string) => hhmm, en: (hhmm: string) => hhmm },
      left: {
        sv: (h: number, m: number) => (h > 0 ? `${h} h ${m} min kvar` : `${m} min kvar`),
        en: (h: number, m: number) => (h > 0 ? `${h} h ${m} min left` : `${m} min left`)
      },
      closes: { sv: (hhmm: string) => `Stänger ${hhmm}`, en: (hhmm: string) => `Closes ${hhmm}` },
      closed: { sv: 'Stänger', en: 'Closing' },
      aria: {
        sv: (left: string, closes: string) => `${left}. ${closes}.`,
        en: (left: string, closes: string) => `${left}. ${closes}.`
      },
      lastOrders: { sv: 'Sista beställningen', en: 'Last orders' },
      hhmm: { sv: (h: string, m: string) => `${h}.${m}`, en: (h: string, m: string) => `${h}:${m}` }
    },
    events: {
      reviewerBooked: {
        sv: 'En recensent har bokat bord i kväll. Ryktet har nått ut.',
        en: 'A reviewer has booked a table tonight. Word has got out.'
      },
      reviewGood: {
        sv: 'Recensenten gick nöjd. Kvällen höll, och det kommer att stå i tidningen.',
        en: 'The reviewer left happy. The evening held, and it will be in the paper.'
      },
      reviewBad: {
        sv: 'Recensenten såg en kväll som inte höll ihop. Det kommer att märkas i ryktet.',
        en: 'The reviewer saw an evening that did not hold together. It will show in the reputation.'
      },
      reviewMixed: {
        sv: 'Recensenten skrev ner både det som fungerade och det som inte gjorde det.',
        en: 'The reviewer wrote down both what worked and what did not.'
      },
      cleanEvening: {
        sv: 'Ingen gick ifrån i kväll. Det pratas om det, och ryktet hämtar sig.',
        en: 'No one walked out tonight. People are talking about it, and the reputation recovers.'
      },
      slowRecovery: {
        sv: 'Ryktet hämtar sig sakta. Gästerna minns inte längre den sämsta kvällen.',
        en: 'The reputation is slowly recovering. The guests no longer remember the worst evening.'
      },
      inspection: {
        sv: 'Miljöinspektören kom i morse. Stationerna hade inte hållits rena under gårdagens kväll.',
        en: "The environmental health inspector came this morning. The stations had not been kept clean during last night's service."
      },
      inspectionLedger: { sv: 'Avgift efter inspektionen', en: 'Fee after the inspection' },
      bankCall: {
        sv: 'Banken ringde i morse. Kassan var under noll när dagen tog slut.',
        en: 'The bank called this morning. Cash was below zero when the day ended.'
      }
    },
    stock: {
      forecast: {
        sv: (covers: string) => `Råvaror till ungefär ${covers} kuvert.`,
        en: (covers: string) => `Ingredients for about ${covers} ${pl(covers, 'cover', 'covers')}.`
      },
      none: {
        sv: 'Inga råvaror i lager. Du kan ändå öppna, men köket har inget att laga.',
        en: 'No ingredients in stock. You can still open, but the kitchen has nothing to cook.'
      },
      noMenu: { sv: 'Ingen meny satt i dag.', en: 'No menu set today.' }
    },
    morningEvents: { sv: 'I morse', en: 'This morning' },
    wentWell: {
      happy: { sv: (n: string) => `${n} gick härifrån nöjda.`, en: (n: string) => `${n} ${pl(n, 'guest', 'guests')} left happy.` },
      happyOne: { sv: 'En gäst gick härifrån nöjd.', en: 'One guest left happy.' },
      clean: { sv: 'Ingen gav upp i kön.', en: 'No one gave up in the queue.' },
      turned: {
        sv: 'När kvällen ställdes på sin spets tog du rätt beslut.',
        en: 'When the evening came to a head, you made the right decision.'
      }
    },
    numberWords: {
      sv: ['noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv', 'tretton', 'fjorton', 'femton', 'sexton', 'sjutton', 'arton', 'nitton', 'tjugo'],
      en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
    },
    manyWord: { sv: 'fler än tjugo', en: 'more than twenty' }
  },
  // ORDER 275 — lagret är insatsen.
  stock: {
    heading: { sv: 'Kvällens lager', en: "Tonight's stock" },
    intro: {
      sv: 'Köp lagret innan du öppnar. Pengarna går ur kassan direkt. Portionerna säljs ur lagret under servicen, och osåld mat blir svinn i kväll.',
      en: 'Buy the stock before you open. The money leaves the till at once. Portions are sold from the stock during service, and unsold food goes to waste tonight.'
    },
    base: { sv: 'Baspaket', en: 'Base package' },
    addOns: { sv: 'Köp till', en: 'Add more' },
    buy: { sv: (price: string) => `Köp · ${price}`, en: (price: string) => `Buy · ${price}` },
    boughtTimes: {
      sv: (n: number) => (n === 1 ? 'Köpt i dag' : `Köpt ${n}× i dag`),
      en: (n: number) => (n === 1 ? 'Bought today' : `Bought ${n}× today`)
    },
    inStock: { sv: 'I lager nu', en: 'In stock now' },
    empty: {
      sv: 'Inget i lager. Gäster som kommer in hittar inget att beställa.',
      en: 'Nothing in stock. Guests who come in will find nothing to order.'
    },
    // Rätterna delar ingredienser: talet är taket om inget annat säljs.
    portions: {
      sv: (n: number) => `upp till ${n} ${n === 1 ? 'portion' : 'portioner'}`,
      en: (n: number) => `up to ${n} ${n === 1 ? 'portion' : 'portions'}`
    },
    covers: {
      sv: (n: number) => `Räcker till ungefär ${n} ${n === 1 ? 'gäst' : 'gäster'}.`,
      en: (n: number) => `Enough for about ${n} ${n === 1 ? 'guest' : 'guests'}.`
    },
    drinksKeep: {
      sv: 'Drycken står sig till i morgon. Maten gör det inte.',
      en: 'Drinks keep until tomorrow. Food does not.'
    },
    lastWaste: {
      sv: (sek: string) => `Gårdagens osålda mat blev svinn: ${sek}.`,
      en: (sek: string) => `Yesterday's unsold food went to waste: ${sek}.`
    },
    wasteEvent: {
      sv: (sek: string) => `Osåld mat blev svinn vid stängning: ${sek}.`,
      en: (sek: string) => `Unsold food went to waste at closing: ${sek}.`
    },
    packageLedger: { sv: (name: string) => `Lager: ${name}`, en: (name: string) => `Stock: ${name}` },
    // ORDER 277 — morgonen är insatsen: menyn, dryckeslistan och mängderna.
    sheetHeading: { sv: 'Kvällens meny och dryckeslista', en: "Tonight's menu and drinks list" },
    sheetIntro: {
      sv: 'Välj vad som står på menyn och dryckeslistan, och hur mycket. Du kan inte öppna förrän minst en rätt och en dryck finns i lager. Gäster som inte hittar något för sin kost eller plånbok går, och ryktet sjunker.',
      en: 'Choose what goes on the menu and the drinks list, and how much. You cannot open until at least one dish and one drink are in stock. Guests who find nothing for their diet or their wallet leave, and the reputation drops.'
    },
    sheetDishes: { sv: 'Menyn', en: 'The menu' },
    sheetDrinks: { sv: 'Dryckeslistan', en: 'The drinks list' },
    drinkGroups: {
      sv: { 'wine-glass': 'Vin på glas', 'wine-bottle': 'Vin på flaska', beer: 'Öl', 'alcohol-free': 'Alkoholfritt' } as Record<string, string>,
      en: { 'wine-glass': 'Wine by the glass', 'wine-bottle': 'Wine by the bottle', beer: 'Beer', 'alcohol-free': 'Alcohol-free' } as Record<string, string>
    },
    tags: {
      sv: { vegan: 'vegansk', vegetarian: 'vegetarisk', fish: 'fisk', meat: 'kött', lactose: 'laktos', gluten: 'gluten' } as Record<string, string>,
      en: { vegan: 'vegan', vegetarian: 'vegetarian', fish: 'fish', meat: 'meat', lactose: 'lactose', gluten: 'gluten' } as Record<string, string>
    },
    priceAndCost: {
      sv: (price: string, cost: string) => `Gästen betalar ${price} · kostar ${cost}`,
      en: (price: string, cost: string) => `Guest pays ${price} · costs ${cost}`
    },
    bottleNote: { sv: (n: number) => `${n} glas, ett bord delar`, en: (n: number) => `${n} ${pl(n, 'glass', 'glasses')}, one table shares it` },
    haveNow: { sv: (n: number) => `${n} i lager`, en: (n: number) => `${n} in stock` },
    less: { sv: (name: string) => `Färre ${name}`, en: (name: string) => `Fewer ${name}` },
    more: { sv: (name: string) => `Fler ${name}`, en: (name: string) => `More ${name}` },
    fillHeading: { sv: 'Fyll på listan', en: 'Fill the list' },
    fillWith: { sv: (name: string) => `+ ${name}`, en: (name: string) => `+ ${name}` },
    clear: { sv: 'Töm listan', en: 'Clear the list' },
    buySheet: { sv: (price: string) => `Köp listan · ${price}`, en: (price: string) => `Buy the list · ${price}` },
    sheetEmpty: { sv: 'Listan är tom.', en: 'The list is empty.' },
    sheetLedger: { sv: 'Lager: morgonens inköpslista', en: "Stock: the morning's order" },
    returnLedger: { sv: 'Lager: inköp tillbaka', en: 'Stock: purchase returned' },
    ranOut: {
      sv: (name: string) => `${name} är slut — köket har inga råvaror kvar.`,
      en: (name: string) => `${name} has run out — the kitchen has no ingredients left.`
    },
    notReady: {
      sv: (dishes: number, drinks: number) => dishes === 0 && drinks === 0
        ? 'Sätt menyn och dryckeslistan innan du öppnar: minst en rätt och en dryck i lager.'
        : dishes === 0 ? 'Menyn är tom. Köp minst en rätt innan du öppnar.' : 'Dryckeslistan är tom. Köp minst en dryck innan du öppnar.',
      en: (dishes: number, drinks: number) => dishes === 0 && drinks === 0
        ? 'Set the menu and the drinks list before you open: at least one dish and one drink in stock.'
        : dishes === 0 ? 'The menu is empty. Buy at least one dish before you open.' : 'The drinks list is empty. Buy at least one drink before you open.'
    },
    item: {
      sv: (portions: number, name: string) => `${portions} × ${name}`,
      en: (portions: number, name: string) => `${portions} × ${name}`
    },
    packages: {
      sv: {
          'vinbar-base': { name: 'Baspaket', description: 'En vanlig vardagskväll: soppa, kyckling, fläsk, en vegansk rätt och desserter, med husets vin på glas och flaska, lokal öl och alkoholfritt.' },
          'vinbar-green': { name: 'Grönt', description: 'Linser med rostade rotfrukter (vegansk) och kantareller på toast (vegetarisk).' },
          'vinbar-alcohol-free': { name: 'Mer alkoholfritt', description: 'Alkoholfri lingondricka, till gäster som inte dricker vin eller öl.' },
          'vinbar-extra-covers': { name: 'Fler kuvert', description: 'Kyckling, fläsk och husets vin till en livligare kväll.' },
          'vinbar-fish': { name: 'Insjöfisk', description: 'Pocherad gös från Hjälmaren, till gäster som vill ha något lättare.' },
          'vinbar-lamb': { name: 'Lamm', description: 'Lamm med rotfrukter, en dyrare tallrik.' },
          'vinbar-game': { name: 'Vilt', description: 'Hjort från Bergslagen, menyns dyraste tallrik.' },
          'vinbar-fine-wine': { name: 'Finare vin', description: 'Pinot Noir på glas och flaska, till ett högre pris.' },
          'vinbar-house-wine': { name: 'Mer husets vin', description: 'Grüner Veltliner på glas och flaska, till en törstig kväll.' }
        } as Record<string, { name: string; description: string }>,
      en: {
          'vinbar-base': { name: 'Base package', description: 'An ordinary weekday evening: soup, chicken, pork, a vegan plate and desserts, with house wine by the glass and bottle, local beer and alcohol-free.' },
          'vinbar-green': { name: 'Green', description: 'Roast roots with lentils (vegan) and chanterelles on toast (vegetarian).' },
          'vinbar-alcohol-free': { name: 'More alcohol-free', description: 'Alcohol-free lingonberry sparkling, for guests who drink neither wine nor beer.' },
          'vinbar-extra-covers': { name: 'More covers', description: 'Chicken, pork and house wine for a busier evening.' },
          'vinbar-fish': { name: 'Lake fish', description: 'Poached pike-perch from Hjälmaren, for guests who want something lighter.' },
          'vinbar-lamb': { name: 'Lamb', description: 'Lamb with root vegetables, a dearer plate.' },
          'vinbar-game': { name: 'Game', description: 'Deer from Bergslagen, the dearest plate on the menu.' },
          'vinbar-fine-wine': { name: 'Fine wine', description: 'Pinot Noir by the glass and bottle, at a higher price.' },
          'vinbar-house-wine': { name: 'More house wine', description: 'Grüner Veltliner by the glass and bottle, for a thirsty evening.' }
        } as Record<string, { name: string; description: string }>
    }
  },
  // ORDER 278 — slumpens händelser i servicen, lagret under servicen och
  // svinnet efter kvällen.
  chance: {
    glassBroken: { sv: 'Ett glas vin välte vid baren. Ett glas ur lagret är borta.', en: 'A glass of wine was knocked over at the bar. One glass from the stock is gone.' },
    regularRound: {
      sv: (n: number, sek: string) => `En stamgäst bjuder baren på en runda: ${n} glas, ${sek}.`,
      en: (n: number, sek: string) => `A regular buys the bar a round: ${n} ${pl(n, 'glass', 'glasses')}, ${sek}.`
    },
    birthday: {
      sv: (name: string, sek: string) => `Ett sällskap firar en födelsedag och beställer en flaska ${name.replace(/, bottle$/, '')}: ${sek}.`,
      en: (name: string, sek: string) => `A party is celebrating a birthday and orders a bottle of ${name.replace(/, bottle$/, '')}: ${sek}.`
    },
    walkIns: { sv: (n: number) => `${n} ${pl(n, 'gäst', 'gäster')} kommer in utan att ha bokat.`, en: (n: number) => `${n} ${pl(n, 'guest', 'guests')} walk in without a booking.` },
    neighbour: { sv: 'Grannen klagar på ljudet. Gästerna märker det.', en: 'The neighbour complains about the noise. The guests notice.' },
    goodWord: { sv: 'En gäst säger högt att det här är ortens bästa vinbar. Rummet ler.', en: 'A guest says out loud that this is the best wine bar in town. The room smiles.' }
  },
  serviceStock: {
    heading: { sv: 'Lagret i kväll', en: 'Stock tonight' },
    portions: { sv: (n: number) => `${n}`, en: (n: number) => `${n}` },
    glasses: { sv: (n: number) => `${n} glas`, en: (n: number) => `${n} gl.` },
    bottles: { sv: (n: number) => `${n} fl.`, en: (n: number) => `${n} btl.` },
    out: { sv: 'SLUT', en: 'OUT' },
    aria: { sv: 'Lagret under servicen: portioner och flaskor per artikel', en: 'Stock during service: portions and bottles per item' }
  },
  waste: {
    event: {
      sv: (kept: number, units: number, fee: string) => `Efter kvällen: ${kept} ${pl(kept, 'portion', 'portioner')} går att använda i morgon. Sopbilen hämtade ${units} ${pl(units, 'portion', 'portioner')}, miljöavgift ${fee}.`,
      en: (kept: number, units: number, fee: string) => `After the evening: ${kept} ${pl(kept, 'portion', 'portions')} can be used tomorrow. The refuse truck took ${units} ${pl(units, 'portion', 'portions')}, environmental fee ${fee}.`
    },
    keptOnly: {
      sv: (kept: number) => `Efter kvällen: ${kept} ${pl(kept, 'portion', 'portioner')} går att använda i morgon. Inget svinn.`,
      en: (kept: number) => `After the evening: ${kept} ${pl(kept, 'portion', 'portions')} can be used tomorrow. No waste.`
    },
    morning: {
      sv: (kept: number, units: number, value: string, fee: string) => `I går: ${kept} ${pl(kept, 'portion', 'portioner')} sparades till i dag. ${units} ${pl(units, 'portion', 'portioner')} blev svinn (${value}), och sopbilen tog ${fee} i miljöavgift.`,
      en: (kept: number, units: number, value: string, fee: string) => `Yesterday: ${kept} ${pl(kept, 'portion', 'portions')} were kept for today. ${units} ${pl(units, 'portion', 'portions')} went to waste (${value}), and the refuse truck charged ${fee} as an environmental fee.`
    },
    ledger: { sv: 'Sopbilen: miljöavgift för svinnet', en: 'Refuse truck: environmental fee for the waste' }
  },
  // ORDER 285 — gårdagens rester: en fråga om hur råvaran tas tillvara. Rätt
  // svar gör resterna säljbara i dag; annars går de till sopbilen.
  salvage: {
    kicker: { sv: 'Gårdagens rester', en: "Yesterday's leftovers" },
    title: { sv: (n: number, dish: string) => `${n} ${pl(n, 'portion', 'portioner')} ${dish} står kvar i kylrummet`, en: (n: number, dish: string) => `${n} ${pl(n, 'portion', 'portions')} of ${dish} ${pl(n, 'is', 'are')} left in the cold room` },
    right: { sv: (n: number) => `Rätt. ${n} ${pl(n, 'portion', 'portioner')} går att sälja i kväll.`, en: (n: number) => `Right. ${n} ${pl(n, 'portion', 'portions')} can be sold tonight.` },
    wrong: { sv: (fee: string) => `Inte så. Resterna går till sopbilen (${fee}).`, en: (fee: string) => `Not like that. The leftovers go to the bin lorry (${fee}).` },
    done: { sv: 'Vidare', en: 'Continue' },
    ledger: { sv: 'Sopbilen: gårdagens rester', en: "Bin lorry: yesterday's leftovers" },
    discarded: { sv: (n: number, fee: string) => `Gårdagens rester, ${n} ${pl(n, 'portion', 'portioner')}, gick till sopbilen (${fee}).`, en: (n: number, fee: string) => `Yesterday's leftovers, ${n} ${pl(n, 'portion', 'portions')}, went to the bin lorry (${fee}).` },
    questions: {
      'root-veg': {
        question: { sv: 'Rostade rotfrukter från i går. Vad gör du av dem?', en: "Roasted root vegetables from yesterday. What do you make of them?" },
        options: {
          a: { sv: 'Mixar dem i dagens soppa och smakar av saltet på nytt', en: "Blend them into today's soup and taste for salt again" },
          b: { sv: 'Serverar dem som de är, till fullt pris', en: 'Serve them as they are, at full price' },
          c: { sv: 'Låter dem stå framme så att de är klara till kvällen', en: 'Leave them out so they are ready for the evening' }
        },
        why: { sv: 'Rester som kylts snabbt och stått kallt går att laga om. En soppa tar vara på smaken, och den kokas upp ordentligt innan den serveras.', en: 'Leftovers that were cooled quickly and kept cold can be cooked again. A soup keeps the flavour, and it is brought to the boil before it is served.' }
      },
      chicken: {
        question: { sv: 'Tillagad kyckling från i går, kyld över natten. Hur används den?', en: 'Cooked chicken from yesterday, chilled overnight. How is it used?' },
        options: {
          a: { sv: 'Samma tallrik igen, uppvärmd lite lätt', en: 'The same plate again, lightly warmed' },
          b: { sv: 'Rivs till en paj eller gratäng som värms genom till minst 70 °C', en: 'Pulled into a pie or gratin that is heated through to at least 70 °C' },
          c: { sv: 'Står i rumstemperatur till lunch, så går den fortare att värma', en: 'Kept at room temperature until lunch, so it warms faster' }
        },
        why: { sv: 'Kyckling som värms om ska bli genomvarm, minst 70 °C i mitten. En ny rätt ger också en ny tallrik, inte gårdagens.', en: 'Reheated chicken must be hot all the way through, at least 70 °C in the centre. A new dish also gives a new plate, not yesterday\'s.' }
      },
      pork: {
        question: { sv: 'Stekt fläsk från i går. Vilken rätt tar vara på det?', en: 'Fried pork from yesterday. Which dish makes use of it?' },
        options: {
          a: { sv: 'Pytt i panna med potatis och lök, stekt het', en: 'Pytt i panna, a hash with potato and onion, fried hot' },
          b: { sv: 'Kallt på tallrik som i går', en: "Cold on the plate, as yesterday's" },
          c: { sv: 'Fryses och tinas igen till i kväll', en: 'Frozen and thawed again for tonight' }
        },
        why: { sv: 'Pytt i panna är en klassisk resträtt: köttet tärnas och steks hett tillsammans med potatis och lök.', en: 'Pytt i panna is a classic leftover dish: the meat is diced and fried hot with potato and onion.' }
      },
      'lake-fish': {
        question: { sv: 'Pocherad gös från i går, kyld direkt efter servicen. Vad gör du?', en: 'Poached pike-perch from yesterday, chilled right after service. What do you do?' },
        options: {
          a: { sv: 'Serverar den kall som varmrätt', en: 'Serve it cold as a main course' },
          b: { sv: 'Sparar den en vecka till', en: 'Keep it another week' },
          c: { sv: 'Gör fiskbiffar som steks genom i dag', en: 'Make fish cakes that are fried through today' }
        },
        why: { sv: 'Tillagad fisk håller kort. Den används nästa dag, och fiskbiffar som steks genom är ett sätt att ta vara på den.', en: 'Cooked fish keeps only a short time. It is used the next day, and fish cakes fried through are one way to make use of it.' }
      },
      dairy: {
        question: { sv: 'Gräddig efterrätt från i går. Hur hanteras den?', en: 'A cream dessert from yesterday. How is it handled?' },
        options: {
          a: { sv: 'Står framme vid kassan så att den är redo', en: 'Kept out by the till so it is ready' },
          b: { sv: 'Hålls kall hela tiden och serveras i dag', en: 'Kept cold the whole time and served today' },
          c: { sv: 'Fryses och tinas till kvällen', en: 'Frozen and thawed for the evening' }
        },
        why: { sv: 'Gräddiga efterrätter ska stå kallt hela tiden. Frysta och tinade separerar de ofta och blir grynig.', en: 'Cream desserts must be kept cold the whole time. Frozen and thawed, they often split and turn grainy.' }
      },
      lentils: {
        question: { sv: 'Kokta linser från i går. Vad gäller?', en: 'Cooked lentils from yesterday. What applies?' },
        options: {
          a: { sv: 'De håller i kylen några dagar och går till soppa eller sallad', en: 'They keep in the fridge for a few days and go into a soup or a salad' },
          b: { sv: 'Kokta linser måste kastas samma kväll', en: 'Cooked lentils must be thrown away the same evening' },
          c: { sv: 'De ska blötläggas igen innan de används', en: 'They must be soaked again before use' }
        },
        why: { sv: 'Kokta linser som kylts snabbt håller några dagar i kylen. De passar i soppa och sallad.', en: 'Cooked lentils cooled quickly keep a few days in the fridge. They suit a soup or a salad.' }
      },
      mushrooms: {
        question: { sv: 'Stekta kantareller från i går. Hur används de?', en: 'Fried chanterelles from yesterday. How are they used?' },
        options: {
          a: { sv: 'I en omelett eller sås, värmda ordentligt', en: 'In an omelette or a sauce, heated well' },
          b: { sv: 'Läggs i vatten över natten så att de håller sig fräscha', en: 'Put in water overnight to keep them fresh' },
          c: { sv: 'Serveras råa på toast', en: 'Served raw on toast' }
        },
        why: { sv: 'Stekta svampar går att använda nästa dag i en varm rätt. Kantareller äts tillagade, och vatten gör dem sladdriga.', en: 'Fried mushrooms can be used the next day in a hot dish. Chanterelles are eaten cooked, and water makes them soggy.' }
      },
      berries: {
        question: { sv: 'Lingonsorbet som stod i frysen hela natten. Vad gäller?', en: 'Lingonberry sorbet that stayed in the freezer all night. What applies?' },
        options: {
          a: { sv: 'Den ska kastas efter en natt', en: 'It must be thrown away after one night' },
          b: { sv: 'Om den aldrig tinat går den att servera i dag', en: 'If it never thawed, it can be served today' },
          c: { sv: 'Den tinas och fryses om så att den blir mjukare', en: 'It is thawed and refrozen to make it softer' }
        },
        why: { sv: 'En sorbet som stått fryst hela tiden går att servera. Tinad och omfryst får den iskristaller och blir sämre.', en: 'A sorbet kept frozen the whole time can be served. Thawed and refrozen, it forms ice crystals and gets worse.' }
      },
      meat: {
        question: { sv: 'Långkokt kött från i går. Vilken rätt tar vara på det?', en: 'Slow-cooked meat from yesterday. Which dish makes use of it?' },
        options: {
          a: { sv: 'En ragu eller gryta som kokas upp i dag', en: 'A ragù or a stew brought to the boil today' },
          b: { sv: 'Kallt på tallrik som i går', en: "Cold on the plate, as yesterday's" },
          c: { sv: 'Står framme så att köttet mjuknar', en: 'Left out so the meat softens' }
        },
        why: { sv: 'Långkokt kött blir ofta bättre dagen efter i en ragu eller gryta. Den kokas upp ordentligt innan den serveras.', en: 'Slow-cooked meat is often better the next day in a ragù or a stew. It is brought to the boil before it is served.' }
      }
    }
  },
  // ORDER 285 — kvällens resultat (R1): vad spelaren vann och förlorade.
  result: {
    // ORDER 285 — texterna ur Designs leverans 2026-09-29 (evening.*), utan
    // premiärens namngivna gäster och personal (de kommer med 286–288).
    kicker: { sv: (day: string) => `${day} · kvällens resultat`, en: (day: string) => `${day} · tonight's result` },
    title: { sv: 'Så gick kvällen', en: 'How the evening went' },
    stream: { sv: 'Kvällen, i den ordning det hände', en: 'The evening, in the order it happened' },
    gains: { sv: 'Det kvällen gav', en: 'What the evening gave' },
    stepsOf: { sv: (c: number, n: number) => `${c} av ${n} steg`, en: (c: number, n: number) => `${c} of ${n} ${pl(n, 'step', 'steps')}` },
    truck: { sv: 'Sopbilen', en: 'The bin lorry' },
    truckLine: { sv: (kg: string) => `${kg} till sopbilen`, en: (kg: string) => `${kg} to the bin lorry` },
    chance: { sv: 'I rummet', en: 'In the room' },
    guests: { sv: (n: number) => `${n} ${pl(n, 'gäst', 'gäster')} in`, en: (n: number) => `${n} ${pl(n, 'guest', 'guests')} in` },
    none: { sv: 'Inga raketer eller händelser i kväll.', en: 'No rockets or events tonight.' },
    waste: { sv: 'Svinn', en: 'Waste' },
    wasteNote: { sv: 'Till sopbilen efter stängning', en: 'To the bin lorry after closing' },
    won: { sv: 'Vann', en: 'Won' },
    lost: { sv: 'Förlorade', en: 'Lost' },
    even: { sv: 'Oförändrat', en: 'Unchanged' },
    rows: {
      money: { sv: 'Pengar', en: 'Money' },
      credits: { sv: 'Krediter', en: 'Credits' },
      reputation: { sv: 'Rykte', en: 'Reputation' },
      knowledge: { sv: 'Kunskap', en: 'Knowledge' },
      experience: { sv: 'Erfarenhet', en: 'Experience' },
      social: { sv: 'Social hållbarhet', en: 'Social sustainability' },
      economic: { sv: 'Ekonomisk hållbarhet', en: 'Economic sustainability' },
      ecological: { sv: 'Ekologisk hållbarhet', en: 'Ecological sustainability' }
    },
    notes: {
      money: { sv: (rev: string, cost: string) => `Intäkter ${rev} minus inköp, löner och avgifter ${cost}`, en: (rev: string, cost: string) => `Takings ${rev} minus purchases, wages and fees ${cost}` },
      credits: { sv: 'Rätta svar i raketerna, och Back your knowledge', en: 'Right answers in the rockets, and Back your knowledge' },
      reputation: { sv: 'Nöjda gäster höjer, gäster som går sänker', en: 'Happy guests raise it, guests who leave lower it' },
      knowledge: { sv: (r: number, n: number) => `${r} av ${n} steg rätt i kvällens raketer`, en: (r: number, n: number) => `${r} of ${n} ${pl(n, 'step', 'steps')} right in tonight's rockets` },
      experience: { sv: (g: number, rk: number) => `${g} ${pl(g, 'gäst', 'gäster')} serverade, ${rk} ${pl(rk, 'raket', 'raketer')} tagna`, en: (g: number, rk: number) => `${g} ${pl(g, 'guest', 'guests')} served, ${rk} ${pl(rk, 'rocket', 'rockets')} handled` },
      social: { sv: 'Gästerna och laget: nöjdhet, köer och ork', en: 'The guests and the team: satisfaction, queues and stamina' },
      economic: { sv: (m: string) => `Marginal ${m} av kvällens intäkt`, en: (m: string) => `Margin ${m} of tonight's takings` },
      ecological: { sv: (kg: string) => `Råvarorna och svinnet: ${kg} till sopbilen`, en: (kg: string) => `Ingredients and waste: ${kg} to the bin lorry` }
    },
    continue: { sv: 'Till kvällens lärdom', en: "To tonight's lesson" },
    points: { sv: (v: string) => `${v} poäng`, en: (v: string) => `${v} pts` },
    // ORDER 287a — hållbarheterna som nivåer 0–10 med förra kvällens nivå.
    level: { sv: (n: number, max: number) => `${n} av ${max}`, en: (n: number, max: number) => `${n} of ${max}` },
    previousLevel: { sv: (n: number) => `Förra kvällen ${n}`, en: (n: number) => `Last evening ${n}` },
    kg: { sv: (v: string) => `${v} kg`, en: (v: string) => `${v} kg` }
  },
  // ORDER 290 — ljudet i menyn.
  sound: {
    label: { sv: 'Ljud', en: 'Sound' },
    on: { sv: 'På', en: 'On' },
    off: { sv: 'Av', en: 'Off' },
    volume: { sv: 'Volym', en: 'Volume' }
  },
  // ORDER 290 — kunskapspyramiden i raketkortet och kvällens resultat.
  pyramid: {
    aria: { sv: (n: number, of: number) => `Kunskapspyramiden: ${n} av ${of} våningar`, en: (n: number, of: number) => `Knowledge pyramid: ${n} of ${of} ${pl(of, 'level', 'levels')}` },
    full: { sv: 'Hela pyramiden!', en: 'The whole pyramid!' },
    tonight: { sv: 'Kvällens pyramider', en: "Tonight's pyramids" }
  },
  // ORDER 290 — byn och tillbaka.
  // ORDER 290 — serviceläget: panelerna fälls ihop under servicen.
  drawer: {
    show: { sv: 'Visa panelerna', en: 'Show panels' },
    hide: { sv: 'Fäll ihop panelerna', en: 'Hide panels' },
    amountsOn: { sv: 'Visa belopp', en: 'Show amounts' },
    amountsOff: { sv: 'Dölj belopp', en: 'Hide amounts' }
  },
  // ORDER 290 — kvällens insats när dörrarna öppnas, och överföringen.
  stake: {
    kicker: { sv: 'Kvällens insats', en: "Tonight's stake" },
    lines: {
      ingredients: { sv: 'Råvaror', en: 'Ingredients' },
      staff: { sv: 'Personal', en: 'Staff' },
      dj: { sv: 'DJ', en: 'DJ' },
      investments: { sv: 'Satsningar', en: 'Investments' },
      competence: { sv: 'Kompetens', en: 'Training' },
      interest: { sv: 'Räntan', en: 'Interest' }
    },
    total: { sv: 'Break-even', en: 'Break-even' },
    note: { sv: 'Kvällskassan ska fylla linjen innan kvällen går plus.', en: 'The till has to reach the line before the evening makes money.' }
  },
  transfer: {
    kicker: { sv: 'Efter servicen', en: 'After service' },
    title: { sv: 'Kvällens resultat till kontot', en: "Tonight's result to the account" },
    revenue: { sv: 'Kvällskassan', en: "Tonight's till" },
    variable: { sv: 'Råvaror och sopbilen', en: 'Ingredients and the bin lorry' },
    contribution: { sv: 'Täckningsbidrag', en: 'Contribution margin' },
    ratio: { sv: 'Täckningsgrad', en: 'Contribution ratio' },
    fixed: { sv: 'Personal, DJ, satsningar, kompetens och ränta', en: 'Staff, DJ, investments, training and interest' },
    result: { sv: 'Kvällens resultat', en: "Tonight's result" },
    till: { sv: 'Kvällskassan', en: "Tonight's till" },
    account: { sv: 'Företagskontot', en: 'Company account' },
    breakEven: { sv: (be: string) => `Break-even ${be}`, en: (be: string) => `Break-even ${be}` },
    toAccount: { sv: 'Förs till kontot', en: 'Transferred to the account' },
    fromAccount: { sv: 'Dras från kontot', en: 'Taken from the account' },
    morningNote: { sv: 'Råvarorna och satsningarna betalades i morse. Lönerna och räntan dras i kväll.', en: 'The ingredients and investments were paid this morning. Wages and interest are paid tonight.' },
    forecastWeeks: {
      sv: (w: number) => `Med det här konceptet klarar du dig ${w} ${pl(w, 'vecka', 'veckor')}.`,
      en: (w: number) => `With this concept you last ${w} ${pl(w, 'week', 'weeks')}.`
    },
    forecastSeason: { sv: 'Med det här konceptet klarar du dig resten av säsongen.', en: 'With this concept you last the rest of the season.' },
    continue: { sv: 'Till kvällens resultat', en: "To tonight's result" },
    // Raketernas kassa i kväll (negativt belopp = en intäkt).
    incidents: { sv: 'Kvällens händelser', en: "Tonight's events" },
    // ORDER 291 — sopbilen i resten, och kurserna som investering.
    waste: { sv: 'Sopbilen', en: 'The bin lorry' },
    courses: { sv: 'Kurser', en: 'Courses' },
    coursesSub: { sv: 'En investering, inte kvällens kostnad', en: "An investment, not tonight's cost" }
  },
  // Satsningarna (activities.ts ACTIVITY_CATALOGUE). ORDER 291: alla på
  // båda språken, inte bara DJ:n.
  activityText: {
    'train-service': {
      name: { sv: 'Utbilda salen', en: 'Train the floor staff' },
      description: { sv: 'En halvtimmes genomgång av tempot vid passet och rytmen vid borden.', en: 'A half-hour run-through of the pace at the pass and the rhythm at the tables.' }
    },
    'runner-shift': {
      name: { sv: 'Ta in en springare', en: 'Bring in a runner' },
      description: { sv: 'Ett par extra händer som bär ut tallrikar och dukar av.', en: 'An extra pair of hands to carry out plates and clear tables.' }
    },
    'local-sourcing': {
      name: { sv: 'Lokala råvaror i kväll', en: 'Local ingredients tonight' },
      description: { sv: 'Små gårdar i närheten: högre styckpris, kortare kedja.', en: 'Small farms nearby: a higher unit price, a shorter supply chain.' }
    },
    'wine-tasting': {
      name: { sv: 'Vinprovning med laget', en: 'Wine tasting with the team' },
      description: { sv: 'Laget kan vinlistan, och merförsäljningen kommer av sig själv.', en: 'The team knows the wine list, and the extra sales come on their own.' }
    },
    'guest-chef': {
      name: { sv: 'Gästkock för kvällen', en: 'Guest chef for the evening' },
      description: { sv: 'En vän till huset lagar maten, och passet skickar ut något gästerna pratar om.', en: 'A friend of the house cooks, and the pass sends out something the guests talk about.' }
    },
    'compost-audit': {
      name: { sv: 'Genomgång av kökets kompost', en: 'Review of the kitchen compost' },
      description: { sv: 'Gå igenom kärlen och flödet i förberedelsen. Små ändringar håller när någon har ett öga på dem.', en: 'Go through the bins and the flow in the prep. Small changes hold when someone keeps an eye on them.' }
    },
    'book-dj': {
      name: { sv: 'DJ i kväll', en: 'A DJ tonight' },
      description: { sv: 'Musik från nio, och alla som sitter tar ett glas till. Köp vin till. Lönar sig en full kväll, och mest när det inte är varje kväll.', en: 'Music from nine o’clock, and everyone seated orders another glass. Buy wine for it. It pays on a full evening, and most when it isn’t every evening.' }
    }
  },
  // ORDER 291 — rätter, råvaror och leverantörer (m4Catalogue.ts) på
  // spelarens språk. Katalogens `name` läser härifrån.
  catalogue: {
    dish: {
      'root-soup': { sv: 'Rotfruktssoppa', en: 'Root vegetable soup' },
      'chicken-plate': { sv: 'Kyckling med rotfrukter', en: 'Chicken with root veg' },
      'pork-plate': { sv: 'Fläsk med rotfrukter', en: 'Pork with root veg' },
      'lamb-plate': { sv: 'Lamm med rotfrukter', en: 'Lamb with root veg' },
      'game-plate': { sv: 'Vilt med rotfrukter', en: 'Game with root veg' },
      'fish-plate': { sv: 'Pocherad gös', en: 'Poached pike-perch' },
      'dairy-dessert': { sv: 'Gräddessert', en: 'Cream dessert' },
      'lentil-plate': { sv: 'Rostade rotfrukter med linser', en: 'Roast roots with lentils' },
      'chanterelle-toast': { sv: 'Kantareller på toast', en: 'Chanterelles on toast' },
      'lingon-sorbet': { sv: 'Lingonsorbet', en: 'Lingonberry sorbet' },
      'beer-pairing': { sv: 'Lokal öl till maten', en: 'Local beer with the meal' },
      'house-wine-glass': { sv: 'Grüner Veltliner, per glas', en: 'Grüner Veltliner, by the glass' },
      'fine-wine-glass': { sv: 'Pinot Noir, per glas', en: 'Pinot Noir, by the glass' },
      'house-wine-bottle': { sv: 'Grüner Veltliner, flaska', en: 'Grüner Veltliner, bottle' },
      'fine-wine-bottle': { sv: 'Pinot Noir, flaska', en: 'Pinot Noir, bottle' },
      'alcohol-free-glass': { sv: 'Alkoholfritt mousserande lingon', en: 'Alcohol-free lingonberry sparkling' }
    },
    ingredient: {
      'root-veg': { sv: 'rotfrukter', en: 'root vegetables' },
      'leaf-veg': { sv: 'bladgrönt', en: 'leafy greens' },
      herbs: { sv: 'färska örter', en: 'fresh herbs' },
      chicken: { sv: 'kyckling', en: 'chicken' },
      pork: { sv: 'fläsk', en: 'pork' },
      lamb: { sv: 'lamm', en: 'lamb' },
      game: { sv: 'vilt (hjort)', en: 'game (deer)' },
      'lake-fish': { sv: 'gös', en: 'pike-perch' },
      eggs: { sv: 'ägg', en: 'eggs' },
      dairy: { sv: 'mejeri', en: 'dairy' },
      flour: { sv: 'mjöl', en: 'flour' },
      lentils: { sv: 'linser', en: 'lentils' },
      mushrooms: { sv: 'kantareller', en: 'chanterelles' },
      berries: { sv: 'lingon', en: 'lingonberries' },
      beer: { sv: 'öl (dryck)', en: 'beer (drink)' },
      'house-wine': { sv: 'husets vin', en: 'house wine' },
      'fine-wine': { sv: 'fint vin', en: 'fine wine' },
      'alcohol-free': { sv: 'alkoholfritt mousserande', en: 'alcohol-free sparkling' }
    },
    supplier: {
      wholesaler: { sv: 'Bergslagens grossist', en: 'Bergslagen wholesaler' },
      'local-veg': { sv: 'Grythyttans odlare', en: 'Grythyttan growers' },
      organic: { sv: 'Örebros ekogårdar', en: 'Örebro organic farms' },
      'meat-game': { sv: 'Bergslagens kött & vilt', en: 'Bergslagen meat & game' },
      'lake-fish': { sv: 'Hjälmarens insjöfisk', en: 'Hjälmaren lake fish' },
      brewery: { sv: 'Nora bryggeri', en: 'Nora brewery' },
      'wine-merchant': { sv: 'Bergslagens vinhandlare', en: 'Bergslagen wine merchant' }
    }
  },
  // ORDER 291 — händelseloggens rader ur reducer.ts på spelarens språk.
  simEvent: {
    shortDelivery: { sv: (s: string, r: number, u: number, i: string) => `Kort leverans: ${s} levererade ${r} av ${u} ${i}.`, en: (s: string, r: number, u: number, i: string) => `Short delivery: ${s} delivered ${r} of ${u} ${i}.` },
    ranOut: { sv: (d: string) => `${d} är slut — köket har inga råvaror kvar.`, en: (d: string) => `${d} has run out — the kitchen has no ingredients left.` },
    guestLeftMissing: { sv: (d: string) => `En gäst gick — ${d} fanns inte i kväll.`, en: (d: string) => `A guest left — ${d} was not available tonight.` },
    substituted: { sv: (want: string, got: string) => `En gäst ville ha ${want}; köket serverade ${got} i stället.`, en: (want: string, got: string) => `A guest wanted ${want}; the kitchen served ${got} instead.` },
    agencyIn: { sv: 'Bemanning inringd — laget växer för kvällen.', en: 'Agency staff called in — the team grows for the evening.' },
    agencyDeclined: { sv: 'Bemanningen tackades nej till — laget märker att ingen hjälp kom.', en: 'Declined agency staff — the team notices that no help came.' },
    hired: { sv: (r: string, d: number) => `Anställde ${r} — kontrakt till dag ${d}.`, en: (r: string, d: number) => `Hired ${r} — contract until day ${d}.` },
    terrace: { sv: 'Uteplatsen öppnade. Ståbord ute på gatan.', en: 'Terrace opened. Standing tables out on the street.' },
    cutShort: {
      sv: (where: 'kitchen' | 'room' | 'house') => `Kvällen tog slut i förtid — ${where === 'kitchen' ? 'köket' : where === 'room' ? 'salen' : 'huset'} höll inte.`,
      en: (where: 'kitchen' | 'room' | 'house') => `The evening was cut short — ${where === 'kitchen' ? 'the kitchen' : where === 'room' ? 'the room' : 'the house'} did not hold.`
    },
    mentor: { sv: (c: string) => `Mentorn: ${c}`, en: (c: string) => `Mentor: ${c}` },
    scenarioChose: { sv: (c: string) => `Scenario: valde ${c}`, en: (c: string) => `Scenario: chose ${c}` }
  },
  // ORDER 291 — kassabokens rader (EveningAccountPanel) på spelarens språk.
  ledgerCause: {
    investment: { sv: (n: string) => `Satsning: ${n}`, en: (n: string) => `Investment: ${n}` },
    investmentRefunded: { sv: (n: string) => `Satsning återbetald: ${n}`, en: (n: string) => `Investment refunded: ${n}` },
    investmentEffect: { sv: (n: string) => `Satsningens följd: ${n}`, en: (n: string) => `Investment effect: ${n}` },
    purchase: { sv: (u: number, i: string, s: string) => `Inköp ${u}× ${i} från ${s}`, en: (u: number, i: string, s: string) => `Purchase ${u}× ${i} from ${s}` },
    bankLoan: { sv: (tier: string) => `Banklån (${tier})`, en: (tier: string) => `Bank loan (${tier})` },
    latePayment: { sv: 'Sen betalning från en gäst', en: 'Late payment from a guest' },
    wage: { sv: (r: string) => `Lön: ${r}`, en: (r: string) => `Wage: ${r}` },
    idleStaff: { sv: (d: number) => `Personal utanför servicen (dag ${d})`, en: (d: number) => `Staff cost outside service (day ${d})` },
    agency: { sv: (r: string) => `Bemanning: ${r} i kväll`, en: (r: string) => `Agency staff: ${r} tonight` },
    severance: { sv: (r: string, d: number) => `Avgångsvederlag: ${r} (${d} ${d === 1 ? 'dag' : 'dagar'} kvar)`, en: (r: string, d: number) => `Severance pay: ${r} (${d} ${d === 1 ? 'day' : 'days'} left)` },
    revenue: {
      sv: (lunch: boolean, covers: number) => `Försäljning ${lunch ? 'lunch' : 'middag'}${covers > 0 ? ` (${covers} kuvert)` : ''}`,
      en: (lunch: boolean, covers: number) => `Revenue ${lunch ? 'lunch' : 'dinner'}${covers > 0 ? ` (${covers} covers)` : ''}`
    },
    ingredients: {
      sv: (lunch: boolean, covers: number) => `Råvaror — ${lunch ? 'lunch' : 'middag'}${covers > 0 ? ` — ${covers} kuvert` : ''}`,
      en: (lunch: boolean, covers: number) => `Ingredients — ${lunch ? 'lunch' : 'dinner'}${covers > 0 ? ` — ${covers} covers` : ''}`
    }
  },
  // ORDER 291 — morgonens ändringar i kvällsberättelsen (reducer.ts
  // observerVoiceForPolicyChange) och i händelseloggen.
  policyVoice: {
    trainingUp: { sv: 'Du höjde utbildningsnivån för i dag', en: 'You raised the training level for today' },
    trainingDown: { sv: 'Du sänkte utbildningsnivån för i dag', en: 'You lowered the training level for today' },
    pricesLow: { sv: 'Du sänkte priserna för i dag', en: 'You lowered prices for today' },
    pricesMid: { sv: 'Du satte priserna på mellannivå för i dag', en: 'You set prices to medium for today' },
    pricesHigh: { sv: 'Du höjde priserna för i dag', en: 'You raised prices for today' },
    supplyBasic: { sv: 'Du gick ner till grundleverantören för i dag', en: 'You went down to the basic supplier for today' },
    supplySelected: { sv: 'Du valde utvalda leverantörer för i dag', en: 'You chose selected suppliers for today' },
    supplyPremium: { sv: 'Du gick över till premiumleveranser för i dag', en: 'You moved to premium supply for today' },
    changed: { sv: (parts: string) => `Ändrat: ${parts}`, en: (parts: string) => `Changed: ${parts}` }
  },
  // ORDER 291 — platsnamnet överst i byn (ui/ViewLabel.tsx).
  viewLabel: {
    grythyttan: { sv: 'Grythyttan', en: 'Grythyttan' },
    kvarteret: { sv: 'Kvarteret', en: 'The District' },
    vinbaren: { sv: 'Vinbaren', en: 'The Wine Bar' }
  },
  // ORDER 291 — kvällsberättelsens första mening om morgonens val.
  activityChosen: {
    sv: (list: string) => `I dag valde du: ${list}.`,
    en: (list: string) => `Today you chose: ${list}.`
  },
  listAnd: { sv: 'och', en: 'and' },
  // ORDER 290 — svarens följd som händelser i rummet, över bordet.
  // ORDER 292 — följder nästa dag i bokningsboken (sim/nextDay.ts).
  nextDay: {
    what: {
      sommellerie: { sv: 'vin', en: 'wine' },
      kok: { sv: 'mat', en: 'food' },
      service: { sv: 'service', en: 'service' }
    },
    thanks: {
      sv: (n: number, what: string) => `${n} ${pl(n, 'bokning', 'bokningar')} tack vare gårdagens ${what}`,
      en: (n: number, what: string) => `${n} ${pl(n, 'booking', 'bookings')} thanks to yesterday's ${what}`
    },
    lost: {
      sv: (n: number, what: string) => `${n} ${pl(n, 'avbokning', 'avbokningar')} efter gårdagens ${what}`,
      en: (n: number, what: string) => `${n} ${pl(n, 'cancellation', 'cancellations')} after yesterday's ${what}`
    },
    note: { sv: 'Gårdagens svar', en: "Yesterday's answers" }
  },
  // ORDER 292 — rusningarna: vågorna, kön vid dörren och spelarens val.
  rush: {
    waves: {
      cars: { sv: 'Bilarna från Örebro och Karlstad', en: 'The cars from Örebro and Karlstad' },
      bus: { sv: 'Bussen', en: 'The coach' }
    },
    arrives: {
      sv: (label: string, n: number) => `${label} kommer: ${n} ${pl(n, 'gäst', 'gäster')} på väg till dörren.`,
      en: (label: string, n: number) => `${label} ${label.startsWith('The cars') ? 'arrive' : 'arrives'}: ${n} ${pl(n, 'guest', 'guests')} on the way to the door.`
    },
    notice: {
      sv: (label: string, n: number, parties: number) => `${label} är här · ${n} ${pl(n, 'gäst', 'gäster')} i ${parties} ${pl(parties, 'sällskap', 'sällskap')}`,
      en: (label: string, n: number, parties: number) => `${label} ${label.startsWith('The cars') ? 'are' : 'is'} here · ${n} ${pl(n, 'guest', 'guests')} in ${parties} ${pl(parties, 'party', 'parties')}`
    },
    queueTitle: { sv: 'Kön vid dörren', en: 'The queue at the door' },
    queueHint: { sv: 'Den som kom först får bord först. Välj ett sällskap för att ge det nästa lediga bord.', en: 'First come, first seated. Pick a party to give it the next free table.' },
    party: {
      sv: (n: number, who: string) => `${n === 1 ? 'En gäst' : `${n} gäster`} · ${who}`,
      en: (n: number, who: string) => `${n === 1 ? 'One guest' : `${n} guests`} · ${who}`
    },
    waited: { sv: (sec: number) => `väntat ${sec} s`, en: (sec: number) => `waited ${sec} s` },
    impatient: { sv: 'otålig', en: 'impatient' },
    seatFirst: { sv: 'Bord först', en: 'Seat first' },
    chosen: { sv: 'Får nästa bord', en: 'Gets the next table' },
    patienceAria: { sv: (pct: number) => `Tålamod ${pct} %`, en: (pct: number) => `Patience ${pct}%` },
    walkIn: { sv: 'utan bokning', en: 'walk-in' }
  },
  // ORDER 288 — byn och konkurrensen: rivalerna, nivåerna, aviseringarna,
  // jämförelsen efter kvällen och tidningens rankning.
  village: {
    // ORDER 290 — knappen till byn och tillbaka.
    out: { sv: 'Byn', en: 'Village' },
    back: { sv: 'Tillbaka till krogen', en: 'Back to the bar' },
    keyHint: { sv: 'Tangenten V', en: 'Key V' },
    venues: {
      player: { sv: 'Din krog', en: 'Your place' },
      torgkrogen: { sv: 'Torgkrogen', en: 'Torgkrogen' },
      'pizzeria-grytan': { sv: 'Pizzeria Grytan', en: 'Pizzeria Grytan' },
      sjoboden: { sv: 'Sjöboden', en: 'The Boathouse' },
      'hotellets-matsal': { sv: 'Hotellets matsal', en: 'The hotel dining room' },
      grillvagnen: { sv: 'Grillvagnen', en: 'The grill truck' },
      tacovagnen: { sv: 'Tacovagnen', en: 'The taco truck' }
    } as Record<string, { sv: string; en: string }>,
    food: {
      torgkrogen: { sv: 'Husmanskost och dagens rätt', en: 'Home cooking and a dish of the day' },
      'pizzeria-grytan': { sv: 'Pizza och kebab, stora portioner', en: 'Pizza and kebab, large portions' },
      sjoboden: { sv: 'Fisk och skaldjur från sjöarna', en: 'Fish from the lakes' },
      'hotellets-matsal': { sv: 'Vita dukar och ett stort vinkort', en: 'White tablecloths and a long wine list' },
      grillvagnen: { sv: 'Burgare från vagnen', en: 'Burgers from the truck' },
      tacovagnen: { sv: 'Tacos och lemonad', en: 'Tacos and lemonade' }
    } as Record<string, { sv: string; en: string }>,
    spots: {
      torget: { sv: 'på torget', en: 'on the square' },
      'maltidens-hus': { sv: 'vid Måltidens hus', en: 'by the House of the Meal' },
      sjon: { sv: 'vid sjön', en: 'by the lake' }
    } as Record<string, { sv: string; en: string }>,
    open: { sv: 'Öppet', en: 'Open' },
    closed: { sv: 'Stängt i kväll', en: 'Closed tonight' },
    tonight: {
      sv: (n: number) => `${n} ${pl(n, 'gäst', 'gäster')} i kväll`,
      en: (n: number) => `${n} ${pl(n, 'guest', 'guests')} tonight`
    },
    priceTag: { sv: (sek: string) => `omkring ${sek} kr per gäst`, en: (sek: string) => `about ${sek} kr per guest` },
    starsAria: { sv: (n: number) => `${n} av 5 stjärnor`, en: (n: number) => `${n} of 5 stars` },
    controlHuman: { sv: 'spelare', en: 'player' },
    levels: {
      aria: { sv: 'Nivåer', en: 'Levels' },
      village: { sv: 'Byn', en: 'Village' },
      district: { sv: 'Kvarteret', en: 'Quarter' },
      street: { sv: 'Gatan', en: 'Street' },
      room: { sv: 'Krogen', en: 'Your place' },
      hint: {
        village: { sv: 'Krogarna och grupperna i byn', en: 'The restaurants and the groups in the village' },
        district: { sv: 'Gästflödet i kvarteret', en: 'The flow of guests in the quarter' },
        street: { sv: 'Vem som är på väg in', en: 'Who is on the way in' },
        room: { sv: 'Rummet', en: 'The room' }
      }
    },
    group: {
      sv: (n: number, who: string, to: string) => `${n === 1 ? 'En gäst' : `${n} gäster`} · ${who} · mot ${to}`,
      en: (n: number, who: string, to: string) => `${n === 1 ? 'One guest' : `${n} guests`} · ${who} · to ${to}`
    },
    onTheWay: {
      sv: (n: number) => `${n} ${pl(n, 'gäst', 'gäster')} på väg in`,
      en: (n: number) => `${n} ${pl(n, 'guest', 'guests')} on the way in`
    },
    notice: {
      busAnnounce: {
        sv: (n: number, at: string) => `En buss med ${n} turister anländer ${at}. De väljer krog efter rykte.`,
        en: (n: number, at: string) => `A coach with ${n} tourists arrives at ${at}. They choose by reputation.`
      },
      busChose: {
        sv: (n: number, to: string) => `Bussens ${n} turister går till ${to}.`,
        en: (n: number, to: string) => `The coach's ${n} tourists head for ${to}.`
      },
      busChoseYou: {
        sv: (n: number) => `Bussens ${n} turister valde din krog. De är på väg.`,
        en: (n: number) => `The coach's ${n} tourists chose your place. They are on their way.`
      },
      trucks: {
        sv: (lines: string) => `Vagnarna i kväll: ${lines}.`,
        en: (lines: string) => `The trucks tonight: ${lines}.`
      }
    },
    compare: {
      title: { sv: 'Kvällen i byn', en: 'The evening in the village' },
      lead: { sv: 'Så gick kvällen för byns krogar.', en: 'How the evening went for the village restaurants.' },
      venue: { sv: 'Krog', en: 'Restaurant' },
      guests: { sv: 'Gäster', en: 'Guests' },
      perGuest: { sv: 'Per gäst', en: 'Per guest' },
      perSeat: { sv: 'Per stol', en: 'Per seat' },
      stars: { sv: 'Stjärnor', en: 'Stars' },
      noSeats: { sv: 'står vid luckan', en: 'eats standing' },
      bus: { sv: (n: number) => `varav ${n} från bussen`, en: (n: number) => `${n} from the coach` },
      place: {
        sv: (rank: number, of: number) => `Din krog kom ${rank} av ${of} i gäster i kväll.`,
        en: (rank: number, of: number) => `Your place came ${rank} of ${of} in guests tonight.`
      },
      kr: { sv: (sek: string) => `${sek} kr`, en: (sek: string) => `${sek} kr` },
      next: { sv: 'Vidare', en: 'Continue' }
    },
    newspaper: {
      kicker: { sv: 'Byns krogar', en: 'The village restaurants' },
      title: { sv: 'Veckans rankning', en: "This week's ranking" },
      row: {
        sv: (rank: number, name: string, guests: number, perGuest: string) => `${rank}. ${name}: ${guests} gäster, ${perGuest} kr per gäst`,
        en: (rank: number, name: string, guests: number, perGuest: string) => `${rank}. ${name}: ${guests} guests, ${perGuest} kr per guest`
      },
      rose: { sv: (name: string) => `${name} steg mest i ryktet den här veckan.`, en: (name: string) => `${name} rose the most in reputation this week.` },
      fell: { sv: (name: string) => `${name} föll mest.`, en: (name: string) => `${name} fell the most.` }
    }
  },
  answerEffects: {
    up: {
      sv: (table: number | null, n: number) => `${table !== null ? `Bord ${table} beställer mer` : 'Bordet beställer mer'}${n > 0 ? ` · ${n} ${pl(n, 'ny gäst', 'nya gäster')} in` : ''}`,
      en: (table: number | null, n: number) => `${table !== null ? `Table ${table} orders more` : 'The table orders more'}${n > 0 ? ` · ${n} new ${pl(n, 'guest', 'guests')} in` : ''}`
    },
    down: {
      sv: (table: number | null, n: number) => `${table !== null ? `Bord ${table} blir missnöjt` : 'Bordet blir missnöjt'}${n > 0 ? ` · ${n} ${pl(n, 'gäst', 'gäster')} i kön går` : ''}`,
      en: (table: number | null, n: number) => `${table !== null ? `Table ${table} is unhappy` : 'The table is unhappy'}${n > 0 ? ` · ${n} ${pl(n, 'guest', 'guests')} in the queue ${pl(n, 'leaves', 'leave')}` : ''}`
    },
    // ORDER 292 — fel svar: en gäst vid bordet går och stolen blir tom.
    tableLeaves: {
      sv: (table: number | null) => `${table !== null ? `En gäst vid bord ${table} går` : 'En gäst går'} · stolen står tom`,
      en: (table: number | null) => `${table !== null ? `A guest at table ${table} leaves` : 'A guest leaves'} · the chair stands empty`
    }
  },
  // ORDER 292 — insatsen på raketkortet: bordet, notan och gästerna.
  rocketStake: {
    sv: (table: number | null, kr: string, guestsWord: string, guests: number, social: boolean) => `${table !== null ? `Bord ${table}` : 'Bordet'}: ${kr} och ${guestsWord} ${pl(guests, 'gäst', 'gäster')}${social ? `, ${guests > 1 ? 'en av dem tar' : 'som tar'} med sig byn` : ''}`,
    en: (table: number | null, kr: string, guestsWord: string, guests: number, social: boolean) => `${table !== null ? `Table ${table}` : 'The table'}: ${kr} and ${guestsWord} ${pl(guests, 'guest', 'guests')}${social ? `, ${guests > 1 ? 'one of them brings' : 'who brings'} the village along` : ''}`
  },
  rocketStakeAria: { sv: 'Det som står på spel', en: 'What is at stake' },
  // ORDER 287a — gästerna med kapital: bokningsboken (Designs skärm 1,
  // brief.book.*), strömmen, kvällens resultat och söndagstidningen (Designs
  // paper.seen.*). Namnen på gästerna med socialt kapital är egennamn.
  guestTypes: {
    socialNames: { sv: ['Lova Berg', 'Maja Lind', 'Ebba Strand', 'Hugo Ek', 'Nils Holm', 'Signe Dahl'], en: ['Lova Berg', 'Maja Lind', 'Ebba Strand', 'Hugo Ek', 'Nils Holm', 'Signe Dahl'] },
    label: {
      student: { sv: 'Studenter', en: 'Students' },
      middle: { sv: 'Medelinkomst', en: 'Middle income' },
      high: { sv: 'Höginkomst', en: 'High income' },
      social: { sv: 'Socialt kapital', en: 'Social capital' },
      billionaire: { sv: 'Mannen i guld', en: 'The man in gold' }
    },
    book: {
      student: { sv: 'Studenter från Måltidens hus', en: 'Students from Måltidens hus' },
      middle: { sv: 'Par och familjer från byn', en: 'Couples and families from the village' },
      high: { sv: 'Bilar från Örebro och Karlstad', en: 'Cars from Örebro and Karlstad' },
      social: { sv: (name: string) => name, en: (name: string) => name },
      walkIns: { sv: 'Utan bokning', en: 'Walk-ins' }
    },
    bookNote: {
      student: { sv: 'Billig öl · tar platsen länge', en: 'Cheap beer · keep the table a long time' },
      middle: { sv: 'Den vanliga notan', en: 'The usual bill' },
      high: { sv: 'Frågar efter vinlistan · förväntar sig mer', en: 'Ask for the wine list · expect more' },
      social: { sv: 'Hälsar på alla · tar med sig byn om hen trivs', en: 'Greets everyone · brings the village if they enjoy it' },
      walkIns: { sv: 'Kommer när det finns plats', en: 'Come when there is room' }
    },
    bookNoteBuzz: {
      sv: (name: string, up: boolean) => up ? `${name} talade gott om er: fler gäster i kväll.` : `${name} talade illa om er: färre gäster i kväll.`,
      en: (name: string, up: boolean) => up ? `${name} spoke well of you: more guests tonight.` : `${name} spoke badly of you: fewer guests tonight.`
    },
    // Designs brief.greet.aside: miljardären är i byn.
    billionaireAside: { sv: 'Hotellet ringde. De har en ovanlig gäst i helgen.', en: 'The hotel called. They have an unusual guest this weekend.' },
    stream: {
      socialArrives: { sv: (name: string) => `${name} kommer in och hälsar på alla.`, en: (name: string) => `${name} comes in and greets everyone.` },
      socialGood: { sv: (name: string) => `${name} gick nöjd. Byn kommer att höra om kvällen.`, en: (name: string) => `${name} left happy. The village will hear about tonight.` },
      socialBad: { sv: (name: string) => `${name} gick missnöjd. Det sprids i byn.`, en: (name: string) => `${name} left unhappy. Word will spread.` },
      socialNeutral: { sv: (name: string) => `${name} gick. Inget att berätta om.`, en: (name: string) => `${name} left. Nothing to tell anyone.` },
      billionaireArrives: { sv: 'Mannen i guld kliver in. Rummet tystnar.', en: 'The man in gold walks in. The room goes quiet.' },
      billionaireTreats: {
        sv: (n: number) => `Mannen i guld bjuder hela salen på champagne: ${n} glas.`,
        en: (n: number) => `The man in gold buys champagne for the whole room: ${n} ${pl(n, 'glass', 'glasses')}.`
      }
    },
    result: {
      heading: { sv: 'Vilka som kom', en: 'Who came' },
      row: {
        sv: (n: number, kr: string) => `${n} ${pl(n, 'gäst', 'gäster')} · ${kr}`,
        en: (n: number, kr: string) => `${n} ${pl(n, 'guest', 'guests')} · ${kr}`
      },
      perGuest: { sv: (kr: string) => `${kr} per gäst`, en: (kr: string) => `${kr} per guest` },
      socialGood: { sv: (name: string) => `${name} gick nöjd: fler gäster de närmaste kvällarna.`, en: (name: string) => `${name} left happy: more guests the next few evenings.` },
      socialBad: { sv: (name: string) => `${name} gick missnöjd: färre gäster de närmaste kvällarna.`, en: (name: string) => `${name} left unhappy: fewer guests the next few evenings.` },
      socialNeutral: { sv: (name: string) => `${name} gick utan att bli imponerad. Inget sprids.`, en: (name: string) => `${name} left unimpressed. Nothing spreads.` },
      socialAway: { sv: (name: string) => `${name} kom aldrig.`, en: (name: string) => `${name} never came.` },
      billionaire: { sv: (kr: string) => `Mannen i guld åt här. Hans nota: ${kr}.`, en: (kr: string) => `The man in gold dined here. His bill: ${kr}.` },
      billionaireTreat: { sv: (n: number) => `Han bjöd salen på champagne, ${n} glas.`, en: (n: number) => `He bought the room champagne, ${n} ${pl(n, 'glass', 'glasses')}.` },
      billionaireElsewhere: { sv: 'Mannen i guld var i byn, men åt någon annanstans.', en: 'The man in gold was in the village, but dined somewhere else.' },
      billionaireLeft: { sv: 'Mannen i guld kom, men fick inget bord och gick.', en: 'The man in gold came in, but got no table and left.' }
    },
    paper: {
      seenKicker: { sv: 'Sett på stan', en: 'Seen in town' },
      oursTitle: { sv: (name: string) => `Mannen i guld åt på ${name}`, en: (name: string) => `The man in gold dined at ${name}` },
      oursBody: {
        sv: (weekday: string) => `Hela Storgatan stannade i ${weekday} när en hotellgäst i guld steg in. Han beställde det dyraste på listan.`,
        en: (weekday: string) => `All of Storgatan stopped on ${weekday} when a hotel guest in gold walked in. He ordered the most expensive things on the list.`
      },
      oursTreat: { sv: 'Sedan bjöd han hela salen på champagne.', en: 'Then he bought the whole room champagne.' },
      elsewhereTitle: { sv: 'Mannen i guld gick längs sjön', en: 'The man in gold walked by the lake' },
      // Designs paper.seen.body: han bor på hotellet och åt där. Byns övriga
      // krogar kommer med rivalerna (288a).
      hotel: { sv: 'Hotellets matsal', en: 'the hotel dining room' },

      elsewhereBody: {
        sv: (weekday: string, rival: string) => `Hela Sjövägen stannade i ${weekday} när en hotellgäst i guld tog en promenad runt sjön. Han åt på ${rival}.`,
        en: (weekday: string, rival: string) => `The whole lake road stopped on ${weekday} when a hotel guest in gold took a walk round the lake. He dined at ${rival}.`
      },
      // Tidningen skriver i ord, utan siffror (ORDER 267): vilka som kom mest.
      guestsMost: {
        sv: (first: string, second: string | null) => second ? `Flest gäster var ${first}, därefter ${second}.` : `Flest gäster var ${first}.`,
        en: (first: string, second: string | null) => second ? `Most guests were ${first}, followed by ${second}.` : `Most guests were ${first}.`
      },
      who: {
        student: { sv: 'studenter från Måltidens hus', en: 'students from Måltidens hus' },
        middle: { sv: 'par och familjer från byn', en: 'couples and families from the village' },
        high: { sv: 'bilar från Örebro och Karlstad', en: 'cars from Örebro and Karlstad' }
      },
      socialGood: { sv: (name: string) => `${name} talade gott om er i byn.`, en: (name: string) => `${name} spoke well of you around the village.` },
      socialBad: { sv: (name: string) => `${name} talade illa om er i byn.`, en: (name: string) => `${name} spoke badly of you around the village.` }
    }
  },
  // ORDER 286a — bildtexten vid figuren när raketen börjar i rummet (Designs
  // leverans 2, theatreStrings.ts rocket.*; bordet formateras i koden).
  theatre: {
    caption: {
      cutHand: { sv: 'Bartendern skär sig på en flaska', en: 'The bartender cuts a hand on a bottle' },
      smellWine: { sv: 'Värden luktar på vinet och ställer ned glaset', en: 'The host smells the wine and puts the glass down' },
      askPointMenu: { sv: (table: string) => `Gästen vid bord ${table} frågar och pekar i menyn`, en: (table: string) => `The guest at table ${table} asks and points at the menu` },
      walkToKitchen: { sv: 'En gäst går mot köket', en: 'A guest heads for the kitchen' }
    }
  },
  // ORDER 283 — introduktionen till de tre kunskapsformerna, första gången
  // spelaren kommer till Måltidens hus. Utkast för Vision Owners granskning,
  // ur DOMAIN_INTRO i Sommelier Championship.
  houseIntro: {
    label: { sv: 'Måltidens hus', en: 'The House of the Meal' },
    heading: { sv: 'Tre sätt att kunna', en: 'Three ways of knowing' },
    lead: {
      sv: 'Allt du lär dig här hör till en av tre kunskapsformer, efter Aristoteles. En skicklig sommelier behöver alla tre, och byter mellan dem i stunden.',
      en: 'Everything you learn here belongs to one of three forms of knowledge, after Aristotle. A skilled sommelier needs all three, and moves between them in the moment.'
    },
    forms: {
      sv: [
        {
          name: 'Episteme', title: 'Vetenskaplig kunskap', pavilion: 'Måltidsbiblioteket',
          question: 'Vad kan jag identifiera i glaset?',
          summary: 'Den teoretiska och analytiska kunskapen om vin och måltid: det som går att mäta, pröva och generalisera. Syra, sötma, tannin och arom, bedömda med en systematisk metod.',
          practice: ['Prova systematiskt: utseende, doft, smak, slutsats.', 'Förklara varför tannin mjuknar mot protein och syra skär igenom fett.', 'Förstå hur ljus, musik och form påverkar smaken.'],
          quote: '”Det som pågår här är en form av sensorisk analys — inte i ett laboratorium utan på golvet, i en faktisk situation.” — Herdenstam, Den arbetande gommen (2011)'
        },
        {
          name: 'Techne', title: 'Hantverksmässig kunskap', pavilion: 'Metodköket och Stensöta',
          question: 'Hur gör jag det här rätt, just nu?',
          summary: 'Färdighetskunskapen: att veta hur man gör, i rörelse, med rätt teknik och i rätt ordning. Temperatur, glas, dekantering och provningsordning.',
          practice: ['Välja temperatur, glas och dekantering efter vinet.', 'Hitta felen i tid: korksmak, diskmedel, fel temperatur.', 'Arbeta i takt med kollegorna, utan ord.'],
          quote: '”Novisen har verktygen men vet inte hur han skall använda dem.” — Herdenstam, Den arbetande gommen (2011)'
        },
        {
          name: 'Phronesis', title: 'Praktisk klokhet', pavilion: 'Kalastorget',
          question: 'Vad behöver den här gästen, i den här stunden?',
          summary: 'Omdömet och förtrogenheten: att läsa situationen och forma en upplevelse för gästen. Berättelsen, stämningen och valet som passar just nu.',
          practice: ['Lyssna på gästen innan du väljer.', 'Berätta om vinet så att gästen smakar mer.', 'Ge alla gäster samma omsorg, också den som inte dricker alkohol.'],
          quote: '”I gestaltande aktiviteter är det formella kravet på sanning inte intressant. Det som blir är det väsentliga.” — Herdenstam, Den arbetande gommen (2011)'
        }
      ] as { name: string; title: string; pavilion: string; question: string; summary: string; practice: string[]; quote: string }[],
      en: [
        {
          name: 'Episteme', title: 'Scientific knowledge', pavilion: 'Måltidsbiblioteket',
          question: 'What can I identify in the glass?',
          summary: 'The theoretical and analytical knowledge of wine and the meal: what can be measured, tested and generalised. Acidity, sweetness, tannin and aroma, judged with a systematic method.',
          practice: ['Taste systematically: appearance, nose, palate, conclusions.', 'Explain why tannin softens against protein and acidity cuts through fat.', 'Understand how light, music and shape change taste.'],
          quote: '“What goes on here is a form of sensory analysis — not in a laboratory but on the floor, in a real situation.” — Herdenstam, Den arbetande gommen (2011)'
        },
        {
          name: 'Techne', title: 'Craft knowledge', pavilion: 'Metodköket and Stensöta',
          question: 'How do I do this right, right now?',
          summary: 'Skill: knowing how, in motion, with the right technique and in the right order. Temperature, glass, decanting and the order of a tasting.',
          practice: ['Choose temperature, glass and decanting to suit the wine.', 'Catch faults in time: cork taint, detergent, the wrong temperature.', 'Work in step with your colleagues, without words.'],
          quote: '“The novice has the tools but does not know how to use them.” — Herdenstam, Den arbetande gommen (2011)'
        },
        {
          name: 'Phronesis', title: 'Practical wisdom', pavilion: 'Kalastorget',
          question: 'What does this guest need, in this moment?',
          summary: 'Judgement and familiarity: reading the situation and shaping an experience for the guest. The story, the mood and the choice that fits right now.',
          practice: ['Listen to the guest before you choose.', 'Tell the wine\'s story so the guest tastes more.', 'Give every guest the same care, including those who do not drink alcohol.'],
          quote: '“In creative work the formal demand for truth is not what matters. What becomes is what is essential.” — Herdenstam, Den arbetande gommen (2011)'
        }
      ] as { name: string; title: string; pavilion: string; question: string; summary: string; practice: string[]; quote: string }[]
    },
    inPractice: { sv: 'I praktiken', en: 'In practice' },
    where: { sv: (p: string) => `Övas i ${p}`, en: (p: string) => `Practised in ${p}` },
    sources: {
      sv: 'Bygger på Herdenstam (2011), Crichton-Fock & Spence (2024), Herdenstam m.fl. (2018, 2020), Crichton-Fock, Spence & Pettersson (2023). Utkast.',
      en: 'Based on Herdenstam (2011), Crichton-Fock & Spence (2024), Herdenstam et al. (2018, 2020), Crichton-Fock, Spence & Pettersson (2023). Draft.'
    },
    continue: { sv: 'Till paviljongerna', en: 'To the pavilions' }
  },
  // ORDER 280 — Designs leverans kassan och kvällen (nexusStrings.kassan.ts),
  // i spelets form: M1 morgonens inköp, L1 lagret, H1 händelserna, B1 Back
  // your knowledge, S1 sopbilen och K1 klockan. Designs ordval gäller, utom
  // "the House of the Meal" (CLAUDE.md regel 7).
  clock: {
    time: { sv: (h: string, mm: string) => `${h}.${mm}`, en: (h: string, mm: string) => `${h}:${mm}` },
    left: { sv: (h: number, mm: string) => `${h} h ${mm} min kvar`, en: (h: number, mm: string) => `${h} h ${mm} min left` },
    leftMin: { sv: (m: number) => `${m} min kvar`, en: (m: number) => `${m} min left` },
    label: {
      sv: { service: 'Servicen', rush: 'Rusning', lastOrders: 'Sista beställning', closed: 'Stängt', morning: 'Morgon', evening: 'Kväll', prep: 'Förberedelser' } as Record<string, string>,
      en: { service: 'Service', rush: 'Rush', lastOrders: 'Last orders', closed: 'Closed', morning: 'Morning', evening: 'Evening', prep: 'Getting ready' } as Record<string, string>
    },
    doorsAt: { sv: 'Dörrarna öppnar 18.00', en: 'Doors open 18:00' },
    // ORDER 292b — när dörrarna faktiskt öppnar (efter förberedelserna).
    doorsAtTime: { sv: (hhmm: string) => `Dörrarna öppnar ${hhmm}`, en: (hhmm: string) => `Doors open ${hhmm}` },
    pickup: { sv: 'Sopbilen hämtar', en: 'Bin lorry collecting' },
    aria: { sv: (label: string, time: string, left: string) => `${label}, klockan ${time}, ${left}`, en: (label: string, time: string, left: string) => `${label}, ${time}, ${left}` }
  },
  money: {
    plus: { sv: (n: string) => `+${n} kr`, en: (n: string) => `+SEK ${n}` },
    minus: { sv: (n: string) => `−${n} kr`, en: (n: string) => `−SEK ${n}` }
  },
  morningBuy: {
    open: { sv: 'Köp in för kvällen', en: "Buy in for tonight" },
    summary: {
      sv: (dishes: number, bottles: number) => `I lager: ${dishes} ${pl(dishes, 'portion', 'portioner')} och ${bottles} ${pl(bottles, 'flaska', 'flaskor')}.`,
      en: (dishes: number, bottles: number) => `In stock: ${dishes} ${pl(dishes, 'portion', 'portions')} and ${bottles} ${pl(bottles, 'bottle', 'bottles')}.`
    },
    phase: { sv: 'Morgonen', en: 'Morning' },
    menu: { sv: 'Meny', en: 'Menu' },
    menuStep: { sv: '+ köper 5 portioner', en: '+ buys 5 portions' },
    wine: { sv: 'Dryckeslista', en: 'Wine list' },
    wineStep: { sv: '+ köper 2 flaskor', en: '+ buys 2 bottles' },
    dishSub: { sv: (cost: string, price: string) => `Inköp ${cost} · säljs för ${price}`, en: (cost: string, price: string) => `Cost ${cost} · sells for ${price}` },
    wineSub: { sv: (cost: string, glasses: number, price: string) => `Inköp ${cost}/fl · ${glasses} glas à ${price}`, en: (cost: string, glasses: number, price: string) => `Cost ${cost}/btl · ${glasses} ${pl(glasses, 'glass', 'glasses')} at ${price}` },
    beerSub: { sv: (cost: string, price: string) => `Inköp ${cost}/fl · säljs för ${price}`, en: (cost: string, price: string) => `Cost ${cost}/btl · sells for ${price}` },
    dishSum: { sv: (n: number, kr: string) => `${n} ${pl(n, 'portion', 'portioner')} · ${kr} i inköp`, en: (n: number, kr: string) => `${n} ${pl(n, 'portion', 'portions')} · ${kr} spent` },
    wineSum: { sv: (n: number, kr: string) => `${n} ${pl(n, 'flaska', 'flaskor')} · ${kr} i inköp`, en: (n: number, kr: string) => `${n} ${pl(n, 'bottle', 'bottles')} · ${kr} spent` },
    spent: { sv: 'Inköp i dag', en: 'Bought today' },
    mains: { sv: 'Rätter', en: 'Dishes' },
    // ORDER 291 — "79 portioner till 15 väntade gäster", inte "79 av 15 gäster".
    mainsCover: { sv: (n: number, booked: number) => `${n} ${pl(n, 'portion', 'portioner')} till ${booked} ${pl(booked, 'väntad gäst', 'väntade gäster')}`, en: (n: number, booked: number) => `${n} ${pl(n, 'portion', 'portions')} for ${booked} expected ${pl(booked, 'guest', 'guests')}` },
    overFood: { sv: (n: number, need: number) => `Mer än dubbelt så mycket mat som behövs: ${n} portioner till omkring ${need} gäster. Det som inte säljs i kväll blir svinn.`, en: (n: number, need: number) => `More than twice the food you need: ${n} portions for about ${need} guests. What does not sell tonight becomes waste.` },
    overDrink: { sv: (n: number, need: number) => `Mer än dubbelt så mycket dryck som behövs: ${n} glas där omkring ${need} räcker.`, en: (n: number, need: number) => `More than twice the drink you need: ${n} glasses where about ${need} will do.` },
    booked: { sv: (n: number) => `Omkring ${n} ${pl(n, 'gäst', 'gäster')} väntas i kväll`, en: (n: number) => `About ${n} ${pl(n, 'guest', 'guests')} expected tonight` },
    // ORDER 285 — bokningsboken i Designs morgon, med det spelet redan har:
    // kvällens väntade gäster (gästtyperna kommer med 287).
    bookKicker: { sv: 'Bokningsboken', en: 'The booking book' },
    bookTitle: { sv: (day: string) => `${day} kväll`, en: (day: string) => `${day} evening` },
    bookNote: { sv: 'Väntade gäster i kväll. Köp så att det räcker, men inte mer.', en: 'Guests expected tonight. Buy enough, but no more.' },
    wineCover: { sv: (n: number, per: string) => `${n} glas · ${per} per gäst`, en: (n: number, per: string) => `${n} ${pl(n, 'glass', 'glasses')} · ${per} per guest` },
    wineLabel: { sv: 'Dryck', en: 'Drinks' },
    potential: { sv: 'Om allt säljs', en: 'If everything sells' },
    potentialNote: { sv: 'Det som inte säljs blir svinn när sopbilen kommer.', en: 'Whatever doesn’t sell is waste when the bin lorry comes.' },
    potentialIn: { sv: (kr: string) => `${kr} in`, en: (kr: string) => `${kr} in` },
    openDoors: { sv: 'Öppna dörrarna 18.00', en: 'Open the doors 18:00' },
    base: { sv: '+ Baspaketet', en: '+ Base package' },
    back: { sv: 'Tillbaka till schemat', en: 'Back to the schedule' },
    notEnough: { sv: 'Kassan räcker inte till partiet.', en: 'The till cannot cover that batch.' },
    unitPortion: { sv: 'port', en: 'ptn' },
    unitBottle: { sv: 'fl', en: 'btl' },
    less: { sv: (name: string) => `Ett parti färre ${name}`, en: (name: string) => `One batch less ${name}` },
    more: { sv: (name: string) => `Ett parti till ${name}`, en: (name: string) => `One more batch ${name}` }
  },
  stockL1: {
    kitchen: { sv: 'Lagret · kök', en: 'Stock · kitchen' },
    bar: { sv: 'Lagret · bar', en: 'Stock · bar' },
    of: { sv: (n: number) => `av ${n} ${pl(n, 'portion', 'portioner')}`, en: (n: number) => `of ${n} ${pl(n, 'portion', 'portions')}` },
    open: { sv: (g: number, n: number) => `${g} glas i öppen · av ${n} fl`, en: (g: number, n: number) => `${g} in open bottle · of ${n} btl` },
    ok: { sv: 'I lager', en: 'In stock' },
    low: { sv: 'Snart slut', en: 'Running low' },
    out: { sv: 'Slut', en: 'Sold out' },
    warnLow: { sv: (item: string, n: number, unit: string) => `${item} snart slut · ${n} ${unit} kvar`, en: (item: string, n: number, unit: string) => `${item} running low · ${n} ${unit} left` },
    warnOut: { sv: (item: string) => `${item} slut · stryks från menyn`, en: (item: string) => `${item} sold out · off the menu` },
    // ORDER 284 — när varje rätt är slut, inte bara en.
    kitchenOut: { sv: 'Köket har ingen mat kvar · alla rätter slut', en: 'The kitchen is out of food · every dish sold out' },
    unitGlass: { sv: 'glas', en: 'glasses' },
    // ORDER 289 — ett glas.
    unitGlassOne: { sv: 'glas', en: 'glass' },
    heading: { sv: 'Lagret i kväll', en: 'Stock tonight' }
  },
  feed: {
    title: { sv: 'Händelser', en: 'Events' },
    ordered: { sv: 'Beställt', en: 'Ordered' },
    paid: { sv: 'Betalt', en: 'Paid' },
    tip: { sv: 'Dricks', en: 'Tips' },
    order: { sv: (t: string, lines: string) => `Bord ${t} · ${lines}`, en: (t: string, lines: string) => `Table ${t} · ${lines}` },
    linePortion: { sv: (n: number, item: string) => `${n} × ${item}`, en: (n: number, item: string) => `${n} × ${item}` },
    lineGlass: { sv: (n: number, item: string) => `${n} glas ${item}`, en: (n: number, item: string) => `${n} ${n === 1 ? 'glass' : 'glasses'} ${item}` },
    lineBottle: { sv: (item: string) => `1 fl ${item}`, en: (item: string) => `1 btl ${item}` },
    miss: { sv: (t: string, item: string) => `Bord ${t} ville ha ${item} · slut`, en: (t: string, item: string) => `Table ${t} wanted ${item} · sold out` },
    pay: { sv: (t: string) => `Bord ${t} betalar`, en: (t: string) => `Table ${t} pays` },
    tipLine: { sv: (t: string) => `Dricks bord ${t} · till personalen`, en: (t: string) => `Tip table ${t} · to the staff` },
    guest: { sv: 'en gäst', en: 'a guest' },
    tonight: { sv: 'I kväll', en: 'Tonight' },
    tonightPaid: { sv: 'Betalt', en: 'Paid' },
    tonightTips: { sv: 'Dricks till personalen', en: 'Tips to the staff' },
    tonightTabs: { sv: 'Öppna notor', en: 'Open tabs' },
    tonightTabsValue: { sv: (n: number, kr: string) => `${n} bord · ${kr}`, en: (n: number, kr: string) => `${n} ${pl(n, 'table', 'tables')} · ${kr}` },
    tonightTabsNone: { sv: 'Inga', en: 'None' }
  },
  back: {
    title: { sv: 'Stå för ditt svar', en: 'Back your knowledge' },
    kicker: { sv: (role: string, place: string) => `Stå för ditt svar · ${role} · ${place}`, en: (role: string, place: string) => `Back your knowledge · ${role} · ${place}` },
    steps: { sv: 'Tre steg', en: 'Three steps' },
    introTitle: { sv: 'Tre frågor. Du bestämmer hur mycket du står för varje svar.', en: 'Three questions. You decide how firmly you back each answer.' },
    introBody: {
      sv: 'Efter varje svar väljer du hur säker du är. Ju säkrare du är, desto mer vinner du om det stämmer och desto mer förlorar du om det inte gör det. Steget du har kommit till multiplicerar vinsten.',
      en: 'After each answer, choose how sure you are. The surer you are, the more you gain if you’re right and the more you lose if you’re not. The step you’ve reached multiplies the gain.'
    },
    introSource: {
      sv: 'Krediterna har du tjänat på proven i Måltidens hus och på raketerna i servicen. De kan inte köpas och växlas aldrig mot kassan.',
      en: 'You earned your credits in the House of the Meal exams and the service rockets. They can’t be bought and never convert to cash.'
    },
    start: { sv: 'Starta raketen', en: 'Launch the rocket' },
    left: { sv: (n: number) => `${n} kvar i kväll`, en: (n: number) => `${n} left tonight` },
    none: { sv: 'Inga fler i kväll.', en: 'No more tonight.' },
    track: { sv: 'Raketen', en: 'The rocket' },
    trackSub: { sv: 'Varje rätt steg lyfter den', en: 'Each right step lifts it' },
    trackGoal: { sv: 'Mål', en: 'Goal' },
    howSure: { sv: 'Hur säker är du?', en: 'How sure are you?' },
    // ORDER 284 — när krediterna inte räcker till mer än en gissning.
    earn: { sv: 'Slut på krediter? Du tjänar dem med rätta svar: en för varje rätt svar när du övar eller gör prov i Måltidens hus, och för det bästa svaret i kvällens raketer.', en: 'Out of credits? You earn them with right answers: one for each right answer when you practise or take a test in the House of the Meal, and for the best answer in the evening\'s rockets.' },
    earnShort: { sv: 'Krediterna räcker bara till Gissar. Nya tjänas med rätta svar, i Måltidens hus och i raketerna.', en: 'Your credits only cover Guessing. You earn more with right answers, in the House of the Meal and in the rockets.' },
    // ORDER 284 — klockan stannar när svaret är valt.
    pickFirst: { sv: 'Välj ett svar först, då stannar klockan.', en: 'Pick an answer first; the clock then stops.' },
    pickedHint: { sv: (s: number) => `Svaret är låst. Välj hur säker du är, annars räknas Gissar om ${s} s.`, en: (s: number) => `Answer locked. Choose how sure you are, or it counts as Guessing in ${s} s.` },
    // Provspel av 285: en grå knapp säger alltid varför.
    chooseHow: { sv: 'Välj hur säker du är', en: 'Choose how sure you are' },
    why: {
      busy: { sv: 'En raket pågår redan', en: 'A rocket is already under way' },
      maxed: { sv: 'Alla tre är använda i kväll', en: 'All three are used tonight' },
      noneFits: { sv: 'Ingen fråga passar kvällens meny just nu', en: "No question fits tonight's menu right now" },
      notOpen: { sv: 'Öppnar när dörrarna öppnar', en: 'Opens when the doors open' },
      // ORDER 292b — med klockslaget när dörrarna öppnar.
      notOpenAt: { sv: (hhmm: string) => `Öppnar ${hhmm}, när dörrarna öppnar`, en: (hhmm: string) => `Opens at ${hhmm}, when the doors open` },
      // ORDER 291 — verksamheter utan egna raketer ännu (food trucken).
      noRockets: { sv: 'Den här verksamheten har inga raketer ännu', en: 'This business has no rockets yet' }
    },
    odds: { sv: (win: number, loss: number) => `+${win} om rätt · ${loss > 0 ? `−${loss}` : '±0'} om fel`, en: (win: number, loss: number) => `+${win} if right · ${loss > 0 ? `−${loss}` : '±0'} if wrong` },
    lock: { sv: 'Stå för svaret', en: 'Back it' },
    confidence: { sv: ['Gissar', 'Tror det', 'Vet det'], en: ['Guessing', 'Think so', 'Know it'] },
    boxCredits: { sv: 'Krediter', en: 'Credits' },
    boxWrong: { sv: (level: string) => `${level} · fel`, en: (level: string) => `${level} · wrong` },
    wrongNoMult: { sv: 'Steget multiplicerar bara rätt svar.', en: 'The step only multiplies right answers.' },
    bandRight: {
      sv: ['Rätt, men du gissade. Nästa gång kan du stå för det.', 'Rätt. Du trodde det, och det stämde.', 'Du visste, och du stod för det.'],
      en: ['Right, but you guessed. Next time, back it.', 'Right. You thought so, and you were.', 'You knew it, and you backed it.']
    },
    bandWrong: {
      sv: ['Fel, men en gissning kostar inget. Nu vet du svaret. Raketen slutar här.', 'Du trodde det, men det stämde inte. Raketen slutar här.', 'Du var säker, men det stämde inte. Det är värt att veta. Raketen slutar här.'],
      en: ['Wrong, but a guess costs nothing. Now you know. The rocket ends here.', 'You thought so, but it wasn’t. The rocket ends here.', 'You were sure, and you were wrong. That’s worth knowing. The rocket ends here.']
    },
    calibTitle: { sv: 'Hur säker du var', en: 'How sure you were' },
    calibTonight: { sv: 'I kväll', en: 'Tonight' },
    calibRow: { sv: (r: number, n: number) => `${r} av ${n} rätt`, en: (r: number, n: number) => `${r} of ${n} right` },
    calibNote: {
      sv: { overconfident: (r: number, n: number) => `Vet det höll i ${r} av ${n}. Här tror du dig kunna mer än du kan.`, underconfident: () => 'Dina gissningar stämmer oftare än du tror. Stå för dem.', default: () => 'Stå för så mycket som du kan. Då mäter krediterna vad du vet.' } as Record<string, (r: number, n: number) => string>,
      en: { overconfident: (r: number, n: number) => `Know it held ${r} of ${n} ${pl(n, 'time', 'times')}. Here you think you know more than you do.`, underconfident: () => 'Your guesses are right more often than you think. Back them.', default: () => 'Back what you know. Then your credits measure what you know.' } as Record<string, (r: number, n: number) => string>
    },
    credits: { sv: 'Krediter', en: 'Credits' },
    creditsAria: { sv: (n: number) => `Krediter: ${n}`, en: (n: number) => `Credits: ${n}` },
    juice: { sv: 'Animationer', en: 'Animations' },
    juiceBalatro: { sv: 'Balatro', en: 'Balatro' },
    juiceCalm: { sv: 'Lugn', en: 'Calm' }
  },
  wasteScreen: {
    phase: { sv: 'Efter stängning', en: 'After closing' },
    kicker: { sv: 'Sopbilen · 23.40', en: 'Bin lorry · 23:40' },
    title: { sv: 'Det som blev över', en: 'What was left' },
    // ORDER 289 — sopbilen hos krogen, med krogens namn (provspel av 285).
    hauler: { sv: (name: string) => `Sopbilen hos ${name}`, en: (name: string) => `The bin lorry at ${name}` },
    colFraction: { sv: 'Fraktion', en: 'Fraction' },
    colWhat: { sv: 'Vad', en: 'What' },
    colKg: { sv: 'Vikt', en: 'Weight' },
    colValue: { sv: 'Inköpspris', en: 'Cost price' },
    fractions: {
      sv: { unsold: 'Matsvinn · osålt', plates: 'Tallrikssvinn', glass: 'Glas', cardboard: 'Kartong och papper' } as Record<string, string>,
      en: { unsold: 'Food waste · unsold', plates: 'Plate waste', glass: 'Glass', cardboard: 'Cardboard and paper' } as Record<string, string>
    },
    unsoldNone: { sv: 'Allt såldes', en: 'Everything sold' },
    // ORDER 285 — portionerna som lagts undan till morgonens fråga.
    asideLine: { sv: (n: number, dish: string) => `${n} ${pl(n, 'portion', 'portioner')} ${dish} läggs undan i kylrummet. I morgon avgör en fråga om de går att använda.`, en: (n: number, dish: string) => `${n} ${pl(n, 'portion', 'portions')} of ${dish} are set aside in the cold room. Tomorrow a question decides whether they can be used.` },
    unsoldDetail: { sv: (n: number, kept: number) => `${n} osålda portioner${kept > 0 ? ` · ${kept} sparas till i morgon` : ''}`, en: (n: number, kept: number) => `${n} unsold portions${kept > 0 ? ` · ${kept} kept for tomorrow` : ''}` },
    platesDetail: { sv: (n: number) => `Rester från ${n} ${pl(n, 'tallrik', 'tallrikar')}`, en: (n: number) => `Leftovers from ${n} ${pl(n, 'plate', 'plates')}` },
    glassDetail: { sv: (n: number) => `${n} tomma flaskor`, en: (n: number) => `${n} empty bottles` },
    cardboardDetail: { sv: 'Morgonens leveranser', en: 'This morning’s deliveries' },
    total: { sv: 'Totalt', en: 'Total' },
    kg: { sv: (kg: string) => `${kg} kg`, en: (kg: string) => `${kg} kg` },
    value: { sv: 'Svinn', en: 'Waste' },
    valueNote: { sv: 'Betalt redan i morse. Nu ligger det i soporna.', en: 'Paid for this morning. Now it’s in the bin.' },
    fee: { sv: 'Miljöavgift', en: 'Environmental fee' },
    feeLine: { sv: (kg: string, perKg: string, pickup: string) => `${kg} kg × ${perKg} + hämtning ${pickup}`, en: (kg: string, perKg: string, pickup: string) => `${kg} kg × ${perKg} + ${pickup} collection` },
    adviceKicker: { sv: 'I morgon bitti', en: 'Tomorrow morning' },
    advice: { sv: (n: number, item: string, kr: string) => `Köp ${n} färre ${item} i morgon. Det sparar ${kr} i inköp.`, en: (n: number, item: string, kr: string) => `Buy ${n} fewer ${item} tomorrow. It saves ${kr}.` },
    adviceNone: { sv: 'Nästan inget blev över. Köp samma mängder i morgon.', en: 'Almost nothing was left. Buy the same tomorrow.' },
    // ORDER 289 — maten tog slut före stängning (provspel av 285).
    adviceMore: {
      sv: (clock: string | null, guests: number, n: number) => `${clock ? `Maten tog slut ${clock}` : 'Maten tog slut'} och ${guests} ${pl(guests, 'gäst', 'gäster')} gick utan. Köp omkring ${n} ${pl(n, 'portion', 'portioner')} mer i morgon.`,
      en: (clock: string | null, guests: number, n: number) => `${clock ? `The food ran out at ${clock}` : 'The food ran out'} and ${guests} ${pl(guests, 'guest', 'guests')} went without. Buy about ${n} more ${pl(n, 'portion', 'portions')} tomorrow.`
    },
    adviceOutNoGuests: { sv: (clock: string) => `Maten tog slut ${clock}, men ingen gick utan. Köp gärna ett parti till i morgon.`, en: (clock: string) => `The food ran out at ${clock}, but nobody went without. Consider one more batch tomorrow.` },
    continue: { sv: 'Till kvällens lärdom', en: "To tonight's lesson" }
  },
  // ORDER 280 — resten av engelskan: äldre komponenter som hade texten
  // direkt i koden, nu i strängtabellen med svenska och engelska.
  legacy: {
    controls: {
      mouse: {
        sv: ['Mushjulet', 'zoomar', 'vänsterdrag', 'panorerar', 'höger- eller mittdrag', 'roterar', 'klick', 'väljer', 'Esc', 'ut'],
        en: ['Mouse wheel', 'zooms', 'left drag', 'pans', 'right/middle drag', 'rotates', 'click', 'selects', 'Esc', 'out']
      },
      hide: { sv: 'Dölj kontrollerna', en: 'Hide controls' },
      village: { sv: 'byn', en: 'the village' },
      district: { sv: 'kvarteret', en: 'the district' },
      block: { sv: 'ditt kvarter', en: 'your block' },
      business: { sv: 'din verksamhet', en: 'your business' }
    },
    outward: { sv: 'Tillbaka', en: 'Back' },
    outwardAria: { sv: 'Zooma ut ett steg', en: 'Zoom out one step' },
    closeSelection: { sv: 'Stäng valet', en: 'Close selection' },
    continue: { sv: 'Fortsätt', en: 'Continue' },
    scaleDown: {
      heading: { sv: 'Skala ner', en: 'Scale down' },
      body: { sv: 'En aktiv reträtt när passet blöder. Går att ångra — öppna igen när kassan tål det.', en: 'An active retreat when the pass is bleeding. Reversible — reopen when the cash can take it.' },
      shortenMenu: { sv: 'Korta menyn', en: 'Shorten the menu' },
      restoreMenu: { sv: 'Återställ menyn', en: 'Restore the menu' },
      shortenMenuDesc: { sv: 'Sänk råvarunivån ett steg. Sparar per gäst, sänker matens kvalitet över tid.', en: 'Lower the ingredient level one step. Saves per guest, dampens food quality over time.' },
      restoreMenuDesc: { sv: 'Höj råvarunivån till där den var.', en: 'Raise the ingredient level back to where it was.' },
      thinWine: { sv: 'Gallra vinlistan', en: 'Thin the wine list' },
      restoreWine: { sv: 'Återställ vinlistan', en: 'Restore the wine list' },
      thinWineDesc: { sv: 'Dra ner på drycken. Servicen har mindre att bära, dryckens kvalitet sjunker över tid.', en: 'Scale back the drinks side. The service has less to carry, drink quality falls over time.' },
      restoreWineDesc: { sv: 'Öppna listan igen. Kvaliteten börjar återhämta sig.', en: 'Open the list again. The quality reading starts to recover.' },
      closeLunch: { sv: 'Stäng lunchen', en: 'Close lunch' },
      openLunch: { sv: 'Öppna lunchen igen', en: 'Open lunch again' },
      closeLunchDesc: { sv: 'Ingen lunch förrän du öppnar igen. Sparar personal och råvaror; stamgästerna märker den stängda dörren.', en: "No lunch until you open again. Saves staff + ingredients; the room's regular tables notice the door." },
      openLunchDesc: { sv: 'Ta tillbaka lunchen. Ryktet börjar återhämta sig.', en: 'Bring lunch back. The reputation starts to recover.' },
      closeDinner: { sv: 'Stäng kvällen', en: 'Close dinner' },
      openDinner: { sv: 'Öppna kvällen igen', en: 'Open dinner again' },
      closeDinnerDesc: { sv: 'Ingen kvällsservice förrän du öppnar igen. Den största besparingen, den största kostnaden för ryktet.', en: 'No dinner until you open again. The biggest saving, the biggest cost to reputation.' },
      openDinnerDesc: { sv: 'Ta tillbaka kvällen.', en: 'Bring dinner back.' }
    }
  },
  // ORDER 277 — kassan syns hela tiden.
  cashCounter: {
    label: { sv: 'Kassa', en: 'Cash' },
    aria: { sv: (amount: string) => `Kassan: ${amount}`, en: (amount: string) => `Cash: ${amount}` },
    // ORDER 290 — kvällskassan under servicen, mot linjen för break-even.
    tillLabel: { sv: 'Kvällskassan', en: 'Tonight' },
    tillAria: { sv: (till: string, be: string) => `Kvällskassan: ${till} av ${be} till break-even`, en: (till: string, be: string) => `Tonight's till: ${till} of ${be} to break even` },
    breakEven: { sv: (be: string) => `Break-even ${be}`, en: (be: string) => `Break-even ${be}` }
  },
  // ORDER 277 — gästerna har kost och plånbok.
  guests: {
    lost: {
      sv: (reason: string, table: number | null, partyLeft: number) => {
        const at = table === null ? 'En gäst' : `En gäst vid bord ${table}`;
        const why: Record<string, string> = {
          vegetarian: 'hittade inget vegetariskt på menyn',
          vegan: 'hittade inget veganskt på menyn',
          lactose: 'hittade inget utan laktos på menyn',
          gluten: 'hittade inget utan gluten på menyn',
          soldOut: 'fick höra att allt hen kunde äta var slut',
          wallet: 'hittade inget i sin prisklass',
          alcoholFree: 'hittade inget alkoholfritt'
        };
        const party = partyLeft > 0 ? ` Sällskapet gick med, ${partyLeft === 1 ? 'en till' : `${partyLeft} till`}.` : '';
        return `${at} ${why[reason] ?? why.soldOut} och gick utan att beställa.${party}`;
      },
      en: (reason: string, table: number | null, partyLeft: number) => {
        const at = table === null ? 'A guest' : `A guest at table ${table}`;
        const why: Record<string, string> = {
          vegetarian: 'found nothing vegetarian on the menu',
          vegan: 'found nothing vegan on the menu',
          lactose: 'found nothing without lactose on the menu',
          gluten: 'found nothing without gluten on the menu',
          soldOut: 'heard that everything they could eat had run out',
          wallet: 'found nothing in their price range',
          alcoholFree: 'found nothing alcohol-free'
        };
        const party = partyLeft > 0 ? ` Their party left with them, ${partyLeft === 1 ? 'one more' : `${partyLeft} more`}.` : '';
        return `${at} ${why[reason] ?? why.soldOut} and left without ordering.${party}`;
      }
    },
    // ORDER 278 — servicen syns: beställningen, betalningen och dricksen.
    wantedButOut: {
      sv: (table: number | null, wanted: string, got: string) => `${table === null ? 'En gäst' : `Bord ${table}`} ville ha ${wanted.toLowerCase()}, men den var slut. Det blev ${got.toLowerCase()}, och gästen är missnöjd.`,
      en: (table: number | null, wanted: string, got: string) => `${table === null ? 'A guest' : `Table ${table}`} wanted the ${wanted.toLowerCase()}, but it had run out. They took the ${got.toLowerCase()}, and they are not pleased.`
    },
    ordered: {
      sv: (table: number | null, items: string[]) => `${table === null ? 'En gäst' : `Bord ${table}`} beställer: ${items.join(', ')}.`,
      en: (table: number | null, items: string[]) => `${table === null ? 'A guest' : `Table ${table}`} orders: ${items.join(', ')}.`
    },
    paid: {
      sv: (table: number | null, bill: string, tip: string | null) => `${table === null ? 'En gäst' : `Bord ${table}`} betalar ${bill}${tip ? ` och lämnar ${tip} i dricks till personalen` : ''}.`,
      en: (table: number | null, bill: string, tip: string | null) => `${table === null ? 'A guest' : `Table ${table}`} pays ${bill}${tip ? ` and leaves ${tip} as a tip for the staff` : ''}.`
    },
    noAlcoholFree: {
      sv: (table: number | null) => `${table === null ? 'En gäst' : `En gäst vid bord ${table}`} dricker inte alkohol, och det fanns inget alkoholfritt på listan.`,
      en: (table: number | null) => `${table === null ? 'A guest' : `A guest at table ${table}`} does not drink alcohol, and there was nothing alcohol-free on the list.`
    },
    drinkOnly: {
      sv: (table: number | null) => `${table === null ? 'En gäst' : `En gäst vid bord ${table}`} hittade ingen rätt i sin prisklass och tog bara något att dricka.`,
      en: (table: number | null) => `${table === null ? 'A guest' : `A guest at table ${table}`} found no dish in their price range and only had a drink.`
    }
  },
  save: {
    menuItem: { sv: 'Spara och ladda', en: 'Save and load' },
    continueSaved: { sv: 'Fortsätt ett sparat spel', en: 'Continue a saved game' },
    heading: { sv: 'Sparade spel', en: 'Saved games' },
    close: { sv: 'Stäng', en: 'Close' },
    slot: { sv: (n: number) => `Plats ${n}`, en: (n: number) => `Slot ${n}` },
    empty: { sv: 'Tom', en: 'Empty' },
    active: { sv: 'Spelar nu', en: 'Playing now' },
    saveHere: { sv: 'Spara här', en: 'Save here' },
    load: { sv: 'Ladda', en: 'Load' },
    weeklyCopies: { sv: 'Veckokopior', en: 'Weekly copies' },
    loadWeek: { sv: (week: number) => `Början av vecka ${week}`, en: (week: number) => `Start of week ${week}` },
    autosaveNote: {
      sv: 'Spelet sparas automatiskt när dagen tar slut, och en kopia sparas varje vecka.',
      en: 'The game saves automatically when the day ends, and a copy is saved every week.'
    },
    savedAt: {
      sv: (weekday: string, week: number, name: string) => `${name} · ${weekday}, vecka ${week}`,
      en: (weekday: string, week: number, name: string) => `${name} · ${weekday}, week ${week}`
    },
    olderVersion: {
      sv: 'Sparat i en äldre version av spelet och kan inte laddas.',
      en: 'Saved in an older version of the game and cannot be loaded.'
    },
    storageUnavailable: {
      sv: 'Webbläsaren tillåter inte sparande just nu.',
      en: 'The browser does not allow saving right now.'
    }
  },
  scenario: {
    // ORDER 042 §3.3 walk-in-of-five. Difficulty is chosen BEFORE the
    // situation is revealed (LEARNING_AND_SCENARIO_ARCHITECTURE §4.3).
    // No response is marked correct (§4.2). No result popup — the
    // response resolves in the room (CAMERA_AND_GAMEPLAY_BIBLE §8.1).
    //
    // These fields are legacy fallbacks — the live spec text lives in
    // strategic/simulation/scenarios.ts and is what the overlay uses
    // in practice. Kept in English so any drop-through fallback still
    // reads in the game's language.
    subject: {
      body: { sv: 'A party is at the door — no booking.', en: 'A party is at the door — no booking.' },
      cta: { sv: 'Continue', en: 'Continue' }
    },
    // ORDER 048 §5 (2026-08-10 amendment) — the difficulty block
    // (self-reported confidence "Hur säker känner du dig inför det
    // här?") is retired. It asked about feeling instead of knowledge
    // and produced no outcome. The slot between subject and situation
    // is reserved for ORDER 049 §5.1's professional questions.
    situation: {
      body: {
        sv: 'Five in the party. Service starts soon and the room is partly booked. What do you do?',
        en: 'Five in the party. Service starts soon and the room is partly booked. What do you do?'
      },
      options: {
        A: {
          sv: 'Seat all five — join the four-top and a two-top.',
          en: 'Seat all five — join the four-top and a two-top.'
        },
        B: {
          sv: 'Seat four at the four-top, the fifth at the bar.',
          en: 'Seat four at the four-top, the fifth at the bar.'
        },
        C: { sv: 'Turn the party away.', en: 'Turn the party away.' }
      }
    },
    // Mentor comments are non-modal — they surface as an in-world text
    // bubble above the room after the response has begun to play out.
    // Keyed by choice only after the ORDER 048 §5 confidence-question
    // retirement (2026-08-10); the mid-difficulty variants survive as
    // the neutral base.
    mentor: {
      A: {
        sv: 'Joining tables works when the floor is with you. Keep an eye on the two-top next door.',
        en: 'Joining tables works when the floor is with you. Keep an eye on the two-top next door.'
      },
      B: {
        sv: 'Sensible split. The bar seat only works if a staff member gets there in time.',
        en: 'Sensible split. The bar seat only works if a staff member gets there in time.'
      },
      C: {
        sv: 'Declining is a choice too. The evening keeps its rhythm — but the room notes it.',
        en: 'Declining is a choice too. The evening keeps its rhythm — but the room notes it.'
      }
    }
  },
  // ORDER 043 v3 §10 step 5 — the morning team panel. Player-facing
  // labels for the hire/fire surface, keyed by role for a compact
  // switch in TeamPanel. Role labels are capitalized display forms
  // of the internal StaffRole (which stays lowercase for code-side).
  team: {
    heading: { sv: 'Laget', en: 'The team' },
    body: {
      sv: 'Anställ och säg upp inför dagen. Kontrakt löper i sju dagar.',
      en: 'Hire and let go before the day. Contracts run for seven days.'
    },
    contractLabel: { sv: 'kontrakt t.o.m. dag', en: 'contract until day' },
    dailyCostLabel: { sv: 'kr/dag', en: 'SEK/day' },
    fireButton: { sv: 'Säg upp', en: 'Let go' },
    buyoutLabel: { sv: 'buyout', en: 'buyout' },
    kr: { sv: 'kr', en: 'SEK' },
    hireHeading: { sv: 'Anställ', en: 'Hire' },
    agencyTag: { sv: ' (bemanning)', en: ' (agency)' },
    roleLabel: {
      'värd': { sv: 'Värd', en: 'Host' },
      'servitör': { sv: 'Servitör', en: 'Waiter' },
      'kock': { sv: 'Kock', en: 'Cook' },
      'lärling': { sv: 'Lärling', en: 'Apprentice' }
    },
    roleDescription: {
      'värd': {
        sv: 'Hälsar och styr rummet — hög kulturell kompetens.',
        en: 'Greets and runs the room — high cultural competence.'
      },
      'servitör': {
        sv: 'Bär order och håller flöde — balanserad rustning.',
        en: 'Carries orders and keeps the flow — balanced all-rounder.'
      },
      'kock': {
        sv: 'Håller köket — hög vetenskaplig kompetens.',
        en: 'Holds the kitchen — high scientific competence.'
      },
      'lärling': {
        sv: 'Lärling som avlastar överallt — låg kompetens, låg kostnad.',
        en: 'An apprentice who lends a hand everywhere — low competence, low cost.'
      }
    }
  },
  // ORDER 043 v3 §10 step 5 — agency-staff offer. Appears mid-service
  // when strain has been sustained above threshold. Player accepts
  // (money cost, agency joins for the service) or declines (social
  // capital cost — the team registers that no help came).
  agency: {
    heading: { sv: 'Hyrpersonal erbjuds', en: 'Agency staff offered' },
    body: {
      sv: 'Laget står under press. Vill du ta in en extra hand för resten av kvällen?',
      en: 'The team is under pressure. Do you want to bring in an extra pair of hands for the rest of the evening?'
    },
    accept: { sv: 'Ta in — kostar', en: 'Bring in — costs' },
    decline: { sv: 'Avstå', en: 'Decline' },
    kr: { sv: 'kr', en: 'SEK' }
  },
  // ORDER 046 §2 — the morning investment panel. Sits alongside
  // TeamPanel and surfaces the three policy dials that shape the
  // service (training level, price positioning, ingredient tier).
  // Not a scoreboard — the labels are the reading.
  invest: {
    heading: { sv: 'Investering', en: 'Investment' },
    body: {
      sv: 'Vad står laget inför i dag? Träning, prisläge och råvara sätter kvällens karaktär.',
      en: 'What is the team facing today? Training, pricing and ingredients set the character of the evening.'
    },
    trainingHeading: { sv: 'Utbildning', en: 'Training' },
    trainingLevels: {
      1: { sv: 'Grundnivå', en: 'Basic' },
      2: { sv: 'Erfaren', en: 'Experienced' },
      3: { sv: 'Specialiserad', en: 'Specialised' }
    },
    trainingDescriptions: {
      1: {
        sv: 'Räcker för att öppna dörrarna. Rummet får bära det som händer.',
        en: 'Enough to open the doors. The room has to carry whatever happens.'
      },
      2: {
        sv: 'Kockar och servitörer har rutin. Slag jämnas ut innan de syns.',
        en: 'Cooks and waiters have routine. Blows are smoothed out before they show.'
      },
      3: {
        sv: 'Alla vet mer än det som krävs i stunden. Servicen har djup att gå till.',
        en: 'Everyone knows more than the moment demands. The service has depth to draw on.'
      }
    },
    pricingHeading: { sv: 'Prisläge', en: 'Pricing' },
    pricingLevels: {
      'låg': { sv: 'Lågt', en: 'Low' },
      'medel': { sv: 'Medel', en: 'Medium' },
      'hög': { sv: 'Högt', en: 'High' }
    },
    pricingDescriptions: {
      'låg': {
        sv: 'Fyllt hus, tunnare marginal. Krogen håller pulsen uppe.',
        en: 'A full house, a thinner margin. The restaurant keeps the pulse up.'
      },
      'medel': {
        sv: 'Balans mellan volym och intäkt. Kvällens standardläge.',
        en: "A balance between volume and revenue. The evening's standard setting."
      },
      'hög': {
        sv: 'Färre gäster, mer per bord. Rummet måste bära förväntan.',
        en: 'Fewer guests, more per table. The room has to live up to the expectation.'
      }
    },
    ingredientHeading: { sv: 'Råvara', en: 'Ingredients' },
    ingredientLevels: {
      'grund': { sv: 'Grund', en: 'Basic' },
      'utvald': { sv: 'Utvald', en: 'Selected' },
      'premium': { sv: 'Premium', en: 'Premium' }
    },
    ingredientDescriptions: {
      'grund': {
        sv: 'Standardleverantör. Kvällen bygger på hantverket, inte på råvaran.',
        en: 'Standard supplier. The evening rests on the craft, not on the ingredients.'
      },
      'utvald': {
        sv: 'Utvalda leverantörer när det räknas. Något att prata om vid ett par bord.',
        en: 'Selected suppliers where it counts. Something to talk about at a couple of tables.'
      },
      'premium': {
        sv: 'Det bästa av det som finns. Kvällen står och faller med det köket gör med det.',
        en: 'The best there is. The evening stands or falls with what the kitchen does with it.'
      }
    }
  },
  // ORDER 043 v3 §7 wager — placed between scenarios on which
  // sustainability the next situation will concern. Optional; declining
  // is legitimate and progresses more slowly.
  wager: {
    heading: { sv: 'Läs rummet', en: 'Read the room' },
    // ORDER 043 Addendum B — pre-placement copy in the observer's
    // voice. Names what the stake is, what a correct read gives back,
    // what a wrong one costs, and that it locks the moment it's
    // placed. Not a rules panel; a briefing.
    body: {
      sv: 'Vilken hållbarhet handlar nästa situation om? Rätt läsning ger tillbaka — och lite mer om den avläsning du valde ligger svagt. Fel läsning tas.',
      en: 'Which sustainability will the next situation be about? A right reading pays back — and a little more if the reading you chose is weak. A wrong reading is taken.'
    },
    lockNote: {
      sv: 'Insatsen låser i samma stund du väljer. Ingen ångrings-knapp; det är där risken bor.',
      en: 'The stake locks the moment you choose. No undo button; that is where the risk lives.'
    },
    capitals: {
      economic: { sv: 'Ekonomiskt', en: 'Economic' },
      social: { sv: 'Socialt', en: 'Social' },
      ecological: { sv: 'Ekologiskt', en: 'Ecological' }
    },
    decline: { sv: 'Avstå', en: 'Decline' },
    standing: { sv: 'Satsat:', en: 'Staked:' },
    placed: {
      sv: 'Insatsen står — vi ser hur nästa situation faller ut.',
      en: 'The stake stands — we will see how the next situation turns out.'
    },
    // ORDER 045 — weather line shown under the capital buttons so the
    // wager reads against the evening's conditions.
    weatherPrefix: { sv: 'Kvällen:', en: 'The evening:' }
  },
  // ORDER 045 — the opening image before mise en place. Ten-second
  // briefing screen showing weather + local factors + how many are
  // already outside. No numeric HUD dominance (§9); the copy carries
  // the reading.
  opening: {
    heading: { sv: 'Kvällen', en: 'The evening' },
    tempSuffix: { sv: '°C', en: '°C' },
    windSuffix: { sv: 'm/s', en: 'm/s' },
    // ORDER 292b — ordet för vinden (stod på engelska i den svenska raden).
    windWord: { sv: 'vind', en: 'wind' },
    precipitation: {
      none: { sv: 'uppehåll', en: 'dry' },
      drizzle: { sv: 'duggregn', en: 'drizzle' },
      rain: { sv: 'regn', en: 'rain' },
      snow: { sv: 'snö', en: 'snow' }
    },
    clouds: {
      clear: { sv: 'klart', en: 'clear' },
      partly: { sv: 'halvklart', en: 'partly cloudy' },
      overcast: { sv: 'mulet', en: 'overcast' }
    },
    outdoorViable: { sv: 'Uteserveringen är i läge.', en: 'The outdoor seating is open.' },
    outdoorClosed: { sv: 'Uteserveringen är stängd i kväll.', en: 'The outdoor seating is closed tonight.' },
    waitingSingular: {
      sv: 'En person står redan utanför dörren.',
      en: 'One person is already standing outside the door.'
    },
    waitingPlural: {
      sv: (n: number) => `${n} personer står redan utanför dörren.`,
      en: (n: number) => `${n} ${pl(n, 'person', 'people')} are already standing outside the door.`
    },
    waitingNone: { sv: 'Ingen står utanför ännu.', en: 'No one is outside yet.' },
    countdownPrefix: { sv: 'Dörrarna öppnar om', en: 'The doors open in' },
    countdownSecondsSuffix: { sv: 's', en: 's' }
  },
  // ORDER 109 — M7b bankmötet. Player-visible text på engelska per
  // CLAUDE.md Observation 6 (2026-08-09); paviljongnamn på svenska per
  // samma regel (platsnamn behålls). {pavilion} substitueras vid render
  // med `bank.pavilionNames[outcome.pointedPavilion]`. Interna
  // outcome-nycklar från businessProfile.ts/bankMeeting.ts får inte
  // förekomma i den här filen — DoD 6 grep-testet skannar hela filen.
  bank: {
    grantRestaurant: {
      sv: 'Your judgement carries the room. We are funding the full house.',
      en: 'Your judgement carries the room. We are funding the full house.'
    },
    grantFoodtruck: {
      sv: 'You have the hands. Start smaller and grow into it.',
      en: 'You have the hands. Start smaller and grow into it.'
    },
    grantWide: {
      sv: 'A broad competence. We back a starting position.',
      en: 'A broad competence. We back a starting position.'
    },
    rejectPractice: {
      sv: 'We cannot see enough to fund. Practise at {pavilion} and come back.',
      en: 'We cannot see enough to fund. Practise at {pavilion} and come back.'
    },
    rejectField: {
      sv: 'You have read the field but never lived it. Come back once you have worked at {pavilion}.',
      en: 'You have read the field but never lived it. Come back once you have worked at {pavilion}.'
    },
    pavilionNames: {
      maltidbiblioteket: { sv: 'Måltidbiblioteket', en: 'Måltidsbiblioteket' },
      kalastorget: { sv: 'Kalastorget', en: 'Kalastorget' },
      stensota: { sv: 'Stensöta', en: 'Stensöta' },
      metodkoket: { sv: 'Metodköket', en: 'Metodköket' },
      gastronomiskateatern: { sv: 'Gastronomiska Teatern', en: 'Gastronomiska Teatern' }
    }
  },
  // ORDER 110 — R4 verksamhetsklassen som spelartext. Interna nycklar
  // (`restaurant`, `foodtruck`, `värdshus`) hålls samma här som i koden;
  // spelartexten är utpekad. Bankmötets intern-nyckel för den fjärde
  // klassen mappas till `'gästgiveriet'` innan spelartexten läses — den
  // förbjudna nyckeln får aldrig läcka hit (grep-test i ORDER 109 §5).
  businessClass: {
    // ORDER 140 — nycklarna följer BusinessClass i bestämd form
    // (Vision Owner-beslut 2026-08-30 §1 per ORDER 139). "Kvarterskrogen"
    // ersätter tidigare "Restaurang", "Foodtrucken" är den bestämda
    // formen av spelarens vagn, "Gästgiveriet" ersätter "Värdshuset".
    kvarterskrogen: { sv: 'Kvarterskrogen', en: 'The Restaurant' },
    foodtrucken: { sv: 'Foodtrucken', en: 'The Food Truck' },
    gästgiveriet: { sv: 'Gästgiveriet', en: 'The Inn' },
    // ORDER 125 §3 — Ölkrogen. Spelartext med versal första bokstav,
    // matchar övriga.
    ölkrogen: { sv: 'Ölkrogen', en: 'The Brewpub' },
    // ORDER 166 — vinbaren blir spelartext för klass-nyckeln som
    // tillkommer när COMPETITORS bär `businessClass: 'vinbaren'` i data.
    // Ingen scen är monterad än (WineBarScene är egen order).
    vinbaren: { sv: 'Vinbaren', en: 'The Wine Bar' }
  },
  // Vision Owner efter speltest: "inga engelska paneler". Paneltexter som
  // tidigare stod på engelska direkt i komponenterna.
  panels: {
    // Satsningskortens tre effektchips (ekonomiskt, socialt, ekologiskt).
    activityEffects: {
      panelAria: { sv: 'Morgonens satsningar', en: 'The morning’s initiatives' },
      aria: { sv: 'Effekt på de tre kapitalen', en: 'Effect on the three capitals' },
      econ: { sv: 'Ekon', en: 'Econ' },
      soc: { sv: 'Soc', en: 'Soc' },
      ecol: { sv: 'Ekol', en: 'Ecol' }
    },
    menu: {
      aria: { sv: 'Meny och inköp', en: 'Menu and purchasing' },
      menuHeading: { sv: 'Kvällens meny', en: 'Tonight’s menu' },
      ingredientCost: {
        sv: (sek: string) => `råvarukostnad ≈ ${sek} kr`,
        en: (sek: string) => `ingredient cost ≈ ${sek} SEK`
      },
      priceAria: {
        sv: (dish: string) => `Pris för ${dish} i kronor`,
        en: (dish: string) => `Price for ${dish} in SEK`
      },
      confirmAria: { sv: 'Fastställ dagens meny', en: "Set today's menu" },
      confirm: {
        sv: (n: number) => `Fastställ menyn (${n} ${n === 1 ? 'rätt' : 'rätter'})`,
        en: (n: number) => `Set the menu (${n} ${n === 1 ? 'dish' : 'dishes'})`
      },
      stockHeading: { sv: 'Inköp', en: 'Purchasing' },
      supplierAria: { sv: 'Leverantör', en: 'Supplier' },
      ingredientAria: { sv: 'Råvara', en: 'Ingredient' },
      offer: {
        sv: (sek: string, reliabilityPct: string) => `${sek} kr · leveranssäkerhet ${reliabilityPct} %`,
        en: (sek: string, reliabilityPct: string) => `${sek} SEK · delivery reliability ${reliabilityPct}%`
      },
      unitsAria: { sv: 'Antal att köpa', en: 'Quantity to buy' },
      buyAria: { sv: 'Bekräfta inköpet', en: 'Confirm the purchase' },
      buy: { sv: 'Köp', en: 'Buy' }
    },
    prep: {
      heading: { sv: 'Mise en place', en: 'Mise en place' },
      items: {
        sv: {
            ice: 'is',
            napkins: 'servetter',
            cutlery: 'bestick',
            stations: 'stationer',
            garnish: 'garnityr'
          } as Record<string, string>,
        en: {
            ice: 'ice',
            napkins: 'napkins',
            cutlery: 'cutlery',
            stations: 'stations',
            garnish: 'garnish'
          } as Record<string, string>
      },
      stations: {
        sv: {
            bar: 'baren',
            floor: 'matsalen',
            kitchen: 'köket',
            pass: 'passet'
          } as Record<string, string>,
        en: {
            bar: 'the bar',
            floor: 'the dining room',
            kitchen: 'the kitchen',
            pass: 'the pass'
          } as Record<string, string>
      },
      doorsOpen: { sv: 'Dörrarna öppnas, servicen börjar.', en: 'Doors open. Service begins.' },
      doorsOpenReady: { sv: 'Dörrarna öppnas, salen är redo.', en: 'Doors open. The room is ready.' },
      doorsOpenThin: {
        sv: (station: string, item: string) => `Dörrarna öppnas, men ${station} ligger efter (${item}).`,
        en: (station: string, item: string) => `Doors open, but ${station} is behind (${item}).`
      }
    },
    evening: {
      heading: { sv: 'Kvällens avräkning', en: "The evening's account" },
      figuresHeading: { sv: 'Dagens siffror', en: "Today's figures" },
      ledgerHeading: { sv: 'Dagens kassabok', en: "Today's ledger" },
      revenue: { sv: 'Intäkter', en: 'Revenue' },
      costs: { sv: 'Kostnader', en: 'Costs' },
      result: { sv: 'Resultat', en: 'Result' },
      reputation: { sv: 'Rykte', en: 'Reputation' },
      knowledge: { sv: 'Kunskap', en: 'Knowledge' },
      newRound: { sv: 'Ny omgång', en: 'New round' },
      newRoundAria: { sv: 'Starta en ny omgång från dag 1', en: 'Start a new round from day 1' },
      nothingToRecord: { sv: 'Inget att bokföra i dag.', en: 'Nothing to record today.' },
      entriesAria: { sv: 'Dagens poster', en: "Today's entries" },
      currency: { sv: 'kr', en: 'SEK' },
      entryAria: {
        sv: (cause: string, amount: string, running: string) =>
          `${cause}: ${amount} kr, kassa ${running} kr`,
        en: (cause: string, amount: string, running: string) =>
          `${cause}: ${amount} SEK, cash ${running} SEK`
      },
      // Kort kategorietikett i kassabokens första kolumn.
      category: {
        revenue: { sv: 'Intäkt', en: 'Rev.' },
        wage: { sv: 'Lön', en: 'Wage' },
        agency: { sv: 'Hyrp.', en: 'Agency' },
        ingredient: { sv: 'Råv.', en: 'Ingr.' },
        interest: { sv: 'Ränta', en: 'Int.' },
        scenario: { sv: 'Händ.', en: 'Incid.' },
        buyout: { sv: 'Avg.', en: 'Fee' },
        stock: { sv: 'Inköp', en: 'Stock' },
        waste: { sv: 'Svinn', en: 'Waste' },
        bet: { sv: 'Insats', en: 'Stake' },
        floor: { sv: 'Golv', en: 'Floor' },
        amortisation: { sv: 'Amort.', en: 'Repay.' },
        rent: { sv: 'Hyra', en: 'Rent' },
        other: { sv: '—', en: '—' }
      }
    },
    cash: {
      label: { sv: 'Kassa', en: 'Cash' },
      pillAria: { sv: 'Kassa', en: 'Cash' },
      pillTitle: {
        sv: (amount: string) => `Klicka för att öppna verksamhetens konto — kassa ${amount}`,
        en: (amount: string) => `Click to open the business account — cash ${amount}`
      },
      accountAria: { sv: 'Verksamhetens konto', en: 'Business account' },
      heading: { sv: 'Kassa', en: 'Cash' },
      valuation: { sv: 'värdering', en: 'valuation' },
      thousands: { sv: (k: string) => `${k} tkr`, en: (k: string) => `SEK ${k}k` }
    },
    platesRemaining: {
      heading: { sv: 'Portioner kvar', en: 'Portions left' },
      out: { sv: 'SLUT', en: 'OUT' }
    },
    verifyBadge: {
      sv: 'GRÅSKISS — © OpenStreetMap-bidragsgivare (ODbL) · byggnadshöjder och material stiliserade',
      en: 'GREY SKETCH — © OpenStreetMap contributors (ODbL) · building heights and materials stylised'
    }
  },
  // ORDER 271 — Designs paket 6 (servicen som raketer): raketkortet R1–R3,
  // mätarna, kvällens lärdom L1, kvällsberättelsen K1 och rutan X1.
  rocket: {
    card: {
      rocketOf: {
        sv: (n: string, total: string) => `Raket ${n} av ${total}`,
        en: (n: string, total: string) => `Rocket ${n} of ${total}`
      },
      // ORDER 289 — följdraketer och egna raketer står utanför räkningen.
      followUp: { sv: 'Följd', en: 'Follow-up' },
      backOf: { sv: (n: number, max: number) => `Egen raket ${n} av ${max}`, en: (n: number, max: number) => `Your rocket ${n} of ${max}` },
      table: { sv: (n: string) => `Bord ${n}`, en: (n: string) => `Table ${n}` },
      room: { sv: 'Rummet', en: 'The room' },
      stepCleared: { sv: (ask: string) => `${ask} · klar ✓`, en: (ask: string) => `${ask} · done ✓` },
      stepCurrent: {
        sv: (ask: string, sec: string) => `${ask} · ${sec} s · pågår`,
        en: (ask: string, sec: string) => `${ask} · ${sec} s · now`
      },
      stepNext: { sv: (sec: string) => `Nästa · ${sec} s`, en: (sec: string) => `Next · ${sec} s` },
      stepAhead: {
        sv: (ask: string, sec: string) => `${ask} · ${sec} s`,
        en: (ask: string, sec: string) => `${ask} · ${sec} s`
      },
      stepFailed: { sv: (ask: string) => `${ask} · fel`, en: (ask: string) => `${ask} · wrong` },
      stepUnreached: { sv: 'Nås inte', en: 'Locked' },
      stepAsks: {
        sv: { episteme: 'Vad', techne: 'Hur', phronesis: 'När och varför' } as Record<string, string>,
        en: { episteme: 'What', techne: 'How', phronesis: 'When and why' } as Record<string, string>
      },
      right: { sv: (next: string) => `Rätt · vidare till ${next}`, en: (next: string) => `Right · on to ${next}` },
      rightDone: { sv: 'Rätt · raketen klar', en: 'Right · rocket complete' },
      // ORDER 276 — raketerna styr gästflödet.
      guestsIn: {
        sv: (n: number) => (n === 1 ? 'En gäst till kommer in.' : `${n} ${pl(n, 'gäst', 'gäster')} till kommer in.`),
        en: (n: number) => (n === 1 ? 'One more guest comes in.' : `${n} more guests come in.`)
      },
      wrong: { sv: (role: string) => `Fel · ${role} tar över`, en: (role: string) => `Wrong · ${role} takes over` },
      correctTag: { sv: 'Rätt', en: 'Right' },
      yourTag: { sv: 'Ditt svar', en: 'Your answer' },
      footer: {
        sv: 'Rummet väntar inte. Går tiden ut räknas det som fel svar.',
        en: 'The room won’t wait. Running out of time counts as a wrong answer.'
      },
      secondsLeft: { sv: (sec: string) => `${sec} sekunder kvar`, en: (sec: string) => `${sec} seconds left` },
      takeover: { sv: (role: string) => `${role} tar över`, en: (role: string) => `${role} takes over` },
      outOfTime: {
        sv: (role: string) => `Tiden gick ut · ${role} tar över`,
        en: (role: string) => `Out of time · ${role} takes over`
      },
      keys: { sv: 'Välj med 1–4', en: 'Choose with 1–4' }
    },
    meters: {
      cash: { sv: 'Kassa', en: 'Takings' },
      guests: { sv: 'Gästerna', en: 'Guests' },
      staff: { sv: 'Personalen', en: 'Staff' },
      note: { sv: 'Tio steg per mätare. Riktning, inte belopp.', en: 'Ten steps per meter. Direction, not amounts.' },
      delta: {
        sv: (name: string, sign: string, n: string) => `${name} ${sign}${n}`,
        en: (name: string, sign: string, n: string) => `${name} ${sign}${n}`
      },
      sentence: { sv: (parts: string) => `${parts}.`, en: (parts: string) => `${parts}.` },
      nothing: { sv: 'Mätarna står still.', en: 'The meters stand still.' }
    },
    lesson: {
      label: {
        sv: (weekday: string, hour: string) => `${weekday} · Stängt ${hour}.00 · kvällens lärdom`,
        en: (weekday: string, hour: string) => `${weekday} · Closed ${hour}:00 · tonight’s lesson`
      },
      wentWrong: {
        sv: (clock: string, step: string, ask: string) => `Det som gick fel · ${clock} · ${step}, ${ask}`,
        en: (clock: string, step: string, ask: string) => `What went wrong · ${clock} · ${step}, ${ask}`
      },
      also: {
        sv: (clock: string, step: string, ask: string) => `Också · ${clock} · ${step}, ${ask}`,
        en: (clock: string, step: string, ask: string) => `Also · ${clock} · ${step}, ${ask}`
      },
      question: { sv: (q: string) => `Frågan: ${q}`, en: (q: string) => `The question: ${q}` },
      youChose: { sv: (label: string) => `Du valde: ${label}.`, en: (label: string) => `You chose: ${label}.` },
      staffDecided: {
        sv: 'Du svarade inte i tid, och personalen beslutade själv.',
        en: 'You did not answer in time, and the staff decided for themselves.'
      },
      right: { sv: (label: string) => `Rätt var: ${label}.`, en: (label: string) => `The right answer was: ${label}.` },
      noneTitle: { sv: 'Varje raket höll', en: 'Every rocket held' },
      gridRocket: { sv: 'Raket', en: 'Rocket' },
      legendCleared: { sv: '✓ klarat', en: '✓ passed' },
      legendFailed: { sv: '✗ fel, personalen tog över', en: '✗ wrong, staff took over' },
      legendUnreached: { sv: '— nåddes inte', en: '— not reached' },
      cellCleared: { sv: 'klarat', en: 'passed' },
      cellFailed: { sv: 'fel, personalen tog över', en: 'wrong, staff took over' },
      cellUnreached: { sv: 'nåddes inte', en: 'not reached' },
      summary: {
        sv: (n: string, total: string) => `${n} av ${total} steg klarade i kväll.`,
        en: (n: string, total: string) => `${n} of ${total} ${pl(total, 'step', 'steps')} cleared tonight.`
      },
      practice: {
        sv: (pavilion: string) => `Öva i ${pavilion} i morgon`,
        en: (pavilion: string) => `Practise in ${pavilion} tomorrow`
      },
      toStory: { sv: 'Till kvällsberättelsen', en: 'Tonight’s story' }
    },
    story: {
      label: {
        sv: (weekday: string, hour: string) => `${weekday} kväll · Stängt ${hour}.00`,
        en: (weekday: string, hour: string) => `${weekday} evening · Closed ${hour}:00`
      },
      title: {
        sv: (weekday: string, business: string) => `${weekday} i ${business}`,
        en: (weekday: string, business: string) => `${weekday} at ${business}`
      },
      weekdayDefinite: {
        sv: { mon: 'Måndagen', tue: 'Tisdagen', wed: 'Onsdagen', thu: 'Torsdagen', fri: 'Fredagen', sat: 'Lördagen', sun: 'Söndagen' } as Record<string, string>,
        en: { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' } as Record<string, string>
      },
      evening: { sv: 'Kvällen', en: 'The evening' },
      wentWell: { sv: 'Det som gick bra', en: 'What went well' },
      wentWrong: { sv: 'Det som gick fel', en: 'What went wrong' },
      cause: { sv: (why: string) => `Orsak: ${why}`, en: (why: string) => `Cause: ${why}` },
      noCause: {
        sv: 'Orsak: inget svar i tid, och personalen fick besluta själv.',
        en: 'Cause: no answer in time, and the staff had to decide for themselves.'
      },
      nothingWell: { sv: 'Ingen raket höll hela vägen i kväll.', en: 'No rocket held all the way tonight.' },
      nothingWrong: { sv: 'Inget gick fel i kväll.', en: 'Nothing went wrong tonight.' },
      back: { sv: 'Tillbaka till lärdomen', en: 'Back to the lesson' }
    },
    stranded: {
      label: { sv: 'Ingen verksamhet · ingen kassa', en: 'No business · no cash' },
      medals: {
        sv: 'Dina medaljer finns kvar. Det du har lärt dig tas aldrig ifrån dig.',
        en: 'Your medals stay. What you have learned is never taken from you.'
      },
      cashShort: { sv: 'Kassan räcker inte till en ny insats.', en: 'Your cash won’t cover a new stake.' },
      toHouse: { sv: 'Gå till Måltidens hus', en: 'Go to the House of the Meal' },
      title: { sv: 'Banken lånar inte ut i dag.', en: 'The bank won’t lend today.' }
    }
  },
  menu: {
    button: { sv: 'Meny', en: 'Menu' },
    firstPerson: { sv: 'Förstapersonsprototypen', en: 'First-person prototype' },
    language: { sv: 'Språk', en: 'Language' },
    english: { sv: 'English', en: 'English' },
    swedish: { sv: 'Svenska', en: 'Svenska' }
  }
};

// En tabell med { sv, en }-löv → samma tabell med ett språks värden.
export type ForLang<T> = T extends { sv: infer A; en: infer B } ? A | B : { readonly [K in keyof T]: ForLang<T[K]> };

export type GameStrings = ForLang<typeof TABLE>;

function isLeaf(v: unknown): v is Entry {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  return keys.length === 2 && 'sv' in v && 'en' in v;
}

// Bygger tabellen för ett språk.
export function pickLang<T>(table: T, lang: Lang): ForLang<T> {
  const walk = (node: unknown): unknown => {
    if (isLeaf(node)) return (node as Record<Lang, unknown>)[lang];
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = walk(v);
    return out;
  };
  return walk(table) as ForLang<T>;
}
