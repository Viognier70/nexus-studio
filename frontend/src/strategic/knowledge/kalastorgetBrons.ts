// ORDER 233 — Kalastorgets tio bronsfrågor.
//
// Källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// avsnittet "Kalastorget — fronesis" (tillagt sist i filen).
// Formen följer briefen `FRAGORNA_TILL_PAVILJONGERNA.md` §7.
//
// **Källfilen är kanonisk. Denna modul är replikat.** Testet
// `__tests__/kalastorgetBrons.test.ts` läser källfilen på nytt vid
// varje körning och verifierar att modulen matchar per fält (samma
// pattern som ORDER 229/231/232).
//
// **Ankarmappning** (per VO 2026-09-21):
//   - "när gästen tas emot"     → anchorId='greet'        (koreografi)
//   - "när beställningen tas upp" → anchorId='order'      (koreografi)
//   - "när notan begärs"        → anchorId='requestCheck' (koreografi)
//   - "när en gäst klagar"      → phase='service' UTAN anchorId
//                                  (väntar på Fas 2 `guest_complaint`-
//                                  event per ORDER 224 §7)
//   - "morgon" → phase='morning'
//   - "kväll"  → phase='evening'
//
// Kalastorget är sista av de fyra brons-paviljongerna. Efter denna
// modul finns 40 brons-frågor totalt (Metodköket 10 + Stensöta 10 +
// Måltidsbiblioteket 10 + Kalastorget 10) — samma tal som
// FRAGORNA_TILL_PAVILJONGERNA.md §8 angav som "fyrtio innan det är
// värt att pröva".

import type { FlervalQuestion } from './questionFormats';

