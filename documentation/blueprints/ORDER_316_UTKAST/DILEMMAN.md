# ORDER 316 — Fikat efter stängning: utkast till tolv dilemman

**Status:** utkast till Anders granskning. Inget är inbyggt i spelet. Texten är på svenska. Den engelska skrivs när utkastet är godkänt, och då står båda i strängtabellen (`nexusStrings.ts`).

**Underlag:** `~/Downloads/ORDRAR_314-316_D7.md`, ORDER 316 (beslut C, Anders 2026-10-06).

**Principen.** Efter stängning tar laget en fika. En i personalen kommer fram med en fråga av komplex natur. Det är phronesis och social hållbarhet i praktiken: det finns inget enkelt rätt eller fel, bara hållningar som är mer eller mindre väl grundade.

## Så fungerar kortet (förslag)

- **Högst ett dilemma per kväll.** Det utlöses av något som hänt under kvällen (raden *Utlöses av* under varje dilemma). Har inget av det hänt kommer inget dilemma.
- **Kortet:** personen som frågar (namn och roll), frågan, och 3–4 svar. Varje svar är en motiverad hållning, inte ett faktasvar.
- **Bedömningen** följer en rubrik med tre nivåer:

  | Nivå | Vad det betyder |
  |---|---|
  | Väl grundat | Väger flera parters intressen, följer lag och säkerhet, och tar ansvar för följden. |
  | Delvis grundat | Ser en viktig sida men missar en annan, eller skjuter upp det svåra. |
  | Svagt grundat | Löser stunden på någon annans bekostnad, eller blundar för en risk. |

- **Efter svaret** visas en kort förklaring av vad som vägdes mot vad. Spelaren får inte höra att svaret var "fel".
- **Följderna**, i ordning:
  1. **Först** personalens trivsel och lojalitet, alltså det sociala kapitalet.
     - Förslag: väl grundat ger trivsel +2 och lojalitet +1, delvis grundat ger trivsel +1, svagt grundat ger trivsel −2 och lojalitet −1.
     - Den som frågade påverkas dubbelt.
  2. **Sedan**, i vissa fall, ekonomin. Till exempel höjer en genväg i livsmedelssäkerheten risken för tillsyn de närmaste kvällarna. Det står under *Ekonomi* där det gäller.
  3. **Sist** krediter för phronesis.
     - Förslag: väl grundat 3, delvis grundat 1, svagt grundat 0.
     - Portfolion registrerar evidensen: dilemmat, svaret, nivån och kvällen.
- **"Gå hem"** finns alltid. Trivseln sjunker något (förslag −1 för hela laget), och raden blir: *"Chefen hade inte tid i kväll."*
- **Talen är förslag.** De kalibreras mot harness när utkastet är godkänt.

## Juridisk granskning

Dilemman med juridiska frågor är märkta **⚖ Granskas**, med lagen som berörs:
- diskrimineringslagen (2008:567);
- arbetsmiljölagen (1977:1160) med föreskrifterna om organisatorisk och social arbetsmiljö (AFS 2015:4);
- livsmedelslagen (2006:804) och EU:s förordningar om livsmedelshygien (852/2004) och livsmedelsinformation (1169/2011, allergener).

Förklaringarna i utkastet beskriver hållningen, inte lagens exakta krav. Texten om vad lagen säger behöver granskas av någon med juridisk kunskap innan den står i spelet.

## Personerna

Laget i vinbaren (`strings.foljder.staffName`): **Per** (hovmästare), **Sara** (servitör), **Elin** (sommelier), **Mira** (bartender), **Jonas** (kock).

---

## Livsmedelssäkerhet

