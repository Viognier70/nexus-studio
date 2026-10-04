# ORDER 299b — Mätaren vid kassan och stämningen som lyfts av kunskap (rapport)

**Vision Owners beslut 2026-10-04** (ORDER 299 godkänd):
1. Mätaren flyttas till höger om kassan, som D1 visar.
2. Symbolerna visas som D1 säger: väntar, otålig och missnöjd hela tiden, glad och nöjd i 4 s.
3. Stämningen ska kunna lyftas av kunskap. Värdena i `balance.ts` kalibreras (rätt- och fel-effekten och spridningen till rummet), så att i harness:
   - med 0,85 rätt per steg stiger rummets läge minst lika ofta som det sjunker;
   - med 0,6 sjunker det oftare än det stiger;
   - den som svarar slarvigt får ett otåligt eller missnöjt rum de flesta kvällar.
   - Ekonomins trappa ändras inte.
4. Ansiktena på manusfigurerna kopplas in när det passar, gärna i 297.

Gren `order-299b` från `main` (`c39cfa8`). Talen pekar på filer under `frontend/reports/order299b/`.

## 1. Mätaren till höger om kassan

Stämningen i rummet står som en egen ruta i HUD:ens översta rad, till höger om kvällskassan, i kassans trä och mässing (`StrategicApp.tsx`, `MoodMeter.tsx`). Den är minst 230 px bred, som D1 säger.
- Den står bredvid kolumnen med klockan, kassan och bandet, så att bandet Byn i kväll inte blir bredare (D1 §9).
- Under en raket viker bandet undan, och kortet börjar högre.
- Kassans ruta växer med sin översta rad, så att mätaren inte täcker "kvar till insatsen". Mätaren flyttar sig därför några pixlar när beloppet blir längre.

**Produktionsbygget** (`check-1280x720.json`, `check-1440x900.json` `rockets[].layout.meter`):
- mätaren börjar 13–15 px till höger om kassans kant, i samma höjd;
- rummet tar 70,6 % (1280 × 720) och 71,1 % (1440 × 900) av bildens mitt;
- bilder: `check-*-raket-*.jpg`.

## 2. Symbolerna

De visas redan som D1 säger sedan ORDER 299 (`scene/moodSymbols.ts`). Inget ändrat.

## 3. Stämningen som lyfts av kunskap

**Ekonomin rörs inte.** Gästernas nöjdhet styr dricksen, ryktet och vem som går. Kunskapens del av stämningen är därför ett eget värde:
- **Stämningen** är gästens nöjdhet plus gästens lyft plus rummets lyft (`sim/guestMood.ts` `guestMoodValue`).
- **Ekonomin** läser bara nöjdheten.
- **Vittnenas effekt flyttad:** i ORDER 299 flyttade svaret vittnenas *nöjdhet*. Den effekten ligger nu också i lyftet.

**Kontroll:** trappan med 20 säsonger för alla åtta spelare (`trappa.json`) är identisk med ORDER 298b (`../order298b/trappa-golv.json`). Alla 160 säsonger har samma kassa, stängning och stjärna.

**Värdena** (`balance.ts` `MOOD_BALANCE`):

| Vad | Rätt | Fel |
|---|---|---|
| Bordet där svaret gällde | +0,15 | −0,30 |
| De som såg det (inom 3,5 m) | +0,10 | −0,20 |
| Spridningen till rummet (rummets lyft) | +0,17 | −0,30 |

- **En gäst som går missnöjd** (utan mat, eller som ger upp i kön) sänker de nära med 0,10 och rummet med 0,02.
- **Rummets lyft** gäller alla i rummet, också de som kommer senare. Det står kvar kvällen ut och börjar på noll varje kväll.
- **Gästernas lyft** klingar av 0,0005 per spelminut.
- **Lyften** stannar inom ±0,4.

