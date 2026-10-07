# ORDER 315 — Karriärstegen, v1: förslag före bygget

**Underlag:** `~/Downloads/ORDRAR_314-316_D7.md`, ORDER 315 (beslut B, Anders 2026-10-06). Där står: "Först förslag, sedan bygge. Lämna en rapport innan något byggs."

**Status:** förslag till Anders. Ingenting av stegen, foodtrucken eller erbjudandena är byggt.

**Byggt redan nu** (gren `order-315`): bara det som är beslutat och inte hänger på förslaget.
1. **Nivåerna heter Enkel · Mellan · Exklusiv.**
   - Konceptklasserna från 307 (enkel, bistro, soigné) är nivåer inom varje verksamhet. Spelartexten (`strings.shopTabs.tier`) säger Enkel, Mellan och Exklusiv (en. Simple, Mid-range, Exclusive).
   - Recensionens rad säger "Ryktet i nivån Mellan +3".
   - Nycklarna i koden (`enkel`, `bistro`, `soigne`) och kalibreringen från 307, 311 och 314 är oförändrade.
2. **Konkurrenternas nivåer** (Anders 2026-10-06) står som data (`balance.ts VILLAGE.rivals level`) och visas i "Byn just nu":
   - Enkel: Pizzeria Grytan, Grillvagnen och Tacovagnen;
   - Mellan: Torgkrogen och Sjöboden;
   - Exklusiv: Hotellets matsal.
   - Simuleringen läser inte nivån än.

Ordet "bistro" används nu bara för steget på stegen (verksamheten), inte för nivån. Namnkonflikten med 307 är därmed borta.

---

## 1. Datamodellen

```ts
// Stegen, i ordning. v1 spelbara: foodtruck, vinbar, bistro.
type LadderStepId = 'foodtruck' | 'kvarterskrog' | 'vinbar' | 'olhall' | 'bistro' | 'nattklubb' | 'soigne' | 'gastgiveri';

interface LadderStep {
  id: LadderStepId;
  playable: boolean;              // v1: foodtruck, vinbar, bistro
  building: string | null;        // byggnaden i byn; vinbaren och bistron delar hus (w869907975)
  rebuildsFrom?: LadderStepId;    // bistro byggs om från vinbar i samma hus
  starsPossible: boolean;         // stjärnan bara från bistro och uppåt
  questionBank: string;           // frågorna följer verksamheten (content/incidents/<id>.*.json)
}

// Kraven för nästa steg: kassan, ryktet och en medalj.
interface StepRequirement {
  cashSek: number;                // kassan vid dagens slut, efter insatsen
  reputationAtLeast: number;      // 0–100, byns rykte
  medal: { pavilion: PavilionKey; level: MedalLevelId };
}

// Erbjudandet från Åsa: kommer när kraven är uppfyllda, spelaren tar det eller väntar.
interface LadderOffer {
  to: LadderStepId;
  requirement: StepRequirement;
  priceSek: number;               // köpet: kapital eller lån (insats + lån, som UPGRADE i dag)
  depositShare: number;           // andel av priset ur kassan
  state: 'hidden' | 'offered' | 'declined' | 'taken';
  offeredOnDay: number | null;
}

// I SimulationState:
//   ladder: { step: LadderStepId; reachedOnDay: Record<LadderStepId, number | null>; offer: LadderOffer | null };
// Nivån (Enkel · Mellan · Exklusiv) står kvar som kvällens koncept (CONCEPT), inom steget.
```

**Flödet:**
1. Öppningen.
2. Åsa: spelaren övar i Måltidens hus och gör **inträdesprovet** (brons i en paviljong, som i dag).
3. Åsa erbjuder foodtrucken vid Torget: *"Du har klarat inträdet. Det står en foodtruck ledig vid Torget. Den är din, om du vill."*
4. Kraven för vinbaren uppfylls, och Åsas erbjudande kommer (kortet från D7, "Ta över" och "Inte än").
5. Vinbaren.
6. Kraven för bistron uppfylls, och erbjudandet om ombyggnad kommer.
7. Bistron.

Bankens nuvarande val av första verksamhet (`BankDialog`, `openFirstBusiness`) ersätts av steg 3. Banken står kvar för lånet vid köpet.

## 2. Foodtruckens ekonomi (förslag till kalibrering)

Utgångspunkten är byns egen grillvagn (`VILLAGE.rivals` grillvagnen: notan 95 kr, högst 40 gäster per kväll vid luckan, `truckGuestsPerEvening`).

