# ORDER 264 — Nexus v1 etapp 2: Kunskapen (rapport)

**Order** `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md`, etapp 2
**Speldesign** `NEXUS_SPELDESIGN_V1.md` > Kunskapen
**Gren** `order-264` från `main` `73c01e2`
**Datum** 2026-09-25

---

## 1. Vad som byggdes

**Paviljongsbesök** (`frontend/src/strategic/knowledge/pavilionVisit.ts`)
- Ett besök kostar en schemaplats. Platserna delas med morgonens satsningar.
- **Öva:** fem frågor med förklaring efter varje svar.
- **Prov:** åtta av nivåns tio frågor i slumpad ordning. Sex rätt ger medaljen. Provet gäller alltid nästa nivå (F18), och ett omprov drar nya frågor.
- Varje rätt svar ger en kredit på frågans axel och spår, i både Öva och Prov.
- Slumpen kommer från simuleringens eget frö, så ett sparat spel fortsätter likadant.

**Medaljerna**
- Brons till platina per paviljong. Medaljer skrivs bara av `awardMedal`, som tar den högsta nivån.
- Platina ger en belöningsflagga (`hasPlatinumReward`) som verksamheten kan läsa.
- **Teatern** är låst tills spelaren har silver i två paviljonger. Tills Vision Owner skrivit Teaterns frågor används kökets och sommelleriens frågor (F6).

**Quizen efter servicen** (`frontend/src/strategic/knowledge/postServiceQuiz.ts`)
- Quizen erbjuds när kvällen börjar, också efter en kväll som fallit ihop.
- Den har tre frågor från kvällens svagaste axel (F16). Rätt svar ger +1 kredit och fel svar −1. Krediterna går aldrig under noll, och medaljerna rörs inte.
- Att hoppa över kostar inget.

**Kvällen** (F17)
- Kvällen varar 240 simulerade sekunder (`EVENING.simSeconds`), vilket är 2 minuter i verkligheten.
- Den väntar medan quizen pågår, och spelaren kan gå vidare med "Till nästa morgon".

**Frågor under servicen** (F15): stängda i v1 via den befintliga policyn `anchorQuestionsEnabled: false`. Koden ligger kvar.

**Tillbaka en vecka** (F19): kunskapen följer med (`carryKnowledge`).

**Gränssnittet** (svenska)
- Knappen "Måltidens hus" på morgonraden öppnar paviljongerna, med medalj, lås, Öva och "Prov: <nivå>".
- `QuestionCard` visar frågan som en replik, till exempel "Sommelieren: …", följd av förklaringen.
- Resultatet visas i ord.
- Medaljraden står på morgonraden.
- Kvällsraden har quizen och "Till nästa morgon".

**Fel som hittades i spelarens vy och rättades**
- Byggnadens namnskylt och mentorns pratbubbla (drei `Html`) lades ovanpå alla dialoger och täckte Måltidens hus rubrik och Stäng-knapp. De har nu `zIndexRange` [30, 0], som gatunamnen.

## 2. Hur det verifierades i spelarens vy

**Skript:** `frontend/scripts/order264-knowledge-playthrough.mjs`, körd mot produktionsbygget (`vite build` och `preview` på port 4173) med start på `/` utan flaggor. Utdata: `frontend/reports/order264/knowledge-playthrough.json`.

Flödet, bara med spelarens knappar:
1. Namnrutan.
2. Måltidens hus: `1-maltidens-hus.png`. Teatern visar "Öppnas när du har silver i två paviljonger" (`house.theatre`).
3. **Öva i Stensöta,** med en fråga besvarad fel med flit: förklaringen efter felet finns i `2-ova-forklaring.png`, resultatet i `practiceResult` och `3-ova-resultat.png`.
4. **Prov i Stensöta:** `examResult` = "8 av 8 rätt. Du har tagit brons i Stensöta." (`4-prov-brons.png`). Efteråt visar `shelfAfterExam` brons, och schemat står på 2 av 2 (`5-morgon-med-medalj.png`).
5. **Kvällen** i farten 4×: quizen erbjuds (`quizOffer`, `6-kvall-quiz-erbjuds.png`), spelaren svarar på tre frågor (`7-kvallsquiz.png`), och `quizDone` följs av "Till nästa morgon".
6. **Omladdning,** sedan "Fortsätt ett sparat spel" och "Ladda": `afterReload.shelf` = "Medaljer: Stensöta brons" och `afterReload.house` = "Medalj: brons" (`9-efter-omladdning.png`, `10-huset-efter-omladdning.png`).
- `errors` är tom.

**Test, ingen väg sänker en medalj** (`src/strategic/knowledge/__tests__/order264Knowledge.test.ts`)
- *Statiskt:* bara `awardMedal`, starttillståndet och `carryKnowledge` skriver `medals` i produktionskoden.
- *Dynamiskt:* 4 000 slumpade åtgärder över flera dagar, där medaljerna jämförs före och efter varje åtgärd.
- *Mutationsprövat:* en `CLOSE_VISIT` som tömmer medaljerna fångas av båda kontrollerna.

