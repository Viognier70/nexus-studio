export const strings = {
  title: 'NEXUS',
  subtitle: 'Grythyttan — The Origin',
  busText:
    'Alla kommer hit med drömmar.\nIngen vet ännu vem de kommer att bli.',
  npc: {
    prompt: 'Är du också här för antagningen?',
    choices: {
      A: 'Ja. Jag vet bara inte riktigt vad jag kan bli.',
      B: 'Ja. Jag har drömt om att arbeta med gastronomi.',
      C: 'Jag är mest nyfiken på varför den här platsen betyder så mycket.'
    },
    responses: {
      A: 'Det är fler än du tror som säger så. Kanske är det just därför vi kommit hit.',
      B: 'Många vägar leder in i gastronomin. Se först vad platsen gör med dig.',
      C: 'Det märks. Var uppmärksam idag — Grythyttan brukar svara den som frågar.'
    }
  },
  objective: 'Hitta registreringen vid Sevillapaviljongen.',
  end: {
    heading: 'Din initiation börjar här.',
    continueButton: 'Utforska vidare',
    restartButton: 'Börja om'
  },
  pause: {
    title: 'Paus',
    resume: 'Fortsätt',
    restart: 'Börja om',
    muteOn: 'Ljud på',
    muteOff: 'Ljud av',
    controlsHeading: 'Kontroller',
    aboutHeading: 'Om denna prototyp',
    disclaimer:
      'Vertikal skiva 001. Alla platser, byggnader och personer i denna prototyp är stiliserade platshållare. Inget anspråk görs på arkitektonisk trohet eller rättigheter. Grythyttan och Sevillapaviljongen är verkliga platser som här används enbart som narrativ inspiration.'
  },
  controls: {
    desktop: [
      'W A S D eller pilar — gå',
      'Mus — se dig omkring',
      'Shift — gå fortare',
      'E — interagera',
      'Esc — paus'
    ],
    mobile: [
      'Vänster styrspak — gå',
      'Dra på skärmen — se dig omkring',
      'Knapp — interagera'
    ]
  },
  prompts: {
    talkTo: 'Prata',
    register: 'Registrera dig'
  },
  hud: {
    muteAria: 'Slå av ljudet',
    unmuteAria: 'Slå på ljudet',
    pauseLabel: 'Paus',
    soundLabel: 'Ljud',
    beginPlay: 'Fortsätt'
  },
  webglFallback: {
    title: 'Grafiken kan inte visas',
    body: 'Din webbläsare eller enhet stöder inte WebGL. Prototypen kräver hårdvaruaccelererad 3D-grafik.',
    quote:
      'Alla kommer hit med drömmar. Ingen vet ännu vem de kommer att bli.',
    restart: 'Försök igen'
  },
  business: {
    firstRunHeading: 'Din verksamhet',
    firstRunBody:
      'Du äger en restaurang i Grythyttans historiska kärna. Vad heter den?',
    firstRunPlaceholder: 'Restaurangens namn',
    firstRunSubmit: 'Öppna verksamheten',
    firstRunHint: 'Namnet kan du inte ändra senare.',
    labelPrefix: 'Restaurang'
  },
  day: {
    // ORDER 043 v3 §2 — day-period player-facing text. Cycle-1 scope:
    // morning + afternoon are the two picker phases; lunch/dinner/
    // evening are running or transitional.
    morning: {
      heading: 'Morgon',
      body: 'Öppna lunch eller hoppa över.',
      openLunch: 'Öppna lunch',
      skipLunch: 'Hoppa över lunch'
    },
    afternoon: {
      heading: 'Eftermiddag',
      body: 'Öppna middag.',
      openDinner: 'Öppna middag'
    },
    minutesSuffix: 'min'
  },
  // ORDER 263 (Nexus v1 etapp 1) — tiden och sparandet. Svenska enligt
  // speldesignen > Språk och målgrupp (CLAUDE.md regel 7, F9).
  calendar: {
    weekdays: {
      mon: 'Måndag',
      tue: 'Tisdag',
      wed: 'Onsdag',
      thu: 'Torsdag',
      fri: 'Fredag',
      sat: 'Lördag',
      sun: 'Söndag'
    },
    weekdaysShort: {
      mon: 'Mån',
      tue: 'Tis',
      wed: 'Ons',
      thu: 'Tor',
      fri: 'Fre',
      sat: 'Lör',
      sun: 'Sön'
    },
    week: (week: number, weeks: number) => `Vecka ${week} av ${weeks}`,
    weekShort: (week: number) => `v. ${week}`,
    season: (season: number) => `Säsong ${season}`,
    holidays: {
      midsommar: 'Midsommar',
      grythyttedagarna: 'Grythyttedagarna',
      vinprovning: 'Vinprovning i Stensöta',
      kraftskiva: 'Kräftskiva'
    },
    holidayToday: (name: string) => `${name} i dag`,
    holidayThisWeek: (name: string) => `${name} den här veckan`,
    phases: {
      morning: 'Morgon',
      service: 'Service',
      evening: 'Kväll'
    },
    closed: 'Stängt'
  },
  morning: {
    heading: 'Morgon',
    serviceDayBody: 'Fyll dagens schema och öppna för kvällen.',
    sundayBody: 'Söndag. Krogen är stängd, och du har fyra platser i schemat.',
    slots: (used: number, total: number) => `Schemat: ${used} av ${total} platser`,
    startService: 'Öppna för kvällen',
    closeSunday: 'Avsluta söndagen',
    activitiesHeading: 'Satsningar i dag',
    weekly: 'en gång i veckan'
  },
  // ORDER 264 (Nexus v1 etapp 2) — Måltidens hus, prov och kvällsquiz.
  knowledge: {
    houseButton: 'Måltidens hus',
    houseHeading: 'Måltidens hus',
    houseBody: 'Ett besök tar en plats i dagens schema. Öva för krediter, eller gör prov för nästa medalj.',
    close: 'Stäng',
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
      phronesis: 'fronesis'
    },
    medals: {
      brons: 'brons',
      silver: 'silver',
      guld: 'guld',
      platina: 'platina'
    },
    noMedal: 'Ingen medalj ännu',
    medalLine: (medal: string) => `Medalj: ${medal}`,
    medalsHeading: 'Medaljer',
    noMedalsYet: 'Inga medaljer ännu',
    practice: 'Öva',
    exam: (level: string) => `Prov: ${level}`,
    examDone: 'Platina är taget',
    theatreLocked: 'Öppnas när du har silver i två paviljonger',
    noSlotsLeft: 'Dagens schema är fullt',
    askers: {
      kock: 'Kocken',
      sommelier: 'Sommelieren',
      gäst: 'Gästen',
      värd: 'Värden',
      servitör: 'Servitören',
      lärling: 'Lärlingen'
    },
    questionOf: (n: number, total: number) => `Fråga ${n} av ${total}`,
    right: 'Rätt.',
    wrong: 'Inte riktigt.',
    next: 'Nästa',
    seeResult: 'Se resultatet',
    practiceResult: (correct: number, total: number) => `${correct} av ${total} rätt. Varje rätt svar gav en kredit.`,
    examPassed: (medal: string, pavilion: string, correct: number, total: number) =>
      `${correct} av ${total} rätt. Du har tagit ${medal} i ${pavilion}.`,
    examFailed: (correct: number, total: number, need: number) =>
      `${correct} av ${total} rätt. Det behövs ${need}. Ett nytt prov drar nya frågor.`,
    back: 'Tillbaka',
    placeholderNote: 'Frågorna på den här nivån är tillfälliga tills de riktiga är skrivna.'
  },
  quiz: {
    heading: 'Kvällen',
    offer: (axis: string, n: number) => `Kvällens quiz: ${n} frågor om ${axis}, där kvällen gick sämst. Rätt svar ger en kredit, fel kostar en.`,
    start: 'Ta quizen',
    skip: 'Hoppa över',
    skipped: 'Du hoppade över quizen i kväll.',
    done: (delta: number) => delta > 0 ? `Quizen gav ${delta} ${delta === 1 ? 'kredit' : 'krediter'}.` : delta < 0 ? `Quizen kostade ${-delta} ${delta === -1 ? 'kredit' : 'krediter'}.` : 'Quizen gick jämnt upp.',
    nextMorning: 'Till nästa morgon'
  },
  save: {
    menuItem: 'Spara och ladda',
    continueSaved: 'Fortsätt ett sparat spel',
    heading: 'Sparade spel',
    close: 'Stäng',
    slot: (n: number) => `Plats ${n}`,
    empty: 'Tom',
    active: 'Spelar nu',
    saveHere: 'Spara här',
    load: 'Ladda',
    weeklyCopies: 'Veckokopior',
    loadWeek: (week: number) => `Början av vecka ${week}`,
    autosaveNote: 'Spelet sparas automatiskt när dagen tar slut, och en kopia sparas varje vecka.',
    savedAt: (weekday: string, week: number, name: string) => `${name} · ${weekday}, vecka ${week}`,
    olderVersion: 'Sparat i en äldre version av spelet och kan inte laddas.',
    storageUnavailable: 'Webbläsaren tillåter inte sparande just nu.'
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
      body: 'A party is at the door — no booking.',
      cta: 'Continue'
    },
    // ORDER 048 §5 (2026-08-10 amendment) — the difficulty block
    // (self-reported confidence "Hur säker känner du dig inför det
    // här?") is retired. It asked about feeling instead of knowledge
    // and produced no outcome. The slot between subject and situation
    // is reserved for ORDER 049 §5.1's professional questions.
    situation: {
      body:
        'Five in the party. Service starts soon and the room is partly booked. What do you do?',
      options: {
        A: 'Seat all five — join the four-top and a two-top.',
        B: 'Seat four at the four-top, the fifth at the bar.',
        C: 'Turn the party away.'
      }
    },
    // Mentor comments are non-modal — they surface as an in-world text
    // bubble above the room after the response has begun to play out.
    // Keyed by choice only after the ORDER 048 §5 confidence-question
    // retirement (2026-08-10); the mid-difficulty variants survive as
    // the neutral base.
    mentor: {
      A: 'Joining tables works when the floor is with you. Keep an eye on the two-top next door.',
      B: 'Sensible split. The bar seat only works if a staff member gets there in time.',
      C: 'Declining is a choice too. The evening keeps its rhythm — but the room notes it.'
    }
  },
  // ORDER 043 v3 §10 step 5 — the morning team panel. Player-facing
  // labels for the hire/fire surface, keyed by role for a compact
  // switch in TeamPanel. Role labels are capitalized display forms
  // of the internal StaffRole (which stays lowercase for code-side).
  team: {
    heading: 'Laget',
    body: 'Anställ och säg upp inför dagen. Kontrakt löper i sju dagar.',
    contractLabel: 'kontrakt t.o.m. dag',
    dailyCostLabel: 'kr/dag',
    fireButton: 'Säg upp',
    buyoutLabel: 'buyout',
    kr: 'kr',
    hireHeading: 'Anställ',
    roleLabel: {
      'värd':     'Värd',
      'servitör': 'Servitör',
      'kock':     'Kock',
      'lärling':  'Lärling'
    },
    roleDescription: {
      'värd':     'Hälsar och styr rummet — hög kulturell kompetens.',
      'servitör': 'Bär order och håller flöde — balanserad rustning.',
      'kock':     'Håller köket — hög vetenskaplig kompetens.',
      'lärling':  'Lärling som avlastar överallt — låg kompetens, låg kostnad.'
    }
  },
  // ORDER 043 v3 §10 step 5 — agency-staff offer. Appears mid-service
  // when strain has been sustained above threshold. Player accepts
  // (money cost, agency joins for the service) or declines (social
  // capital cost — the team registers that no help came).
  agency: {
    heading: 'Hyrpersonal erbjuds',
    body: 'Laget står under press. Vill du ta in en extra hand för resten av kvällen?',
    accept: 'Ta in — kostar',
    decline: 'Avstå',
    kr: 'kr'
  },
  // ORDER 046 §2 — the morning investment panel. Sits alongside
  // TeamPanel and surfaces the three policy dials that shape the
  // service (training level, price positioning, ingredient tier).
  // Not a scoreboard — the labels are the reading.
  invest: {
    heading: 'Investering',
    body: 'Vad står laget inför i dag? Träning, prisläge och råvara sätter kvällens karaktär.',
    trainingHeading: 'Utbildning',
    trainingLevels: {
      1: 'Grundnivå',
      2: 'Erfaren',
      3: 'Specialiserad'
    },
    trainingDescriptions: {
      1: 'Räcker för att öppna dörrarna. Rummet får bära det som händer.',
      2: 'Kockar och servitörer har rutin. Slag jämnas ut innan de syns.',
      3: 'Alla vet mer än det som krävs i stunden. Servicen har djup att gå till.'
    },
    pricingHeading: 'Prisläge',
    pricingLevels: {
      'låg':   'Lågt',
      'medel': 'Medel',
      'hög':   'Högt'
    },
    pricingDescriptions: {
      'låg':   'Fyllt hus, tunnare marginal. Krogen håller pulsen uppe.',
      'medel': 'Balans mellan volym och intäkt. Kvällens standardläge.',
      'hög':   'Färre gäster, mer per bord. Rummet måste bära förväntan.'
    },
    ingredientHeading: 'Råvara',
    ingredientLevels: {
      'grund':   'Grund',
      'utvald':  'Utvald',
      'premium': 'Premium'
    },
    ingredientDescriptions: {
      'grund':   'Standardleverantör. Kvällen bygger på hantverket, inte på råvaran.',
      'utvald':  'Utvalda leverantörer när det räknas. Något att prata om vid ett par bord.',
      'premium': 'Det bästa av det som finns. Kvällen står och faller med det köket gör med det.'
    }
  },
  // ORDER 043 v3 §7 wager — placed between scenarios on which
  // sustainability the next situation will concern. Optional; declining
  // is legitimate and progresses more slowly.
  wager: {
    heading: 'Läs rummet',
    // ORDER 043 Addendum B — pre-placement copy in the observer's
    // voice. Names what the stake is, what a correct read gives back,
    // what a wrong one costs, and that it locks the moment it's
    // placed. Not a rules panel; a briefing.
    body: 'Vilken hållbarhet handlar nästa situation om? Rätt läsning ger tillbaka — och lite mer om den avläsning du valde ligger svagt. Fel läsning tas.',
    lockNote: 'Insatsen låser i samma stund du väljer. Ingen ångrings-knapp; det är där risken bor.',
    capitals: {
      economic:   'Ekonomiskt',
      social:     'Socialt',
      ecological: 'Ekologiskt'
    },
    decline: 'Avstå',
    standing: 'Satsat:',
    placed: 'Insatsen står — vi ser hur nästa situation faller ut.',
    // ORDER 045 — weather line shown under the capital buttons so the
    // wager reads against the evening's conditions.
    weatherPrefix: 'Kvällen:'
  },
  // ORDER 045 — the opening image before mise en place. Ten-second
  // briefing screen showing weather + local factors + how many are
  // already outside. No numeric HUD dominance (§9); the copy carries
  // the reading.
  opening: {
    heading: 'Kvällen',
    tempSuffix: '°C',
    windSuffix: 'm/s',
    precipitation: {
      none: 'uppehåll',
      drizzle: 'duggregn',
      rain: 'regn',
      snow: 'snö'
    },
    clouds: {
      clear: 'klart',
      partly: 'halvklart',
      overcast: 'mulet'
    },
    outdoorViable: 'Uteserveringen är i läge.',
    outdoorClosed: 'Uteserveringen är stängd i kväll.',
    waitingSingular: 'En person står redan utanför dörren.',
    waitingPlural: (n: number) => `${n} personer står redan utanför dörren.`,
    waitingNone: 'Ingen står utanför ännu.',
    countdownPrefix: 'Dörrarna öppnar om',
    countdownSecondsSuffix: 's'
  },
  // ORDER 109 — M7b bankmötet. Player-visible text på engelska per
  // CLAUDE.md Observation 6 (2026-08-09); paviljongnamn på svenska per
  // samma regel (platsnamn behålls). {pavilion} substitueras vid render
  // med `bank.pavilionNames[outcome.pointedPavilion]`. Interna
  // outcome-nycklar från businessProfile.ts/bankMeeting.ts får inte
  // förekomma i den här filen — DoD 6 grep-testet skannar hela filen.
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
      maltidbiblioteket: 'Måltidbiblioteket',
      kalastorget: 'Kalastorget',
      stensota: 'Stensöta',
      metodkoket: 'Metodköket',
      gastronomiskateatern: 'Gastronomiska Teatern'
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
    kvarterskrogen: 'Kvarterskrogen',
    foodtrucken: 'Foodtrucken',
    gästgiveriet: 'Gästgiveriet',
    // ORDER 125 §3 — Ölkrogen. Spelartext med versal första bokstav,
    // matchar övriga.
    ölkrogen: 'Ölkrogen',
    // ORDER 166 — vinbaren blir spelartext för klass-nyckeln som
    // tillkommer när COMPETITORS bär `businessClass: 'vinbaren'` i data.
    // Ingen scen är monterad än (WineBarScene är egen order).
    vinbaren: 'Vinbaren'
  }
} as const;