### 1. Kylen som slog av ⚖ Granskas (livsmedelslagen, 852/2004)
- **Utlöses av:** en leverans eller ett eftersläp i köket (mise en place) under kvällen.
- **Frågar:** Jonas, kock.
- **Frågan:** "Kylen i kalla köket stod öppen en stund i kväll, och termometern visade elva grader när jag stängde den. Det ligger lax och crème fraiche i den. Ska vi slänga allt, eller räcker det att använda det först i morgon?"
- **Svaren:**
  - **A.** "Vi slänger det som ligger över gränsen och skriver upp vad som hände i egenkontrollen. Det kostar, men vi vet vad vi serverar." *Väl grundat.*
  - **B.** "Vi luktar och känner på det i morgon bitti och bestämmer då." *Svagt grundat.*
  - **C.** "Laxen slänger vi, men crème fraichen är syrad och klarar sig. Skriv upp båda." *Delvis grundat.*
  - **D.** "Använd det först i morgon, men bara i varma rätter." *Svagt grundat.*
- **Förklaringen:** Svinnet vägdes mot gästernas säkerhet och mot att egenkontrollen visar vad som hänt. Lukten avslöjar inte bakterier. Uppvärmning räddar inte allt, och vad som gäller för olika varor behöver bedömas mot egenkontrollprogrammet.
- **Ekonomi:** A och C kostar varan i morgonens inköp. B och D höjer risken för tillsyn och klagomål i tre kvällar.

### 2. Allergin som nästan gick fel ⚖ Granskas (1169/2011, allergeninformation)
- **Utlöses av:** en gäst med allergi under kvällen, eller en händelse om allergener.
- **Frågar:** Sara, servitör.
- **Frågan:** "Jag frågade köket om nötter i desserten, och Jonas sa nej. Sedan såg jag att pralinen är gjord på hasselnöt. Gästen hann inte äta. Jag vet inte om jag ska ta upp det, Jonas hade fullt upp."
- **Svaren:**
  - **A.** "Bra att du såg det. Vi tar det med Jonas i morgon, lugnt, och sätter ett kort med allergenerna vid varje rätt så att ingen behöver minnas." *Väl grundat.*
  - **B.** "Det gick ju bra. Vi låter det vara, Jonas blir bara stressad." *Svagt grundat.*
  - **C.** "Jag pratar med Jonas själv i kväll, innan han går." *Delvis grundat.*
- **Förklaringen:** Att det gick bra vägdes mot att det kan hända igen. Felet låg i hur svaret gavs, inte i en enskild person. Ett system (allergenkort, rutin) skyddar både gästen och den som svarar under stress. Sara som sa till ska känna att det var rätt.
- **Ekonomi:** inga direkt. Väljer spelaren A föreslås förmågan Allergenkort i butiken (`ab.allergen`).

## Jämställdhet

### 3. Dricksen
- **Utlöses av:** kvällens dricks över ett belopp (kvällsrapportens dricks).
- **Frågar:** Mira, bartender.
- **Frågan:** "Dricksen i kväll gick till dem som stod vid borden. Jonas och diskaren fick ingenting, fast de jobbade lika hårt. Hur ska vi dela den?"
- **Svaren:**
  - **A.** "Vi delar lika på alla som jobbade i kväll, efter timmar, och skriver upp hur. Då vet alla vad som gäller." *Väl grundat.*
  - **B.** "Den som fick dricksen har gjort sig förtjänt av den." *Svagt grundat.*
  - **C.** "Köket får en tredjedel. Vi provar det en vecka och frågar laget sedan." *Delvis grundat.*
- **Förklaringen:** Att ge till den som gästen ser vägdes mot att kvällen görs av hela laget. En regel som alla känner till skapar mindre misstro än en bedömning varje kväll. Att fråga laget efter en vecka är bra, men tills dess saknas en regel.
- **Ekonomi:** inga. Hur dricks redovisas och beskattas kan behöva en rad i spelets regler senare.

### 4. Vem som får stå i baren ⚖ Granskas (diskrimineringslagen)
- **Utlöses av:** en kväll med stor kö vid baren, eller ett schemabyte.
- **Frågar:** Sara, servitör.
- **Frågan:** "Per sa att killarna ska stå i baren på fredagar, för att gästerna 'vill ha det så'. Jag har stått i bar i tre år. Jag vill också få passen där dricksen är bäst."
- **Svaren:**
  - **A.** "Passen fördelas efter vad man kan och vill, inte efter kön. Jag pratar med Per om hur vi gör schemat." *Väl grundat.*
  - **B.** "Per har hand om rummet. Jag lägger mig inte i." *Svagt grundat.*
  - **C.** "Vi turas om på fredagarna, alla som vill." *Delvis grundat.*
