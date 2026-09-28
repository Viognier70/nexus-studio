# ORDER 270 — Servicen som händelser (rapport)

**Ordern** Vision Owner 2026-09-26, beslut efter provspel, före etapp 6. Servicen görs om:
- Action-knappen tas bort.
- Servicen blir en följd av händelser: 3–6 per kväll, fler fredag och lördag, i en båge med öppning, rusning, kris och avslut.
- Varje händelse har 3–4 svar och 20 sekunders nedräkning. Uteblir svaret beslutar personalen själv, med sämre utfall och −1 kredit.
- Medaljer i händelsens paviljong ger mer tid eller stryker ett fel alternativ.
- Varje svar verkar direkt: i rummet och i tre mätare.
- Händelser kan kedjas.
- Scenarierna flyttar in som händelser, och quizen ersätts av kvällens lärdom.
- Händelsebanken är data: 30 utkast för vinbaren, för Vision Owners granskning.
- Harnessen svarar som rimlig och svag spelare, och slumpmålet mäts om.
- Beslutet skrivs in i speldesignen.
- **Stopp:** när en vinbarskväll med händelser går att spela, så att Vision Owner kan pröva den.

**Gren** `order-270` från main `220296d` (efter ORDER 269).

## 1. Vad som byggdes

**Speldesignen** (`NEXUS_SPELDESIGN_V1.md`) har beslutet daterat 2026-09-26:
- Nytt avsnitt *Servicen > Händelserna i servicen*.
- *Action-knappen* markerad "utgår", med texten kvar som historik.
- *Quizen efter servicen* ersatt av kvällens lärdom.
- Mätarna står som undantag i princip 6.
- Dagens tabell och mognadsstegen är ändrade: "fem kvällar vända i händelserna" och "kvällens lärdom läst tio kvällar".

**Händelsebanken** ligger i `frontend/src/content/incidents/`, med metadata och spelartext skilda som i frågebanken:
- `vinbar.meta.json` innehåller per händelse:
  - paviljong, axel och spår
  - bågens fas
  - om händelsen bara kommer som kedja
  - svaren, med kvalitet (bästa / godtagbart / fel)
  - utfallet i kassa, nöjdhet, ork och rykte, på kvällens bord eller i hela rummet
  - gäster som kommer eller går
  - vad svaret utlöser och förhindrar
  - personalens eget beslut
- `vinbar.text.sv.draft.json` innehåller per händelse:
  - rubrik och berättelse, med platshållarna {bord}, {gäst}, {vin} och {personal}
  - svaren
  - raden som syns i rummet
  - förklaringen, som blir kvällens lärdom
- **30 utkast** (`status: draft`):

| | Stensöta | Kalastorget | Metodköket | Måltidsbiblioteket |
| --- | --- | --- | --- | --- |
| antal | 8 | 10 | 6 | 6 |

- Fördelningen över bågen: öppning 6, rusning 10, kris 10, avslut 4. Fyra av kriserna kommer bara som kedja:
  - allergireaktionen
  - kylen som stannar
  - bråket vid baren
  - gästen med den korkade flaskan
- Kedjor, till exempel:
  - Ett gissat svar om nötter (vb03 b) eller om surdeg och gluten (vb14 b/c) utlöser allergireaktionen. Det rätta svaret spärrar den.
  - Att servera den berusade gästen (vb10) utlöser bråket.
  - Getostens rätta vin (vb09 a) leder till en söt avslutning (vb23).
- De tre scenarierna vid dörren står i banken som vb08 *Fem utan bokning*, vb13 *Delegationen* och vb15 *Fisken*.
- `sim/incidentBank.ts` validerar banken när den laddas:
  - paviljongens axel och spår
  - 3–4 svar, exakt ett bästa och minst ett fel
  - att kedjorna pekar på händelser som finns
  - att texten finns

**Motorn** (`sim/incidents.ts`, talen i `balance.ts` `INCIDENTS`) gör följande:
- Planerar kvällens händelser när servicen öppnar.
- Öppnar nästa händelse när dess tid kommer.
- Medan kortet är öppet står rummet stilla, och nedräkningen går i verklig tid (`TICK` dt / fart).
- Svaret (`ANSWER_INCIDENT`) verkar direkt:
  - kassan, genom scenarioenheterna och veckans ±20 % (F41)
  - gästernas nöjdhet, som syns i deras färg i rummet
  - moralen, som visas som personalens ork
  - ryktet
  - gäster som kommer eller går
  - en rad i strömmen och i rummet
- Kedjor läggs till med 40 spelsekunders fördröjning, eller spärras.
- Det bästa svaret ger +1 kredit på axeln. När tiden går ut beslutar personalen, med −1 kredit.
- När servicen stänger, också vid kollaps, skrivs kvällens lärdom.

