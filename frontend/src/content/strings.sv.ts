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
  scenario: {
    // ORDER 042 §3.3 walk-in-of-five. Difficulty is chosen BEFORE the
    // situation is revealed (LEARNING_AND_SCENARIO_ARCHITECTURE §4.3).
    // No response is marked correct (§4.2). No result popup — the
    // response resolves in the room (CAMERA_AND_GAMEPLAY_BIBLE §8.1).
    subject: {
      body: 'Ett sällskap står i entrén — utan bokning.',
      cta: 'Fortsätt'
    },
    // ORDER 048 §5 (2026-08-10 amendment) — the difficulty block
    // (self-reported confidence "Hur säker känner du dig inför det
    // här?") is retired. It asked about feeling instead of knowledge
    // and produced no outcome. The slot between subject and situation
    // is reserved for ORDER 049 §5.1's professional questions.
    situation: {
      body:
        'Fem personer i sällskapet. Kvällens service börjar snart och rummet är delvis bokat. Vad gör du?',
      options: {
        A: 'Sätt alla fem — slå ihop fyran och ett tvåbord.',
        B: 'Sätt fyra vid fyran, den femte vid baren.',
        C: 'Neka sällskapet.'
      }
    },
    // Mentor comments are non-modal — they surface as an in-world text
    // bubble above the room after the response has begun to play out.
    // Keyed by choice only after the ORDER 048 §5 confidence-question
    // retirement (2026-08-10); the mid-difficulty variants survive as
    // the neutral base.
    mentor: {
      A: 'Sammanslagning fungerar när servisen är med. Håll ett öga på tvåan bredvid.',
      B: 'Klok fördelning. Barsätet kräver dock att någon i personalen hinner dit.',
      C: 'Att neka är också ett val. Kvällens rytm bevaras — men ryktet noteras.'
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
  }
} as const;
