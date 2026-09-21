// ORDER 231 — Stensötas tio bronsfrågor.
//
// Källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// avsnittet "Stensöta — techne, sommellerie" (2026-09-21 re-export).
// Formen följer briefen `FRAGORNA_TILL_PAVILJONGERNA.md` §7.
//
// **Källfilen är kanonisk. Denna modul är replikat.** Testet
// `__tests__/stensotaBrons.test.ts` läser källfilen på nytt vid
// varje körning och verifierar att modulen matchar per fält (samma
// pattern som `metodkoketBrons.test.ts` från ORDER 229).
//
// Ankarfördelning (per VO 2026-09-21):
//   - "när beställningen tas upp" → anchorId='order' (4 frågor:
//     #02, #03, #07, #10). Kopplas till ORDER 225:s `order`-ankare
//     som fyras ~86 ggr/pass (ORDER 227 §1).
//   - "när vin serveras" → anchorId='setDown' (5 frågor: #01, #04,
//     #05, #06, #09). Kopplas till ORDER 225:s `setDown`-ankare —
//     **dead mapping tills ORDER 227 §5a-remap** (mappningen
//     `staff.taskType === 'serve'` fyrade 0 ggr/pass i mätningen
//     eftersom findTaskTarget('serve') aldrig matchar).
//   - "morgon" → phase='morning', ingen anchorId (1 fråga: #08).
//
// Ingen picker läser dessa frågor ännu. Fas 2 (event-lagret,
// ORDER 224 §7) binder anchor → fråga.

import type { FlervalQuestion } from './questionFormats';