**Borttaget:**
- `sim/actionButton.ts`, `ActionButtonPanel.tsx`, `ACTION_BUTTON`
- `knowledge/postServiceQuiz.ts`, `POST_SERVICE_QUIZ`, quizens åtgärder och test
- Sparfilen har formatversion 3. Filer i version 1 och 2 förs över (`save.ts` `migrate`).

**Gränssnittet:**
- `scenario/IncidentPanel.tsx`:
  - `IncidentCard`, med testid `incident-card`, `incident-countdown`, `incident-option-<id>` och `data-struck`.
  - `ServiceMeters`, i högra kolumnen under servicen, med testid `service-meters` och `meter-cash|satisfaction|stamina`.
- `scene/IncidentOutcomeBubble.tsx`: raden över rummet (klassen `incident-outcome`).
- `EveningBar.tsx`: kvällens lärdom (`evening-lesson`, `lesson-<id>`).

## 2. Hur det verifierades i spelarens vy

**Kontrollen:** produktionsbygget från `/` utan flaggor, från bussen genom introduktionen till vinbarens första kväll (måndag vecka 1) i 2×. Kommando: `node scripts/order270-evening-from-bus.mjs`. Utdata: `frontend/reports/order270/evening-from-bus.json` och skärmdumparna `e01`–`e14`, @ `order-270`.

Utdrag ur `evening-from-bus.json`:
- `errors` är tom, och `minutesToBusiness` är 1,6.
- `incidents` har tre händelser i bågen, öppning → kris → avslut:
  - **vb04** (fel svar): `metersBefore` → `metersAfter` visar nöjdheten 0,78 → 0,64 och orken 0,88 → 0,83. `roomLine`: "Båda sällskapen står kvar i entrén. Kön växer bakom dem."
  - **vb21** (inget svar): `secondsUntilStaffDecided` 19,1. `roomLine`: "Ingen tog hand om såret, och kocken fortsatte arbeta."
  - **vb23** (bästa svaret): kassan +420 kr. `countdownAtOpen` "25 s", eftersom brons i Stensöta ger +5 s.
- `lessonItems` 2. Lärdomen tar upp vb04 och vb21, med vad spelaren valde, varför det var fel, det bättre svaret och förklaringen.
- `actionButtonGone` är `true`.
- Skärmdumpar:
  - `e11-handelse-1.png`: kortet, nedräkningen och mätarna.
  - `e12-utfall-1.png`: raden i rummet och mätarnas −15 och −5.
  - `e13-kvallens-lardom.png`: lärdomen.

## 3. Harnessens tal

**Slumpmålet** (`frontend/reports/order270/randomness.json`, 1 000 veckor, båda spelarna rimliga och svarar på händelserna):
- `winShare` 0,730 (`betterWins` 730, `ties` 0). Målet 70–80 % är nått.
- `weeksWithEmptyEvening`: better 0,224 och baseline 0,234. En kväll kan fortfarande gå riktigt illa.
- Före ordern var det 0,735 (`reports/order269/randomness.json`).

**Rimlig och svag spelare** (`frontend/reports/order270/incident-cash.json`, vecka 2, tio frön, brons i tre):
- Händelsernas kassa som andel av en normal veckointäkt: `meanShare.rimlig` 0,105, `meanShare.svag` 0,039.
- Den rimliga har 18–23 händelser med kassa i veckan, den svaga 9–17.
- Den svaga har färre, eftersom gästerna går och rummet töms tidigare.

**Svit:** typecheck och build är gröna. Vitest: 2 041 godkända, 4 överhoppade (mätningar och rapportskrivning), inga förväntade fel.

## 4. Avvikelser och val (F43, F44 i `NEXUS_V1_OPPNA_FRAGOR.md`)

- **"Mer tid eller stryker":** byggt som *både och*. +5 s per medaljsteg, och från silver stryks ett fel alternativ.
- **Rummet står stilla** medan kortet är öppet. Nedräkningen går i verkliga sekunder, oavsett fart.
- **Personalens ork är moralen**, samma värde som personalens kompetens läser. Den driver av sig själv mot gästernas nöjdhet, så ett svars effekt klingar av.
- **Klasser utan bank behåller scenarierna vid dörren.** Det gäller food trucken, som etapp 6 bygger. Dess bank behöver skrivas.
- **Svag spelare med plus:** flera fel svar ger kassa i stunden och kostar i stället rykte och nöjdhet. Den svaga får därför +4 % mot förut −6 till +1 %. Det är beloppen i banken som styr, och de är utkast.
- **Den sista händelsen kan komma när rummet är tomt** (vb23 i verifieringen, `metersBefore.satisfaction` tom). Texten talar om "bord 5" utan gäst vid bordet. Förslag: lägg avslutet tidigare, eller låt händelser med {bord} kräva en sittande gäst.
- **Äldre skript** som väntar på action-knappen eller quizen fungerar inte längre: `order266-service-playthrough.mjs`, `order267-week-from-bus.mjs` och `order264-knowledge-playthrough.mjs`. Veckan från bussen behöver ett nytt skript i etapp 6.
- **Äldre paneler på engelska** står kvar bredvid mätarna: *Guest mood*, *Team stamina* och strömmen (CLAUDE.md regel 7).

