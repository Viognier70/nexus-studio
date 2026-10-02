# ORDER 296b — Balansen, kärnan punkt 1–5 och butiken (rapport)

**Vision Owners beslut 2026-10-02:**
- Punkt 6 mergas till main. Det är gjort, merge `92faea1`.
- Bygg balansändringarna först:
  - ta reda på varför hälften rätt kostar lika mycket som allt fel;
  - felsvar ska kosta mindre;
  - ryktet ska hålla över veckan;
  - DJ och springare ska löna sig när de används klokt, men inte varje kväll.
- Talen godkänns som utgångsläge:
  - startkassa 25 000 kr;
  - bara ränta under säsongen;
  - veckomål 40 000 kr i intäkt;
  - dubbel ränta vid omförhandling;
  - stängning efter tre veckoavräkningar under noll;
  - mise en place enligt förslaget.
- Därefter punkt 1, 3, 4 och 5 med Designs leverans *hovmästaren och butiken*, och sist butiken.
- Kör harnessen med fem spelare och rapportera innan talen låses.

Gren `order-296b` från `main` (`92faea1`). Designs leverans ligger oförändrad i `documentation/leveranser/nexus-leverans-2026-10-02-hovmastaren-och-butiken/`. Talen pekar på filer under `frontend/reports/order296b/`.

## 1. Varför hälften rätt kostade lika mycket som allt fel

`diagnos.json` innehåller kvällarna vecka 1–3, 10 frön, med baspaketet.

**1. Det var ett mätfel.** I ORDER 296 växlade harnessens *hälften rätt* (`'half'`) mellan rätt och fel *per steg*. En raket klaras bara om alla tre stegen är rätt, så den spelaren klarade ingen raket alls:
- 31 % av stegen var rätt (`halvaSteg.mean.stepsRightShare`), men 0 raketer klarades (`cleared`).
- Intäkten var 5 561 kr per kväll, exakt som för den som alltid svarar fel.

Den nya spelaren `'halfRocket'` svarar rätt på varannan *raket* hela vägen. Den klarar 1,3 av 2,9 raketer och hamnar mitt emellan:

| Spelaren | Intäkt per kväll |
|---|---|
| Alltid rätt | 8 411 kr |
| Hälften rätt (`'halfRocket'`) | 7 233 kr |
| Alltid fel | 5 561 kr |

**2. Strukturen förklarar resten.** En klarad raket släpper in ungefär fyra gäster (ett per steg och ett för hela raketen):
- Mentorns spelare får 10,9 gäster per kväll ur raketerna (`rocketGuestsIn`), av omkring 21 notor.
- Ankomsterna är nästan lika för alla: 21,1 mot 20,6.
- Ryktet orsakade alltså inte skillnaden.

## 2. Ryktet som föll, och vad som är ändrat

Mätningen följer varje gästs nöjdhet tick för tick efter källa (`order296bNojdhet.test.ts`). Utdata: `nojdhet.json`, `nojdhet-efter-mep.json` och `nojdhet-efter-ko.json`. Tre saker sänkte ryktet för den rimliga spelaren:

| Orsaken | Mätt | Ändringen |
|---|---|---|
| Mise en place-förbrukningen var kalibrerad för en lunch med 15 gäster (ORDER 117). Servetter, bestick och garnityr tog slut efter en tredjedel av kvällen (`diag-ready.json`: 0,05–0,08 vid stängning). | De missnöjda gästerna tappade 0,229 i nöjdhet när maten kom (`nojdhet.json`). | Förbrukningen skalas med kvällens bokning (`balance.ts` `MEP_EVENING`, `mepConsumption.ts`). |
| Kön hade inget tak. En fredag med bussens turister kom 62 gäster till 20 platser. | 10 gav upp, vilket kostade −0,20 i rykte, och kön stod för −0,233 i nöjdhet (`diag-ready-efter.json`, `nojdhet-efter-mep.json`). | Kön tar högst 7 sällskap, Designs regel ur *Byn i kvällsljus* (`QUEUE_CAP`). De som kommer när kön är full väljer en annan krog. De räknas i `day.turnedAwayFull` och kostar inget rykte. |
| Kvällen föll ihop för ofta, med talen från ORDER 046. | Mentorns spelare fick kollaps 22 % av kvällarna, med −0,15 i rykte och halva kvällen förlorad (`diag-steg2.json`). | `COLLAPSE` är en femtedel av de gamla talen. Kollapsen kommer nu 5 % av kvällarna (`diag-steg3.json`). |

**Resultat** (`karnan-slut.json` `players.mentorn.repByWeek`): mentorns rykte står på 0,40–0,50 vecka 2–8, och måndag och lördag ligger inom ±0,05 de flesta veckor.