| Post | Förslag | Kommentar |
|---|---|---|
| Notan per gäst | 95 kr | korv med bröd, tunnbrödsrulle, dryck |
| Gäster per kväll | 50–90 | kön vid luckan och det tillfälliga serveringsområdet; efter rykte och svar |
| Kvällar per vecka | 6 (måndag–lördag) | som vinbaren |
| Intäkt per vecka | omkring 30 000–50 000 kr | |
| Varor | 35 % av intäkten | korv, bröd, mos, räksallad, dryck |
| Medhjälparen | 500 kr per kväll (lärlingens dagslön) | spelaren står själv vid grillen |
| Platsen och tillståndet vid Torget | 1 500 kr per vecka | i stället för hyra |
| Resultat per vecka, 0,85 rätt | omkring 10 000–14 000 kr | |
| Resultat per vecka, 0,6 rätt | omkring 4 000–7 000 kr | |
| Resultat per vecka, alltid fel | under noll | |
| Startkassan | 15 000 kr (som i dag) | inget lån för foodtrucken |

**Erbjudandet om vinbaren:**
- **Kassan** minst 30 000 kr vid dagens slut.
- **Ryktet** minst 50 av 100.
- **Medaljen** brons i Stensöta. Det är vinbarens startkrav i dag (`BUSINESS_CLASSES` vinbar `startRequirements`).
- **Köpet:**
  - insatsen ur kassan är 25 % av vinbarens veckogolv, som `UPGRADE.depositShareOfWeekFloor` i dag;
  - resten är startlånet, som i dag;
  - ryktet går med till vinbaren (förslag: oförändrat, inte halverat som vid uppgradering i dag).

Med startkassan och 0,85 rätt nås 30 000 kr under vecka 2 (15 000 + 2 × omkring 12 000). Med 0,6 rätt nås det under vecka 3. Det ger målen i §3.

**Erbjudandet om bistron** (ombyggnad i samma hus):
- kassan minst 60 000 kr;
- ryktet minst 60;
- silver i Stensöta och brons i Metodköket;
- köpet görs på samma sätt (insats och lån).

## 3. Målen att kalibrera mot i harness

Mätningen görs med säsongernas harness (`order296Karnan.test.ts`, 40 säsonger, som i 311b och 314), med ett nytt fält per säsong: veckan då vinbaren och bistron nåddes.

| Spelaren | Mål |
|---|---|
| 0,85 rätt | vinbaren vecka 2–3, bistron vecka 4–5, stjärnan i ungefär 50 % av säsongerna |
| 0,6 rätt | når vinbaren, sällan bistron |
| Alltid fel | lämnar aldrig foodtrucken |
| Ignorerar (314) | lämnar aldrig foodtrucken |
| Tidigare mål | koncepten (nu nivåerna), halva och den slarviga, mätta i vinbaren och bistron |

Spelarna tar erbjudandet direkt när det kommer, utom en ny spelartyp, "försiktig", som väntar en vecka.

**Konflikt att avgöra:** med 314:s takt får 0,85 stjärnan i 98 % av säsongerna i bistron (`ORDER_314_RAPPORT.md` §6). Målet här är omkring 50 %. Med stegen hinner spelaren färre veckor i bistron, så andelen sjunker. Om det inte räcker är spaken `STAR.weeksToEarn` eller `STAR.minRocketsInWeek`.

## 4. Utkast till frågebanken för foodtrucken (svensk grill)

Tjugo frågor över de tre kunskapsformerna och tre områden:
- korven: vad den innehåller, hur den görs och var råvaran kommer ifrån;
- drycken till: varför beska och sälta fungerar ihop;
- livsmedelssäkerheten vid luckan.

Rätt svar är märkt ✓. **Anders granskar dem.** De som rör regler och temperaturer är märkta **⚖ Granskas**, eftersom gränserna ska stämmas av mot Livsmedelsverkets aktuella råd innan de står i spelet.

Frågorna kan sättas ihop till situationer om tre steg (episteme, techne, phronesis), som vinbarens. Förslag till grupperingen står sist.

### Episteme (att veta)

1. **Vad håller ihop en grillkorv, så att den inte faller sönder när den grillas?**
   - A. Mjölet i smeten.
   - B. ✓ Saltet, som löser ut köttets proteiner och binder fett och vatten.
   - C. Röken.
   - D. Fjälstret.
