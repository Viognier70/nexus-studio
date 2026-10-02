# ORDER 294 — Beslut efter 293 (rapport)

**Vision Owners beslut 2026-10-02:**
- Hyran är 17 % de två första veckorna och därefter 32 %. Det ska visas för spelaren.
- Kör harnessen igen och rapportera förlustveckorna.
- Smakvikten (F63) behålls.
- Rummets gäster döljs inte under en händelse.
- Övriga punkter i F65 väntar på Designs felslut.
- Rapportera om leveransen *Byn i kvällsljus* användes i 288. Bygg inget innan provspelet.

Gren `order-294` från `main` (`5f03859`). Talen pekar på filer under `frontend/reports/order294/`.

## 1. Introduktionshyran

**Hur den räknas:**
- `balance.ts` `RENT`: `introShareOfNormalWeeklyRevenue` 0,17 och `introWeeks` 2.
- `sim/economy.ts` `weeklyRentSek(id, week)` ger introduktionshyran säsongens vecka 1–2.
- Avräkningen och prognosen efter servicen läser samma funktion.

**Vad spelaren ser i bankmötet.** Raden står i båda mötena med banken: det första (B0b, när spelaren tar vinbaren) och samtalet (B1) under vecka 1–2. Texten är "De två första veckorna har du introduktionshyra: 7 155 kr i veckan. Från vecka 3 är hyran 13 469 kr." (`data-testid="bank-intro-rent"`). Beloppen räknas ur klassens normala veckointäkt.

**Tester:**
- `order294IntroRent.test.ts`: hyran per vecka.
- `order271Screens.test.tsx`: raden finns i B0b och i B1 vecka 1, och saknas vecka 3.
- `economy.test.ts`: avräkningen vecka 1 drar introduktionshyran.

## 2. Förlustveckorna

Harnessen är samma som i ORDER 291: vinbaren, brons i tre, startkassan och bästa svaret, 20 frön. Den kan nu börja vilken vecka som helst (`FIRST_WEEK_START`). Vecka 1–2 har introduktionshyra och vecka 3 full hyra.

Veckor med förlust av 20 (`players.<spelare>.weeksWithLoss`):

| Spelaren | Vecka 1 | Vecka 2 | Vecka 3 | Veckans resultat i snitt, v1 / v2 / v3 |
|---|---|---|---|---|
| Gör som mentorn säger | 0 | 0 | 2 | +8 128 / +9 940 / +3 567 kr |
| Som första kvällen i provspelet (utbildning och DJ första kvällen) | 2 | 1 | 9 | +4 596 / +7 154 / +279 kr |
| DJ och springare varje kväll | 20 | 20 | 20 | −12 753 / −11 023 / −16 772 kr |
| Kurser varje kväll | 20 | 20 | 20 | −18 891 / −16 155 / −22 858 kr |

Filerna är `first-week.json` (vecka 1), `first-week-w2.json` och `first-week-w3.json`. Ingen spelare nedgraderades.

**Före beslutet** gick mentorns spelare med förlust i 5 av 20 första veckor (`reports/order288/first-week.json`). Nu blir det 0 de två första veckorna och 2 av 20 i vecka 3, med full hyra.

**Den rimliga spelaren** i vecka 2 (`rent-check.json`) går nu plus med 20,1 % av veckointäkten, eftersom vecka 2 har introduktionshyra. Målet 5–10 % gäller full hyra: 8,1 % i ORDER 293 (`reports/order293/rent-check.json`, samma mätning med 32 %). Den svaga nedgraderas i vecka 3 i alla 20 frön.

Satsningarna och kurserna varje kväll går med förlust varje vecka, som förut. Det är förslaget om satsningarna från 2026-10-01, som väntar.

## 3. Rummets gäster under en händelse

Rummets gäster döljs inte medan en händelse spelas. De är kvar, och strålkastaren dämpar rummet till 45 % (`WineBarFigures.tsx`).

Två undantag:
- En gäst som sitter på en sits som manuset använder döljs, så att två figurer aldrig sitter på samma stol (`eventTheatre.ts` `seatIds`).
- Personalen döljs, eftersom manuset har sin egen: Per, Sara, Elin, Mira och kocken. Fråga till Vision Owner: ska rummets personal också stå kvar? Då står två servitörer och två bartendrar i bild.

Födelsedagen i produktionsbygget, rätt och fel i steg 2 (`events.json`): bilden `events-fodelsedagen-ratt-04-svar-2-ratt.jpg` visar sällskapen vid småborden med tallrikarna, dämpade. Ingen figur låg ned (`maxDown` 0) och inga sidfel.

## 4. Leveransen *Byn i kvällsljus*