export const KALASTORGET_BRONS_QUESTIONS: readonly FlervalQuestion[] = [
  {
    id: 'kalastorget-brons-01',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'värd',
    prompt:
      'Ett sällskap på fem kommer utan bokning en fredag. Alla bord är tagna och det första blir ledigt om cirka fyrtio minuter. Vad gör du?',
    options: [
      'Säger att det blir ledigt snart, så att de stannar kvar',
      'Ger en ärlig väntetid och erbjuder plats i baren eller en bokning en annan kväll',
      'Tränger in dem vid ett fyrabord med en extra stol',
      'Beklagar att det är fullt och ber dem återkomma'
    ],
    correctIndex: 1,
    explanation:
      'En ärlig väntetid låter sällskapet välja själva, och baren eller en ny bokning gör att de inte går tomhänta. C lockar eftersom sällskapet får sitta direkt, men ett trångt bord ger en sämre kväll för dem och sämre service för grannborden. A köper tid men kostar förtroende när fyrtio minuter blir en timme.',
    anchor: {
      phase: 'service',
      anchorId: 'greet',
      rawText: 'när gästen tas emot'
    }
  },
  {
    id: 'kalastorget-brons-02',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'servitör',
    prompt:
      'Gästen beställde biffen medium rare, men den är genomstekt. Hon säger det lugnt när du går förbi. Vad gör du?',
    options: [
      'Förklarar att köttet fortsätter att tillagas under vilan',
      'Tar tallriken direkt, ber kort om ursäkt och ser till att en ny biff går före i köket',
      'Kontrollerar med kocken innan du säger något till gästen',
      'Erbjuder rabatt på notan så att hon slipper vänta'
    ],
    correctIndex: 1,
    explanation:
      'Felet är uppenbart och gästen har rätt, så det viktigaste är att agera direkt och synligt. En kort ursäkt räcker; det är den nya biffen som reparerar kvällen. C lockar eftersom det känns noggrant, men att gå iväg utan att ta tallriken lämnar gästen med felet framför sig.',
    anchor: {
      // phase='service' UTAN anchorId — väntar på Fas 2:s guest_complaint-
      // event per ORDER 224 §7 (VO:s prio 1 av 9 händelsetyper).
      phase: 'service',
      rawText: 'när en gäst klagar'
    }
  },
  {
    id: 'kalastorget-brons-03',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'gäst',
    prompt: 'Jag är allergisk mot nötter. Kan jag ta pannacottan?',
    options: [
      'Ja, det står inga nötter i beskrivningen på menyn',
      'Nej, för säkerhets skull avråder vi från alla desserter',
      'Du kontrollerar med köket vad som ingår och hur den hanteras, och återkommer innan något serveras',
      'Ja, om gästen har sin medicin med sig'
    ],
    correctIndex: 2,
    explanation:
      'Menyn beskriver rätten, inte vad som finns i den eller vad den kommit i kontakt med — praliner, garnityr och delade redskap syns inte där. Att kontrollera och återkomma tar en minut och tar allergin på allvar. A är det lockande felsvaret eftersom det låter hjälpsamt, men ett snabbt ja på fel grund kan bli allvarligt.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'kalastorget-brons-04',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'gäst',
    prompt:
      'Jag är här ofta. Kan köket göra den där pastan från förra säsongen i kväll, fast den inte står på menyn?',
    options: [
      'Ja, stamgäster ska alltid få det de ber om',
      'Nej, vi lagar bara det som står på menyn',
      'Du frågar köket innan du svarar, och om det inte går föreslår du det som ligger närmast',
      'Ja, och du ber köket prioritera den eftersom gästen är stamgäst'
    ],
    correctIndex: 2,
    explanation:
      'Om det går beror på vad köket har hemma och hur hårt pressat det är just då — det vet inte den som står vid bordet. Genom att fråga först undviker du att lova något köket inte kan hålla. A lockar eftersom stamgäster är viktiga, men ett löfte som köket sedan måste bryta skadar relationen mer än ett vänligt nej med ett alternativ.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'kalastorget-brons-05',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'lärling',
    prompt: 'Gästen vid bord sju är märkbart berusad och beställer ett glas till. Vad gör jag?',
    options: [
      'Serverar, men ett mindre glas',
      'Frågar sällskapet om det är okej',
      'Säger diskret att du inte serverar mer alkohol i kväll, och erbjuder vatten och något att äta',
      'Ber gästen att lämna restaurangen'
    ],
    correctIndex: 2,
    explanation:
      'Enligt alkohollagen får alkohol inte serveras till den som är märkbart påverkad, så svaret är nej oavsett glasets storlek. Att säga det diskret och samtidigt erbjuda vatten och mat bevarar gästens värdighet. B lockar eftersom sällskapet känner gästen, men ansvaret för serveringen kan inte lämnas över till dem.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'kalastorget-brons-06',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'gäst',
    prompt: 'Den här flaskan på notan tror jag inte att vi beställde. Kan du titta på det?',
    options: [
      'Visar utskriften från kassasystemet som bevis',
      'Går igenom beställningen lugnt med gästen, och stryker posten om det inte går att reda ut',
      'Hämtar chefen direkt',
      'Säger att den måste betalas, men erbjuder rabatt nästa gång'
    ],
    correctIndex: 1,
    explanation:
      'Kvällens sista minuter formar gästens minne av hela besöket, och en omtvistad flaska är värd mindre än den relationen. Att gå igenom beställningen tillsammans utan att lägga skuld löser de flesta fall. A lockar eftersom systemet ofta har rätt, men att bevisa att gästen har fel vinner diskussionen och förlorar gästen.',
    anchor: {
      phase: 'service',
      anchorId: 'requestCheck',
      rawText: 'när notan begärs'
    }
  },
  {
    id: 'kalastorget-brons-07',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'kock',
    prompt: 'Lammet är slut. Bord fyra beställde det för fem minuter sedan. Hur hanterar vi det?',
    options: [
      'Väntar tills varmrätterna går ut och förklarar då',
      'Går till bordet nu, säger som det är och föreslår ett par alternativ',
      'Skickar ut en annan rätt och förklarar när den serveras',
      'Ber köket improvisera något liknande utan att säga något'
    ],
    correctIndex: 1,
    explanation:
      'Ju tidigare gästen får veta, desto mer tid finns att välja om utan att sällskapets tempo störs. Två konkreta alternativ gör beskedet till ett val i stället för en förlust. A lockar eftersom det skjuter upp ett obekvämt samtal, men då sitter gästen utan mat medan resten av bordet äter.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'kalastorget-brons-08',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'värd',
    prompt:
      'Sällskapet vid fönsterbordet har betalat men sitter kvar och pratar. Nästa bokning kommer om en kvart. Vad gör du?',
    options: [
      'Börjar duka av runt dem så att de förstår',
      'Låter dem sitta och ber nästa sällskap vänta vid dörren',
      'Säger vänligt i god tid att bordet är bokat, och erbjuder kaffe i baren',
      'Väntar tills nästa sällskap står i dörren och ber då de första gå'
    ],
    correctIndex: 2,
    explanation:
      'En vänlig förvarning i god tid ger sällskapet chans att avsluta i lugn, och kaffe i baren gör flytten till en fortsättning i stället för en utkastning. A lockar eftersom den undviker ett samtal, men signaler utan ord upplevs som ohövliga. B skyddar det ena sällskapet på det andras bekostnad.',
    anchor: {
      phase: 'service',
      anchorId: 'requestCheck',
      rawText: 'när notan begärs'
    }
  },
  {
    id: 'kalastorget-brons-09',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'värd',
    prompt:
      'En servitör har sjukanmält sig. Sextio kuverter är bokade i kväll. Vad gör du före öppning?',
    options: [
      'Kör som vanligt och hoppas att kvällen går',
      'Avbokar de sista bokningarna för att få ned antalet',
      'Förenklar kvällen, till exempel färre sittningar eller en kortare meny, och går igenom den nya fördelningen med laget',
      'Tar själv över den sjukas hela station utöver ditt eget arbete'
    ],
    correctIndex: 2,
    explanation:
      'Ett lag som är en person kort klarar samma kväll om tempot anpassas och alla vet sin nya uppgift innan dörrarna öppnas. Att förenkla är ett beslut; att hoppas är det inte. D lockar eftersom det känns ansvarsfullt, men värden som gör två jobb tappar överblicken som kvällen behöver.',
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'kalastorget-brons-10',
    format: 'flerval',
    axis: 'phronesis',
    spar: null,
    pavilion: 'kalastorget',
    level: 'brons',
    askerRole: 'värd',
    prompt:
      'Lärlingen gjorde ett misstag vid bord tolv som ledde till ett klagomål. Hur tar du upp det?',
    options: [
      'Inför hela laget vid kvällens genomgång, så att alla lär sig',
      'Enskilt, efter service eller på morgonen, med fokus på vad som hände och vad som görs annorlunda',
      'Vid nästa medarbetarsamtal, så att det inte blir för känslosamt',
      'Låter det passera eftersom gästen redan fått en ursäkt'
    ],
    correctIndex: 1,
    explanation:
      'Ett enskilt samtal medan händelsen är färsk gör det möjligt att förstå vad som hände utan att lärlingen behöver försvara sig inför andra. Fokus på nästa gång gör misstaget till lärande. A lockar eftersom andra också kan lära sig, men det lärandet kan tas upp som ett exempel utan namn.',
    anchor: {
      phase: 'evening',
      rawText: 'kväll'
    }
  }
];