**Ryktet hittar en ny jämvikt.** Det sjunker från startvärdet 0,60 under vecka 1. Vill Vision Owner att det står kvar på 0,60 krävs ett lägre startvärde eller fler nöjda gäster. Det är inte gjort.

## 3. Felsvar kostar mindre

En felaktig raket kostar nu hälften så mycket i kassan (`INCIDENTS.wrongCashShare` 0,5). Varianterna är prövade, med liten effekt:

| Andelen | Hälften rätt stänger (20 säsonger) |
|---|---|
| 1,0 | 4 |
| 0,75 | 3 |
| 0,5 | 3 |

Källor: `karnan-fel100.json`, `karnan-fel075.json` och `karnan-balans.json`. Det som skiljer mest är gästerna som en klarad raket släpper in (§1).

## 4. Satsningarna

**DJ:n**
- **Den sena rundan.** När musiken börjar 21.00 beställer alla som sitter ett glas till (`sim/satsningar.ts`). Glaset tas ur lagret, och den kloka spelaren köper vintillägget på DJ-morgonen.
- **Ingen extra gästandel.** DJ:n drar inte längre fler gäster (`djGuestShare` 0). En full kväll vänder dem vid kön, och en lugn kväll betalade gästandelen DJ:n.
- **Musiken drar mest när den är något särskilt.** Efter veckans två första DJ-kvällar beställer 40 % av gästerna.

**Springaren**
- Uppgifterna vid borden tar 0,6 av tiden.
- Priset är 1 200 kr (förut 1 800).

**Den parade mätningen** (`slut.json` och `vecka-slut.json`, 10 frön, vecka 2):

| | Mån | Tis | Ons | Tors | Fre | Lör |
|---|---|---|---|---|---|---|
| DJ | −963 | −298 | +606 | +744 | +962 | +773 |
| Springare | −628 | −263 | +181 | +5 | +292 | +230 |

**Veckan:**

| Spelaren | Veckans resultat |
|---|---|
| Utan satsningar | +12 799 kr |
| Klokt (DJ fredag och lördag, springare vid bokning ≥ 45) | +15 489 kr |
| Varje kväll | +12 076 kr |

Satsningarna lönar sig alltså när de används klokt, inte varje kväll. Alla tal står i `balance.ts` `EVENING_ECONOMY`.

## 5. Risken i spelet (punkt 2)

`balance.ts` `RISK` och `sim/economy.ts` `settleWeek`:
- **Startkassa** 25 000 kr. Banklånet finansierar lokalen som förut.
- **Lånet:** bara ränta under säsongen, ingen amortering.
- **Veckomålet:** veckans intäkt minst 0,95 × klassens normala veckointäkt, vilket är 40 000 kr för vinbaren.
- **Omförhandlingen:** två missade mål i rad, och räntan blir dubbel resten av säsongen.
- **Stängningen:** kassan under noll vid tre avräkningar i rad. Krogen stänger, och säsongen är slut.
  - Rutan *Krogen stänger* (`ClosedBox`) har en knapp, *Börja om*.
  - Den nya säsongen behåller medaljerna, proven och det köpta i butiken (`RESTART_SEASON`).

**Två regler är avstängda, med flaggor i `RISK`:**
- Golvets påfyllnad, eftersom harnessen räknade utan den.
- Nedgraderingen efter tre dagsavslut, som stängningen ersätter.

Testerna av de äldre reglerna kör med flaggorna påslagna (`testHarness/legacyEconomy.ts`).

**Spelaren ser risken på tre ställen:**
- I bankmötet: villkoren (`bank-risk-terms`).
- Efter kvällen: veckans intäkt mot målet (`transfer-week-target`).
- I avräkningen: målet, omförhandlingen och hur många veckor kassan stått under noll.

**Kassan styr gästerna, och det upptäcktes under arbetet.** Det ekonomiska kapitalet är kassan delad med veckans kostnader (`cashReading.ts`, ORDER 043). Med 25 000 kr vänder upp till 20 % av gästerna vid dörren, och ankomsterna blir färre. Harnessen räknade först med en stor kassa och visade därför inte det. Nu spelar den med spelets egna regler (`order296Karnan.test.ts`, `KARNAN_START`).

## 6. Mise en place efter inköpen (punkt 5)

`balance.ts` `MISE_EN_PLACE` och `sim/miseEnPlace.ts`:
- **Behovet:** portionerna för kvällen (lagret, högst bokningen) gånger 1 minut, plus de bokade gästerna gånger 0,5 minut. Bokningen ligger över gästerna som kommer, därför halv vikt.
- **Personalen:** varje anställd hinner 25 minuter före öppning.
- **Den extra handen på morgonen:** 800 kr och 40 minuter till.
- **Det som inte hinns:**
  - mise en place räcker mindre när dörrarna öppnar;
  - personalens uppgifter vid borden tar 1,3 av tiden tills eftersläpet är klart.