- **Förklaringen:** Pers bild av gästerna vägdes mot Saras erfarenhet och rätt att bedömas efter sin förmåga. Att turas om är rättvist i stunden men säger inget om grunden. Som chef är det spelarens ansvar att schemat inte bygger på kön.
- **Ekonomi:** inga.

## Gränser för trakasserier

### 5. Gästen som gick över gränsen ⚖ Granskas (arbetsmiljölagen, AFS 2015:4)
- **Utlöses av:** en gäst som blivit för berusad, eller en händelse där en gäst varit otrevlig mot personalen.
- **Frågar:** Elin, sommelier.
- **Frågan:** "Gästen vid lounge B sa saker till mig i kväll som jag inte vill upprepa, och tog mig om armen när jag gick förbi. Han är stamgäst och lämnar mycket dricks. Jag vet inte om jag ska säga något."
- **Svaren:**
  - **A.** "Tack för att du säger det. Du ska inte behöva stå ut med det. Nästa gång han kommer pratar jag med honom, och händer det igen är han inte välkommen. Du serverar inte hans bord." *Väl grundat.*
  - **B.** "Han är nog bara glad. Säg ifrån själv nästa gång." *Svagt grundat.*
  - **C.** "Du slipper hans bord, så får Sara ta det." *Delvis grundat.*
  - **D.** "Vi skriver upp vad som hände och tar det på nästa personalmöte." *Delvis grundat.*
- **Förklaringen:** Stamgästens värde för kassan vägdes mot Elins trygghet och arbetsgivarens ansvar för arbetsmiljön. Att flytta Elin skyddar henne men lämpar över problemet på Sara. Att skriva upp är bra, men Elin behöver stöd nu.
- **Ekonomi:** A kan kosta en stamgäst (ryktet påverkas inte nämnvärt). B ger en risk att Elin säger upp sig inom en vecka (lojaliteten sjunker kraftigt).

### 6. Skämten i köket ⚖ Granskas (diskrimineringslagen, AFS 2015:4)
- **Utlöses av:** konflikt i laget (låg trivsel hos en i personalen).
- **Frågar:** Mira, bartender.
- **Frågan:** "Det skämtas mycket i köket om Saras utseende när hon går in med tallrikarna. Hon skrattar, men jag tror inte att hon tycker det är roligt. Ska vi göra något, fast hon inte har sagt något?"
- **Svaren:**
  - **A.** "Ja. Jag pratar med Sara först, i enrum, och sedan med köket om vad som är okej här. Det ska inte hänga på att hon säger något." *Väl grundat.*
  - **B.** "Om Sara inte klagar är det inte vårt problem." *Svagt grundat.*
  - **C.** "Jag säger till köket direkt i morgon att det ska upphöra." *Delvis grundat.*
- **Förklaringen:** Att respektera Saras eget val vägdes mot att arbetsgivaren ska förebygga kränkningar, också när ingen anmäler. Att gå direkt till köket utan att höra Sara kan göra hennes läge svårare.
- **Ekonomi:** inga.

## Service och bemötande

### 7. Gästen som inte fick bord
- **Utlöses av:** en kväll då kön var full och sällskap gick vidare (`turnedAway`).
- **Frågar:** Per, hovmästare.
- **Frågan:** "Jag sa nej till ett sällskap i kväll, för vi var fulla. De blev arga och sa att de skulle skriva en dålig recension. Jag tror jag var för kort i tonen. Hur borde jag ha gjort?"
- **Svaren:**
  - **A.** "Du gjorde rätt som sa nej. Nästa gång kan du ge dem en tid eller tipsa om en annan krog i byn. Ett nej kan vara vänligt." *Väl grundat.*
  - **B.** "Du skulle ha klämt in dem, gästen har alltid rätt." *Svagt grundat.*
  - **C.** "Det är deras sak hur de tar det." *Svagt grundat.*
  - **D.** "Vi kan börja ta bokningar på fredagar, så händer det mer sällan." *Delvis grundat.*