## 5. Till Vision Owner

- **Pröva kvällen:** starta spelet från `/`, gå igenom introduktionen och öppna vinbaren.
- **Granska banken:** läs `frontend/src/content/incidents/vinbar.text.sv.draft.json` (texterna) och `vinbar.meta.json` (kvalitet, utfall och kedjor). Status `draft` tills den är granskad.
- **Öppna frågor:** F43 och F44.

## 6. Svit och commit

Typecheck grön, `npm run build` grön, Vitest 116 filer godkända (1 överhoppad), 2 041 tester godkända, 4 överhoppade. Arbetet är committat på `order-270` och **inte mergat till main**. Ordern stannar här för Vision Owners provning.

---

# Tillägg efter provspel 2026-09-27

**Ordern** (Vision Owner 2026-09-27, lagt till i ORDER 270):
- Utan verksamhet och utan pengar: en ruta mitt på skärmen, med Måltidens hus som enda väg vidare.
- Proven på tid, 30 s per fråga, där tiden ute räknas som fel. Övningen är utan tid.
- Fältet referens (titel och länk) i fråge- och händelsebanken. Alla fält är tomma tills Vision Owner levererar dem (Vision Owners rättelse samma dag), och inga länkar hittas på.
- Händelser där rätt svar beror på kvällens läge, med servetterna och isen som exempel. Fler utkast ska bero på klockslag och läge.
- Fel val låser. Rummet står inte still.
- Från förra rapporten: den svaga spelaren ska gå minus över en vecka, inga händelser om bord utan gäster, och inga engelska paneler.
- Besluten skrivs in i speldesignen.
- Stopp när det går att spela.

## T1. Vad som byggdes

**Rummet står inte still.**
- `TICK` kör servicen som vanligt, och nedräkningen går bredvid (`reducer.ts`).
- En händelse som står öppen när servicen tar slut beslutas av personalen, med −1 kredit (`closeIncidents`).

**Fel val låser** (`incidents.ongoing`):
- Följden av ett fel svar, eller av personalens eget beslut, står över rummet och verkar varje simulerad minut tills nästa händelse öppnas (`tickOngoing`). Den verkar på:
  - nöjdheten, vid bordet eller i rummet
  - orken
  - personalens tempo (`service.ts`)
- Svaret går inte att ändra, och ett andra svar avvisas.

**Kvällens läge:**
- Villkor i banken:
  - `when`: fönster i speltid, kön, gäster vid borden
  - `situations`: lägen där ett annat svar är rätt, med kvalitet, utfall och förklaring per läge (`in`, `explanationIn`)
- Kortet visar klockslaget och läget i ord.
- Lärdomen förklarar svaret i det läge det gavs.
- Nytt: **vb31 Servetterna och isen**, med Vision Owners exempel. Före 20.00 är servetterna rätt, efter är isen det. Fel val ger "Isen är slut i baren. Drinkarna står och väntar", och personalen går 30 % långsammare, nöjdheten sjunker och det kostar −1 kredit.
- 20 av 31 händelser beror nu på klockslag eller läge (F45).

**Bord utan gäster:** en händelse vars berättelse nämner ett bord (`needsTable`) kommer bara när en gäst sitter där. En kedjad händelse gäller samma bord, som allergireaktionen efter peston.

**Den svaga spelaren går minus:** fel svar ger ingen kassa (utom att servera den berusade gästen), personalens eget beslut kostar, och 38 svar låser en följd.

**Referenser:**
- `reference: null` finns på alla 40 frågor (`bank.meta.json`) och alla 31 händelser.
- Laddaren validerar titel och länk när fältet är ifyllt.
- `ReferenceLine` visar referensen med förklaringen (frågekortet och kvällens lärdom) och visar ingenting när fältet är tomt.

**Provet på tid:**
- `EXAM.secondsPerQuestion` 30, i verklig tid i frågekortet.
- När tiden går ut skickas `TIMED_OUT` (−1), som räknas som fel ("Tiden gick ut. Det räknas som fel.").
- Övningen har ingen tid, och reducern avvisar −1 där.

