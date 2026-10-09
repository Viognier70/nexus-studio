# ORDER 321 — Provspelsläge (rapport)

Anders 2026-10-09: "Finns det redan ett sätt att börja direkt i foodtrucken, vinbaren eller bistron utan att spela hela vägen? Om inte, bygg ORDER 321 – Provspelsläge."

## Fanns det redan?

Nej, inte för Nexus v1:s steg. Det som fanns var dev-växlarna i adressens hash (`strategic/testHarness/urlParams.ts`), som kräver `#playtest=1`:
- `business=`: sätter den gamla verksamhetsklassen (kvarterskrogen, foodtrucken, gästgiveriet, ölkrogen), inte stegen i `economy.businessClass` och `ladder`;
- `rocket=`: köar en situation;
- `seed=` och `start=dinner15`.

Det gick inte att börja i vinbaren eller bistron med vald vecka, kassa och väder.

## Vad som är byggt

**Adressen.**
- `http://localhost:4173/?prov`: `main.tsx` väljer `ProvRoot` i stället för det vanliga spelet bara när sökdelen har `prov` (`isProvSearch`).
- Utan `?prov` är allt som förut.
- Det fungerar i produktionsbygget, som förhandsvisningen på port 4173 serverar.

**Startskärmen** (`strategic/prov/ProvStart.tsx`).
- **Var:** foodtrucken, vinbaren eller bistron.
- **Vecka i säsongen:** 1–8 (`SEASON.weeks`).
- **Kassa:**
  - förifylld med 15 000 kr i foodtrucken (`RISK.startCashSek`);
  - 30 000 kr i vinbaren och 60 000 kr i bistron (stegets krav, `LADDER.requirements`);
  - kassan byts när platsen byts.
- **Väder:** auto (prognosen), sol, regn, blåst eller sval kväll. Det valda vädret gäller varje kväll i provspelet:
  - vid vagnen via prognosen (`truckWeatherFor` med det valda vädret);
  - i vinbaren och bistron rättas byns väder som vid vagnen (`truckVillageWeather`).
- **Situation i kväll (valfritt):** listan har platsens situationer ur banken (id och titel; bistron spelar vinbarens).
  - Foodtrucken har 11 situationer. Två av de tretton väntar på juridisk granskning och står inte i banken.
  - Vinbaren har 49.
  - Situationen köas när dörrarna öppnar den första kvällen och kommer så snart dess signal håller, till exempel ft08-regnet när regnet börjar. Skärmen säger det.

**Starttillståndet** (`strategic/prov/provState.ts` `buildProvState`) byggs längs spelets egen väg, så att laget, lånet och rummet blir som när spelaren når steget:
- **Foodtrucken:** introduktionen, inträdesprovet (brons i Stensöta) och Åsas erbjudande om vagnen.
- **Vinbaren:** därtill erbjudandet om vinbaren (`takeOffer`).
- **Bistron:** därtill erbjudandet om bistron, utan de stängda dagarna för ombyggnaden.
- **Medaljerna och kraven för steget räknas som uppfyllda:**
  - medaljerna höjs med `awardMedal`;
  - ryktet sätts till stegets krav;
  - kvällarna och situationerna i foodtrucken sätts till vinbarens krav.
- **Tiden och kassan:** spelet börjar på veckans måndag, på morgonen, med den valda kassan.

**Markeringen.** "Provspel" står i övre vänstra hörnet under hela provspelet (`ProvBadge.tsx`). Texten finns på svenska och engelska (`content/provStrings.ts`).

**Inget sparas.**
- `savesForDayChange` ger inget för ett provspel.
- `SaveProvider` skriver inte och tömmer ingen plats, inte heller med menyns Spara.
- Provspelet har ett eget namn, så registreringen och den automatiska sparplatsen för ett nytt spel kommer aldrig.
- Portfolion ligger i sparfilerna, så provspelet når den inte.
- Någon topplista finns inte i spelet än. Startskärmens text nämner den ändå, så att den gäller när den kommer.

**Kön.** En köad situation (`QUEUE_INCIDENT`) får en tid i kvällens `slots`, som en kedjad följd. Annars kom den bara när slumpen träffade medan dess signal höll, och för regnet missades fönstret i kontrollen. Det gäller också `#playtest=1&rocket=`.

## Verifiering

**Testerna.**
- `strategic/prov/__tests__/order321Prov.test.ts` prövar att ?prov inte påverkar det vanliga spelet:
  - bara `?prov` öppnar provspelet, inte `?prova`, `?a=prov` eller tomt;
  - `main.tsx` väljer det bara med `?prov`, och det vanliga flödet står kvar;
  - ett nytt spel har inget `prov`;
  - vädret är prognosen i 20 dagar;
  - sparandet är som förut.
- Samma fil prövar också provspelet:
  - steget, veckan, morgonen och kassan för alla tre platserna;
  - kraven;
  - kassan förifylld;
  - vädret;
  - listan och kön;
  - att inget sparas.
- `order321ProvStart.test.tsx` renderar startskärmen och prövar att Börja lämnar valen vidare.

**Spelarens flöde.** `scripts/order321-prov-check.mjs` kör mot produktionsbygget på en egen port, 1440 × 900, på svenska, och skriver `reports/order321/check.json` och bilderna:
- utan `?prov`: startrutan, ingen provskärm och ingen markering (`normal`);
- med `?prov` för varje plats (vecka 3, regn): markeringen, ingen startruta eller registrering, inga sparplatser (`prov[].saveKeys`);
- i foodtrucken öppnas kvällen på 4×: `incidentsTonight` har ft01, ft10 och ft08-regnet, som kom när regnet började. Inga sparplatser efter kvällen (`saveKeysAfterEvening`).
- Bilderna:
  - `check-startskarm.png`, `check-vanligt.png`;
  - `check-foodtruck.png`, `check-vinbar.png`, `check-bistro.png`;
  - `check-foodtruck-kvall.png`.

**Ändrade tester.**
- ORDER 273: `provStrings.ts` bland strängfilerna med svenska och engelska sida vid sida.
- ORDER 264: provspelets två rader som sätter medaljerna (höjda med `awardMedal`).

**Rättat på vägen.** Beslutsraden från 2026-10-09 i speldesignen hade filnamnet `order306b4.test.ts`. `balance.test.ts` läste "306" som ett tal i speldesignen, och raden ska ändå inte ha ordernummer. Raden säger nu "Testerna för längden, med en tiondels marginal". Felet kom med den förra commiten (`da34daf8`), som bara ändrade dokumentationen och kördes utan sviten.

## Kvar

- **Kortet säger "Följd"** för den tvingade situationen, eftersom en köad situation räknas som kedjad (samma som `rocket=`).
- **Vädret gäller varje kväll** i provspelet, inte bara den första.
- **Vinbarens och bistrons kväll** är inte körd i webbläsaren. Kön prövas i testet; vb40-karaffen kräver ett sittande bord och kommer när det finns ett.
