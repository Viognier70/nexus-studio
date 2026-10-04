# ORDER 303 — Följderna (rapport)

**Underlag:** Anders 2026-10-04 (`ORDRAR_303-304_D5.md`), efter provspelet på `main` efter 297b.

**Ordningen:** 303 → 301 → 302 → 304. ORDER 300 var redan mergad (`8a1be42`). ORDER 301 ligger pausad på grenen `order-301` (`544fe07`).

Gren `order-303` från `main` (`8a1be42`).

## A. Följderna i dag (före kod)

### Hur det mättes

`src/strategic/testHarness/__tests__/order303Foljderna.test.ts` kör vinbaren vecka 1–3 med fröna 1–4, alltså 24 kvällar per vecka och spelartyp.
- Morgonen är mentorns: baspaketet, med den extra handen när mise en place inte hinns.
- Medaljerna är brons i tre paviljonger.

**Spelartyperna:**
- **alltid fel:** svarar fel på varje steg.
- **hälften rätt:** varannan raket rätt hela vägen, som trappans "halva".
- **0,5 och 0,85 rätt per steg:** som jämförelse.

**Källorna:**
- **Kvällskassan:** `tillSek`, sista ticken under servicen.
- **Insatsen:** `day.stake.total`, HUD:ens "Insatsen".
- **Ryktet:** `state.reputation` på skalan 0–100, före morgonen, när servicen börjar, efter kvällen och nästa morgon.
- **Placeringen:** `economy.weekEvenings[].village` med `rankedVillage`, alltså det bandet visar nästa morgon.
- **Varje raketsvar:** `incidents.log` `deltas`.

**Filer:** `frontend/reports/order303/kvallar-fel.json`, `kvallar-halva.json`, `kvallar-skill-0.5.json` och `kvallar-skill-0.85.json`. Varje fil har `rows`, med en rad per kväll, och `summary`.

### 1. Per kväll, sammanfattat per vecka

| Spelaren | Vecka | Kassa − insats, medel | Kvällar med förlust | 1:a i byn | Medelplats |
|---|---|---|---|---|---|
| Alltid fel | 1 | +1 602 kr | 3 av 24 | **17 av 24** | 1,6 |
| | 2 | −61 kr | 12 av 24 | 8 av 24 | 3,0 |
| | 3 | +277 kr | 9 av 24 | 7 av 24 | 3,3 |
| Hälften rätt | 1 | +2 177 kr | 2 av 24 | 19 av 24 | 1,3 |
| | 2 | +665 kr | 11 av 24 | 8 av 24 | 2,1 |
| | 3 | +900 kr | 12 av 24 | 11 av 24 | 2,3 |
| 0,85 rätt per steg | 1 | +2 198 kr | 2 av 24 | 18 av 24 | 1,5 |
| | 2 | +1 456 kr | 7 av 24 | 9 av 24 | 2,0 |
| | 3 | +1 410 kr | 6 av 24 | 11 av 24 | 2,3 |
| 0,5 rätt per steg | 1 | +1 601 kr | 5 av 24 | 19 av 24 | 1,6 |
| | 2 | +343 kr | 10 av 24 | 9 av 24 | 2,4 |
| | 3 | +69 kr | 14 av 24 | 6 av 24 | 3,2 |

Kvällarna en och en står i `rows`, med veckodag och frö, kassan, insatsen, ryktet, platsen och gästerna.

**Vad tabellen visar:**
- **Vecka 1 skiljer nästan inte spelarna åt.** Den som alltid svarar fel går med vinst 21 kvällar av 24 och blir 1:a i byn 17 gånger. Den som har 0,85 rätt blir 1:a 18 gånger.
- **Från vecka 2 skiljer det,** men mindre än det borde:
  - "alltid fel" går ungefär jämnt upp (−61 kr och +277 kr) och är 1:a 7–8 kvällar av 24;
  - 0,85 rätt går med omkring 1 400 kr i vinst.

### 2. Hur mycket ett svar flyttar ryktet, och om ryktet följer med

**Per svar** (`summary.answers`, `incidents.log` `deltas`):

| Spelaren | Rätt: ryktet / kassan | Fel: ryktet / kassan |
|---|---|---|
| Alltid fel | – | −0,19 / −66 kr (109 svar) |
| Hälften rätt | +0,34 / +210 kr (71) | −0,14 / −55 kr (63) |
| 0,5 rätt per steg | +0,67 / +202 kr (12) | −0,31 / −64 kr (105) |
| 0,85 rätt per steg | +0,40 / +180 kr (99) | −0,44 / −62 kr (59) |