**Den användes inte i 288.** Zip-filen (`~/Downloads/Restaurant guest animation (22).zip`, omtaget 2026-10-02) laddades ned 11.10 den 2 oktober. ORDER 288 mergades 02.07 samma natt. Byn i 288 bygger på leveransen *Byn och gästerna* (2026-10-01).

Leveransen är inte inkopierad i `documentation/leveranser/`. Det görs när den ska byggas.

Det som skiljer leveransen från det som byggdes i 288:

| | Leveransen | Byggt i 288 |
|---|---|---|
| **Nivåernas avstånd** | 190 / 90 / 42 / 24 m. Målen står i rummets ram och vridningen söderifrån. Synfältet går från 34° till 42°. | 900 / 210 / 95 / 24 m (spelets förval, viewLevels.ts). Byn står mellan torget och campus, kvarteret vid torget och gatan vid vår krog. Synfältet ändras inte. |
| **Hur byn ritas per nivå** | Byn: gästerna som lyktor. Kvarteret: en ljusfläck under sällskapen. Gatan: medlemmarna. Krogen: trottoaren. Vagnarna som glöd, modell och ljusslinga. Krogarna som gloria, fönster, skylt och fasad. | Byn och kvarteret: en skiva per sällskap i typens färg. Figurerna förstoras med avståndet. Gästflödet lyser som band längs gatorna. Krogarna har sken och lykta vid dörren och en etikett i HUD:en, kortare i byn. Vagnarna är modeller med markis. |
| **Kvällens ljus** | Egen himmel i fyra faser (skymning, blå timme, kväll, natt) med färger, månljus, sjöns färg och exponering, efter kvällens gång `e`. | Spelets sol (SunLightRig) följer klockan från 18.30 till 21.45, med ett ljuslyft från 1,6 till 2,9. |
| **Gatlyktorna** | Var 30:e meter längs bilgatorna, växelvis på var sin sida. De tänds en i taget med ett kort fladder. De sex närmast vår dörr har en riktig ljuskälla. Ljuscirklarna tonar ner på byns nivå. | Var 32:e meter längs gatorna i byns kärna (505 st), alla tända samtidigt med nattkurvan. Glorior, inga riktiga ljuskällor. |
| **Husens fönster** | Husen tänds i skymningen. Hus där sällskapet går ut släcks och tänds när de kommer hem. Teve i en del hus, sänggåendet, Måltidens hus, hotellets rum och kyrktornet. | Spelets fönster (ProceduralFacades): omkring 60 % av husen lyser när det är natt. Ingen koppling till sällskapen. |
| **Krogarnas lägen** | Fyra lägen: köket lyser före öppning (mise en place), öppet, städning efter stängning, släckt. Glorian växer med gästerna. | Sken när krogen har öppet, mörkt när den är stängd. |
| **Kön** | Byns kö står på rummets köplatser, omräknade till byn, och visas på trottoaren i byn. Kön är högst sju sällskap; den som kommer när det är fullt väljer en annan krog. `VILLAGE_QUEUE` (platser, tålamod, gräns för otålig) är platshållare som Code sätter. | Kön finns bara i rummet (simuleringens kö, regissören på Designs köplatser sedan 293). Byns figurer går till dörren och försvinner där. Kön har inget tak och skickar ingen till en annan krog. |
| **Gästernas start** | Bostadshus inom 260 m från krogen; studenterna från campus när krogen ligger inom 380 m. | Bostadshus inom 700 m från torget; studenterna alltid från campus. |
| **Sittiden och kvällens längd** | Prototypens tal (55–95 s, kvällen 420 s); i spelet gäller `SITTING`. | Simuleringens tider. Byns figurer går 12 m per spelminut och går hem efter 70–130 spelminuter. |
| **Styrningen** | Hjulet zoomar, dra vrider, och högerklick (eller skift och dra) flyttar kameran. En lista över krogarna flyger kameran dit, och läget kan öppna eller stänga en krog för hand. | Spelets kamera (hjul, dra, Q och E) och fyra knappar med tangenter. Ingen lista. |
| **Strängar** | 64 nycklar (`byk.*`). | 288:s egna nycklar (`village.*`). Leveransens är inte inslagna. |

**Att se över** (leveransens §9):
- **Rummets vridning.** `orientedBbox(w869907975)` väljer långsidan med 9 mm marginal. En ändring på en centimeter i OSM vänder rummet och kön 180°. Det gäller spelet i dag också. Designs förslag är att entrésidan blir data i byggnadsposten.
- **Byns nivå.** Leveransens 190 m visar byns kärna; spelets 900 m visar hela byn. Valet påverkar om Pizzans hus och Sjöboden syns utan att kameran flyttas.

Inget av det här är byggt.

## 5. Öppet

- Om rummets personal ska stå kvar under en händelse (avsnitt 3).
- Hur leveransen *Byn i kvällsljus* ska byggas, efter provspelet.
- F65 väntar på Designs felslut.