- **Förklaringen:** Gästens besvikelse vägdes mot rummets kapacitet och resten av gästerna. Att klämma in fler gör kvällen sämre för alla. Hur nejet sägs avgör ofta mer än själva nejet.
- **Ekonomi:** inga.

### 8. Den äldre gästen som inte hann med
- **Utlöses av:** en gäst som väntat länge, eller en gäst med särskilda behov (till exempel rullstolen i händelserna).
- **Frågar:** Sara, servitör.
- **Frågan:** "Ett äldre par satt i en timme innan någon tog beställningen, för alla sprang förbi. Mannen sa att 'det här stället är inte för sådana som oss'. Det kändes inte bra."
- **Svaren:**
  - **A.** "Vi gör en regel: varje bord får en blick inom fem minuter, oavsett hur fullt det är. Och jag skickar ett kort till dem med en inbjudan." *Väl grundat.*
  - **B.** "Det var en stressig kväll. Det händer." *Svagt grundat.*
  - **C.** "Nästa gång tar du dem först." *Delvis grundat.*
- **Förklaringen:** Kvällens tempo vägdes mot att alla gäster ska känna sig välkomna. En regel för alla bord skyddar mot att några gäster blir osynliga. Att ge just dem förtur löser det enskilda fallet men inte mönstret.
- **Ekonomi:** inga. A kan ge en recension på rad i morgontidningen.

## Återkoppling

### 9. Kollegan som är långsam
- **Utlöses av:** en anställd med låg ork eller många uppgifter kvar (personalens ork under kvällen).
- **Frågar:** Mira, bartender.
- **Frågan:** "Den nya diskaren är långsam, och vi får vänta på glas hela kvällen. Jag vill inte gå till dig och klaga bakom hennes rygg, men det påverkar mig. Vad ska jag göra?"
- **Svaren:**
  - **A.** "Säg det till henne själv, vänligt och konkret: vad du behöver och när. Vill du kan vi prata alla tre. Och jag ser över om hon har fått lära sig rutinen." *Väl grundat.*
  - **B.** "Jag pratar med henne. Du behöver inte göra något." *Delvis grundat.*
  - **C.** "Hon får en vecka på sig, sedan får vi se." *Svagt grundat.*
- **Förklaringen:** Miras behov vägdes mot diskarens rätt att få veta vad som förväntas och att lära sig. Direkt och konkret återkoppling mellan kollegor bygger förtroende. När chefen tar över helt lär sig ingen av dem att ge eller ta emot återkoppling.
- **Ekonomi:** inga.

## Kommunikation

### 10. Beskedet om schemat
- **Utlöses av:** när personalen bytts (anställning eller uppsägning) samma dag.
- **Frågar:** Per, hovmästare.
- **Frågan:** "Laget hörde från någon annan att vi tar in ny personal och att några får färre pass. Nu är det oro. Varför fick vi inte höra det från dig först?"
- **Svaren:**
  - **A.** "Du har rätt, det borde ni ha hört från mig. Jag samlar alla i morgon före öppning och berättar vad som gäller och varför." *Väl grundat.*
  - **B.** "Det var inte bestämt än, därför sa jag inget." *Delvis grundat.*
  - **C.** "Det är mitt beslut. Ni får se schemat när det är klart." *Svagt grundat.*
- **Förklaringen:** Rätten att fatta beslutet vägdes mot lagets behov av att veta vad som händer med deras arbete. Att erkänna att informationen kom fel väg och rätta det bygger förtroende. Att vänta tills allt är klart lämnar fältet åt rykten.
- **Ekonomi:** inga.

## Arbetsmiljö