**Ett svar flyttar ryktet mindre än en poäng av 100.**
- Raketens egna effekter är små: `incidents.ts:845`, `effects.reputation`.
- Ryktet rör sig främst när gästerna går:
  - en nöjd gäst (≥ 0,85) ger +0,6;
  - en missnöjd (< 0,65) ger −2,0 (`reputation.ts:107–110`).
- Per kväll (`metrics.reputationBreakdown`):
  - "nöjda" +4,2 till +6,1;
  - "missnöjda" −5,4 till −6,9;
  - personalens belastning −1,0 till −2,0.
- Det gäller alla spelare nästan lika. Därför sjunker ryktet för alla, från 60 till omkring 21–28 efter tre veckor (`rows[].repNextMorning`).

**Få raketer per kväll:** 1,5–2,2 planerade (`rows[].rockets`). Svaren flyttar därför kvällens kassa med några hundra kronor. Kassan minus insatsen är 1 600–2 200 kr vecka 1.

**Ryktet följer med till nästa dag:**
- **Över natten:** självläkning +2 per morgon mot 50 (`serviceEvents.ts:122`, `REPUTATION.dailyRecovery`), och +3 efter en kväll utan returer (`serviceEvents.ts:86`, `cleanEveningBonus`). Mellan servicerna drar det dessutom mot taket (`reputation.ts` `tickReputationCeilingDrift`). Uppmätt: +0,7 till +2,0 per natt (`summary.byWeek[].meanRepChangeOvernight`).
- **Nästa kväll:**
  - gästerna kommer i proportion till ryktet, 0,6× till 1,4× (`arrivals.ts:101`);
  - byns val läser stjärnorna ur ryktet när dagen började (`village.ts` `venuesTonight`, `reputationAtDayStart`). Ett fel svar i kväll ändrar inte vart kvällens sällskap går.

### 3. Varför ett fel svar nästan alltid blir "gästen går utan att betala"

Det är kodens förval sedan ORDER 292 (`incidents.ts:709–718`). Vid ett fel svar vid ett bord går gästen med den största notan, och notan stryks.
- Undantaget är när felet köar en följdraket vid samma bord. Då stannar bordet och beställer mindre (`wrongBillShare`).
- Utan bord går gäster i kön (`wrongGuestsLeave`).

Raketernas egen data har en skala (`fail.effects` och `fail.room`). Bara 12 av 300 fel alternativ i `vinbar.meta.json` skickar själva ut gäster (`summary.wrongDataLeave`). Förvalet tar alltså över för nästan alla.

### 4. Varför den som svarar fel kan bli bäst i byn

1. **Placeringen räknas på antalet gäster vid bord** (`villageLive.ts` `villageRank`, `rankedVillage`), inte på kvällens kvalitet. Gästerna kommer efter ryktet vid dagens början. Alla börjar på 60 och konkurrenterna på 50–70. Vecka 1 är alla därför 1:a de flesta kvällar.
2. **Svaren väger lätt** mot kvällens kassa och rykte (punkt 2). Det som skiljer spelarna är fler gäster för den som svarar rätt (34–35 per kväll mot 27–30), en effekt som byggs upp långsamt.
3. **Kassan minus insatsen** räknar inte veckans fasta kostnader per kväll. Insatsen är kvällens del. Därför ser den som svarar fel ut att gå med vinst. Veckans resultat (trappan) tar hyran och lönerna.

## B. Målen efter ordern (harness)

### Kalibreringen

Varianterna prövades i minnet med `FOLJD_VARIANT` och `KARNAN_VARIANT`. Filerna ligger i `frontend/reports/order303/kalib/`: V1–V5, W1–W3, X1 och Y1–Y2, med frö 1–2.

**Det som avgjorde:**
1. **Straff vid bordet räckte inte.** Rummet är fullt: när ett bord går tar nästa sällskap i kön stolarna (V1–V2). Även när hela bordet gick utan att betala, och gatan tappade 30 %, gick "alltid fel" med vinst vecka 1–2.
2. **Stämningen flyttar notan.** Kunskapens lyft i stämningen (299b: gästens och rummets lyft) flyttar nu vad hela rummet beställer. Notan blir gånger 1 + 1,4 × lyftet när lyftet är negativt och 1 + 0,9 × lyftet när det är positivt (`CONSEQUENCES.moodBillPerLift`, `moodBillPerLiftUp`; `reducer.ts`, vid betalningen).
3. **Placeringen i byn räknas på kvällens nöjda gäster vid bord.**
   - Hos oss räknas gästerna som var minst nöjda när de betalade (`day.contentTonight`).
   - Hos konkurrenterna räknas gästerna gånger 0,4 + 0,6 × deras rykte (`CONSEQUENCES.rivalContent*`, `village.ts`, `villageLive.ts`, `CompareScreen.tsx` `rankedVillage`).
   - Med antalet gäster som mått var den som svarade fel 1:a, eftersom rummet var fullt (V3: 4–5 gånger vecka 2–3).
   - Bandets rad säger nu "Placering efter kvällens nöjda gäster vid bord".