2. **Vad betyder köttandelen på en korvförpackning?**
   - A. Hur mycket av korven som är fläsk.
   - B. ✓ Hur stor andel av korven som är kött, enligt receptet.
   - C. Hur mycket fett korven innehåller.
   - D. Var köttet kommer ifrån.
3. **Vad krävs för att en korv ska få märkas "Kött från Sverige"? ⚖ Granskas**
   - A. Att korven är tillverkad i Sverige.
   - B. ✓ Att köttet kommer från djur som är födda, uppfödda och slaktade i Sverige.
   - C. Att korven säljs i Sverige.
   - D. Att kryddorna är svenska.
4. **Vilka av tillbehören vid luckan innehåller ett av de fjorton allergener som måste kunna anges? ⚖ Granskas**
   - A. Bara brödet.
   - B. Bara räksalladen.
   - C. ✓ Senapen, brödet (gluten), räksalladen (kräftdjur och ägg) och moset (mjölk).
   - D. Inget, korvkiosker är undantagna.
5. **Varför passar en bitter, kolsyrad dryck till en salt och fet korv?**
   - A. Bitterheten gör korven sötare.
   - B. ✓ Saltet dämpar upplevelsen av beska, och beskan och kolsyran skär igenom fettet.
   - C. Kolsyran värmer korven.
   - D. De passar inte, korv ska ätas med vatten.
6. **Vad är fjälstret på en grillkorv oftast gjort av?**
   - A. Plast.
   - B. ✓ Naturtarm från gris eller får, eller ett ätbart fjälster av kollagen.
   - C. Papper.
   - D. Stärkelse.
7. **Varför spricker en korv som grillas på för hög värme?**
   - A. För att den är för gammal.
   - B. ✓ För att vattnet i korven kokar och trycket spräcker fjälstret innan korven är varm inuti.
   - C. För att saltet smälter.
   - D. För att grillen är för smutsig.

### Techne (att kunna göra)

8. **Hur grillar du korvarna inför kvällens rusning?**
   - A. På högsta värme, så går det fort.
   - B. ✓ På medelvärme och vänd ofta, så att de blir genomvarma utan att spricka.
   - C. I kallt vatten först, sedan på hög värme.
   - D. Bara på ena sidan.
9. **Korvarna har legat i varmhållningen sedan öppning. Vad gör du? ⚖ Granskas**
   - A. Säljer dem så länge de ser bra ut.
   - B. ✓ Kontrollerar att de hållits varma nog (minst +60 °C) och kastar det som stått för länge eller för svalt.
   - C. Grillar om dem en gång till.
   - D. Lägger dem i kylen och säljer dem i morgon.
10. **Kylboxen visar +11 °C mitt i kvällen. Vad gör du först? ⚖ Granskas**
    - A. Fortsätter, det är bara en kväll.
    - B. ✓ Flyttar varorna till kyla som håller (högst +8 °C för korv, kallare för räksalladen), skriver upp temperaturen och bedömer om något måste kastas.
    - C. Stänger luckan för kvällen.
    - D. Lägger is ovanpå locket.
11. **Du tar betalt och lägger upp korv vid samma lucka. Hur gör du?**
    - A. Torkar händerna på förklädet mellan.
    - B. ✓ Använder tång till maten och tar inte i maten med samma hand som pengarna, eller byter handskar.
    - C. Tar betalt först och lägger upp efteråt, med samma handskar.
    - D. Låter kunden ta korven själv.
12. **Hur får du en tunnbrödsrulle som håller ihop när gästen äter den stående?**
    - A. Mycket räksallad överst.
    - B. ✓ Moset först som bädd, korven, sedan räksalladen och löken, och rullar hårt med kanten under.
    - C. Rullar löst så att den går att öppna.
    - D. Delar den i två.
13. **Vilken dryck föreslår du till en kryddig grillkorv till en gäst som inte dricker alkohol?**
    - A. Vatten, inget annat går.
    - B. ✓ En alkoholfri öl eller en kolsyrad dryck med beska, till exempel tonic eller bitter lemon.
    - C. En söt fruktsoda.
    - D. Mjölk.
14. **Hur många korvar har du framme inför rusningen klockan sju?**
    - A. Alla du har.
    - B. ✓ Så många som kön brukar ta den närmaste halvtimmen, och fyller på i jämn takt.
    - C. En åt gången.
    - D. Inga, allt grillas när gästen beställt.