export const STENSOTA_BRONS_QUESTIONS: readonly FlervalQuestion[] = [
  {
    id: 'stensota-brons-01',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'gäst',
    prompt:
      'Det röda känns spritigt och platt i kväll. Flaskan har stått framme i matsalen, som håller 23 grader. Vad gör du?',
    options: [
      'Dekanterar vinet så att det får mer luft',
      'Kyler flaskan några minuter ned mot 16–17 °C',
      'Byter till ett glas med större kupa',
      'Öppnar en ny flaska av samma vin'
    ],
    correctIndex: 1,
    explanation:
      'Värme ökar alkoholens flyktighet, så spriten tar över doften medan fruktens friskhet dämpas. Några minuter i kylen eller en ishink räcker för att få tillbaka balansen. Dekantering lockar eftersom den ofta löser problem med slutna viner, men luft gör ingenting åt temperaturen.',
    anchor: {
      phase: 'service',
      anchorId: 'setDown',
      rawText: 'när vin serveras'
    }
  },
  {
    id: 'stensota-brons-02',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'sommelier',
    prompt: 'Varför fungerar ett tanninrikt rött vin så bra till en fet, välhängd entrecôte?',
    options: [
      'Syran i vinet bryter ned fettet kemiskt i munnen',
      'Alkoholen löser upp fettet så att det sköljs bort',
      'Tanninerna binder till proteiner, så strävheten mildras och fettet känns lättare',
      'Tanninerna förstärker köttets umami så att vinet smakar fylligare'
    ],
    correctIndex: 2,
    explanation:
      'Tanniner binder till proteiner, både i saliven och i maten. Med kött på tungan fångas tanninerna upp och vinet upplevs mjukare, samtidigt som strävheten rensar känslan av fett. A lockar eftersom syra verkligen upplevs fräscha mot fett, men den verkan är sinnlig, inte en kemisk nedbrytning.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'stensota-brons-03',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'sommelier',
    prompt:
      'Ett sällskap beställer en het thailändsk curry och vill ha ett kraftigt rött på 15 procent till. Vad är det viktigaste att säga?',
    options: [
      'Hög alkohol förstärker upplevd hetta; ett vin med lägre alkohol och lite restsötma fungerar bättre',
      'Tanninerna i ett kraftigt rött neutraliserar chilins hetta',
      'Hög syra i vinet släcker chili bättre än alkohol gör',
      'Ett fatlagrat vin dämpar hettan genom sina vaniljtoner'
    ],
    correctIndex: 0,
    explanation:
      'Alkohol förstärker hur capsaicin upplevs, så hettan blir skarpare och vinet smakar bränt. Restsötma och låg alkohol verkar åt motsatt håll. B är det lockande felsvaret, men tanniner och chili förstärker varandra — strävhet och hetta adderas.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'stensota-brons-04',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'gäst',
    prompt: 'Vinet luktar som en fuktig källare, nästan som blöt kartong. Är det meningen?',
    options: [
      'Nej, det är troligen en korkdefekt; flaskan ska bytas',
      'Ja, det är brettanomyces och en del av vinets stil',
      'Nej, vinet behöver luftas en halvtimme så försvinner lukten',
      'Ja, det är svavel från tappningen och klingar av i glaset'
    ],
    correctIndex: 0,
    explanation:
      'Doft av fuktig källare och blöt kartong är kännetecknet för TCA, den vanligaste korkdefekten. Den går inte att lufta bort och dämpar dessutom vinets frukt, så flaskan byts. B lockar eftersom brett också ger jordiga toner, men den luktar stall och läder, inte våt papp.',
    anchor: {
      phase: 'service',
      anchorId: 'setDown',
      rawText: 'när vin serveras'
    }
  },
  {
    id: 'stensota-brons-05',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'sommelier',
    prompt:
      'Du ska öppna en champagne vid bordet utan smäll och utan att tappa kolsyra. Hur gör du?',
    options: [
      'Tar av buren helt, greppar korken och vrider den försiktigt',
      'Lossar buren men håller kvar tummen, och vrider flaskan medan korken hålls stilla',
      'Öppnar med flaskan rakt upp så att skummet stannar i halsen',
      'Vrider korken snabbt så att trycket släpps på en gång'
    ],
    correctIndex: 1,
    explanation:
      'Buren sitter kvar som grepp och skydd, och flaskan vrids i cirka 45 graders vinkel medan korken hålls fast. Då släpps trycket ut med en suck i stället för en smäll. A lockar eftersom det känns naturligt, men utan bur och tumme kan korken skjuta iväg i samma stund som den lossnar.',
    anchor: {
      phase: 'service',
      anchorId: 'setDown',
      rawText: 'när vin serveras'
    }
  },
  {
    id: 'stensota-brons-06',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'sommelier',
    prompt: 'En 25 år gammal Bordeaux ska dekanteras. Vad är huvudskälet, och vad bör du undvika?',
    options: [
      'Att ge tanninerna ett par timmar att mjukna; undvik att servera den direkt',
      'Att höja temperaturen; undvik en kall karaff',
      'Att skilja vinet från fällningen; undvik att låta det stå länge i karaffen',
      'Att få bort svavelstickan; undvik att hälla för långsamt'
    ],
    correctIndex: 2,
    explanation:
      'Ett gammalt vin dekanteras främst för att fällningen ska stanna i flaskan. Samtidigt är det skört: för mycket luft kan få det att falla ihop på en halvtimme. A är rätt för ett ungt, stramt vin — och därför lockande — men gäller inte här.',
    anchor: {
      phase: 'service',
      anchorId: 'setDown',
      rawText: 'när vin serveras'
    }
  },
  {
    id: 'stensota-brons-07',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'sommelier',
    prompt:
      'Till en crème brûlée föreslår en kollega ett torrt, friskt vitt som kontrast. Vad händer i munnen?',
    options: [
      'Kontrasten lyfter både vin och dessert',
      'Vinet upplevs surt och tunt eftersom desserten är sötare',
      'Vinets syra skär igenom grädden och balanserar sötman',
      'Ingenting särskilt, så länge vinet håller låg alkohol'
    ],
    correctIndex: 1,
    explanation:
      'Söt mat får vin att smaka mindre sött och mer syrligt, så ett torrt vin blir strävt och tunt bredvid en dessert. Tumregeln är att vinet ska vara minst lika sött som rätten. A och C lockar eftersom kontrast ofta är ett bra parningsgrepp — men inte när det gäller sötma.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  },
  {
    id: 'stensota-brons-08',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'kock',
    prompt: 'Jag sätter grön sparris med hollandaise på menyn i dag. Vilken stil av vin ska vi para med?',
    options: [
      'En fyllig, fatlagrad chardonnay som möter smöret',
      'En ung, tanninrik röd som står emot såsen',
      'En frisk, oekad vit med grön ton, som sauvignon blanc eller grüner veltliner',
      'En söt riesling som balanserar sparrisens beska'
    ],
    correctIndex: 2,
    explanation:
      'Sparrisens svavelföreningar och beska får ek och tanniner att smaka metalliskt, medan ett friskt, oekat vin med gröna toner möter dem. Syran räcker också mot hollandaisens smör. A lockar eftersom smörsås ofta paras med ekad chardonnay, men eken krockar med sparrisen.',
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'stensota-brons-09',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'gäst',
    prompt:
      'Den vita burgundern doftar nästan ingenting. Den har stått i isbadet sedan ni öppnade den. Är den dålig?',
    options: [
      'Troligen korkad; flaskan bör bytas',
      'Den behöver dekanteras för att öppna sig',
      'Den är för kall; låt den stiga mot 10–12 °C i glaset',
      'Glaset är för stort så doften sprids ut'
    ],
    correctIndex: 2,
    explanation:
      'Kyla håller kvar aromämnena i vinet, så ett fylligt vitt som stått länge i is blir stumt. Några minuter i handen eller på bordet räcker för att doften ska komma fram. A lockar eftersom stumhet kan vara ett korkfel, men korkade viner har en egen doft av fuktig källare — de är inte bara tysta.',
    anchor: {
      phase: 'service',
      anchorId: 'setDown',
      rawText: 'när vin serveras'
    }
  },
  {
    id: 'stensota-brons-10',
    format: 'flerval',
    axis: 'techne',
    spar: 'sommellerie',
    pavilion: 'stensota',
    level: 'brons',
    askerRole: 'gäst',
    prompt: 'Jag dricker inte alkohol i kväll. Vad passar till den friterade rätten jag beställde?',
    options: [
      'En söt fruktdryck som balanserar saltet',
      'En mousserande dryck med tydlig syra och låg sötma',
      'En fyllig, krämig dryck som matchar friteringens fett',
      'Stilla vatten med citron, så att smaken inte störs'
    ],
    correctIndex: 1,
    explanation:
      'Kolsyra och syra rensar munnen från fett på samma sätt som champagne gör till friterat. Låg sötma hindrar drycken från att bli tung bredvid rätten. C lockar eftersom lika-med-lika fungerar i många parningar, men fett mot fett förstärker bara tyngden.',
    anchor: {
      phase: 'service',
      anchorId: 'order',
      rawText: 'när beställningen tas upp'
    }
  }
];