**Varför de här talen** (`kalibrering.json`, varianterna A–M8):
- **Fel väger omkring dubbelt så tungt som rätt.** Med lika vikt gav också 0,6 rätt per steg ett lyft. Med vikten 0,17 mot 0,30 blir varje svar i snitt positivt vid 0,85 (0,85 × 0,17 − 0,15 × 0,30 > 0) och negativt vid 0,6 (0,6 × 0,17 − 0,4 × 0,30 < 0).
- **Spridningen ligger på rummet, inte på gästerna.** Ett lyft per gäst följdes alltid av ett fall: när det klingade av, och när de lyfta gästerna gick och nya kom på noll. Därför kunde läget aldrig stiga oftare än det sjönk (varianterna A–F).
- **Gästerna som går missnöjda** behövdes för den slarviga. Hen köper för lite, så gästerna får ingen mat och går. Rummet töms och ser lugnt ut, och raketerna blir få (0,6 per kväll).

**Tabellen.** Vinbaren vecka 2, måndag–lördag, frö 1–8: 48 kvällar per spelare. Rummets läge läses som mätaren läser det, med dödzonen. Källa: `stamning-*.json`.

| Spelaren | Svar per kväll | Läget stiger | Läget sjunker | Till sista beställningen (stiger/sjunker) | Otåligt eller missnöjt ≥ 15 spelminuter |
|---|---|---|---|---|---|
| 0,85 rätt per steg | 6,0 | **2,1** | **1,9** | 2,0 / 1,5 | 19 av 48 |
| 0,6 rätt per steg | 4,3 | **2,0** | **2,3** | 1,9 / 2,0 | 33 av 48 |
| Slarvig (köper för lite, svarar fel) | 0,6 | 0,9 | 3,4 | 0,9 / 3,4 | **48 av 48** |
| Alltid fel (mentorns morgon) | 1,9 | 0,7 | 1,6 | 0,6 / 1,5 | **45 av 48** |

**Tid i varje läge:**

| Spelaren | Glad | Nöjd | Väntar | Otålig | Missnöjd |
|---|---|---|---|---|---|
| 0,85 rätt per steg | 33 % | 48 % | 4 % | 4 % | 12 % |
| 0,6 rätt per steg | 17 % | 46 % | 6 % | 9 % | 23 % |
| Slarvig | 1 % | 23 % | 11 % | 15 % | 50 % |
| Alltid fel | 3 % | 40 % | 2 % | 9 % | 47 % |

Alla tre villkoren gäller.
- **Marginalerna är små** för de två skickliga spelarna (2,1 mot 1,9, och 2,0 mot 2,3). Med 24 kvällar vände 0,85 till 1,7 mot 1,8 (`kalibrering.json` K och K8), så 48 kvällar behövs för ett säkert svar.
- **Mot kvällens slut** sjunker läget när rummet töms och de sista gästerna drar medelvärdet. Därför står också räkningen fram till sista beställningen (22.30) i tabellen.
- **"Den som svarar slarvigt"** är prövad både som trappans slarviga (köper för lite och svarar fel) och som den som alltid svarar fel med en vanlig morgon. Båda får ett otåligt eller missnöjt rum de flesta kvällar.

**I spelet** (`check-*.json` `samples[].meter`):
- Ett rätt svar lyfte mätaren från nöjd till glad (fyllningen 3,5–3,7 → 4,4–4,8).
- Ett fel svar tog den till väntar (2,4) eller missnöjd (0,8).

## 4. Ansiktena på manusfigurerna

Väntar till ORDER 297, som Vision Owner föreslog.

## 5. Tester och bygge

- **Ändrade tester** i `sim/__tests__/order299Stamning.test.ts`: svaret lyfter bordet, dem som såg det och rummet utan att röra nöjdheten, och rummets lyft gäller också en gäst som kommer efteråt.
- **Mätningen:** `order299StamningKvall.test.ts`, med spelartypen (`STAMNING_PLAYER`), dagarna, fröna och `MOOD_VARIANT` för prövning i minnet.
- **Kontrollen i spelet:** `scripts/order299-check.mjs`, som också mäter mätarens plats.
- Hela sviten och bygget är gröna.

## 6. Rättat på vägen

Ett fel svar som bara gällde kön ("1 i kön går") skickade inte kameran någonstans i ORDER 299. Rättelsen därifrån prövades i en kontrollkörning under arbetet med 299b: kameran gick in till 6,13 m. Den filen skrevs över av den sista körningen, som inte hade något sådant svar, så talet står inte i någon fil.