### Phronesis (att kunna bedöma)

15. **En gäst frågar om korven innehåller nötter. Du är inte säker. Vad gör du? ⚖ Granskas**
    - A. Säger nej, det brukar det inte göra.
    - B. ✓ Säger att du inte vet säkert, visar förpackningens ingrediensförteckning eller avråder.
    - C. Säger ja för säkerhets skull.
    - D. Frågar en annan gäst.
16. **Kön är lång, och en gäst säger att korven är kall inuti. Vad gör du?**
    - A. Ber om ursäkt och ger rabatt.
    - B. ✓ Byter till en korv som är genomvarm direkt, och ser över grillens värme och takt så att det inte händer igen.
    - C. Säger att den ska vara så.
    - D. Grillar den en minut till och ger tillbaka samma.
17. **En leverantör erbjuder billigare korv utan uppgift om köttets ursprung. Vad väger du?**
    - A. Bara priset, gästerna märker inget.
    - B. ✓ Priset mot vad du kan svara gästen om ursprunget och mot ditt rykte, och du frågar leverantören om ursprung och köttandel.
    - C. Byter direkt, utan att fråga.
    - D. Behåller den gamla utan att räkna.
18. **Det börjar regna, och kön blir kort. Vad gör du?**
    - A. Stänger för kvällen.
    - B. ✓ Drar ned grillen till den takt kön har, ställer ut skärmtaket och erbjuder något varmt att dricka.
    - C. Grillar som vanligt, det kommer folk.
    - D. Sänker priset till hälften.
19. **En berusad gäst blir otrevlig mot din medhjälpare vid luckan. Vad gör du?**
    - A. Låter medhjälparen sköta det.
    - B. ✓ Tar över själv, lugnt, säger nej till fortsatt servering om det behövs, och stöttar medhjälparen efteråt.
    - C. Ger gästen en gratis korv så att han går.
    - D. Ringer polisen direkt.
20. **Kvällen är slut, och det finns tio grillade korvar kvar. Vad gör du? ⚖ Granskas**
    - A. Kyler dem i varmhållningen och säljer dem i morgon.
    - B. ✓ Kastar dem som stått varmhållna, och planerar mindre till nästa kväll efter hur kön gick.
    - C. Ger dem till medhjälparen att ta hem utan att tänka på hur de förvarats.
    - D. Lägger tillbaka dem i förpackningen.

**Förslag till situationerna** (tre steg vardera):
1. Leveransen: 6, 10 och 17.
2. Rusningen: 7, 8 och 16.
3. Allergin: 4, 15 och 11.
4. Drycken: 5, 13 och 18.
5. Rullen: 1, 12 och 19.
6. Stängningen: 2, 9 och 20.
7. Ursprunget: 3, 14 och 17 (17 används två gånger, eller byts mot en ny fråga).

## 5. Stjärnan

**I dag** kan vinbaren få stjärnan (`STAR` i `balance.ts`): guld i Teatern, ryktet, omdömet och raketerna i veckan.

**Förslag:**
- Stjärnan kräver steget bistro eller högre (`LadderStep.starsPossible`). I vinbaren räknas inga veckor mot stjärnan.
- Öppningens rad "Målet är stjärnan" står kvar, eftersom stjärnan nu är målet för hela stegen.
- Butikens väg mot stjärnan (`ShopScreen`, "Vägen mot stjärnan") behöver en rad om att stjärnan kommer i bistron. Formen kommer från D7 ("Din väg").

## 6. Ordningen för bygget, när förslaget är godkänt

1. **315a:** datamodellen, stegen och erbjudandena (utan foodtrucken som eget spel). Vinbaren och bistron i samma hus, och stjärnan i bistron. Harness med tiderna till stegen.
2. **315b:** foodtrucken som spelbar: luckan, kön, serveringsområdet och ekonomin. Formen kommer från D7.
3. **315c:** frågebanken för foodtrucken (efter Anders granskning) och kalibreringen mot §3.

## 7. Frågor till Anders

1. Ska ryktet följa med oförändrat vid köpet av vinbaren, eller halveras som vid uppgradering i dag?
2. Ska spelaren kunna avböja och stanna kvar i foodtrucken hela säsongen?
3. Kraven i §2: är kassan 30 000 / 60 000 kr och ryktet 50 / 60 rätt nivå att börja kalibrera från?
4. Frågorna i §4: godkänns de, och vem granskar de märkta mot Livsmedelsverkets råd?
