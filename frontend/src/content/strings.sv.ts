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
  // ORDER 267 (Nexus v1 etapp 5) — söndagstidningen (sim/newspaper.ts).
  newspaper: {
    masthead: 'Söndagsnumret',
    subhead: (week: number) => `Lokaltidningen i Grythyttan · vecka ${week}`,
    open: 'Söndagsnumret',
    close: 'Lägg ifrån dig tidningen',
    reviewHeading: 'Recensionen',
    marketHeading: 'Marknaden',
    bankHeading: 'Banken',
    holidayHeading: 'Det som kommer',
    reviewTitleGood: (weekday: string, name: string) => `En ${weekday}kväll hos ${name}`,
    reviewTitleBad: (weekday: string, name: string) => `En ${weekday}kväll hos ${name} som inte höll`,
    reviewFull: 'Det var fullt, och kön ringlade ut mot torget.',
    reviewGaveUp: 'Några tröttnade i kön och gick innan de fick plats.',
    reviewSparse: 'Rummet var glest, och det märktes i stämningen.',
    reviewSteady: 'Rummet fylldes i jämn takt.',
    reviewUp: 'De som satt där talade gott om kvällen efteråt.',
    reviewDown: 'Ryktet fick sig en törn.',
    reviewFlat: 'Kvällen gick som kvällar gör, utan att någon talade om den efteråt.',
    noEvenings: (name: string) => `${name} höll stängt hela veckan. Tidningen har ingen kväll att recensera.`,
    market: {
      full: (cls: string) => `${cls} tog nästan varje gäst som marknaden gav den den här veckan.`,
      most: (cls: string) => `${cls} fick de flesta av gästerna den kunde få den här veckan.`,
      half: (cls: string) => `${cls} fick ungefär hälften av gästerna den kunde få den här veckan.`,
      few: (cls: string) => `${cls} fick få av gästerna den kunde få den här veckan.`
    },
    marketNoBusiness: 'Du hade ingen verksamhet den här veckan, och inga gäster att räkna.',
    bankNext: (missing: string) => `Banken om nästa steg: ${missing.charAt(0).toLowerCase()}${missing.slice(1)}`,
    holidayNextWeek: (name: string) => `${name} nästa vecka.`,
    holidayInWeeks: (name: string, weeks: string) => `${name} om ${weeks} veckor.`,
    holidayNone: 'Ingen högtid före säsongens slut.',
    weekdaysLower: {
      mon: 'måndags', tue: 'tisdags', wed: 'onsdags', thu: 'torsdags', fri: 'fredags', sat: 'lördags', sun: 'söndags'
    }
  },
  // ORDER 267 (Nexus v1 etapp 5) — startrutan, mentorn i introduktionen
  // och namnet på den första verksamheten.
  introduction: {
    startHeading: 'Nexus',
    startSubtitle: 'Grythyttan',
    newGame: 'Nytt spel',
    mentor: 'Mentorn',
    steps: {
      practice:
        'Välkommen till Grythyttan. Jag kommer från Campus och följer dig i dag. Banken lånar inte ut något förrän den har sett vad du kan, så vi börjar med att öva. Öppna Måltidens hus och öva i Stensöta, där sommelierna håller till. Inget står på spel.',
      exam:
        'Bra. Nu provet i samma paviljong: åtta frågor, och sex rätt ger brons. Med brons i Stensöta kan banken låna ut till en vinbar. Går det inte, gör om det. I dag kostar besöken ingen plats i schemat.',
      bank: 'Brons. Gå till Banken i morgonraden. Där får du höra vad du har visat och vad du kan låna till.'
    },
    farewell:
      'Nu är den din. I kväll öppnar du för första gången. Den här veckan kommer färre gäster än vanligt, så du hinner lära dig rummet. Jag finns på Campus om det går illa.',
    farewellClose: 'Tack',
    classesIndefinite: {
      vinbar: 'en vinbar',
      foodtruck: 'en food truck',
      restaurang: 'en restaurang',
      olkrog: 'en ölkrog',
      gastgiveri: 'ett gästgiveri',
      nattklubb: 'en nattklubb'
    },
    chooseFirst: (cls: string) => `Öppna ${cls}`,
    nameBody: (cls: string) => `Banken lånar ut till ${cls} vid torget. Vad ska den heta?`,
    namePlaceholder: 'Verksamhetens namn',
    endContinue: 'Fortsätt'
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
    closeDay: 'Avsluta dagen utan service',
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
    // ORDER 270 — provet på tid och referensen med förklaringen.
    timedOut: 'Tiden gick ut. Det räknas som fel.',
    secondsLeft: (sec: string) => `${sec} s`,
    referenceLabel: 'Läs mer:',
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
  // ORDER 270 — kvällens lärdom ersätter quizen efter servicen.
  lesson: {
    heading: 'Kvällens lärdom',
    eveningHeading: 'Kvällen',
    intro: 'Det här gick fel i kväll, och varför.',
    none: 'Inga fel beslut i kväll. Varje raket höll hela vägen.',
    noIncidents: 'Kvällen hade inga händelser att lära av.',
    // ORDER 270 — raketen föll på ett steg.
    fellOn: (step: string, question: string) => `${step}: ${question}`,
    youChose: (label: string) => `Du valde: ${label}`,
    staffDecided: (outcome: string) => `Du svarade inte, och personalen beslutade själv. ${outcome}`,
    better: (label: string) => `Bättre: ${label}`,
    nextMorning: 'Till nästa morgon'
  },
  // ORDER 271 — skärmarna i paket 1 (mentorn M1/M2, morgonens schema
  // S1/S2, banken B0/B1, tidningen T1, Måltidens hus O1/O2/MD1/MD2).
  // Speldesignens text där den finns; övrigt är skärmarnas egna rader.
  screens: {
    mentor: {
      label: 'Mentorn · från Campus',
      campus: 'Campus',
      stepOf: (n: number, total: number) => `Steg ${n} av ${total}`,
      skip: 'Jag klarar mig — hoppa över guiden',
      understood: 'Uppfattat',
      service:
        'Nu öppnar du. När något händer i rummet kommer ett kort upp: vad, hur och när, ett steg i taget och på tid. Svarar du inte tar personalen över. Mätarna visar kassan, gästerna och personalen, i riktning, inte i belopp.'
    },
    morning: {
      label: (weekday: string, week: number, weeks: number) => `${weekday} morgon · vecka ${week} av ${weeks}`,
      heading: 'Vad gör du i dag?',
      sundayHeading: 'Söndag. Fyra platser, en lång dag.',
      slot: (n: number) => `Plats ${n}`,
      slotPavilion: 'Paviljong',
      slotActivity: 'Satsning',
      slotEmpty: 'Välj satsning eller paviljong',
      newspaperArrived: 'Söndagstidningen har kommit',
      newspaperBody: 'Recensionen, marknaden, banken och det som kommer.',
      activities: 'Satsningar',
      pavilions: 'Paviljonger i Måltidens hus',
      picked: 'Vald',
      aside: 'Rummet och personalen',
      backToSchedule: 'Tillbaka till schemat'
    },
    bank: {
      speaker: 'Banken',
      diagnosis: 'Bankens diagnos',
      seen: 'Det banken ser',
      none: 'ingen än',
      startLoan: 'Startlån',
      queue: 'Kö i stället för platser.',
      seats: (n: number) => `${n} platser.`,
      // Speldesign > Verksamhetsklasserna, kolumnen Särdrag.
      traits: {
        vinbar: 'Smårätter, lounger, DJ, vinlista.',
        foodtruck: 'Lucka mot gatan, kö, väder, gatuläge, snabb omsättning.',
        restaurang: 'Matsal och bar, mise en place, flera rätter.',
        olkrog: 'Bryggeri i lokalen, rejäl mat, få rätter.',
        gastgiveri: 'Övernattning, frukost, soignée servering, dygnsstruktur.',
        nattklubb: 'Flera barer, dans, volym och flöde, sena kvällar.'
      },
      firstLabel: (weekday: string) => `${weekday} · dag 1 · banken`,
      firstHeading: 'Första mötet med banken',
      firstOpening: 'Mentorn sa att du gjorde provet i dag. Låt mig se.',
      firstVerdict: {
        vinbar: 'Det räcker för ett rum med bord. Banken vågar vinbaren.',
        foodtruck: 'Det räcker för att börja, men inte för ett rum med bord.',
        restaurang: 'Det räcker för att börja.',
        olkrog: 'Det räcker för ett rum med bord. Banken vågar ölkrogen.',
        gastgiveri: 'Det räcker för att börja.',
        nattklubb: 'Det räcker för att börja.'
      },
      firstNoteVinbar: 'Undantaget gäller bara första dagen. Därefter styr medaljerna, som för alla.',
      firstNoteLater: 'Banken ser på det vid varje veckoavräkning.',
      heading: 'Samtal med banken',
      canChange: 'Går att byta till nu',
      missing: 'Det som saknas',
      stay: (cls: string) => `Stanna i ${cls}`
    },
    newspaper: {
      toBank: 'Till banken'
    },
    house: {
      medals: 'Medaljerna',
      today: (level: string) => `${level} i dag`,
      practiceLabel: 'Övning · ingen medalj står på spel',
      yourAnswer: 'Ditt svar',
      practiceHeading: 'Övningen är klar',
      examHeading: 'Provet är klart',
      practiceDone: 'Bra övat.',
      practiceCredits: 'Varje rätt svar gav en kredit.',
      passed: (level: string, pavilion: string) => `Godkänt. ${level} i ${pavilion}.`,
      almost: 'Nästan.',
      waited: (n: number, word: string) => `${word} ${n === 1 ? 'fråga fick' : 'frågor fick'} vänta.`,
      need: (need: string, total: string) => `Det behövs ${need} rätt av ${total}. Ett nytt prov drar nya frågor.`,
      boxesAria: (correct: number, total: number) => `${correct} av ${total} rätt`,
      toMedals: 'Till medaljerna',
      newMedal: 'Ny medalj',
      medalTitle: (level: string, pavilion: string) => `${level} i ${pavilion}`,
      medalCaption: (level: string, pavilion: string) => `${level} · ${pavilion}`,
      continue: 'Fortsätt'
    }
  },
  // ORDER 265 (Nexus v1 etapp 3) — ekonomin och banken.
  economy: {
    ledger: {
      interest: 'Ränta på lånet',
      floor: 'Golvet fyllde på veckan',
      amortisation: 'Amortering på lånet',
      sale: 'Lokalen såld till banken',
      deposit: 'Kontantinsats för den nya lokalen'
    },
    classes: {
      vinbar: 'Vinbar',
      foodtruck: 'Food truck',
      restaurang: 'Restaurang',
      olkrog: 'Ölkrog',
      gastgiveri: 'Gästgiveri',
      nattklubb: 'Nattklubb'
    },
    classesDefinite: {
      vinbar: 'vinbaren',
      foodtruck: 'food trucken',
      restaurang: 'restaurangen',
      olkrog: 'ölkrogen',
      gastgiveri: 'gästgiveriet',
      nattklubb: 'nattklubben'
    },
    warnings: {
      first: 'Kassan är under det banken lånar ut mot ditt golv i kväll. Om den är det tre kvällar i rad tar banken lokalen vid veckoavräkningen.',
      second: 'Andra kvällen i rad under det banken lånar ut mot. En kväll till, och banken tar lokalen vid söndagens avräkning.',
      downgrade: 'Tredje kvällen i rad under det banken lånar ut mot. Vid söndagens avräkning går verksamheten ner en klass. Det du kan följer med.'
    },
    noBusinessBody: 'Du har ingen verksamhet just nu. Öva och gör prov i Måltidens hus, och gå sedan till banken.',
    // ORDER 270 — rutan mitt på skärmen utan verksamhet och utan pengar.
    stranded: {
      heading: 'Du står utan verksamhet',
      body: 'Verksamheten är borta, men det du kan finns kvar. Banken lånar ut igen när du visat vad du kan: en hel vecka i Måltidens hus med minst ett prov.',
      readyBody: 'Du har visat vad du kan. Banken är beredd att pröva ett nytt lån.',
      progress: (days: number, of: number, exams: number, need: number) =>
        `Dag ${days} av ${of} i Måltidens hus · ${exams} av ${need} ${need === 1 ? 'prov' : 'prov'}`,
      toHouse: 'Till Måltidens hus',
      toBank: 'Till banken'
    },
    bankButton: 'Banken',
    bankHeading: 'Banken',
    bankCurrent: (name: string) => `Du driver ${name}.`,
    bankNone: 'Du har ingen verksamhet.',
    bankNoLoan: 'Banken ger inget lån utan en medalj. Gå och öva.',
    shown: (topics: string) => `Du har visat att du kan ${topics}.`,
    shownNothing: 'Du har inte visat något i Måltidens hus ännu.',
    missing: (cls: string, req: string) => `För ${cls} saknas ${req}.`,
    reqLevelIn: (level: string, count: string) => `${level} i ${count}`,
    reqIncluding: (names: string) => `, varav ${names}`,
    cashShort: (cls: string) => `Kassan räcker inte till kontantinsatsen för ${cls}.`,
    bankWait: 'Banken lånar ut igen när du har ägnat en hel vecka åt Måltidens hus och gjort minst ett prov.',
    upgradeOnly: 'Nås bara genom att växa från en annan verksamhet.',
    choose: (cls: string) => `Byt till ${cls.toLowerCase()}`,
    current: 'Din verksamhet',
    onlySunday: 'Byte av verksamhet görs på söndagen, vid veckoavräkningen.',
    topics: {
      maltidbiblioteket: 'måltidens historia och begrepp',
      metodkoket: 'köket',
      stensota: 'vin och dryck',
      kalastorget: 'bemötande och omdöme',
      gastronomiskateatern: 'helheten'
    },
    counts: ['ingen', 'en', 'två', 'tre', 'fyra', 'fem'],
    pavilionOne: 'paviljong',
    pavilionMany: 'paviljonger',
    and: 'och',
    settlement: {
      heading: 'Veckoavräkningen',
      aboveFloor: 'Veckan gav mer än golvet.',
      topUp: 'Veckan blev svag, och golvet fyllde på skillnaden.',
      noFloor: 'Du har inget golv ännu. Det växer med dina medaljer.',
      amortised: 'Banken drog veckans amortering.',
      downgraded: (from: string, to: string) => `Banken tog ${from} och köpte inventarierna. Det blir din kassa när du fortsätter med ${to}.`,
      downgradedToNothing: (from: string) => `Banken tog ${from}. Nu gäller det att öva och komma tillbaka.`
    }
  },
  // ORDER 266 (Nexus v1 etapp 4) — servicen: action-knappen, ryktet,
  // lagret och händelserna.
  service: {
    // ORDER 270 — händelserna i servicen och de tre mätarna.
    incident: {
      countdown: (sec: string) => `${sec} s`,
      clock: (hhmm: string) => `Kl. ${hhmm}`,
      ongoingLabel: 'Pågår tills nästa händelse',
      struck: 'Strukits av dina kunskaper',
      medalTime: (pavilion: string) => `Mer tid tack vare ${pavilion}`,
      staffDecides: 'Svarar du fel eller inte alls tar personalen över resten.',
      // ORDER 270 (Vision Owner 2026-09-27) — raketens tre steg.
      stepName: { episteme: 'Episteme', techne: 'Techne', phronesis: 'Phronesis' } as Record<string, string>,
      stepAsks: { episteme: 'vad', techne: 'hur', phronesis: 'när och varför' } as Record<string, string>,
      stepOf: (n: string, total: string) => `Steg ${n} av ${total}`,
      stepCleared: 'Klarat',
      staffDecided: 'Personalen beslutade själv.',
      chained: 'Följden av ett tidigare val',
      phase: { opening: 'Öppning', rush: 'Rusning', crisis: 'Kris', closing: 'Avslut' } as Record<string, string>,
      guests: ['ett par', 'en stamgäst', 'ett sällskap från Örebro', 'två kollegor från Campus', 'en turist från Hamburg', 'en gäst i ljus kavaj', 'ett par på bröllopsresa', 'en ensam gäst med en bok'],
      wines: ['Chablis', 'Sancerre', 'Barolo', 'Rioja Reserva', 'Riesling från Mosel', 'Côtes du Rhône', 'Grüner Veltliner'],
      staffRoles: { värd: 'värden', servitör: 'servitören', kock: 'kocken', lärling: 'lärlingen' } as Record<string, string>,
      staffFallback: 'servitören',
      ledger: (title: string) => `Händelse: ${title}`
    },
    meters: {
      heading: 'Kvällen',
      cash: 'Kassa',
      satisfaction: 'Gästernas nöjdhet',
      stamina: 'Personalens ork',
      noGuests: 'inga gäster',
      sek: (amount: string) => `${amount} kr`
    },
    // ORDER 274 — tiden kvar av servicen, hela kvällen.
    clock: {
      label: 'Servicen',
      now: (hhmm: string) => hhmm,
      left: (h: number, m: number) => (h > 0 ? `${h} h ${String(m).padStart(2, '0')} min kvar` : `${m} min kvar`),
      closes: (hhmm: string) => `Stänger ${hhmm}`,
      closed: 'Stänger',
      aria: (left: string, closes: string) => `${left}. ${closes}.`
    },
    events: {
      reviewerBooked: 'En recensent har bokat bord i kväll. Ryktet har nått ut.',
      reviewGood: 'Recensenten gick nöjd. Kvällen höll, och det kommer att stå i tidningen.',
      reviewBad: 'Recensenten såg en kväll som inte höll ihop. Det kommer att märkas i ryktet.',
      reviewMixed: 'Recensenten skrev ner både det som fungerade och det som inte gjorde det.',
      cleanEvening: 'Ingen gick ifrån i kväll. Det pratas om det, och ryktet hämtar sig.',
      slowRecovery: 'Ryktet hämtar sig sakta. Gästerna minns inte längre den sämsta kvällen.',
      inspection: 'Miljöinspektören kom i morse. Stationerna hade inte hållits rena under gårdagens kväll.',
      inspectionLedger: 'Avgift efter inspektionen',
      bankCall: 'Banken ringde i morse. Kassan var under noll när dagen tog slut.'
    },
    stock: {
      forecast: (covers: string) => `Råvaror till ungefär ${covers} kuvert.`,
      none: 'Inga råvaror i lager. Du kan ändå öppna, men köket har inget att laga.',
      noMenu: 'Ingen meny satt i dag.'
    },
    morningEvents: 'I morse',
    wentWell: {
      happy: (n: string) => `${n} gick härifrån nöjda.`,
      happyOne: 'En gäst gick härifrån nöjd.',
      clean: 'Ingen gav upp i kön.',
      turned: 'När kvällen ställdes på sin spets tog du rätt beslut.'
    },
    numberWords: ['noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv', 'tretton', 'fjorton', 'femton', 'sexton', 'sjutton', 'arton', 'nitton', 'tjugo'],
    manyWord: 'fler än tjugo'
  },
  // ORDER 275 — lagret är insatsen.
  stock: {
    heading: 'Kvällens lager',
    intro: 'Köp lagret innan du öppnar. Pengarna går ur kassan direkt. Portionerna säljs ur lagret under servicen, och osåld mat blir svinn i kväll.',
    base: 'Baspaket',
    addOns: 'Köp till',
    buy: (price: string) => `Köp · ${price}`,
    boughtTimes: (n: number) => (n === 1 ? 'Köpt i dag' : `Köpt ${n}× i dag`),
    inStock: 'I lager nu',
    empty: 'Inget i lager. Gäster som kommer in hittar inget att beställa.',
    // Rätterna delar ingredienser: talet är taket om inget annat säljs.
    portions: (n: number) => `upp till ${n} ${n === 1 ? 'portion' : 'portioner'}`,
    covers: (n: number) => `Räcker till ungefär ${n} ${n === 1 ? 'gäst' : 'gäster'}.`,
    drinksKeep: 'Drycken står sig till i morgon. Maten gör det inte.',
    lastWaste: (sek: string) => `Gårdagens osålda mat blev svinn: ${sek}.`,
    wasteEvent: (sek: string) => `Osåld mat blev svinn vid stängning: ${sek}.`,
    packageLedger: (name: string) => `Lager: ${name}`,
    item: (portions: number, name: string) => `${portions} × ${name}`,
    packages: {
      'vinbar-base': { name: 'Baspaket', description: 'En vanlig vardagskväll: soppa, kyckling, fläsk och en dessert, med husets vin och lokal öl.' },
      'vinbar-extra-covers': { name: 'Fler kuvert', description: 'Kyckling, fläsk och husets vin till en livligare kväll.' },
      'vinbar-fish': { name: 'Insjöfisk', description: 'Pocherad insjöfisk, till gäster som vill ha något lättare.' },
      'vinbar-lamb': { name: 'Lamm', description: 'Lamm med rotfrukter, en dyrare tallrik.' },
      'vinbar-game': { name: 'Vilt', description: 'Hjort från Bergslagen, menyns dyraste tallrik.' },
      'vinbar-fine-wine': { name: 'Finare vin', description: 'Ett bättre vin på glas, till ett högre pris.' },
      'vinbar-house-wine': { name: 'Mer husets vin', description: 'Husets vin på glas, till en törstig kväll.' }
    } as Record<string, { name: string; description: string }>
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
  },
  // Vision Owner efter speltest: "inga engelska paneler". Paneltexter som
  // tidigare stod på engelska direkt i komponenterna.
  panels: {
    // Satsningskortens tre effektchips (ekonomiskt, socialt, ekologiskt).
    activityEffects: {
      panelAria: 'Morgonens satsningar',
      aria: 'Effekt på de tre kapitalen',
      econ: 'Ekon',
      soc: 'Soc',
      ecol: 'Ekol'
    },
    menu: {
      aria: 'Meny och inköp',
      menuHeading: 'Dagens meny',
      ingredientCost: (sek: string) => `råvarukostnad ≈ ${sek} kr`,
      priceAria: (dish: string) => `Pris för ${dish} i kronor`,
      confirmAria: 'Fastställ dagens meny',
      confirm: (n: number) => `Fastställ menyn (${n} ${n === 1 ? 'rätt' : 'rätter'})`,
      stockHeading: 'Köp in råvaror',
      supplierAria: 'Leverantör',
      ingredientAria: 'Råvara',
      offer: (sek: string, reliabilityPct: string) => `${sek} kr · leveranssäkerhet ${reliabilityPct} %`,
      unitsAria: 'Antal att köpa',
      buyAria: 'Bekräfta inköpet',
      buy: 'Köp'
    },
    prep: {
      heading: 'Mise en place',
      items: {
        ice: 'is',
        napkins: 'servetter',
        cutlery: 'bestick',
        stations: 'stationer',
        garnish: 'garnityr'
      } as Record<string, string>,
      stations: {
        bar: 'baren',
        floor: 'matsalen',
        kitchen: 'köket',
        pass: 'passet'
      } as Record<string, string>,
      doorsOpen: 'Dörrarna öppnas — servicen börjar.',
      doorsOpenReady: 'Dörrarna öppnas — salen är redo.',
      doorsOpenThin: (station: string, item: string) => `Dörrarna öppnas — ${station} ligger efter (${item}).`
    },
    evening: {
      heading: 'Kvällens avräkning',
      figuresHeading: 'Dagens siffror',
      ledgerHeading: 'Dagens kassabok',
      revenue: 'Intäkter',
      costs: 'Kostnader',
      result: 'Resultat',
      reputation: 'Rykte',
      knowledge: 'Kunskap',
      newRound: 'Ny omgång',
      newRoundAria: 'Starta en ny omgång från dag 1',
      nothingToRecord: 'Inget att bokföra i dag.',
      entriesAria: 'Dagens poster',
      currency: 'kr',
      thousandSuffix: 'tkr',
      entryAria: (cause: string, amount: string, running: string) =>
        `${cause}: ${amount} kr, kassa ${running} kr`,
      // Kort kategorietikett i kassabokens första kolumn.
      category: {
        revenue: 'Intäkt',
        wage: 'Lön',
        agency: 'Hyrp.',
        ingredient: 'Råv.',
        interest: 'Ränta',
        scenario: 'Händ.',
        buyout: 'Avg.',
        stock: 'Inköp',
        floor: 'Golv',
        amortisation: 'Amort.',
        other: '—'
      }
    },
    cash: {
      label: 'Kassa',
      unit: 'tkr',
      pillAria: 'Kassa',
      pillTitle: (amount: string) => `Klicka för att öppna verksamhetens konto — kassa ${amount}`,
      accountAria: 'Verksamhetens konto',
      heading: 'Kassa',
      valuation: 'värdering'
    },
    platesRemaining: {
      heading: 'Portioner kvar',
      out: 'SLUT'
    },
    verifyBadge: 'GRÅSKISS — © OpenStreetMap-bidragsgivare (ODbL) · byggnadshöjder och material stiliserade'
  },
  // ORDER 271 — Designs paket 6 (servicen som raketer): raketkortet R1–R3,
  // mätarna, kvällens lärdom L1, kvällsberättelsen K1 och rutan X1.
  rocket: {
    card: {
      rocketOf: (n: string, total: string) => `Raket ${n} av ${total}`,
      table: (n: string) => `Bord ${n}`,
      room: 'Rummet',
      stepCleared: (ask: string) => `${ask} · klar ✓`,
      stepCurrent: (ask: string, sec: string) => `${ask} · ${sec} s · pågår`,
      stepNext: (sec: string) => `Nästa · ${sec} s`,
      stepAhead: (ask: string, sec: string) => `${ask} · ${sec} s`,
      stepFailed: (ask: string) => `${ask} · fel`,
      stepUnreached: 'Nås inte',
      stepAsks: { episteme: 'Vad', techne: 'Hur', phronesis: 'När och varför' } as Record<string, string>,
      right: (next: string) => `Rätt · vidare till ${next}`,
      rightDone: 'Rätt · raketen höll',
      wrong: (role: string) => `Fel · ${role} tar över`,
      correctTag: 'Rätt',
      yourTag: 'Ditt svar',
      timedOut: 'Tiden gick ut innan du svarade.',
      footer: (role: string) => `Tangent 1–4 väljer. Rummet väntar inte. Går tiden ut räknas det som fel svar, och ${role} tar över.`,
      secondsLeft: (sec: string) => `${sec} sekunder kvar`,
      takeover: (role: string) => `${role} tar över`
    },
    meters: {
      cash: 'Kassa',
      guests: 'Gästerna',
      staff: 'Personalen',
      note: 'Tio steg per mätare. Riktning, inte belopp.',
      delta: (name: string, sign: string, n: string) => `${name} ${sign}${n}`,
      sentence: (parts: string) => `${parts}.`,
      nothing: 'Mätarna står still.'
    },
    lesson: {
      label: (weekday: string, hour: string) => `${weekday} · Stängt ${hour}.00 · Kvällens lärdom`,
      wentWrong: (clock: string, step: string, ask: string) => `Det som gick fel · ${clock} · ${step}, ${ask}`,
      also: (clock: string, step: string, ask: string) => `Också · ${clock} · ${step}, ${ask}`,
      question: (q: string) => `Frågan: ${q}`,
      youChose: (label: string) => `Du valde: ${label}.`,
      staffDecided: 'Du svarade inte i tid, och personalen beslutade själv.',
      right: (label: string) => `Rätt var: ${label}.`,
      noneTitle: 'Varje raket höll',
      gridRocket: 'Raket',
      legendCleared: '✓ klarat',
      legendFailed: '✗ fel, personalen tog över',
      legendUnreached: '— nåddes inte',
      cellCleared: 'klarat',
      cellFailed: 'fel, personalen tog över',
      cellUnreached: 'nåddes inte',
      summary: (n: string, total: string) => `${n} av ${total} steg klarade i kväll.`,
      practice: (pavilion: string) => `Öva i ${pavilion} i morgon`,
      toStory: 'Till kvällsberättelsen'
    },
    story: {
      label: (weekday: string, hour: string) => `${weekday} kväll · Stängt ${hour}.00`,
      title: (weekday: string, business: string) => `${weekday} i ${business}`,
      weekdayDefinite: { mon: 'Måndagen', tue: 'Tisdagen', wed: 'Onsdagen', thu: 'Torsdagen', fri: 'Fredagen', sat: 'Lördagen', sun: 'Söndagen' } as Record<string, string>,
      evening: 'Kvällen',
      wentWell: 'Det som gick bra',
      wentWrong: 'Det som gick fel',
      cause: (why: string) => `Orsak: ${why}`,
      noCause: 'Orsak: inget svar i tid, och personalen fick besluta själv.',
      nothingWell: 'Ingen raket höll hela vägen i kväll.',
      nothingWrong: 'Inget gick fel i kväll.',
      back: 'Tillbaka till lärdomen'
    },
    stranded: {
      label: 'Ingen verksamhet · ingen kassa',
      medals: 'Dina medaljer finns kvar. Det du har lärt dig tas aldrig ifrån dig.',
      cashShort: 'Kassan räcker inte till en ny insats.',
      toHouse: 'Gå till Måltidens hus'
    }
  }
} as const;
