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

### Förslag till B–G (byggs i den här ordern)

1. **Följden efter hur allvarligt felet är (D).** Raketernas `fail` får en svårighetsgrad: lätt, medel eller grovt.
   - Lätt fel: mindre dricks.
   - Medel: bordet beställer mindre, eller gästen klagar och personalen lägger tid.
   - Grovt fel: gästen går utan att betala.
   - Förvalet i `answerConsequence` blir "bordet beställer mindre och dricksen sjunker", inte "går".
   - Rätt svar får skalan uppåt.
2. **Ryktet per svar och en recension i morse (C).** Varje svar flyttar ryktet med ett tal ur `balance.ts`, per svårighetsgrad, i stället för som i dag en bråkdel av en poäng. Kvällens ändringar samlas till raden "Recensioner i morse", med orsaken.
3. **Samma kväll till gatan (C).** Ett fel svar sänker kvällens dragningskraft i byns val för de sällskap som inte valt ännu (302 visar det).
4. **Placeringen (B).** Placeringen i byn räknas på gäster gånger kvällens stämning eller recension, så att ett fullt men missnöjt hus inte blir 1:a. Alternativet är att låta målen nås genom ryktet ensamt. Jag kalibrerar mot målen i B och rapporterar talen.
5. **Personalens ork, trivsel och kunskapsområden (E)** och statusläget (F) byggs efter D5 där den behövs (ringen, korten). Utan D5 används spelets egna former tills vidare.
6. **Menyerna (G):** kontroll av överlapp i layoutkörningen, fokusläget under 14 m eller med H, och pyramidens ögonblick.
