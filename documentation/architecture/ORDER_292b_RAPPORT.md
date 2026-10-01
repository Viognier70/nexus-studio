# ORDER 292b — Rättelser från provspelet av `e079883` (rapport)

**Ordern** (Vision Owner 2026-10-01, vinbaren 18.10 första kvällen; före 288 och 293):
1. figuren som ligger på golvet, och ett test att ingen figur någonsin ligger ned eller sitter utan sits under en hel kväll;
2. raketknappen som säger "Öppnar när dörrarna öppnar" efter att dörrarna har öppnat;
3. rummets bubblor som svävar över byn;
4. insatsen mot kvällskassan första kvällen, och om en vardag utan satsningar når break-even.

Gren `order-292b` från `main` (`e079883`). Talen pekar på filerna under `frontend/reports/order292b/`.

## 1. Figuren på golvet

**Vem det var:** prototypgästen `AnimationPrototype.tsx`, en figur från före ORDER 053. Den var påslagen (`ENABLED = true`) och monterad i scenen (`StrategicScene.tsx`).
- Den saknar koppling till simuleringen och använder ingen rigg.
- Den går i en evig slinga in genom entrén och sätter sig på den gamla krogens plats 4 "vid långväggen" (`layout.seats[4]`).
- Vinbaren har ingen stol där, så figuren satt på golvet vid väggen. Därefter reste den sig och gick ut, och slingan började om.
- I kvällsbilden från förra körningen syns den som en liten sittande figur utan stol och ring vid barens ände (`figures-knappen-1.png`, tagen före rättelsen).

**Rättelsen:** prototypen är avstängd och monteras inte. Testet `order292Consequences.test.ts` (*prototypgästen är borta ur scenen*) håller den borta.

**Testet i produktionsbygget:**
- Rummet har en mätning som läser riggarna som ritas (`scene/figureAudit.ts`): huvudets och höftens höjd över golvet i världen, var femtonde bildruta.
- En figur ligger ned när huvudet är lägre än 0,9 m, och sitter utan sits när höften är lägre än 0,35 m utan att figuren sitter på en stol.
- Avvikarna står i `body.dataset.figuresDown`.
- Skriptet `scripts/order292b-figures.mjs` läser mätningen under en hel kväll. Resultat: 0 avvikelser (`figures.json` `maxDown` 0, `faults` tom).
- Samma vakt finns i skriptet för veckan från bussen (`order271-dod-from-start.mjs`, `report.figures`), se avsnitt 5.

**Begränsning:** mätningen täcker vinbarens figurer (gäster och personal i `WineBarFigures`). Byns fotgängare ingår inte.

## 2. Raketknappen och dörrarna

**Knappen fungerar som den ska:** den blir aktiv i samma stund som dörrarna öppnar, och texten följer med. I `figures.json` (`button`): 19.04 "Öppnar 19.05, när dörrarna öppnar", 19.05 aktiv med "3 kvar i kväll".

**Felet var tiden.** Dörrarna öppnar efter öppningen (10 s) och förberedelserna (120 s), alltså omkring 19.05 i spelets klocka. Ändå sade morgonen "Dörrarna öppnar 18.00", och klockan visade "Servicen" och tiden kvar från 18.00. För spelaren som tryckt *Öppna dörrarna* var dörrarna öppna.

**Rättelsen gör tiden ärlig utan att ändra balansen** (`sim/clock.ts` `doorsOpenMinutes`, `beforeDoors`):
- klockan visar "Förberedelser · Dörrarna öppnar 19.05" fram till dörrarna;
- knappen visar "Öppnar 19.05, när dörrarna öppnar";
- morgonen visar när dörrarna faktiskt öppnar;
- bokningsboken visar inga ankomsttider före dörrarna.

Om dörrarna ska öppna 18.00 är en fråga till Vision Owner (F62). Det ändrar hur länge gästerna sitter i simuleringen och kräver ny kalibrering.

**Också rättat:** rutan för kvällen skrev "wind" i den svenska raden. Ordet kommer nu ur strängtabellen.

## 3. Bubblorna över byn

drei:s `Html` ritar sin DOM även när föräldragruppen är dold. Därför syntes rummets händelser ("En gäst vid bord 4 går …") och raketens utfall över byn.

De ritas nu bara när rummet syns (samma tonband som figurerna, närmare än 75 m): `WineBarFigures.tsx` och `IncidentOutcomeBubble.tsx`.

I produktionsbygget (`figures.json` `village`): två etiketter i rummet på 17 m, inga i byn på 447 m.

