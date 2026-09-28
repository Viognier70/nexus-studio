// ORDER 273 — the game's strings in English (Vision Owner 2026-09-28: everything
// in the game is in English). Same shape as `strings.sv.ts`, which is kept for a
// Swedish version later. Place and building names stay in Swedish.
import type { strings as Sv } from './strings.sv';

// `strings.sv.ts` is `as const`, so `typeof Sv` carries the Swedish literals.
// Widen every string literal to `string` while keeping keys, tuple lengths
// and function signatures, so TypeScript still requires every key.
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends object
      ? { readonly [K in keyof T]: Widen<T[K]> }
      : T;

export const strings: Widen<typeof Sv> = {
  title: 'NEXUS',
  subtitle: 'Grythyttan — The Origin',
  busText:
    'Everyone comes here with dreams.\nNo one knows yet who they will become.',
  npc: {
    prompt: 'Are you here for admissions too?',
    choices: {
      A: "Yes. I just don't really know what I could become.",
      B: "Yes. I've dreamt of working with gastronomy.",
      C: "I'm mostly curious why this place means so much."
    },
    responses: {
      A: 'More people say that than you think. Maybe that is exactly why we came here.',
      B: 'Many paths lead into gastronomy. First, see what the place does to you.',
      C: 'It shows. Pay attention today — Grythyttan tends to answer those who ask.'
    }
  },
  objective: 'Find registration at the Sevilla Pavilion.',
  end: {
    heading: 'Your initiation begins here.',
    continueButton: 'Explore further',
    restartButton: 'Start again'
  },
  pause: {
    title: 'Pause',
    resume: 'Continue',
    restart: 'Start again',
    muteOn: 'Sound on',
    muteOff: 'Sound off',
    controlsHeading: 'Controls',
    aboutHeading: 'About this prototype',
    disclaimer:
      'Vertical slice 001. All places, buildings and people in this prototype are stylised placeholders. No claim is made to architectural accuracy or rights. Grythyttan and the Sevilla Pavilion are real places, used here purely as narrative inspiration.'
  },
  controls: {
    desktop: [
      'W A S D or arrows — walk',
      'Mouse — look around',
      'Shift — walk faster',
      'E — interact',
      'Esc — pause'
    ],
    mobile: [
      'Left joystick — walk',
      'Drag on the screen — look around',
      'Button — interact'
    ]
  },
  prompts: {
    talkTo: 'Talk',
    register: 'Register'
  },
  hud: {
    muteAria: 'Mute sound',
    unmuteAria: 'Unmute sound',
    pauseLabel: 'Pause',
    soundLabel: 'Sound',
    beginPlay: 'Continue'
  },
  webglFallback: {
    title: 'The graphics cannot be shown',
    body: 'Your browser or device does not support WebGL. The prototype needs hardware-accelerated 3D graphics.',
    quote:
      'Everyone comes here with dreams. No one knows yet who they will become.',
    restart: 'Try again'
  },
  business: {
    firstRunHeading: 'Your business',
    firstRunBody:
      "You own a restaurant in Grythyttan's historic centre. What is it called?",
    firstRunPlaceholder: 'Name of the restaurant',
    firstRunSubmit: 'Open the business',
    firstRunHint: 'You cannot change the name later.',
    labelPrefix: 'Restaurant'
  },
  // ORDER 267 (Nexus v1 stage 5) — the Sunday paper (sim/newspaper.ts).
  newspaper: {
    masthead: 'The Sunday Edition',
    subhead: (week: number) => `The Grythyttan local paper · week ${week}`,
    open: 'The Sunday Edition',
    close: 'Put the paper down',
    reviewHeading: 'The review',
    marketHeading: 'The market',
    bankHeading: 'The bank',
    holidayHeading: 'What is coming',
    reviewTitleGood: (weekday: string, name: string) => `A ${weekday} evening at ${name}`,
    reviewTitleBad: (weekday: string, name: string) => `A ${weekday} evening at ${name} that did not hold`,
    reviewFull: 'It was full, and the queue wound out towards the square.',
    reviewGaveUp: 'Some grew tired of the queue and left before they got a seat.',
    reviewSparse: 'The room was sparse, and you could feel it in the mood.',
    reviewSteady: 'The room filled at a steady pace.',
    reviewUp: 'Those who were there spoke well of the evening afterwards.',
    reviewDown: 'The reputation took a knock.',
    reviewFlat: 'The evening went the way evenings do, and no one talked about it afterwards.',
    noEvenings: (name: string) => `${name} was closed all week. The paper has no evening to review.`,
    market: {
      full: (cls: string) => `${cls} took almost every guest the market gave it this week.`,
      most: (cls: string) => `${cls} got most of the guests it could get this week.`,
      half: (cls: string) => `${cls} got about half of the guests it could get this week.`,
      few: (cls: string) => `${cls} got few of the guests it could get this week.`
    },
    marketNoBusiness: 'You had no business this week, and no guests to count.',
    bankNext: (missing: string) => `The bank on the next step: ${missing.charAt(0).toLowerCase()}${missing.slice(1)}`,
    holidayNextWeek: (name: string) => `${name} next week.`,
    holidayInWeeks: (name: string, weeks: string) => `${name} in ${weeks} weeks.`,
    holidayNone: 'No holiday before the end of the season.',
    weekdaysLower: {
      mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
    }
  },
  // ORDER 267 (Nexus v1 stage 5) — the start box, the mentor in the
  // introduction and the name of the first business.
  introduction: {
    startHeading: 'Nexus',
    startSubtitle: 'Grythyttan',
    newGame: 'New game',
    mentor: 'The mentor',
    steps: {
      practice:
        "Welcome to Grythyttan. I'm from Campus and I'll be with you today. The bank won't lend you anything until it has seen what you can do, so we start by practising. Open Måltidens hus and practise in Stensöta, where the sommeliers are. Nothing is at stake.",
      exam:
        "Good. Now the exam in the same pavilion: eight questions, and six right gives bronze. With bronze in Stensöta the bank can lend you enough for a wine bar. If it doesn't work, try again. Today the visits don't take a place in the schedule.",
      bank: "Bronze. Go to the Bank in the morning row. There you'll hear what you have shown and what you can borrow for."
    },
    farewell:
      "Now it's yours. Tonight you open for the first time. This week fewer guests than usual will come, so you have time to learn the room. I'm at Campus if things go badly.",
    farewellClose: 'Thank you',
    classesIndefinite: {
      vinbar: 'a wine bar',
      foodtruck: 'a food truck',
      restaurang: 'a restaurant',
      olkrog: 'a brewpub',
      gastgiveri: 'an inn',
      nattklubb: 'a nightclub'
    },
    chooseFirst: (cls: string) => `Open ${cls}`,
    nameBody: (cls: string) => `The bank will lend you enough for ${cls} by the square. What should it be called?`,
    namePlaceholder: 'Name of the business',
    endContinue: 'Continue'
  },
  day: {
    // ORDER 043 v3 §2 — day-period player-facing text. Cycle-1 scope:
    // morning + afternoon are the two picker phases; lunch/dinner/
    // evening are running or transitional.
    morning: {
      heading: 'Morning',
      body: 'Open for lunch or skip it.',
      openLunch: 'Open for lunch',
      skipLunch: 'Skip lunch'
    },
    afternoon: {
      heading: 'Afternoon',
      body: 'Open for dinner.',
      openDinner: 'Open for dinner'
    },
    minutesSuffix: 'min'
  },
  // ORDER 263 (Nexus v1 stage 1) — time and saving.
  calendar: {
    weekdays: {
      mon: 'Monday',
      tue: 'Tuesday',
      wed: 'Wednesday',
      thu: 'Thursday',
      fri: 'Friday',
      sat: 'Saturday',
      sun: 'Sunday'
    },
    weekdaysShort: {
      mon: 'Mon',
      tue: 'Tue',
      wed: 'Wed',
      thu: 'Thu',
      fri: 'Fri',
      sat: 'Sat',
      sun: 'Sun'
    },
    week: (week: number, weeks: number) => `Week ${week} of ${weeks}`,
    weekShort: (week: number) => `wk ${week}`,
    season: (season: number) => `Season ${season}`,
    holidays: {
      midsommar: 'Midsummer',
      grythyttedagarna: 'Grythyttan Days',
      vinprovning: 'Wine tasting in Stensöta',
      kraftskiva: 'Crayfish party'
    },
    holidayToday: (name: string) => `${name} today`,
    holidayThisWeek: (name: string) => `${name} this week`,
    phases: {
      morning: 'Morning',
      service: 'Service',
      evening: 'Evening'
    },
    closed: 'Closed'
  },
  morning: {
    heading: 'Morning',
    serviceDayBody: "Fill today's schedule and open for the evening.",
    sundayBody: 'Sunday. The restaurant is closed, and you have four places in the schedule.',
    slots: (used: number, total: number) => `Schedule: ${used} of ${total} places`,
    startService: 'Open for the evening',
    closeSunday: 'End Sunday',
    closeDay: 'End the day without service',
    activitiesHeading: "Today's ventures",
    weekly: 'once a week'
  },
  // ORDER 264 (Nexus v1 stage 2) — Måltidens hus, exams and evening quiz.
  knowledge: {
    houseButton: 'Måltidens hus',
    houseHeading: 'Måltidens hus',
    houseBody: "A visit takes one place in today's schedule. Practise for credits, or take an exam for the next medal.",
    close: 'Close',
    pavilions: {
      maltidbiblioteket: 'Måltidsbiblioteket',
      kalastorget: 'Kalastorget',
      stensota: 'Stensöta',
      metodkoket: 'Metodköket',
      gastronomiskateatern: 'Gastronomiska Teatern'
    },
    axes: {
      episteme: 'episteme',
      techne: 'techne',
      phronesis: 'phronesis'
    },
    medals: {
      brons: 'bronze',
      silver: 'silver',
      guld: 'gold',
      platina: 'platinum'
    },
    noMedal: 'No medal yet',
    medalLine: (medal: string) => `Medal: ${medal}`,
    medalsHeading: 'Medals',
    noMedalsYet: 'No medals yet',
    practice: 'Practise',
    exam: (level: string) => `Exam: ${level}`,
    examDone: 'Platinum is taken',
    theatreLocked: 'Opens when you have silver in two pavilions',
    noSlotsLeft: "Today's schedule is full",
    askers: {
      kock: 'The chef',
      sommelier: 'The sommelier',
      gäst: 'The guest',
      värd: 'The host',
      servitör: 'The waiter',
      lärling: 'The apprentice'
    },
    questionOf: (n: number, total: number) => `Question ${n} of ${total}`,
    right: 'Right.',
    wrong: 'Not quite.',
    // ORDER 270 — the timed exam and the reference with the explanation.
    timedOut: 'Time ran out. It counts as wrong.',
    secondsLeft: (sec: string) => `${sec} s`,
    referenceLabel: 'Read more:',
    next: 'Next',
    seeResult: 'See the result',
    practiceResult: (correct: number, total: number) => `${correct} of ${total} right. Each right answer gave one credit.`,
    examPassed: (medal: string, pavilion: string, correct: number, total: number) =>
      `${correct} of ${total} right. You have taken ${medal} in ${pavilion}.`,
    examFailed: (correct: number, total: number, need: number) =>
      `${correct} of ${total} right. You need ${need}. A new exam draws new questions.`,
    back: 'Back',
    placeholderNote: 'The questions at this level are temporary until the real ones are written.'
  },
  // ORDER 270 — the evening's lesson replaces the quiz after service.
  lesson: {
    heading: "Tonight's lesson",
    eveningHeading: 'The evening',
    intro: 'This is what went wrong tonight, and why.',
    none: 'No wrong decisions tonight. Every rocket held all the way.',
    noIncidents: 'The evening had no incidents to learn from.',
    // ORDER 270 — the rocket fell on a step.
    fellOn: (step: string, question: string) => `${step}: ${question}`,
    youChose: (label: string) => `You chose: ${label}`,
    staffDecided: (outcome: string) => `You did not answer, and the staff decided for themselves. ${outcome}`,
    better: (label: string) => `Better: ${label}`,
    nextMorning: 'On to the next morning'
  },
  // ORDER 271 — the screens in package 1 (mentor M1/M2, the morning
  // schedule S1/S2, the bank B0/B1, the paper T1, Måltidens hus O1/O2/MD1/MD2).
  screens: {
    mentor: {
      label: 'The mentor · from Campus',
      campus: 'Campus',
      stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
      skip: "I'll manage — skip the guide",
      understood: 'Understood',
      service:
        'Now you open. When something happens in the room, a card comes up: what, how and when, one step at a time and against the clock. If you do not answer, the staff take over. The meters show the cash, the guests and the staff, as direction, not as amounts.'
    },
    morning: {
      label: (weekday: string, week: number, weeks: number) => `${weekday} morning · week ${week} of ${weeks}`,
      heading: 'What will you do today?',
      sundayHeading: 'Sunday. Four places, a long day.',
      slot: (n: number) => `Place ${n}`,
      slotPavilion: 'Pavilion',
      slotActivity: 'Venture',
      slotEmpty: 'Choose a venture or a pavilion',
      newspaperArrived: 'The Sunday paper has arrived',
      newspaperBody: 'The review, the market, the bank and what is coming.',
      activities: 'Ventures',
      pavilions: 'Pavilions in Måltidens hus',
      picked: 'Chosen',
      aside: 'The room and the staff',
      backToSchedule: 'Back to the schedule'
    },
    bank: {
      speaker: 'The bank',
      diagnosis: "The bank's diagnosis",
      seen: 'What the bank sees',
      none: 'none yet',
      startLoan: 'Start-up loan',
      queue: 'A queue instead of seats.',
      seats: (n: number) => `${n} seats.`,
      // Game design > The business classes, the Traits column.
      traits: {
        vinbar: 'Small plates, lounges, DJ, wine list.',
        foodtruck: 'Hatch onto the street, queue, weather, street location, fast turnover.',
        restaurang: 'Dining room and bar, mise en place, several courses.',
        olkrog: 'Brewery on site, hearty food, few dishes.',
        gastgiveri: 'Overnight stays, breakfast, soignée service, a round-the-clock rhythm.',
        nattklubb: 'Several bars, dancing, volume and flow, late nights.'
      },
      firstLabel: (weekday: string) => `${weekday} · day 1 · the bank`,
      firstHeading: 'First meeting with the bank',
      firstOpening: 'The mentor said you took the exam today. Let me see.',
      firstVerdict: {
        vinbar: 'It is enough for a room with tables. The bank will risk the wine bar.',
        foodtruck: 'It is enough to start, but not for a room with tables.',
        restaurang: 'It is enough to start.',
        olkrog: 'It is enough for a room with tables. The bank will risk the brewpub.',
        gastgiveri: 'It is enough to start.',
        nattklubb: 'It is enough to start.'
      },
      firstNoteVinbar: 'The exception only applies on the first day. After that, the medals decide, as for everyone.',
      firstNoteLater: 'The bank looks at it at every weekly settlement.',
      heading: 'Talking to the bank',
      canChange: 'Can switch to now',
      missing: 'What is missing',
      stay: (cls: string) => `Stay with ${cls}`
    },
    newspaper: {
      toBank: 'To the bank'
    },
    house: {
      medals: 'The medals',
      today: (level: string) => `${level} today`,
      practiceLabel: 'Practice · no medal at stake',
      yourAnswer: 'Your answer',
      practiceHeading: 'Practice is done',
      examHeading: 'The exam is done',
      practiceDone: 'Well practised.',
      practiceCredits: 'Each right answer gave one credit.',
      passed: (level: string, pavilion: string) => `Passed. ${level} in ${pavilion}.`,
      almost: 'Almost.',
      waited: (n: number, word: string) => `${word} ${n === 1 ? 'question had' : 'questions had'} to wait.`,
      need: (need: string, total: string) => `You need ${need} right out of ${total}. A new exam draws new questions.`,
      boxesAria: (correct: number, total: number) => `${correct} of ${total} right`,
      toMedals: 'To the medals',
      newMedal: 'New medal',
      medalTitle: (level: string, pavilion: string) => `${level} in ${pavilion}`,
      medalCaption: (level: string, pavilion: string) => `${level} · ${pavilion}`,
      continue: 'Continue'
    }
  },
  // ORDER 265 (Nexus v1 stage 3) — the economy and the bank.
  economy: {
    ledger: {
      interest: 'Interest on the loan',
      floor: 'The floor topped up the week',
      amortisation: 'Repayment on the loan',
      sale: 'Premises sold to the bank',
      deposit: 'Cash deposit for the new premises'
    },
    classes: {
      vinbar: 'Wine bar',
      foodtruck: 'Food truck',
      restaurang: 'Restaurant',
      olkrog: 'Brewpub',
      gastgiveri: 'Inn',
      nattklubb: 'Nightclub'
    },
    classesDefinite: {
      vinbar: 'the wine bar',
      foodtruck: 'the food truck',
      restaurang: 'the restaurant',
      olkrog: 'the brewpub',
      gastgiveri: 'the inn',
      nattklubb: 'the nightclub'
    },
    warnings: {
      first: 'Tonight your cash is below what the bank lends against your floor. If it stays there three evenings in a row, the bank takes the premises at the weekly settlement.',
      second: 'Second evening in a row below what the bank lends against. One more evening, and the bank takes the premises at Sunday\'s settlement.',
      downgrade: 'Third evening in a row below what the bank lends against. At Sunday\'s settlement the business goes down one class. What you know comes with you.'
    },
    noBusinessBody: 'You have no business right now. Practise and take exams in Måltidens hus, then go to the bank.',
    // ORDER 270 — the box in the middle of the screen with no business and no money.
    stranded: {
      heading: 'You are without a business',
      body: 'The business is gone, but what you know is still there. The bank will lend again once you have shown what you can do: a whole week in Måltidens hus with at least one exam.',
      readyBody: 'You have shown what you can do. The bank is ready to try a new loan.',
      progress: (days: number, of: number, exams: number, need: number) =>
        `Day ${days} of ${of} in Måltidens hus · ${exams} of ${need} ${need === 1 ? 'exam' : 'exams'}`,
      toHouse: 'To Måltidens hus',
      toBank: 'To the bank'
    },
    bankButton: 'The bank',
    bankHeading: 'The bank',
    bankCurrent: (name: string) => `You run ${name}.`,
    bankNone: 'You have no business.',
    bankNoLoan: 'The bank gives no loan without a medal. Go and practise.',
    shown: (topics: string) => `You have shown that you know ${topics}.`,
    shownNothing: 'You have not shown anything in Måltidens hus yet.',
    missing: (cls: string, req: string) => `For ${cls}, you still need ${req}.`,
    reqLevelIn: (level: string, count: string) => `${level} in ${count}`,
    reqIncluding: (names: string) => `, including ${names}`,
    cashShort: (cls: string) => `There is not enough cash for the deposit for ${cls}.`,
    bankWait: 'The bank will lend again once you have spent a whole week in Måltidens hus and taken at least one exam.',
    upgradeOnly: 'Only reached by growing from another business.',
    choose: (cls: string) => `Switch to ${cls.toLowerCase()}`,
    current: 'Your business',
    onlySunday: 'Changing business happens on Sunday, at the weekly settlement.',
    topics: {
      maltidbiblioteket: 'the history and concepts of the meal',
      metodkoket: 'the kitchen',
      stensota: 'wine and drinks',
      kalastorget: 'hospitality and judgement',
      gastronomiskateatern: 'the whole'
    },
    counts: ['no', 'one', 'two', 'three', 'four', 'five'],
    pavilionOne: 'pavilion',
    pavilionMany: 'pavilions',
    and: 'and',
    settlement: {
      heading: 'The weekly settlement',
      aboveFloor: 'The week gave more than the floor.',
      topUp: 'The week was weak, and the floor topped up the difference.',
      noFloor: 'You have no floor yet. It grows with your medals.',
      amortised: "The bank took this week's repayment.",
      downgraded: (from: string, to: string) => `The bank took ${from} and bought the fittings. That becomes your cash as you carry on with ${to}.`,
      downgradedToNothing: (from: string) => `The bank took ${from}. Now it is time to practise and come back.`
    }
  },
  // ORDER 266 (Nexus v1 stage 4) — the service: the action button, the
  // reputation, the stock and the incidents.
  service: {
    // ORDER 270 — the incidents in service and the three meters.
    incident: {
      countdown: (sec: string) => `${sec} s`,
      clock: (hhmm: string) => `At ${hhmm}`,
      ongoingLabel: 'Ongoing until the next incident',
      struck: 'Struck out by what you know',
      medalTime: (pavilion: string) => `More time thanks to ${pavilion}`,
      staffDecides: 'If you answer wrong or not at all, the staff take over the rest.',
      // ORDER 270 (Vision Owner 2026-09-27) — the rocket's three steps.
      stepName: { episteme: 'Episteme', techne: 'Techne', phronesis: 'Phronesis' } as Record<string, string>,
      stepAsks: { episteme: 'what', techne: 'how', phronesis: 'when and why' } as Record<string, string>,
      stepOf: (n: string, total: string) => `Step ${n} of ${total}`,
      stepCleared: 'Cleared',
      staffDecided: 'The staff decided for themselves.',
      chained: 'The result of an earlier choice',
      phase: { opening: 'Opening', rush: 'Rush', crisis: 'Crisis', closing: 'Closing' } as Record<string, string>,
      guests: ['a couple', 'a regular', 'a party from Örebro', 'two colleagues from Campus', 'a tourist from Hamburg', 'a guest in a light jacket', 'a honeymooning couple', 'a lone guest with a book'],
      wines: ['Chablis', 'Sancerre', 'Barolo', 'Rioja Reserva', 'Riesling from the Mosel', 'Côtes du Rhône', 'Grüner Veltliner'],
      staffRoles: { värd: 'the host', servitör: 'the waiter', kock: 'the chef', lärling: 'the apprentice' } as Record<string, string>,
      staffFallback: 'the waiter',
      ledger: (title: string) => `Incident: ${title}`
    },
    meters: {
      heading: 'The evening',
      cash: 'Cash',
      satisfaction: 'Guest satisfaction',
      stamina: 'Staff stamina',
      noGuests: 'no guests',
      sek: (amount: string) => `${amount} SEK`
    },
    // ORDER 274 — tiden kvar av servicen, hela kvällen.
    clock: {
      label: 'Service',
      now: (hhmm: string) => hhmm,
      left: (h: number, m: number) => (h > 0 ? `${h} h ${String(m).padStart(2, '0')} min left` : `${m} min left`),
      closes: (hhmm: string) => `Closes ${hhmm}`,
      closed: 'Closing',
      aria: (left: string, closes: string) => `${left}. ${closes}.`
    },
    events: {
      reviewerBooked: 'A reviewer has booked a table tonight. Word has got out.',
      reviewGood: 'The reviewer left happy. The evening held, and it will be in the paper.',
      reviewBad: 'The reviewer saw an evening that did not hold together. It will show in the reputation.',
      reviewMixed: 'The reviewer wrote down both what worked and what did not.',
      cleanEvening: 'No one walked out tonight. People are talking about it, and the reputation recovers.',
      slowRecovery: 'The reputation is slowly recovering. The guests no longer remember the worst evening.',
      inspection: "The environmental health inspector came this morning. The stations had not been kept clean during last night's service.",
      inspectionLedger: 'Fee after the inspection',
      bankCall: 'The bank called this morning. Cash was below zero when the day ended.'
    },
    stock: {
      forecast: (covers: string) => `Ingredients for about ${covers} covers.`,
      none: 'No ingredients in stock. You can still open, but the kitchen has nothing to cook.',
      noMenu: 'No menu set today.'
    },
    morningEvents: 'This morning',
    wentWell: {
      happy: (n: string) => `${n} guests left happy.`,
      happyOne: 'One guest left happy.',
      clean: 'No one gave up in the queue.',
      turned: 'When the evening came to a head, you made the right decision.'
    },
    numberWords: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
    manyWord: 'more than twenty'
  },
  // ORDER 275 — lagret är insatsen.
  stock: {
    heading: "Tonight's stock",
    intro: 'Buy the stock before you open. The money leaves the till at once. Portions are sold from the stock during service, and unsold food goes to waste tonight.',
    base: 'Base package',
    addOns: 'Add more',
    buy: (price: string) => `Buy · ${price}`,
    boughtTimes: (n: number) => (n === 1 ? 'Bought today' : `Bought ${n}× today`),
    inStock: 'In stock now',
    empty: 'Nothing in stock. Guests who come in will find nothing to order.',
    // Rätterna delar ingredienser: talet är taket om inget annat säljs.
    portions: (n: number) => `up to ${n} ${n === 1 ? 'portion' : 'portions'}`,
    covers: (n: number) => `Enough for about ${n} ${n === 1 ? 'guest' : 'guests'}.`,
    drinksKeep: 'Drinks keep until tomorrow. Food does not.',
    lastWaste: (sek: string) => `Yesterday's unsold food went to waste: ${sek}.`,
    wasteEvent: (sek: string) => `Unsold food went to waste at closing: ${sek}.`,
    packageLedger: (name: string) => `Stock: ${name}`,
    item: (portions: number, name: string) => `${portions} × ${name}`,
    packages: {
      'vinbar-base': { name: 'Base package', description: 'An ordinary weekday evening: soup, chicken, pork and a dessert, with house wine and local beer.' },
      'vinbar-extra-covers': { name: 'More covers', description: 'Chicken, pork and house wine for a busier evening.' },
      'vinbar-fish': { name: 'Lake fish', description: 'Poached lake fish, for guests who want something lighter.' },
      'vinbar-lamb': { name: 'Lamb', description: 'Lamb with root vegetables, a dearer plate.' },
      'vinbar-game': { name: 'Game', description: 'Deer from Bergslagen, the dearest plate on the menu.' },
      'vinbar-fine-wine': { name: 'Fine wine', description: 'A better wine by the glass, at a higher price.' },
      'vinbar-house-wine': { name: 'More house wine', description: 'House wine by the glass, for a thirsty evening.' }
    } as Record<string, { name: string; description: string }>
  },
  save: {
    menuItem: 'Save and load',
    continueSaved: 'Continue a saved game',
    heading: 'Saved games',
    close: 'Close',
    slot: (n: number) => `Slot ${n}`,
    empty: 'Empty',
    active: 'Playing now',
    saveHere: 'Save here',
    load: 'Load',
    weeklyCopies: 'Weekly copies',
    loadWeek: (week: number) => `Start of week ${week}`,
    autosaveNote: 'The game saves automatically when the day ends, and a copy is saved every week.',
    savedAt: (weekday: string, week: number, name: string) => `${name} · ${weekday}, week ${week}`,
    olderVersion: 'Saved in an older version of the game and cannot be loaded.',
    storageUnavailable: 'The browser does not allow saving right now.'
  },
  scenario: {
    // ORDER 042 §3.3 walk-in-of-five. Legacy fallbacks — the live spec
    // text lives in strategic/simulation/scenarios.ts.
    subject: {
      body: 'A party is at the door — no booking.',
      cta: 'Continue'
    },
    situation: {
      body:
        'Five in the party. Service starts soon and the room is partly booked. What do you do?',
      options: {
        A: 'Seat all five — join the four-top and a two-top.',
        B: 'Seat four at the four-top, the fifth at the bar.',
        C: 'Turn the party away.'
      }
    },
    mentor: {
      A: 'Joining tables works when the floor is with you. Keep an eye on the two-top next door.',
      B: 'Sensible split. The bar seat only works if a staff member gets there in time.',
      C: 'Declining is a choice too. The evening keeps its rhythm — but the room notes it.'
    }
  },
  // ORDER 043 v3 §10 step 5 — the morning team panel.
  team: {
    heading: 'The team',
    body: 'Hire and let go before the day. Contracts run for seven days.',
    contractLabel: 'contract until day',
    dailyCostLabel: 'SEK/day',
    fireButton: 'Let go',
    buyoutLabel: 'buyout',
    kr: 'SEK',
    hireHeading: 'Hire',
    roleLabel: {
      'värd':     'Host',
      'servitör': 'Waiter',
      'kock':     'Chef',
      'lärling':  'Apprentice'
    },
    roleDescription: {
      'värd':     'Greets and runs the room — high cultural competence.',
      'servitör': 'Carries orders and keeps the flow — balanced all-rounder.',
      'kock':     'Holds the kitchen — high scientific competence.',
      'lärling':  'An apprentice who lends a hand everywhere — low competence, low cost.'
    }
  },
  // ORDER 043 v3 §10 step 5 — agency-staff offer.
  agency: {
    heading: 'Agency staff offered',
    body: 'The team is under pressure. Do you want to bring in an extra pair of hands for the rest of the evening?',
    accept: 'Bring in — costs',
    decline: 'Decline',
    kr: 'SEK'
  },
  // ORDER 046 §2 — the morning investment panel.
  invest: {
    heading: 'Investment',
    body: 'What is the team facing today? Training, pricing and ingredients set the character of the evening.',
    trainingHeading: 'Training',
    trainingLevels: {
      1: 'Basic',
      2: 'Experienced',
      3: 'Specialised'
    },
    trainingDescriptions: {
      1: 'Enough to open the doors. The room has to carry whatever happens.',
      2: 'Chefs and waiters have routine. Blows are smoothed out before they show.',
      3: 'Everyone knows more than the moment demands. The service has depth to draw on.'
    },
    pricingHeading: 'Pricing',
    pricingLevels: {
      'låg':   'Low',
      'medel': 'Medium',
      'hög':   'High'
    },
    pricingDescriptions: {
      'låg':   'A full house, a thinner margin. The restaurant keeps the pulse up.',
      'medel': "A balance between volume and revenue. The evening's standard setting.",
      'hög':   'Fewer guests, more per table. The room has to live up to the expectation.'
    },
    ingredientHeading: 'Ingredients',
    ingredientLevels: {
      'grund':   'Basic',
      'utvald':  'Selected',
      'premium': 'Premium'
    },
    ingredientDescriptions: {
      'grund':   'Standard supplier. The evening rests on the craft, not on the ingredients.',
      'utvald':  'Selected suppliers where it counts. Something to talk about at a couple of tables.',
      'premium': 'The best there is. The evening stands or falls with what the kitchen does with it.'
    }
  },
  // ORDER 043 v3 §7 wager.
  wager: {
    heading: 'Read the room',
    body: 'Which sustainability will the next situation be about? A right reading pays back — and a little more if the reading you chose is weak. A wrong reading is taken.',
    lockNote: 'The stake locks the moment you choose. No undo button; that is where the risk lives.',
    capitals: {
      economic:   'Economic',
      social:     'Social',
      ecological: 'Ecological'
    },
    decline: 'Decline',
    standing: 'Staked:',
    placed: 'The stake stands — we will see how the next situation turns out.',
    weatherPrefix: 'The evening:'
  },
  // ORDER 045 — the opening image before mise en place.
  opening: {
    heading: 'The evening',
    tempSuffix: '°C',
    windSuffix: 'm/s',
    precipitation: {
      none: 'dry',
      drizzle: 'drizzle',
      rain: 'rain',
      snow: 'snow'
    },
    clouds: {
      clear: 'clear',
      partly: 'partly cloudy',
      overcast: 'overcast'
    },
    outdoorViable: 'The outdoor seating is open.',
    outdoorClosed: 'The outdoor seating is closed tonight.',
    waitingSingular: 'One person is already standing outside the door.',
    waitingPlural: (n: number) => `${n} people are already standing outside the door.`,
    waitingNone: 'No one is outside yet.',
    countdownPrefix: 'The doors open in',
    countdownSecondsSuffix: 's'
  },
  // ORDER 109 — M7b the bank meeting. {pavilion} is substituted at render
  // with `bank.pavilionNames[outcome.pointedPavilion]`.
  bank: {
    grantRestaurant:
      'Your judgement carries the room. We are funding the full house.',
    grantFoodtruck:
      'You have the hands. Start smaller and grow into it.',
    grantWide:
      'A broad competence. We back a starting position.',
    rejectPractice:
      'We cannot see enough to fund. Practise at {pavilion} and come back.',
    rejectField:
      'You have read the field but never lived it. Come back once you have worked at {pavilion}.',
    pavilionNames: {
      maltidbiblioteket: 'Måltidsbiblioteket',
      kalastorget: 'Kalastorget',
      stensota: 'Stensöta',
      metodkoket: 'Metodköket',
      gastronomiskateatern: 'Gastronomiska Teatern'
    }
  },
  // ORDER 110 — R4 the business class as player text.
  businessClass: {
    kvarterskrogen: 'The Restaurant',
    foodtrucken: 'The Food Truck',
    gästgiveriet: 'The Inn',
    ölkrogen: 'The Brewpub',
    vinbaren: 'The Wine Bar'
  },
  panels: {
    // The three effect chips on the venture cards (economic, social, ecological).
    activityEffects: {
      panelAria: "The morning's ventures",
      aria: 'Effect on the three capitals',
      econ: 'Econ',
      soc: 'Soc',
      ecol: 'Ecol'
    },
    menu: {
      aria: 'Menu and purchasing',
      menuHeading: "Today's menu",
      ingredientCost: (sek: string) => `ingredient cost ≈ ${sek} SEK`,
      priceAria: (dish: string) => `Price for ${dish} in SEK`,
      confirmAria: "Set today's menu",
      confirm: (n: number) => `Set the menu (${n} ${n === 1 ? 'dish' : 'dishes'})`,
      stockHeading: 'Buy ingredients',
      supplierAria: 'Supplier',
      ingredientAria: 'Ingredient',
      offer: (sek: string, reliabilityPct: string) => `${sek} SEK · delivery reliability ${reliabilityPct}%`,
      unitsAria: 'Quantity to buy',
      buyAria: 'Confirm the purchase',
      buy: 'Buy'
    },
    prep: {
      heading: 'Mise en place',
      items: {
        ice: 'ice',
        napkins: 'napkins',
        cutlery: 'cutlery',
        stations: 'stations',
        garnish: 'garnish'
      } as Record<string, string>,
      stations: {
        bar: 'the bar',
        floor: 'the dining room',
        kitchen: 'the kitchen',
        pass: 'the pass'
      } as Record<string, string>,
      doorsOpen: 'The doors open — service begins.',
      doorsOpenReady: 'The doors open — the room is ready.',
      doorsOpenThin: (station: string, item: string) => `The doors open — ${station} is behind (${item}).`
    },
    evening: {
      heading: "The evening's account",
      figuresHeading: "Today's figures",
      ledgerHeading: "Today's ledger",
      revenue: 'Revenue',
      costs: 'Costs',
      result: 'Result',
      reputation: 'Reputation',
      knowledge: 'Knowledge',
      newRound: 'New round',
      newRoundAria: 'Start a new round from day 1',
      nothingToRecord: 'Nothing to record today.',
      entriesAria: "Today's entries",
      currency: 'SEK',
      thousandSuffix: 'k SEK',
      entryAria: (cause: string, amount: string, running: string) =>
        `${cause}: ${amount} SEK, cash ${running} SEK`,
      // Short category label in the first column of the ledger.
      category: {
        revenue: 'Rev.',
        wage: 'Wage',
        agency: 'Agency',
        ingredient: 'Ingr.',
        interest: 'Int.',
        scenario: 'Incid.',
        buyout: 'Fee',
        stock: 'Stock',
        floor: 'Floor',
        amortisation: 'Repay.',
        other: '—'
      }
    },
    cash: {
      label: 'Cash',
      unit: 'k SEK',
      pillAria: 'Cash',
      pillTitle: (amount: string) => `Click to open the business account — cash ${amount}`,
      accountAria: 'Business account',
      heading: 'Cash',
      valuation: 'valuation'
    },
    platesRemaining: {
      heading: 'Portions left',
      out: 'OUT'
    },
    verifyBadge: 'GREY SKETCH — © OpenStreetMap contributors (ODbL) · building heights and materials stylised'
  },
  // ORDER 271 — Design's package 6 (service as rockets): the rocket card
  // R1–R3, the meters, the evening's lesson L1, the evening story K1 and box X1.
  rocket: {
    card: {
      rocketOf: (n: string, total: string) => `Rocket ${n} of ${total}`,
      table: (n: string) => `Table ${n}`,
      room: 'The room',
      stepCleared: (ask: string) => `${ask} · done ✓`,
      stepCurrent: (ask: string, sec: string) => `${ask} · ${sec} s · in progress`,
      stepNext: (sec: string) => `Next · ${sec} s`,
      stepAhead: (ask: string, sec: string) => `${ask} · ${sec} s`,
      stepFailed: (ask: string) => `${ask} · wrong`,
      stepUnreached: 'Not reached',
      stepAsks: { episteme: 'What', techne: 'How', phronesis: 'When and why' } as Record<string, string>,
      right: (next: string) => `Right · on to ${next}`,
      rightDone: 'Right · the rocket held',
      wrong: (role: string) => `Wrong · ${role} takes over`,
      correctTag: 'Right',
      yourTag: 'Your answer',
      timedOut: 'Time ran out before you answered.',
      footer: (role: string) => `Keys 1–4 choose. The room does not wait. If time runs out, it counts as a wrong answer, and ${role} takes over.`,
      secondsLeft: (sec: string) => `${sec} seconds left`,
      takeover: (role: string) => `${role} takes over`
    },
    meters: {
      cash: 'Cash',
      guests: 'The guests',
      staff: 'The staff',
      note: 'Ten steps per meter. Direction, not amounts.',
      delta: (name: string, sign: string, n: string) => `${name} ${sign}${n}`,
      sentence: (parts: string) => `${parts}.`,
      nothing: 'The meters stand still.'
    },
    lesson: {
      label: (weekday: string, hour: string) => `${weekday} · Closed ${hour}:00 · Tonight's lesson`,
      wentWrong: (clock: string, step: string, ask: string) => `What went wrong · ${clock} · ${step}, ${ask}`,
      also: (clock: string, step: string, ask: string) => `Also · ${clock} · ${step}, ${ask}`,
      question: (q: string) => `The question: ${q}`,
      youChose: (label: string) => `You chose: ${label}.`,
      staffDecided: 'You did not answer in time, and the staff decided for themselves.',
      right: (label: string) => `The right answer was: ${label}.`,
      noneTitle: 'Every rocket held',
      gridRocket: 'Rocket',
      legendCleared: '✓ cleared',
      legendFailed: '✗ wrong, the staff took over',
      legendUnreached: '— not reached',
      cellCleared: 'cleared',
      cellFailed: 'wrong, the staff took over',
      cellUnreached: 'not reached',
      summary: (n: string, total: string) => `${n} of ${total} steps cleared tonight.`,
      practice: (pavilion: string) => `Practise in ${pavilion} tomorrow`,
      toStory: "To the evening's story"
    },
    story: {
      label: (weekday: string, hour: string) => `${weekday} evening · Closed ${hour}:00`,
      title: (weekday: string, business: string) => `${weekday} at ${business}`,
      weekdayDefinite: { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' } as Record<string, string>,
      evening: 'The evening',
      wentWell: 'What went well',
      wentWrong: 'What went wrong',
      cause: (why: string) => `Cause: ${why}`,
      noCause: 'Cause: no answer in time, and the staff had to decide for themselves.',
      nothingWell: 'No rocket held all the way tonight.',
      nothingWrong: 'Nothing went wrong tonight.',
      back: 'Back to the lesson'
    },
    stranded: {
      label: 'No business · no cash',
      medals: 'Your medals are still there. What you have learnt is never taken from you.',
      cashShort: 'There is not enough cash for a new deposit.',
      toHouse: 'Go to Måltidens hus'
    }
  }
};