**Övriga tester**
- `order264Knowledge.test.ts`: Öva, Prov, nivåordning, platinataket, Teaterns lås och platsdelning.
- `order264Quiz.test.ts`: svagaste axeln, +1/−1, golvet på noll, att hoppa över, att kvällen väntar och `END_EVENING`.

**Svit:** typecheck och build är gröna. Vitest: 1973 godkända och 3 förväntade fel.

## 3. Veckoharnessens tal

Ej tillämpligt. Veckoharnessen körs från etapp 3.

## 4. Avvikelser från speldesignen och varför

- **Elva befintliga tester** tickade 30 sekunder för kvällen. De läser nu `EVENING.simSeconds` ur `balance.ts`. `order111`-testerna startar kvällen så att samma 30 sekunder återstår, så de prövar samma tidsfönster som före ändringen.
- **Två ankartester** (ORDER 248) slår på ankarfrågorna uttryckligen, eftersom v1 stänger av dem (F15).
- **Avklingningen av `enablers`** (5 % per natt, `reputation.ts:170`) står kvar. Den gäller inte spelarens krediter eller medaljer, som aldrig minskar utom genom kvällsquizens avdrag. Den styr ryktestaket och tas i etapp 4, inte här som etapp 0:s rapport angav.
- **Frågetexten är på engelska** tills Vision Owner har granskat det svenska utkastet (ordern etapp 0). Allt runt frågorna är på svenska.
- **Den gamla provmekaniken** (`START_EXAM`, `examMechanic.ts`, `QUESTIONS_PER_EXAM = 5`) ligger kvar utan anropare i gränssnittet. Den tas bort när bankmötet byggs om i etapp 3, eftersom `examSlotsUsed` hör till den.

## 5. Öppna frågor

Nya i `NEXUS_V1_OPPNA_FRAGOR.md`:
- **F15:** inga frågor under servicen.
- **F16:** kvällens svagaste axel.
- **F17:** kvällens längd och slut.
- **F18:** provet gäller nästa nivå.
- **F19:** tillbaka en vecka behåller kunskapen.

---

## Omräkning av återstående etapper (ordertillägget 2026-09-25)

**Så gick de tre första**, tid från att grenen skapades till mergen enligt `NEXUS_V1_TIDSLOGG.md`:

| Etapp | Uppskattat | Faktiskt | Faktiskt / lägsta uppskattning |
| --- | --- | --- | --- |
| 0 | 1–2 h (i efterhand) | 15 min på grenen, cirka 30 min med läsningen | ~0,5 |
| 1 | 4–6 h | 1 h 19 min | ~0,33 |
| 2 | 5–7 h | 33 min | ~0,11 |

**Slutsatser**
- Uppskattningarna var 3 till 8 gånger för höga.
- Koden tar kort tid. Det som tar tid är verifieringen i spelarens vy: en hel vecka i Playwright tar cirka 20 minuter per körning. Därtill kommer felen verifieringen hittar: i etapp 1 och 2 fann den tre fel i gränssnittet som testerna inte såg.
- Risken med de kalibrerade simtesterna var mindre än väntat. Den gav 3 respektive 13 testjusteringar, alla mekaniska.

**Ny uppskattning**, med tid för en full verifieringskörning per etapp och en omkörning efter rättning:

| Etapp | Innehåll | Uppskattning | Största risk |
| --- | --- | --- | --- |
| 3 | Ekonomin och bankmötet, veckoharnessen | 1,5–2,5 h | Marknadens gästpool ändrar ankomsterna och flyttar de kalibrerade testerna; harnessen byggs från grunden |
| 4 | Servicen (action-knappen, rykte, lager, händelser, kvällsberättelsen) | 2–3 h | Action-knappen kräver val av uppgift och gäst i 3D-rummet, och "en gäst som stannar" ska synas i spelarens vy |
| 5 | Vinbaren, interiören, introduktionen, söndagstidningen, slumpmålet | 3–5 h | Interiörens synlighet (ORDER 172–174-historiken) och bussen från VS001 in i samma flöde |
| — | *Spelstopp 1* | — | — |
| 6–10 | Fem klasser, var och en med egen gästlogik | 1,5–3 h per klass, 8–14 h totalt | Gästgiveriet och nattklubben kräver egna tillståndsmaskiner för gästerna |
| 11 | Paviljongerna som platser | 1–1,5 h | Att placera fem platser i Måltidens hus på kartan |
| 12 | Säsongen och portfolion | 1–2 h | Evidensraderna behöver signaler från flera etapper |
| 13 | Genomspelningsgrinden (20 frön × en säsong) | 1–2 h | Beräkningstiden för 20 hela säsonger |
| **Summa** | | **ungefär 18–30 h** | |