4. **Uppsidan.** Med 0,3 uppåt stängde trappans "halva" 18 av 20 säsonger (`trappa-halva`, mellankörningen). Med 0,9 stänger den 8 av 20, det vill säga 40 %. Det ligger inom 296c:s mål, 30–50 %.

### Utfallet

Vinbaren vecka 1–3 med fröna 1–4, 24 kvällar per vecka (`frontend/reports/order303/efter/kvallar-*.json`, `summary.byWeek`).

| Spelaren | Vecka | Kassa − insats | Förlust | 1:a | Medelplats |
|---|---|---|---|---|---|
| Alltid fel | 1 | −1 485 kr | 19 av 24 | 6 | 4,4 |
| | 2 | −2 009 kr | 22 av 24 | **0** | 5,0 |
| | 3 | −1 865 kr | 20 av 24 | **0** | 5,0 |
| Hälften rätt (0,5 per steg) | 1 | +115 kr | 13 av 24 | 9 | 3,5 |
| | 2 | −983 kr | 16 av 24 | 3 | 4,2 |
| | 3 | −253 kr | 15 av 24 | 1 | 4,4 |
| 0,85 rätt per steg | 1 | +2 820 kr | 5 av 24 | 14 | 2,2 |
| | 2 | +2 696 kr | 6 av 24 | 6 | 2,1 |
| | 3 | +2 695 kr | 6 av 24 | 11 | 3,2 |
| Varannan raket rätt ("halva") | 1–3 | +1 500 till +1 976 kr | 8–10 av 24 | 3–12 | 2,5–3,8 |

**Målen:**
- **"Alltid fel"** går med förlust de flesta kvällar från vecka 1 och blir aldrig 1:a efter första veckan. **Uppfyllt.**
- **"Hälften rätt"** går ungefär jämnt upp och hamnar i mitten av byn. **Uppfyllt för 0,5 rätt per steg:** −983 till +115 kr, plats 3,5–4,4 av omkring sju.
  - Trappans "halva" (varannan raket rätt hela vägen) svarar rätt på omkring tre av fyra steg, eftersom en felraket faller på första steget. Den går med vinst.
- **0,85** går med vinst och kan bli 1:a. **Uppfyllt.**

**Ett svar i dag** (`summary.answers`):
- fel: −2,6 till −3,3 i rykte och −125 till −138 kr i kassan;
- rätt: +1,4 till +1,5 i rykte och +155 till +187 kr.
- Före ordern var det −0,2 till −0,4 i rykte för ett fel.

### Ekonomins trappa över säsongen

8 spelare, 20 säsonger var, åtta veckor (`frontend/reports/order303/trappa-*.json`, jämfört med `../order299b/trappa.json`):

| Spelaren | Stängda | Kassa vid säsongens slut, medel | Stjärnan |
|---|---|---|---|
| Mentorn | 0 av 20 (299b: 0) | 236 454 kr (45 941) | 0 (0) |
| Den kloka | 0 av 20 (0) | 249 084 kr (57 694) | 0 (0) |
| Per | 0 av 20 (0) | 236 454 kr (45 941) | 0 (0) |
| Stjärnjägaren | 0 av 20 (0) | 72 026 kr (52 958) | **3 (7)** |
| Den förnuftiga | 0 av 20 (0) | 208 954 kr (24 088) | 0 (0) |
| Halva | **8 av 20 (4)** | 6 102 kr (1 604) | 0 (0) |
| Alltid fel ("halvbra") | 20 av 20 (20) | −60 529 kr (−26 313) | 0 (0) |
| Den slarviga | 20 av 20 (20) | −88 380 kr (−79 195) | 0 (0) |

- **Trappan håller:** mentorn och den förnuftiga stänger aldrig, den slarviga stänger alltid.

