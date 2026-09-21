// ORDER 232 — Måltidsbibliotekets tio bronsfrågor.
//
// Källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// avsnittet "Måltidsbiblioteket — episteme" (tillagt sist i filen).
// Formen följer briefen `FRAGORNA_TILL_PAVILJONGERNA.md` §7.
//
// **Källfilen är kanonisk. Denna modul är replikat.** Testet
// `__tests__/maltidbiblioteketBrons.test.ts` läser källfilen på nytt
// vid varje körning och verifierar att modulen matchar per fält
// (samma pattern som ORDER 229 Metodköket + ORDER 231 Stensöta).
//
// **Anmärkning om paviljong-id-stavning:** briefen använder
// `maltidsbiblioteket` (med "s"), som är svensk grammatiskt korrekt.
// Kodbasen har konsekvent `maltidbiblioteket` (utan "s") sedan
// ORDER 104 — se `pavilions.ts:44-49` och seed-frågan
// `r2-seed-maltidbiblioteket` i `questionTemplates.ts:110`. VO
// 2026-09-21: använd befintlig stavning. Visningsnamnet i
// `pavilions.ts` (displayName) rättas i samma commit till
// "Måltidsbiblioteket" med s för att spegla svensk grammatik utan
// att röra id:t.
//
// **Anmärkning om källor:** alla tio frågor saknar KÄLLA-fält i
// briefen. `sources`-fältet på `BaseQuestion` är optionellt och
// utelämnas helt här. Verifierat 2026-09-21: `validateQuestion` läser
// inte sources; `coverageErrors` (bygg-gate) läser inte sources;
// `coverageReport.epistemeWithoutSource` är analys utan test-assert.
// Ingen risk att bryta bygget; känd innehållslucka som Vision Owner
// noterar för framtida källhänvisning.
//
// **Anmärkning om ankare:** fråga #09 (brigadsystemet) är första
// `phase: 'evening'`-frågan i kodbasen. Ingen fyrningsmekanism finns
// för evening-phase idag; ORDER 226 §7 väntar på integration mot
// `bankMeeting.ts`.

import type { FlervalQuestion } from './questionFormats';

