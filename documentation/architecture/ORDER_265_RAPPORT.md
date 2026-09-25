# ORDER 265 — Nexus v1 etapp 3: Ekonomin och bankmötet (rapport)

**Order** `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md`, etapp 3
**Speldesign** `NEXUS_SPELDESIGN_V1.md` > Ekonomin, > Verksamhetsklasserna
**Gren** `order-265` från `main` `972f040`
**Datum** 2026-09-25

---

## 1. Vad som byggdes

**Ekonomin** (`frontend/src/sim/economy.ts`). Alla tal kommer från `balance.ts`, och filen läser aldrig krediter.

- **Golvet**
  - G = 0,6 × huvudpaviljongens medaljvärde + 0,4 × snittet av övriga fyra, högst 90. Food truckens huvudpaviljong är spelarens bästa.
  - Veckogolvet = G % av klassens normala veckointäkt (F8, uppmätt).
  - Golvet är också kreditramen för satsningar: en satsning får dra kassan ner till minus golvet, inte längre.
- **Veckoavräkningen** körs när söndagen börjar.
  - Veckans intäkt jämförs med golvet, och mellanskillnaden fylls på i kassan.
  - Lånet amorteras.
  - En väntande nedgradering verkställs.
  - Påfyllnad och amortering flyttar bara kassa, så att nästa veckas intäkt mäts rent. Båda får egna rader i kassaboken (`floor`, `amortisation`).
- **Lånet:** två veckors normal intäkt (F8), amorterat lika över åtta veckor. Räntan är 5 % av lånebeloppet över säsongen (F3) och bokförs varje dygn.
  - Det gamla lånet (ORDER 049: 2 400 kSEK och ränta per dag) är nollställt.
  - Värderingen läser nu v1-lånet.
- **Marknaden:** dagens tak på gäster = pool × kalenderns gästfaktor × (20 % + 3 pe per medaljsteg) (F21).
  - Taket gäller både ankomster och de gäster som väntar vid dörren när servicen öppnar.
  - Tester av rummets mekanik stänger av taket uttryckligen med `policies.marketCapEnabled: false`.
- **Nedgradering**
  - Tre dagsavslut i rad under noll (F24: kassan efter kvällens löner och ränta) ger nedgradering vid nästa avräkning.
  - De två första kvällarna under noll ger en varning i kvällsberättelsen.
  - Kedjan följer speldesignen. Kunskapen följer med.
- **Klassbyte** (F22), på söndagen eller vilken morgon som helst utan verksamhet, till en klass vars krav och golv är uppfyllda.
  - Nedgradering sker utan nytt lån.
  - Byte till lika stor eller större klass ger den nya klassens lån och halverat rykte.
- **v1-klasserna** ligger ovanpå simuleringens rum (F20). Ett nytt spel börjar som vinbar (F23) tills introduktionen byggs i etapp 5.

**Veckoharnessen** (`frontend/src/strategic/testHarness/weekHarness.ts`)
- Den spelar hela veckor headless med fast frö och samma åtgärder som gränssnittet.
- Den rapporterar per dag: kassa, golv, intäkt, gäster, rykte, medaljer, krediter och klass.
- Den ligger utanför `src/sim/`, eftersom tickstorlek och tickgränser är testtal, inte speltal.

**Gränssnittet** (svenska)
- Morgonraden visar klassen, på söndagen avräkningen i ord och knappen "Banken".
- **Banken** har en diagnos i ord: "Du driver vinbaren. Du har visat att du kan vin och dryck, köket och bemötande och omdöme." Den visar de sex klasserna med vad som saknas i ord, och "Byt till …" när det går.
- Utan verksamhet visar morgonen vägen till Måltidens hus och banken.

**Fel som hittades och rättades**
- `START_SERVICE` med kvällen stängd (skala ner) hoppade över lunchen innan den upptäckte att kvällen var stängd. Dagen fastnade då på eftermiddagen, och inget sätt fanns att avsluta den. `CLOSE_DAY` gäller nu också en servicedag med stängd kväll.
- Första formen av F22 gav en nedgraderingsspiral utan väg tillbaka (se §4).

## 2. Hur det verifierades i spelarens vy

**Skript:** `frontend/scripts/order265-economy-playthrough.mjs`, körd mot produktionsbygget (`vite build` och `preview` på port 4173) med start på `/` utan flaggor. Utdata: `frontend/reports/order265/economy-playthrough.json`.

**Flödet**, bara med spelarens knappar:
1. Namnrutan.
2. Måndag: prov i Stensöta och Metodköket. Tisdag: prov i Kalastorget.
3. Varje kväll: "Öppna för kvällen" i farten 4×, quizen hoppas över, "Till nästa morgon".
4. Söndag: avräkningen i ord, `days[6].settlement` = "Veckoavräkningen. Veckan gav mer än golvet. Banken drog veckans amortering." (`1-sondag-avrakning.png`).
5. **Banken** (`2-banken.png`)
   - `bank.diagnosis` = "Du driver vinbaren. Du har visat att du kan bemötande och omdöme, vin och dryck och köket."
   - `bank.classes` visar i ord vad som saknas för restaurangen ("silver i tre paviljonger"), gästgiveriet ("guld i tre paviljonger, varav Kalastorget") och nattklubben ("guld i Kalastorget och silver i Stensöta"). Food truck och ölkrog går att välja.