## 4. Insatsen den första kvällen

Platshållaren "[Skriv om du valde satsningar eller inte.]" var inte ifylld. Insatsen redovisas därför för fyra morgnar.

Mätningen: test `order292bStake.test.ts`, 20 frön, utdata `stake.json`. Den första kvällen är vinbaren vecka 1 måndag, med brons i Stensöta och Kalastorget som efter introduktionen och bästa svaret.

| Morgonen | Insatsen, medel | Råvaror | Personal | DJ | Satsningar | Kvällskassan 21.11 | Kvällskassan vid stängning | Når break-even |
|---|---|---|---|---|---|---|---|---|
| Inga satsningar | 5 037 kr | 1 150 | 3 887 | 0 | 0 | 1 554 | 4 684 | 8 av 20 |
| Utbildningen och DJ:n | 6 609 kr | 1 222 | 3 887 | 1 500 | 0 | 1 586 | 5 325 | 1 av 20 |
| DJ:n och springaren | 8 409 kr | 1 222 | 3 887 | 1 500 | 1 800 | 1 586 | 5 325 | 0 av 20 |
| Baspaketet och två tillköp | 5 816 kr | 1 929 | 3 887 | 0 | 0 | 1 595 | 5 122 | 6 av 20 |

Fälten: `first.<morgon>.stakeMean`, `lines`, `till2111Mean`, `tillAtCloseMean`, `passedStake`.

- **Personalen** (3 887 kr) är de tre lönerna, 3 600 kr, plus köksdriften under servicen och lånets ränta. Utbildningen räknas inte; kurserna är investeringar.
- **Kvällskassan 21.11** är i snitt 1 554–1 595 kr, samma nivå som provspelets 1 754 kr. Dörrarna öppnar 19.05, så klockan 21.11 har rummet varit öppet i två timmar.
- **12 079 kr nås inte av någon av de fyra morgnarna.** Skillnaden mot en morgon utan satsningar (omkring 7 000 kr) motsvarar till exempel gästkocken (8 000 kr), flera dyra satsningar, fler anställda eller stora inköp.

**Kan en vardag utan satsningar nå break-even?** Ibland, men ofta inte (`weekdaysWithoutActivities`):
- Vecka 1 (måndag–torsdag): kvällskassan når insatsen i 48 av 80 kvällar. Insatsen är i snitt 5 485 kr och kvällskassan 5 642 kr.
- Vecka 2: kvällskassan når insatsen i 28 av 80 kvällar. Insatsen är i snitt 5 677 kr och kvällskassan 4 742 kr.

Orsaken är densamma som i förslaget om satsningarna: rummet ger omkring 24 notor per kväll oavsett dag, och ryktet faller under veckan. Personalen ensam (3 900 kr) kräver nästan hela en vardags försäljning.

Underlaget hör till 288: rivalerna och hyrans kalibrering (F59), där vinsten ska ner mot 5–10 %.

## 5. Spelarens flöde

Veckan från bussen i produktionsbygget, på svenska och utan flaggor (`order271-dod-from-start.mjs`, `REPORT_ORDER=order292b GAME_LANG=sv`). Utdata: `dod.json`.

- **Figurvakten:** 8 744 granskade mätningar på 9 169 (`figures.audited`, `figures.samples`). Ingen figur låg ned eller satt utan sits någon gång under veckan (`figures.maxDown` 0).
- **Klockan:** "18.07 Förberedelser · Dörrarna öppnar 19.05", sedan "19.07 Servicen · 3 h 53 min kvar" (`clock`).
- **Bokningsboken:** ankomsttiderna börjar 19.05 (`bookings`).
- **Fel och prestanda:** inga sidfel (`errors` tom), 28 fps i servicen (`fpsService`).
- **Flödet:** sju kvällar och söndagens tidning körs igenom.

## 6. Tester och skript

- `order292Consequences.test.ts`: prototypgästen är borta.
- `order292bStake.test.ts`: insatsen och break-even. Körs med `STAKE_SEEDS`.
- `scripts/order292b-figures.mjs`: en kväll i produktionsbygget (figurerna, knappen, etiketterna i byn).
- `order271-dod-from-start.mjs` vaktar figurerna under hela veckan.
- Hela sviten: 2 238 gröna, 7 överhoppade. Typecheck och bygget gröna.

## 7. Öppet

- **F62:** dörrarna öppnar 19.05, inte 18.00.
- **Figurmätningen** täcker vinbarens figurer, inte byns fotgängare.