### 11. Passen som aldrig tar slut ⚖ Granskas (arbetsmiljölagen, arbetstidslagen 1982:673)
- **Utlöses av:** låg ork i laget flera kvällar i rad, eller en kväll utan rast.
- **Frågar:** Jonas, kock.
- **Frågan:** "Jag har jobbat sex kvällar i rad, och i kväll hann jag inte äta. Jag älskar jobbet, men jag orkar inte så här länge till."
- **Svaren:**
  - **A.** "Det håller inte. Du är ledig i morgon, och vi ser över schemat så att alla får sin vila och sin rast. Om det behövs tar vi in en extra hand." *Väl grundat.*
  - **B.** "Det är högsäsong. Snart blir det lugnare." *Svagt grundat.*
  - **C.** "Ta en längre rast i morgon, så klarar du resten av veckan." *Delvis grundat.*
- **Förklaringen:** Veckans tryck vägdes mot Jonas hälsa och arbetsgivarens ansvar för vila och raster. Att lova att det blir bättre senare flyttar risken framåt. En lång rast hjälper i stunden men inte mot mönstret.
- **Ekonomi:** A kostar en extra hand (lärling eller bemanning) nästa kväll. B ger en risk att Jonas blir sjuk eller säger upp sig.

### 12. Genvägen vid stängning ⚖ Granskas (livsmedelslagen, arbetsmiljölagen)
- **Utlöses av:** en kväll som slutar sent, eller låg ork vid stängning.
- **Frågar:** Sara, servitör.
- **Frågan:** "Vi brukar hoppa över att skura golvet i köket på torsdagar, för alla vill hem. Diskaren halkade nästan i kväll. Ska vi fortsätta så?"
- **Svaren:**
  - **A.** "Nej. Golvet skuras varje kväll, och vi delar upp stängningen så att det går fortare och ingen blir kvar ensam." *Väl grundat.*
  - **B.** "En kväll i veckan gör inget." *Svagt grundat.*
  - **C.** "Vi skurar bara där det är halt." *Delvis grundat.*
- **Förklaringen:** Lagets trötthet vägdes mot halkrisken och hygienen i köket. Att dela upp stängningen tar hand om både tröttheten och säkerheten. En genväg som blivit vana är svår att se förrän något händer.
- **Ekonomi:** B och C höjer risken för tillsyn och för en arbetsskada (en anställd borta några kvällar).

---

## Datamodellen (förberedd för spel för flera, byggs inte nu)

Förslag till form, när utkastet är godkänt:

```ts
interface Dilemma {
  id: string;                    // 'fika-kylen'
  theme: 'food-safety' | 'equality' | 'harassment' | 'service' | 'feedback' | 'communication' | 'work-environment';
  triggers: DilemmaTrigger[];    // vad i kvällen som utlöser det
  asker: StaffKey;               // 'cook'
  legalReview: string[];         // lagarna som granskas; tom när ingen
  options: Array<{
    id: 'A' | 'B' | 'C' | 'D';
    grade: 'well' | 'partly' | 'weakly';
    effects: { wellbeing: number; loyalty: number; askerExtra: number; economy?: DilemmaEconomy };
  }>;
}
// Texten (frågan, svaren, förklaringen) står i strängtabellen med sv och en,
// skild från metadatan, som för frågebanken.

// Spel för flera, senare: laget röstar, sedan väljer chefen.
interface DilemmaVote { dilemmaId: string; evening: number; votes: Record<string /* spelare */, 'A' | 'B' | 'C' | 'D'>; decided: 'A' | 'B' | 'C' | 'D' | null }
```

## Frågor till Anders

1. Ska rubrikens nivå synas för spelaren ("Väl grundat"), eller bara förklaringen?
2. Ska samma dilemma kunna komma igen under säsongen, till exempel med ett annat svar som bättre val?
3. Talen för trivsel, lojalitet och krediter: godtas förslaget som utgångspunkt för kalibreringen?
4. Vem gör den juridiska granskningen av de märkta dilemmana?