6. "Byt till ölkrog" ger `afterChoice` = "Söndag · Morgon · Ölkrog …" (`3-efter-bytet.png`), och `mondayAfter` = "Måndag · Morgon · Ölkrog …" med ölkrogens rum (`4-mandag-olkrog.png`).
- `errors` är tom.

**Felet som körningen hittade.** Första körningen föll på söndagen med "Cannot read properties of undefined (reading 'map')". En omkörning med ett bygge utan minifiering visade stacken, `IndoorLamps` ← `BrewpubScene`: ölkrogens rum publicerar inga bord, och lamporna fick `undefined`. Felet fanns sedan ORDER 249, men kunde inte nås av spelaren förrän banken gjorde det möjligt att byta till ölkrogen. Rättat i `BrewpubScene.tsx`. Andra körningen gick hela vägen utan fel.

**Test:** bankens besked innehåller inga siffror (`src/strategic/economy/__tests__/bankWords.test.ts`).

**Svit:** typecheck och build är gröna. Vitest: 2002 godkända, 3 förväntade fel och 1 överhoppad (mätningen av normal veckointäkt, som körs med `ORDER265_MEASURE=1`).

## 3. Veckoharnessens tal

**Utdata:** `frontend/reports/order265/week-harness.json`, från `order265WeekHarness.test.ts`. Frö 42. Fälten `settlements` (en post per söndag) och `days` (tillståndet efter varje dag).

| Scenario | Vad spelaren gör | Visar |
| --- | --- | --- |
| `vanlig-vecka` | Brons i tre (måndag och tisdag), alla kvällar öppna | `settlements[0]`: intäkten över golvet, `topUpSek` = 0 |
| `svag-vecka` | Silver i tre och brons i Måltidsbiblioteket, kvällarna stängda tisdag–lördag | `settlements[0]`: intäkten under golvet, `topUpSek` = golv − intäkt |
| `nedgradering-och-tillbaka` | Kassa 2 000 SEK och inga medaljer vecka 1–2, brons i tre vecka 3 | `settlements[1]`: `downgradedFrom` vinbar, `downgradedTo` foodtruck. `days[].class`: vinbar, sedan food truck, sedan vinbar efter söndagen vecka 3 |

Testet hävdar alla tre ur samma körning som skriver filen.

Den normala veckointäkten per klass (F8) kommer ur `frontend/reports/order265/normal-weekly-revenue.json`, fältet `result.<rum>.median`.

## 4. Avvikelser från speldesignen och varför

- **Nedgradering utan nytt lån (F22).** Speldesignen säger att "resten av lånet skrivs ner" men inte om ett nytt lån. Första försöket gav food trucken ett nytt lån på två veckors intäkt och halverade ryktet. Spelaren gick då under igen och förlorade allt vecka 4. Det bryter princip 3, "Det finns alltid en väg tillbaka".
- **Halverat rykte även vid byte till lika stor klass.** Annars kunde ett sidobyte skriva av skulden gratis.
- **Starten (F23)** ger vinbaren utan medaljer, vilket speldesignens krav inte tillåter. Introduktionen i etapp 5 rättar det.
- **Food trucken drar mer än restaurangen** i dagens simulering: 60 744 mot 42 090 SEK per vecka. Det motsäger speldesignens ordning av klasserna. Food trucken byggs om i etapp 6.
- **Kassaboken:** avstämningstestet (M3 DoD 3) räknar nu med kostnader som dragits men ännu inte bokförts. Kvar blir en oförklarad rest på 362 SEK på tre dagar, samma kända avvikelse som ORDER 260 §9 lade i en egen order. Den är inte rättad här, trots att etapp 0:s rapport angav etapp 3.
- **Kvar utan anropare i gränssnittet**, och bör tas bort i en städorder:
  - Den gamla bankmekaniken (`REQUEST_BANK_LOAN`, ORDER 109). Den ger lånepengar utifrån kreditprofilen, alltså krediter till kassa, men nås inte från spelet.
  - Det gamla provet (`START_EXAM`).
  - Det gamla lånefältet (`state.loan`, noll).
- **Värderingens lokalvärde** (ORDER 049, cirka 2 164 kSEK) och v1-lånet (84 kSEK) har olika skala. Kassapillret uppe till höger visar värderingen, men den ska bort enligt principen "inga stat-paneler", senast i etapp 5 med tidningen.
- **Mekaniktester:** fem testfall i tre filer (`m4a` ×3, `reputation`, `day`) stänger av marknadstaket (`withoutMarketCap`), eftersom de kör äldre passlängder och prövar rummet, inte marknaden. M1 DoD 3 läser v1-lånet, som testet självt var skrivet för att larma om.

## 5. Öppna frågor

Nya eller ändrade i `NEXUS_V1_OPPNA_FRAGOR.md`:
- **F8:** intäkt och lån, nu uppmätta.
- **F20:** klasserna mot rummen.
- **F21:** marknadens pool.
- **F22:** lån och rykte vid klassbyte.
- **F23:** starten före introduktionen.
- **F24:** dagsavslutet.