**Att besluta:**
1. **De bästa spelarnas kassa vid säsongens slut** blir omkring fem gånger större (236 000 mot 46 000 kr), eftersom rätt svar nu höjer hela rummets notor. Butikens priser och veckomålet är satta mot den gamla nivån. Uppsidan kan sänkas, men då stänger "halva" oftare (0,3 gav 18 av 20).
2. **Stjärnan** delades ut 3 gånger på 20 säsonger för stjärnjägaren, mot 7. Målet från 298b, 20–40 % för 0,75, nås inte längre: 15 %.
3. **`INCIDENTS.wrongCashShare`** är tillbaka på 1. ORDER 296b ("felsvar ska kosta mindre", Vision Owner) satte 0,5. ORDER 303 säger att följderna är för svaga, och den senare ordern gäller. Det står här så att det syns.

## C. Ryktet följer med

- **Ryktet per svar** står i `balance.ts` `CONSEQUENCES`:
  - fel: −1,5 vid ett lätt fel, −3 vid medel och −6 vid ett grovt;
  - rätt: +0,3 per klarat steg och +1 när raketen klaras.
- **"Recensioner i morse"** byggs när dagen byts, efter nattens självläkning (`sim/morningReview.ts`), och står överst i morgonens högerspalt (`ui/MorningReviewLine.tsx`). Exempel ur testet `order303Foljderna.test.ts`: "Reputation −4: one table got a wrong answer (…)". På svenska: "Ryktet −4: ett bord fick fel svar (Första flaskan)." Raden säger:
  - ryktets ändring från kvällens början till morgonen;
  - borden som fick fel svar och rätt hela vägen, med händelsernas namn;
  - resten som "gästernas kväll i övrigt".
- **Samma kväll:** ordet på gatan (`sim/streetWord.ts`) är −0,08 per fel svar och +0,04 per klarad raket, inom −0,4 och +0,2. Det klingar av med 0,004 per spelminut. Ankomsterna läser det (`arrivals.ts` `arrivalAttraction`). 302 visar det på gatan.

## D. Fel svar får fler följder

Graden läses ur raketens egen data (`incidents.ts` `failSeverity`, `CONSEQUENCES`):
- **grovt:** gäster går ut, eller nöjdheten sjunker med 0,2 eller mer, eller ryktet med 2 eller mer;
- **medel:** nöjdheten sjunker med 0,1 eller mer;
- **lätt:** resten.

| Grad | Följd |
|---|---|
| Lätt | Mindre dricks (−0,1 av notan), bordet lite mindre nöjt. Texten: "Bord 4 lämnar mindre dricks". |
| Medel | Bordet beställer mindre (−0,5 av notan) och klagar. Personalens ork sjunker med 0,06. Texten: "Bord 4 klagar och beställer mindre". |
| Grovt | Bordet går utan att betala. Förut gick en gäst vid varje fel. |
| Rätt | Mer dricks per klarat steg (som förut), ett glas till, och avec när raketen klaras (0,2 av notan). Texten: "Bord 4 stannar för avec". |

Dricksen går till personalens pott, inte till kassan (sedan ORDER 280).

## E. Dricksen, personalen och den sociala hållbarheten

Talen står i `balance.ts` `STAFF_CONDITION`, logiken i `sim/staffCondition.ts`.
- **Orken (0–1)** sjunker med 0,0008 per spelminut med öppna dörrar och med 0,06 när en gäst klagar. Den stiger med dricksen (0,0002 per krona) och är full efter natten.
- **Trivseln (0–1)** drar mot 0,75 och påverkas av:
  - kvällens dricks;
  - kurserna på morgonen (+0,06 per kurs);
  - −0,03 varje gång personalen står i en händelse de saknar kunskap för.
- **Låg ork eller trivsel** (under 0,5) gör uppgifterna upp till 60 % långsammare (`service.ts`). Ett rätt svar ger mindre, ner till 40 % av effekten (`staffEffect`).
- **Kunskapsområdena** är vin, mat och service, efter raketernas spår (sommellerie och kök).
  - Från början: värden och servitören har service, kocken har mat.
  - "Vinprovning" på morgonen lär salen vin, "Utbilda salen" lär service och "Gästkock" lär mat.
- **Tvekan:** saknar personalen händelsens område blir ett lätt fel ett medelfel, och raden säger "Personalen tvekar · …". `hesitationToGrave` (0) kan göra medel till grovt också. Det prövades (W1) och sänkte alla spelare för mycket.
- **I bokslutet:** veckoavräkningen säger "Personalen fick … i dricks. Den sociala hållbarheten: orken … %, trivseln … %." (`SettlementRecord.social`, `BankDialog.tsx` `settlementInWords`).
- **Avvikelse:** spec nämner ost och fisk som områden. Raketerna har bara spåren sommellerie och kök, så områdena är vin, mat och service tills varukorgen i ORDER 304 ger varor egna frågor.

