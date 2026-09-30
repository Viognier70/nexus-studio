// ORDER 291 — scenarierna vid dörren på svenska (Vision Owner 2026-09-30:
// "Allt innehåll ska finnas på båda språken"). Scenarierna spelas i klasser
// utan händelsebank (food truck). strategic/simulation/scenarios.ts håller
// den engelska texten och läser härifrån när spelet går på svenska; id och
// val är desamma, bara texten skiljer.

export interface ScenarioChoiceTextSv {
  label: string;
  immediateOutcome: string;
  outcomes: readonly string[];
  mentor: string;
  extraOutcome?: string;
}

export interface ScenarioTextSv {
  subjectBody: string;
  subjectCta: string;
  situationBody: string;
  choices: Record<'A' | 'B' | 'C', ScenarioChoiceTextSv>;
}

export const SCENARIO_TEXT_SV: Record<string, ScenarioTextSv> = {
  'walk-in-of-five': {
    subjectBody: 'Ett sällskap står i dörren — utan bokning.',
    subjectCta: 'Fortsätt',
    situationBody: 'Fem i sällskapet. Servicen börjar snart och rummet är delvis bokat. Vad gör du?',
    choices: {
      A: {
        label: 'Placera alla fem — skjut ihop fyrabordet och ett tvåbord.',
        extraOutcome: 'Disken svämmade över av tallrikar från de ihopskjutna borden — hälften av resterna gick till spillo innan någon hann sortera dem. Hm, sådant svinn kommer inte tillbaka.',
        immediateOutcome: 'Sällskapet fick fyrabordet och tvåbordet ihopskjutna. Grannbordet fick flytta på sig.',
        outcomes: [
          'Fyrabordet och tvåbordet har skjutits ihop — nästa bord får huka sig mot väggen för att nå sina bestick. Ingen sa något, men jag såg blicken; jag undrar om vi borde ha förklarat innan de själva fick lista ut det.',
          'Sällskapets beställning kom till passet på en gång — köket har fem varmrätter samtidigt i stället för utspritt. Kocken vid grillen ser sammanbiten ut; hm, det valde vi när vi sa ja.'
        ],
        mentor: 'Att skjuta ihop bord fungerar när salen är med dig. Håll ett öga på tvåbordet bredvid.'
      },
      B: {
        label: 'Fyra vid fyrabordet, den femte i baren.',
        immediateOutcome: 'Fyra vid fyrabordet, en i baren. Bartendern hälsar på den femte.',
        outcomes: [
          'Fyra sitter vid fyrabordet och en sitter i baren — den femte hänger jackan över barstolen och försöker se avslappnad ut. Sällskapet vid bordet tittar bort lite för ofta; jag undrar om han vet att vi vet att vi delade på dem.',
          'Bartendern hälsade sent på den femte — han hann sitta ut sin egen tystnad först. Nu står drinken framför honom, men samtalet vid bordet har gått vidare utan honom. Hm, den sortens ensamhet är svår att ta tillbaka efteråt.'
        ],
        mentor: 'Förnuftig delning. Barplatsen fungerar bara om någon i personalen hinner dit i tid.'
      },
      C: {
        label: 'Säg nej till sällskapet.',
        immediateOutcome: 'Sällskapet fick nej. Två dröjde sig kvar i entrén, tre gick.',
        outcomes: [
          'Två i sällskapet vände i entrén innan värden hade talat till punkt — de andra tre följde efter utan att fråga varför. Värden blir stående med en artighet på tungan som ingen tog emot; hm, det ansiktet är svårare att glömma än beslutet var att fatta.',
          'En stamgäst vid fönsterbordet såg hela utbytet och höjde ett ögonbryn mot sitt sällskap. De sa ingenting till oss, men de utbytte en blick. Jag undrar hur många kvällar det tar innan den blicken kommer tillbaka som en avbokning.'
        ],
        mentor: 'Att säga nej är också ett val. Kvällen håller sin rytm — men rummet noterar det.'
      }
    }
  },
  'time-pressure': {
    subjectBody: 'En delegation ringer — vill boka till i morgon, men vill att specialmenyn provas i kväll.',
    subjectCta: 'Fortsätt',
    situationBody: 'Bokningen ber köket byta in den nya menyn i kväll för att smaka igenom rätterna. Ett ekonomiskt lyft i morgon, men laget har nästan ingen tid att planera. Vad gör du?',
    choices: {
      A: {
        label: 'Ta bokningen och kör den nya menyn i kväll.',
        extraOutcome: 'Kocken vände sig bort utan att svara när jag nämnde bokningen — den blicken har jag sett förut. Hm, den sortens tystnad kostar mer än en kväll.',
        immediateOutcome: 'Menyn byts mitt i servicen. Två pågående beställningar börjar om.',
        outcomes: [
          'Menyn byts mitt i servicen — köket kvitterar med en nick och börjar tömma stationerna. Två beställningar får släppas halvfärdiga och börjas om. Jag undrar om vi förklarade tydligt nog att det här var mitt beslut, inte deras.',
          'Notan sväller snabbt när delegationen är bokad till i morgon — men resten av kvällen betalar i tempo. Två stambord får sitt bröd senare än vanligt; hm, det är priset för morgondagens vinst, betalt i kvällens andrum.'
        ],
        mentor: 'Vinst i siktet, slitage i praktiken. Ge laget mer tid att planera nästa gång.'
      },
      B: {
        label: 'Ta bokningen — bara i morgon, ingen provning i kväll.',
        immediateOutcome: 'Bokningen skrivs in till i morgon. Kvällen fortsätter som vanligt.',
        outcomes: [
          'Bokningen skrevs in till i morgon — kvällen kunde andas ut. Servitören berättade för köket och båda log lite utan att säga något. Jag undrar om den sortens signal håller ihop ett lag längre än en bonus gör.',
          'Kocken började planera morgondagens meny i huvudet mitt i servicen — han var redan hemma i tankarna. Hm, det är den lyxiga sortens uppmärksamhet vi köpte genom att säga nej i kväll och ja i morgon.'
        ],
        mentor: 'Gott omdöme. Delegationen kommer i morgon utan att kvällen tar skada.'
      },
      C: {
        label: 'Tacka nej — behåll kvällens rytm.',
        immediateOutcome: 'Bokningen avböjdes. Delegationen lade på utan att pressa vidare.',
        outcomes: [
          'Delegationen tackade artigt och lade på — inom en halvtimme hörde vi från en stamgäst att de bokat hotellrestaurangen i stället. Jag undrar om vår rytm är värd det vi tror, eller om vi satte en gräns där ingen annan hade gjort det.',
          'Kvällen höll sitt tempo — inga fler överraskningar nådde passet. Servitörerna rör sig som om de vet vad de gör två timmar till. Hm, det lugnet är svårt att räkna i kassan men lätt att räkna i vem som orkar komma in i morgon.'
        ],
        mentor: 'Att tacka nej är också ett svar. Kvällen håller, men intäkten går till någon annan.'
      }
    }
  },
  'moral-dilemma': {
    subjectBody: 'Leverantören ringer — dagens fisk finns bara som osäkerhet.',
    subjectCta: 'Fortsätt',
    situationBody: 'Fisken kom via en bruten kylkedja — troligen bra, men inte spårbar. Ersättning på torsdag om du säger nej. Vad gör du?',
    choices: {
      A: {
        label: 'Ta fisken — laget märker den noga och hoppas.',
        extraOutcome: 'Två stamgäster har märkt att ursprunget aldrig nämns längre — jag hörde dem prata om det på väg ut. Hm, den tystnaden är svår att vinna tillbaka.',
        immediateOutcome: 'Fisken går ut. Spårbarheten nämns inte.',
        outcomes: [
          'Två av förrätterna gick ut utan att någon nämnde att spårbarheten saknades — värden slingrar sig undan frågor från stamgästerna vid bord tre. Han svarar utan att svara. Jag undrar om han vet att själva motviljan säger något som gästen läser utan att sätta ord på det.',
          'En gäst frågade rakt ut var fisken kom ifrån — servitören tystnade en sekund för länge innan hon svarade "från vår vanliga leverantör". Bordet godtog det men utbytte en blick. Hm, den sekunden är den enda gången vi hade kunnat ta tillbaka det.'
        ],
        mentor: 'Att välja tempo framför spårbarhet. Det syns bara om något går fel.'
      },
      B: {
        label: 'Byt meny i kväll — ta ett annat protein.',
        immediateOutcome: 'Menyn byts. Köket tar fram kyckling i stället för fisken.',
        outcomes: [
          'Menytavlan skrevs om i sista minuten — köket gick över till kyckling utan att klaga och började ta fram det som fanns. Ingen kommenterade bytet. Jag undrar om det lugnet kommer av att beslutet var mitt att fatta och deras att utföra.',
          'Alternativet presenterades utan ursäkt — servitören sa "vi har anpassat menyn efter dagens leverans" och bordet nickade utan att fråga vidare. Hm, det är den sortens språk som gör ett byte till ett val i stället för ett problem.'
        ],
        mentor: 'Förnuftig kompromiss. Menyn viker för säkerheten utan att brista.'
      },
      C: {
        label: 'Skriv om menyn — lyft fram säsongens grönt.',
        immediateOutcome: 'Menyn skrivs om helt. Säsongens grönt tar täten.',
        outcomes: [
          'De gröna rätterna presenterades med sin egen berättelse — servitören berättade för bordet om odlaren och veckans skörd. Sorlet steg märkbart över tre bord. Jag undrar om vi kommer att se tillbaka på det här som punkten där menyn ändrades för gott, eller som en enstaka kväll.',
          'En gäst anmärkte att kvällens meny hade ändrats och nickade gillande — hon frågade var grönsakerna kom ifrån. Servitören kunde svaret. Hm, det svaret är resultatet av morgonens beslut att inte ta genvägen.'
        ],
        mentor: 'Ett ekologiskt drag. Menyn får en riktning och säsongen blir läsbar.'
      }
    }
  }
};

export const SENDER_PREFIX_SV = {
  'värd': 'Värden',
  'servitör': 'Servitören',
  'kock': 'Kocken',
  'lärling': 'Lärlingen',
  'sommelier': 'Sommeliern',
  'gäst': 'Gästen'
} as const;