export const MALTIDBIBLIOTEKET_BRONS_QUESTIONS: readonly FlervalQuestion[] = [
  {
    id: 'maltidbiblioteket-brons-01',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'gäst',
    prompt: 'Vad är egentligen skillnaden mellan champagne och en crémant?',
    options: [
      'Champagne jäser andra gången på flaska, crémant i tank',
      'Champagne är en skyddad ursprungsbeteckning; crémant görs med samma metod i andra franska regioner',
      'Champagne får bara göras på chardonnay, crémant på alla druvor',
      'Champagne är torr, crémant är alltid halvtorr'
    ],
    correctIndex: 1,
    explanation:
      'Båda görs med den traditionella metoden, där den andra jäsningen sker i flaskan. Skillnaden är var: champagne får bara komma från det avgränsade området Champagne, medan crémant är samma metod i exempelvis Loire, Alsace eller Bourgogne. A är det lockande felsvaret, eftersom tankjäsning är det man förknippar med billigare mousserande — men det gäller inte crémant.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'maltidbiblioteket-brons-02',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'lärling',
    prompt: 'Vad är umami egentligen, och var kommer begreppet ifrån?',
    options: [
      'En blandning av salt och sött, beskriven av franska kockar på 1800-talet',
      'Smaken av glutamat och vissa nukleotider, beskriven av Kikunae Ikeda i Japan 1908',
      'Känslan av fett i munnen, som en japansk forskare gav namn på 1950-talet',
      'En samlingsterm för fermenterade smaker, lånad från koreanskt kök'
    ],
    correctIndex: 1,
    explanation:
      'Ikeda isolerade glutamat ur kombu, tången i dashi, och gav smaken namnet umami. Senare visades att nukleotider som inosinat och guanylat förstärker den, vilket förklarar varför kombu och bonito fungerar så bra ihop. A lockar eftersom umami ofta beskrivs som runt och fylligt, men det är en egen grundsmak med egna receptorer.',
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'maltidbiblioteket-brons-03',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'kock',
    prompt: 'Vilken av dessa räknas inte till Escoffiers fem grundsåser?',
    options: ['Velouté', 'Espagnole', 'Béarnaise', 'Béchamel'],
    correctIndex: 2,
    explanation:
      'Escoffiers fem grundsåser är béchamel, velouté, espagnole, tomatsås och hollandaise. Béarnaise är en dottersås till hollandaisen, med dragon och vinäger. Den lockar eftersom den är så central i klassiskt kök — men den bygger på en grundsås i stället för att vara en.',
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'maltidbiblioteket-brons-04',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'gäst',
    prompt: 'Vad är skillnaden mellan torrhängt kött och kött som mognat i vakuumpåse?',
    options: [
      'Vakuummognat blir alltid mörare, eftersom vätskan stannar kvar',
      'Torrhängning påverkar bara ytan; insidan är likadan',
      'Torrhängt tappar vätska och får koncentrerad, nötig smak; båda mörnar genom köttets egna enzymer',
      'Skillnaden ligger bara i hur länge köttet har hängt'
    ],
    correctIndex: 2,
    explanation:
      'I båda metoderna bryter köttets egna enzymer ned muskelproteiner och gör köttet mörare. Det torrhängda förlorar dessutom vätska och utvecklar nötiga, lätt ostiga toner, vilket vakuummognat inte gör. B lockar eftersom den torra skorpan skärs bort, men smakförändringen går genom hela biten.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'maltidbiblioteket-brons-05',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'gäst',
    prompt: 'Den här tomatsåsen känns som något riktigt gammalt. Har italienarna ätit tomatsås sedan romartiden?',
    options: [
      'Ja, tomater odlades redan i det romerska riket',
      'Nej, tomaten kom från Amerika på 1500-talet och tog plats i italienskt kök först från slutet av 1600-talet',
      'Ja, tomaten kom via sidenvägen från Asien under medeltiden',
      'Nej, tomatsås uppfanns i USA och fördes till Italien av återvandrare'
    ],
    correctIndex: 1,
    explanation:
      'Tomaten har sitt ursprung i Sydamerika och kom till Europa efter Columbus. Den betraktades länge med misstänksamhet, och de första tryckta italienska recepten på tomatsås är från 1690-talet. A lockar eftersom tomaten känns så grundläggande i italiensk mat, men den är yngre än både pasta och olivolja i det köket.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'maltidbiblioteket-brons-06',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'lärling',
    prompt: 'Vad menar man med terroir?',
    options: [
      'Den jordiga doften som vissa viner har',
      'Platsens samlade inverkan — jord, klimat, läge och ofta lokal tradition — på det som odlas där',
      'Druvsorten som ett vin är gjort på',
      'En officiell kvalitetsklassning av franska vingårdar'
    ],
    correctIndex: 1,
    explanation:
      'Terroir betecknar hur en plats präglar en produkt genom jordmån, klimat, sluttning och ofta hävdvunna metoder. Begreppet används för vin men också för ost, kaffe och te. A lockar eftersom ordet liknar terre, jord, och jordiga toner ibland tillskrivs terroir — men begreppet handlar om platsen, inte om en doft.',
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'maltidbiblioteket-brons-07',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'kock',
    prompt: 'Receptet till sorbeten anger 28 °Brix. Vad mäter det?',
    options: [
      'Halten lösta ämnen, i praktiken mest socker, i vätskan',
      'Syrahalten i fruktpurén',
      'Vätskans viskositet vid serveringstemperatur',
      'Andelen fast fruktkött i basen'
    ],
    correctIndex: 0,
    explanation:
      'En grad Brix motsvarar ungefär ett gram löst socker per hundra gram lösning, och mäts med refraktometer. I sorbet avgör sockerhalten hur hårt den fryser, så Brix är ett arbetsmått — samma mått används för druvmustens mognad. C lockar eftersom sockret faktiskt påverkar konsistensen, men Brix mäter halten, inte hur trögflytande vätskan är.',
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'maltidbiblioteket-brons-08',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      'En gäst har uppgett allergi. Vilken av dessa ingredienser måste enligt EU:s regler kunna redovisas som allergen?',
    options: ['Tomat', 'Vitlök', 'Selleri', 'Paprika'],
    correctIndex: 2,
    explanation:
      'Selleri är ett av de fjorton ämnen som EU kräver att restauranger kan redovisa, tillsammans med bland annat senap, sesam och lupin. Den gömmer sig ofta i fonder, buljonger och kryddblandningar, vilket gör den lätt att missa. Tomat och vitlök kan ge överkänslighet hos enskilda gäster, men omfattas inte av listan.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'maltidbiblioteket-brons-09',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'lärling',
    prompt: 'Varför kallas köksorganisationen med chef de partie och commis för brigadsystemet?',
    options: [
      'Den byggdes efter brandkårens organisation i Paris',
      'Escoffier organiserade köket efter militär förebild kring sekelskiftet 1900',
      'Den kommer från klosterköken under medeltiden',
      'Den infördes av den franska revolutionens nya restauranger'
    ],
    correctIndex: 1,
    explanation:
      'Auguste Escoffier, som själv tjänstgjort i armén, delade in köket i stationer med tydlig befälsordning för att klara stora hotellserviser. Strukturen lever kvar i dag i titlar som sous-chef och chef de partie. Revolutionen lockar eftersom den gav upphov till de första restaurangerna, men köksbrigaden kom ett sekel senare.',
    anchor: {
      phase: 'evening',
      rawText: 'kväll'
    }
  },
  {
    id: 'maltidbiblioteket-brons-10',
    format: 'flerval',
    axis: 'episteme',
    spar: null,
    pavilion: 'maltidbiblioteket',
    level: 'brons',
    askerRole: 'gäst',
    prompt: 'Vad betyder confit egentligen — är det bara ett finare ord för stekt anka?',
    options: [
      'Nej, det betyder marinerat i vin före tillagning',
      'Nej, det betyder kallrökt och lagrat',
      'Nej, det betyder konserverat genom långsam tillagning och förvaring i fett eller socker',
      'Nej, det betyder inlagt i ättika och kryddor'
    ],
    correctIndex: 2,
    explanation:
      'Ordet kommer av franskans confire, att konservera. Ankan tillagas långsamt i sitt eget fett och kan sedan förvaras täckt av det, på samma sätt som frukt konserveras i socker. D lockar eftersom inläggning också är konservering, men confit bygger på fett eller socker, inte på syra.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  }
];