## F. Status som går att se

- **Statusläget** (tangenten S, eller knappen Status (S) i nivåraden) visar:
  - stämningssymbolen vid alla bord samtidigt (`moodSymbols.ts`, `all`);
  - orken som en ring vid fötterna i tre lägen. Ringen är en grädde båge, en, två eller tre tredjedelar, och skiljer sig från rollernas färger (`WineBarFigures.tsx`).
- **Klick på en gäst eller i personalen** öppnar ett litet kort:
  - för personalen: rollen, orken och trivseln i tre lägen, och vad de kan;
  - för gästen: gästtypen och stämningen (`StaffRingTag.tsx`, `GuestStatusCard.tsx`).
- **D5 levererar formerna** (ringen, korten). Det här är spelets egna former tills dess.

## G. Menyerna och kameran

- **Överlapp:** layoutkörningen (`scripts/order300-layout.mjs`) fäller nu när HUD:ens paneler ligger på varandra (`overlaps`). Den har också en mätpunkt med ett raketkort öppet.
  - Kontrollen hittade ett fel: förberedelseraden från ORDER 300 breddade kolumnen, så att mätaren hamnade under farten före öppning. Det är rättat.
- **Fokusläget** (`ui/FocusMode.tsx`) slår på under 14 m eller med H:
  - bandet i byn, förberedelseraden och aviseringarna döljs;
  - kön, flikarna och nivåraden krymper till smala lister;
  - kassan, klockan och mätaren står kvar.
  - Utvecklarnas säsongsväxel låg på H och är flyttad till J. Tangenttabellen i `CLAUDE.md` är uppdaterad.
- **Pyramidens ögonblick** (`ui/service/PyramidMoment.tsx`): när raketen klättrar ett steg visas pyramiden stort i mitten i 1,5 s, med steget och multiplikatorn. Raden under är "Säkerhet × steg → kvällens utfall", till exempel "Vet det × Techne ×2 → +6 krediter". Sedan krymper den nedåt mot listen. Med reducerad rörelse står den still.

## I spelarens flöde (produktionsbygget)

`scripts/order303-check.mjs`, 1440 × 900. Sparfilen är måndag vecka 2 i vinbaren, med baspaketet. Dörrarna öppnas och kvällen spelas.

- **Pyramidens ögonblick** syntes efter ett klarat steg och försvann sedan (`check-ogonblick.json` `moments`, `momentGone`). Raden var "Utan insats × Episteme ×1 → 1 ny gäst in" (`momentLines`, utan egen insats). Bild: `check-pyramidens-ogonblick.png`.
- **Statusläget och fokusläget** slogs på under servicen kl. 22.01 (`check-ogonblick.json` `status.pressed`, `focus`). Bilder: `check-statuslaget.png` och `check-fokuslaget.png`.
  - I statusläget står stämningssymbolerna över alla bord samtidigt.
  - Ringen för orken syns svagt på krogens avstånd. D5 ger formen.
  - Bandet i byn räknar nöjda gäster ("2:a i byn").
- **Nästa morgon** står "Recensioner i morse": "Ryktet −9: 2 bord fick fel svar (Är det champagne?, Efter stängning), gästernas kväll i övrigt −3." (`check-morgon.json` `review`, bild `check-recensioner-i-morse.png`).
  - Raden kom först efter en rättelse. `reputationAtServiceStart` nollställs när servicen stänger, så raden utgår nu från ryktet när dagen började.

**Layouten:** `scripts/order300-layout.mjs` med kontrollen av överlapp och raketkortet. Alla tolv skärmar i alla fem storlekar är godkända, 60 av 60 (`frontend/reports/order303/layout/layout.json`). Raketkortet och HUD:ens paneler ligger aldrig på varandra.

## Tester och bygge

- **Nya tester:** `sim/__tests__/order303Foljderna.test.ts`, med 5 tester (felets grad, ordet på gatan, recensionen, placeringen och personalen), och harnessen `testHarness/__tests__/order303Foljderna.test.ts` (FOLJD=1).
- **Ändrade tester:**
  - `order296bBalans.test.ts`: `wrongCashShare` är 1.
  - `order270Incidents.test.ts`: raketen "isen efter åtta" kan öppna efter 20.59 när andra raketer drar ut. Det som prövas är att den öppnar efter åtta.
- **Hela sviten:** 2 340 gröna och 16 överhoppade. Typecheck och bygge är gröna.