Morgonens inköp visar behovet, minuterna som hinns, eftersläpet och knappen (`buy-prep`, `prep-hand`). Mentorns spelare tar in den extra handen så här ofta (`karnan-slut.json` `mise`):

| | Mån | Tis | Ons | Tors | Fre | Lör |
|---|---|---|---|---|---|---|
| Extra hand | 0 % | 0 % | 4 % | 39 % | 94 % | 99 % |

## 7. Punkt 1, 3 och 4 och butiken

**Hovmästaren (punkt 1, Designs skärm 1–4)** finns i `sim/hostPins.ts`, `scene/HostLayer.tsx` och `ui/host/HostViews.tsx`.

*Nålarna*
- Fyra sorter:
  - dörren (kön har två sällskap eller fler);
  - vinlistan (en gäst vid ett bord som inte har beställt);
  - baren (tre eller fler vid baren väntar);
  - gästen som väntat länge (under otålighetens gräns).
- Två svar på tangenterna 1 och 2; Esc stänger.
- Tiden går i verkliga sekunder (12 s) och står still under en raket. När den går ut väljer Per det säkra svaret.
- När rummet är fullt kommer en ny nål var sjätte sekund; en lugnare kväll är mellanrummet 2,5 gånger längre.
- Uppmätt (`pins.json` `byDay`, vecka 2, 3 frön, utan svar):

  | | Mån | Ons | Fre | Lör |
  |---|---|---|---|---|
  | Nålar per kväll (5 verkliga minuter) | 11,7 | 13 | 28,7 | 26,3 |
  | Sekunder mellan nålarna | 26 | 23 | 10 | 11 |
- Designs frågor gällde en bestämd kväll ("Fyra vid dörren", "Bord 2"). Spelet har parametriska strängar bredvid (`pin.door.qn` och de andra).
- Per väljer aldrig något som går med förlust:
  - vid dörren tar sällskapet ett glas i baren medan det väntar;
  - vid vinlistan blir det husets vin;
  - i baren och i kön ändras inget i kassan.
- Vinbeslutet styr vad gästen beställer (`hostDrink`) i stället för att sälja ett glas extra.

*Handgreppen*
- **Ge bord:** klicka sällskapet i kön, så lyser borden där det får plats; klicka bordet.
- **Bjud** (ett glas eller kaffe) och **Sälj in** (dessert eller ett glas till): klicka ett bord där någon sitter.
- **Flytta personal:** klicka en anställd eller ringen och välj baren, golvet eller loungerna. Uppgifterna i zonen går fortare i 60 simsekunder, de andra lite långsammare.
- Avvikelser från Design:
  - Flytta personal görs med två klick, inte genom att dra ringen.
  - Figuren går inte dit; bara uppgifternas tid ändras.
  - Den streckade spökringen och tråden från kön till bordet är inte ritade.

**Bandet i byn (punkt 4)** (`ui/host/RivalBand.tsx`, `sim/villageLive.ts`)
- Det står under klockan och kvällskassan och visar kvällens gäster per krog, food truckarna med mindre lyktor.
- Vår lykta är guld och har namnet. Musen över en annan lykta visar namn och gäster.
- Vid en omkörning visas *Förbi …* och kassans ljud spelas svagare.
- Rivalernas gäster följer samma plan och samma ankomstkurva som byns figurer (`VILLAGE.arriveFromMinute`–`arriveUntilMinute`).

**Byn i kväll** är J1 omritad efter skärm 5.

**Följderna (punkt 3)**
- **Recensenten** kommer ibland också under 70 i rykte: chansen är 0,06 + 0,2 × ryktet, omkring en gång i veckan. Hon skriver i nästa morgons tidning, på morgonraden.
- **Gästen med socialt kapital** som går missnöjd syns gå från vår dörr till rivalen med flest stjärnor. Nästa morgon står avbokningarna som tal i bokningsboken.
- **Ryktet** står i bandet, med ändringen sedan dagen började.

