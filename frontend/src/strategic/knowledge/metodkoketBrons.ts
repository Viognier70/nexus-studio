// ORDER 229 — Metodkökets tio bronsfrågor.
//
// Källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// avsnittet "Metodköket — techne, kök" (2026-09-20 av @Someone).
// Formen följer briefen `FRAGORNA_TILL_PAVILJONGERNA.md` §7.
//
// **Källfilen är kanonisk. Denna modul är replikat.** Testet
// `__tests__/metodkoketBrons.test.ts` läser källfilen på nytt vid
// varje körning och verifierar att modulen matchar (per ORDER 160-
// principen — talen ur skriptets källa, inte fixturer). Om briefen
// ändras utan att den här filen regenereras bryter testet.
//
// Ingen picker läser dessa frågor ännu. `pickBankQuestionForContext`
// / `pickQuestionForAnchor` byggs i Fas 2 (ORDER 224 §7). Tills dess
// är modulen innehåll som väntar på anropare — men ligger i typecheck-
// bar form så framtida integration inte kräver innehållsomskrivning.

import type { FlervalQuestion } from './questionFormats';

export const METODKOKET_BRONS_QUESTIONS: readonly FlervalQuestion[] = [
  {
    id: 'metodkoket-brons-01',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      'Du bryner rotselleri i smör och vill ha djup färg utan bränd sötma. Vad skiljer maillardreaktionen från karamellisering?',
    options: [
      'Maillard kräver aminosyror tillsammans med reducerande socker; karamellisering är sockrets egen nedbrytning utan kväve',
      'Maillard sker i fett, karamellisering i vattenfas',
      'Maillard kräver högre temperatur än karamellisering',
      'Maillard ger färgen, karamellisering ger smaken'
    ],
    correctIndex: 0,
    explanation:
      'Maillard är en reaktion mellan en aminogrupp och ett reducerande socker, och ger därför kvävehaltiga aromämnen som karamellisering saknar. C är det lockande felsvaret eftersom båda sker vid hög värme — men rent socker karamelliserar först runt 160 °C, medan maillard går i gång betydligt tidigare.',
    anchor: {
      phase: 'service',
      station: 'range',
      rawText: 'vid stationen, när grönsaker bryns'
    }
  },
  {
    id: 'metodkoket-brons-02',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      'En kycklinglårfilé har legat länge i 60 °C vattenbad. En kollega säger att den är osäker eftersom den aldrig nått 70 °C. Vad avgör säkerheten?',
    options: [
      'Kärntemperaturen ensam — under 70 °C är kyckling alltid osäker',
      'Temperatur och hålltid tillsammans; tillräckligt länge vid 60 °C ger samma reduktion som ett ögonblick vid 70 °C',
      'Vakuumpåsens syrefattiga miljö, som hindrar salmonella',
      'Vilotiden efter badet, då värmen utjämnas inåt'
    ],
    correctIndex: 1,
    explanation:
      'Pastörisering är en logaritmisk reduktion som beror på både temperatur och tid, så 60 °C under tillräckligt många minuter ger samma säkerhet som 70 °C under några sekunder. A är svaret en halvkunnig ger, eftersom 70 °C är siffran som lärs ut för snabb tillagning — men den siffran förutsätter just kort tid. Syrefattig miljö hjälper inte: salmonella är fakultativt anaerob.',
    anchor: {
      phase: 'morning',
      station: 'range',
      rawText: 'vid stationen, när badet sätts på morgonen'
    }
  },
  {
    id: 'metodkoket-brons-03',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      'En gelé på gelatin ska göras vegetarisk med agar. Vilken skillnad märks tydligast i munnen?',
    options: [
      'Agargelén stelnar bara i kyla och rinner så snart den lämnar kylen',
      'Agargelén smälter inte vid kroppstemperatur utan bryts i stycken',
      'Agargelén blir mjukare och lösare än gelatingelén',
      'Agargelén kräver syra för att stelna och smakar därför surt'
    ],
    correctIndex: 1,
    explanation:
      'Gelatin smälter runt 35 °C, alltså strax under kroppstemperatur, vilket ger den smältning på tungan som gästen förväntar sig. Agar smälter först runt 85 °C och behåller formen i munnen, så gelén spricker i stället för att smälta. A vänder på förhållandet — det är gelatin, inte agar, som är det värmekänsliga av de två.',
    anchor: {
      phase: 'morning',
      station: 'pastry',
      rawText: 'när en dessert sätts inför service'
    }
  },
  {
    id: 'metodkoket-brons-04',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt: 'Hollandaisen skär sig när den blir för varm. Vad har hänt med emulsionen?',
    options: [
      'Smöret har avdunstat och lämnat vattenfasen ensam',
      'Syran från citronen har neutraliserats så att pH stigit',
      'Äggulans proteiner har koagulerat och släppt de fettdroppar de höll isär',
      'Fettdropparna har blivit för små för att hålla ihop'
    ],
    correctIndex: 2,
    explanation:
      'Det är äggulans proteiner och lecitin som lägger sig kring fettdropparna och hindrar dem från att slå samman. När värmen koagulerar proteinerna förlorar de den funktionen och fettet skiljer ut sig. B lockar eftersom syran verkligen bidrar till stabiliteten, men den försvinner inte av värme — det är proteinet som ger vika.',
    anchor: {
      phase: 'service',
      station: 'range',
      rawText: 'vid stationen, mitt i service'
    }
  },
  {
    id: 'metodkoket-brons-05',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      'Varför avråds ofta från att salta en biff tio minuter före stekning, men inte fyrtio?',
    options: [
      'Efter tio minuter ligger utdragen vätska kvar på ytan och hindrar bryningen; efter fyrtio har den tagits upp igen',
      'Saltet hinner inte lösa sig på tio minuter och ger ojämn smak',
      'Efter tio minuter har saltet koagulerat ytproteinerna så att de inte kan brynas',
      'Kort saltkontakt smakar beskt, längre kontakt mildrar'
    ],
    correctIndex: 0,
    explanation:
      'Saltet drar först ut vätska genom osmos, och den vätskan måste kokas bort innan ytan kan nå bryningstemperatur. Med längre tid löses saltet i vätskan och dras tillbaka in i köttet, så ytan hinner torka upp. B är det troligaste felsvaret — saltet löser sig snabbt, problemet är var vätskan befinner sig, inte hur jämnt saltet fördelats.',
    anchor: {
      phase: 'morning',
      station: 'range',
      rawText: 'vid stationen, när kött förbereds före service'
    }
  },
  {
    id: 'metodkoket-brons-06',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      'En stärkelseredd sås tunnas ut efter att citronsaft tillsatts och såsen fått koka vidare. Varför?',
    options: [
      'Syran binder vattnet så att mindre finns kvar åt stärkelsen',
      'Syran sänker kokpunkten så att stärkelsen aldrig gelatiniseras',
      'Syran hydrolyserar stärkelsekedjorna, som blir för korta för att förtjocka',
      'Syran denaturerar mjölets gluten, som bär konsistensen'
    ],
    correctIndex: 2,
    explanation:
      'Under värme spjälkar syran de långa amylos- och amylopektinkedjorna i kortare bitar, och korta kedjor binder mycket mindre vatten. Därför tillsätts syra helst sent, efter att såsen dragit ihop sig. D lockar eftersom gluten är det man förknippar med vetemjöl, men i en sås är det stärkelsen och inte proteinet som gör arbetet.',
    anchor: {
      phase: 'service',
      station: 'pass',
      rawText: 'vid stationen, när en sås justeras före uppläggning'
    }
  },
  {
    id: 'metodkoket-brons-07',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt: 'En grönsaksjäsning står i fyraprocentig saltlake. Vad gör saltet i första hand?',
    options: [
      'Hämmar saltkänsliga mikroorganismer så att mjölksyrabakterierna får ett försprång',
      'Sänker pH direkt och startar därmed jäsningen',
      'Tillför näring som mjölksyrabakterierna behöver för att föröka sig',
      'Stoppar all mikrobiell aktivitet tills syran börjat bildas'
    ],
    correctIndex: 0,
    explanation:
      'Salt verkar selektivt, inte steriliserande: mjölksyrabakterier tål högre salthalt än de flesta bakterier och mögelsvampar som annars skulle ta över. Sänkningen av pH kommer sedan, som resultat av bakteriernas egen mjölksyra — inte av saltet. Det gör B till det vanligaste felsvaret, eftersom slutresultatet mycket riktigt är en sur lake.',
    anchor: {
      phase: 'service',
      station: 'brew',
      rawText: 'vid bryggkaret, när en sats sätts'
    }
  },
  {
    id: 'metodkoket-brons-08',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt: 'Ärtor blancheras före infrysning. Vad är huvudsyftet?',
    options: [
      'Att döda bakterier så att ärtorna håller längre i frysen',
      'Att inaktivera enzymer som annars bryter ned färg och smak under frysförvaring',
      'Att driva ut luft så att iskristallerna blir mindre',
      'Att fixera klorofyllet permanent'
    ],
    correctIndex: 1,
    explanation:
      'Enzymer som peroxidas och lipoxygenas arbetar långsamt vidare även vid minus arton grader och ger med tiden hö- och gräsaktiga bismaker. Blancheringen slår ut dem. A lockar eftersom värmebehandling normalt handlar om mikrobiologi, men i frysen är bakterierna redan stoppade — det är enzymerna som fortsätter.',
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  },
  {
    id: 'metodkoket-brons-09',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      'En högrev har legat tre timmar vid 62 °C i vattenbad och är fortfarande seg. Vad saknas?',
    options: [
      'Högre kärntemperatur, eftersom kollagen inte löses under 70 °C',
      'Tid, eftersom omvandlingen av kollagen till gelatin går långsamt vid låg temperatur',
      'Vila, så att muskelfibrerna slappnar av och tar upp saften igen',
      'Salt, som måste tränga in för att lösa bindväven'
    ],
    correctIndex: 1,
    explanation:
      'Kollagen löses till gelatin även strax över 60 °C, men processen är starkt tidsberoende och kan kräva ett dygn i stället för några timmar. A ligger närmast till hands för den som lärt sig grytans 85 °C — men där är det den högre temperaturen som gör tiden kort, inte tvärtom.',
    anchor: {
      phase: 'service',
      station: 'range',
      rawText: 'vid stationen, när nästa dags mise en place sätts'
    }
  },
  {
    id: 'metodkoket-brons-10',
    format: 'flerval',
    axis: 'techne',
    spar: 'kok',
    pavilion: 'metodkoket',
    level: 'brons',
    askerRole: 'kock',
    prompt:
      'En marängsmet vill inte skumma upp trots lång vispning. Vad är den vanligaste orsaken?',
    options: [
      'Äggvitorna var för kalla när vispningen började',
      'Sockret tillsattes för sent i vispningen',
      'Spår av fett i skålen eller från äggulan',
      'Skålen var av rostfritt stål i stället för koppar'
    ],
    correctIndex: 2,
    explanation:
      'Fettmolekyler tränger in mellan äggviteproteinerna och hindrar dem från att bilda den sammanhängande film som håller luftbubblorna. En droppe gula räcker. A lockar eftersom rumstempererade vitor mycket riktigt skummar lättare — men kyla gör skummet långsammare, inte omöjligt.',
    anchor: {
      phase: 'morning',
      rawText: 'morgon'
    }
  }
];