**Rutan utan verksamhet** (`NoBusinessBox`, `isStrandedWithoutBusiness`):
- Visas mitt på skärmen när verksamheten är förlorad och lånet borta.
- Har en knapp: Till Måltidens hus, eller Till banken när bankens krav är uppfyllt.
- Morgonens rad med knappar visas inte.
- Dagen slutar av sig själv när schemat är fullt (F46).

**Inga engelska paneler:**
- `InstrumentsPanel` (Room pace, Guest mood, Team stamina, Tonight's take, kapitalflikarna) och `RoomCardPanel` visas inte längre. Mätarna och rummet ersätter dem.
- Övrig engelsk spelartext är översatt: strömmen, satsningarna, menyn och inköpen, mise en place, kvällens redovisning, kassaraden och tillskriften. Se T3.

# Tillägg 2: trestegsraketer (Vision Owner 2026-09-27)

**Beslutet:** varje händelse i servicen är en raket med tre frågor i samma sammanhang. Episteme frågar vad (15 s), techne hur (20 s) och phronesis när och varför (30 s). Man når nästa steg bara genom att klara det förra. Ett fel svar ger stegets konsekvens, och personalen tar över resten med sämre utfall. Hela raketen klarad ger bästa utfall. Medaljer i stegets paviljong ger mer tid på det steget. Det blir 2–4 raketer per kväll. Beslutet står i speldesignen (Servicen > Händelserna i servicen) och i F43 och F44.

## R1. Vad som byggdes

- **Tider och antal** (`balance.ts` `INCIDENTS`):
  - `stepSeconds` episteme 15, techne 20, phronesis 30.
  - `minPerEvening` 2 och `maxPerEvening` 4. Per veckodag: mån 2, tis 2, ons 3, tor 3, fre 4, lör 4.
  - `staffShareByFailedStep` [1, 2/3, 1/3], som är valt (F43).
- **Banken** (`vinbar.meta.json` schemaVersion 2, `vinbar.text.sv.draft.json`):
  - Alla 31 utkast är omskrivna till raketer. Utkastets fråga blir steget på sin axel, och de två andra stegen är nya.
  - Varje steg har en fråga, 3–4 svar med förklaring och en egen konsekvens vid fel (`fail`). Ett svar kan ha en egen konsekvens, som bär kedjorna.
  - Raketen har `success` och `staff`. `track` avgör techne-stegets paviljong (kök → Metodköket, sommellerie → Stensöta).
  - Det bästa svaret står jämnt fördelat på a–d. I utkasten stod det på a i 28 av 31.
- **Motorn** (`sim/incidents.ts`):
  - `resolveIncident` svarar på det aktuella steget. Ett klarat steg öppnar nästa med stegets tid.
  - Ett fel eller en utebliven tid ger stegets konsekvens och personalens utfall skalat efter stegen som återstod (`applyOutcome`).
  - Krediten går på stegets axel. Loggen och lärdomen anger steget där raketen föll.
- **Kortet** (`IncidentPanel.tsx`): berättelsen står kvar och stegrutorna visar klarat, pågående och kommande steg. Frågan och svaren byts per steg.
- **Kvällens lärdom** (`EveningBar.tsx`): lärdomen anger steget och dess fråga.
- **Harnessen** (`rankedStepOption`) svarar steg för steg.

## R2. Tal

- **Slumpmålet:** `frontend/reports/order270/randomness.json`, 1 000 veckor. `winShare` är 0,732. Harnessen svarar direkt, så nedräkningen och medaljernas tid mäts inte. Skillnaden mellan spelarna är medaljernas verkan i servicen.
- **Rimlig mot svag:** `frontend/reports/order270/week-players.json`, 20 veckor. Den svaga spelaren går minus i `svagMinusWeeks` 20 av 20 veckor.
- **Sviten:** `order270Incidents.test.ts` (29 tester) och `balance.test.ts` är uppdaterade. Hela sviten är grön.

## R3. Öppet

- `scripts/order270-evening-from-bus.mjs` spelar nu raketer steg för steg. Kortet, stegrutorna och utfallet i rummet är verifierade i produktionsbygget (`e11-raket-*`, `e12-utfall-*`).
- Efter den andra raketen visades aldrig kvällsvyn i webbläsaren. Simuleringen når kvällen i samma flöde, så felet utreds i nästa order.
- Personalens text (`staff`) är en per raket och passar ibland inte steget där raketen föll.
- Gusto.science-skriptet (en raket per artikel) är inte byggt. Det väntar på svaren om läsrätten.