**Butiken** (`sim/shop.ts`, `ui/host/ShopScreen.tsx`, skärm 6–7)
- Medaljen öppnar och förbrukas inte; krediterna betalar. Köpta förmågor behålls.
- Facket har två platser, och tre vid stjärnan.
- **Stjärnan** har jag satt till guld i Gastronomiska Teatern, vägens slut. Det är ett val och väntar på Vision Owners beslut.
- **Priserna:** 40, 70 och 110 krediter efter kravet (brons, silver, guld), kockens bord 90 och signaturrätten 150. En rimlig spelare tjänar omkring 53 krediter i veckan.
- **Verkan** av de 14 förmågorna står i `SHOP.effects`, till exempel:
  - flaskan oftare vid loungerna;
  - vinkylen höjer nöjdheten;
  - mise en place-rutinen ger 25 minuter till;
  - förvarningen om recensenten kommer på morgonen.
- **Kvällens ordning:** resultatet, lärdomen, berättelsen, byn i kväll, butiken och sedan morgonen. Det följer Designs knappar *Till butiken* och *Till morgonen*.

**Strängarna.** Designs 128 nycklar är inslagna oförändrade, med två undantag:
- `role.*` heter `shop.role.*`, eftersom `role.sommelier` redan fanns.
- `venue.sjo`, `venue.grill` och `venue.taco` har spelets engelska namn.

## 8. Harnessen med fem spelare

Spelarna spelar spelets regler i 20 säsonger om åtta veckor (`karnan-slut.json`):
- De köper och tar in den extra handen som beskrivet.
- De svarar inte på nålarna, så Per väljer åt dem.
- De köper inget i butiken.

| Spelaren | Stänger | Omförhandlas | Lägsta kassan | Kassan vecka 8 i snitt |
|---|---|---|---|---|
| Mentorns spelare (baspaketet, rätt) | 0 av 20 | 0 | 27 834 kr | 50 519 kr |
| Rimlig (fyller på, rätt) | 0 av 20 | 0 | 16 925 kr | 34 014 kr |
| Hälften rätt | 14 av 20 (vecka 6–8) | 2 | −30 397 kr | −14 015 kr |
| Alltid fel | 20 av 20 (vecka 4–6) | 20 | — | — |
| Slarvig | 20 av 20 (vecka 3) | 20 | — | — |

**Trappan står**, men *hälften rätt* ligger över målet 30–50 % med startkassan 25 000 kr. Samma spelare med en annan startkassa:

| Startkassan | Mentorn | Rimlig | Hälften rätt | Alltid fel | Slarvig | Källa |
|---|---|---|---|---|---|---|
| 25 000 kr | 0 | 0 | 14 (70 %) | 20 | 20 | `karnan-slut.json` |
| 30 000 kr | 0 | 0 | 11 (55 %) | 20 | 20 | `karnan-start30000.json` |
| 35 000 kr | 0 | 0 | 6 (30 %) | 20 | 20 | `karnan-start35000.json` |

**Förslaget är startkassan 35 000 kr**, eller omkring 32 500 kr för mitten av bandet. I spelet står 25 000 kr kvar tills Vision Owner låser talen.

## 9. Produktionsbygget

`scripts/order296b-check.mjs`; utdata `check.json` och `check-*.jpg`. Sparfilen är måndag i vinbaren, flyttad till fredag och skriven före ORDER 296. Krediterna är satta till 130 för butiken.

| Steget | Resultatet |
|---|---|
| Förberedelsen | 58 min mot 75; den extra handen ger 115 |
| Bandet | *1:a i byn*, 7 krogar, ryktet 60 |
| Nålarna | 5 besvarade med tangenten 1, guldpillen visas |
| Sälj in | gjort |
| Flytta personal | gjort |
| Byn i kväll | 7 rader |
| Butiken | Sommeliern säljer in en flaska köpt: krediterna 130 → 90, i facket 1 av 2; *Till morgonen* leder till morgonen |

Inga sidfel. Bilderna motsvarar Designs skärm 2, 4, 5 och 6–7.

**Rättat under kontrollen:**
- Stenarna i butiken var 0 breda och gick inte att klicka; nu har de sin egen bredd.
- Kortet till höger saknade papperet.

## 10. Öppet

- **Startkassan:** förslaget är 35 000 kr (§8). Talen är inte låsta.
- **"Raketerna kommer ur händelserna i rummet, utan taket på tre per kväll"** (kärnan punkt 1) är inte byggt. Raketerna dras som förut, och knappen *Stå för ditt svar* har kvar *3 kvar i kväll*. Nålarna är rummets beslut. Om raketerna också ska utlösas av rummet, och vilket tak som tas bort, behöver Vision Owner bestämma.
- **Flytta personal:** figurerna går inte till zonen; dra och spökring saknas (§7).
- **Stjärnan:** guld i Teatern är valt, inte beslutat.
- **Harnessen** svarar inte på nålarna och köper inget i butiken. Hur mycket det klokt valda ger är inte mätt.
- **Ryktets startvärde** 0,60 ligger över den nya jämvikten (§2).
