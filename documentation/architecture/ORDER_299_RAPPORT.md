# ORDER 299 — Raketen och rummet (rapport)

**Vision Owners order 2026-10-03.** Rummet ska synas under raketen, och ordern har sex punkter:
1. Smalare paneler.
2. Konsekvensögonblicket efter varje svar.
3. Notiser.
4. Kamerastyrning.
5. Mätaren "Stämningen i rummet".
6. Designs stämningssymboler, gester och ansikten (leverans D1).

**Beslut från Anders om D1 §9:**
- Per ger DJ:n tecken direkt i födelsedagens fel.
- Kameran står i söder för gästen som vinglar.
- Huvudena förstoras inte; kameran går in till omkring 5,5 m de sista 1,5 s.
- Stämningens gränser och värden står i `balance.ts`.

Gren `order-299` från `main` (`fc82ec0`). Talen pekar på filer under `frontend/reports/order299/`. Kontrollen i produktionsbygget: `scripts/order299-check.mjs` → `check-1280x720.json` och `check-1440x900.json` med bilder. Den kör spelarens flöde: sparfilen flyttad till fredag, baspaketet och 4×.

## 0. Leveranserna

Båda mapparna låg i den senaste zip-filen (`Restaurant guest animation (26).zip`). De är uppackade oförändrade till `documentation/leveranser/`, i commit `cb31427`:
- `nexus-leverans-2026-10-03-stamning` (D1);
- `nexus-leverans-2026-10-02-byn-omtag-2` (D3, till ORDER 297).

Prototypen heter `prototyp/Stamningen.html`, inte `.dc.html`.

**Monterat ur D1:**
- `figureClips.ts` (åtta gester; repots två egna ändringar är gjorda igen);
- `handelserManus.js` (besluten om födelsedagen och södra kameran);
- `guestMood.ts`, med lägena i `sim/guestMood.ts` och värdena i `balance.ts` `MOOD_BALANCE`;
- `figureFace.ts`;
- `moodStrings.ts`, inslagen i strängtabellen.

`stamningManus.js` och prototypen läses men monteras inte, som leveransen säger.

**Avvikelser som flaggas:**

| Frågan | Ordern | D1 | Gjort |
|---|---|---|---|
| Mätarens plats | där lyktornas linje satt | HUD:ens översta rad till höger om kassan | Orderns: i bandet Byn i kväll |
| Symbolen | visas 2 s när värdet ändras | väntar, otålig och missnöjd syns alltid; glad och nöjd 4 s efter bytet | D1:s (godkänd efter ordern). Säg till om 2 s ska gälla. |
| Raketkortets sida | — | till vänster (3,5–32,5 %), rummet ramas 36–96 % | Flyttat till vänster |

## 1. Panelerna

- **Pyramiden** är en smal list, 32 px hög i båda storlekarna (`check-*.json` `rockets[].layout.stripHeight`; när listen inte ryms bryts den till två rader, 40–44 px i tidigare körningar). Den visar pyramiden i liten form, våningarna med multiplikatorerna och den valda säkerheten på en rad (`KnowledgePyramid.tsx` `PyramidStrip`).
  - Panelerna till vänster i Back your knowledge (raketen och "Hur säker du var") är borta.
  - Meningen om kvällens träffsäkerhet står i stället i bandet när en satsning är avgjord.
- **Frågepanelen** är smalare och står till vänster under HUD:en. Den tar 3,5–32,5 % av bredden (`layout.card.leftShare`/`rightShare`).
  - Under raketen viker kön, händelserna, flikarna och bemanningens erbjudande undan.
  - Bandet visar bara Stämningen i rummet, på en rad.
- **Rummet i mitten:** punkter längs bildens rader på 50 % och 62 % av höjden. Canvas överst betyder att rummet syns.

| Storlek | Rummet | Källa |
|---|---|---|
| 1280 × 720 | 70,6 % | `check-1280x720.json` `rockets[].layout.rows` |
| 1440 × 900 | 71,1 % | `check-1440x900.json` |

- **Bilder:** `check-*-raket-1.jpg`, `check-*-raket-2.jpg`.
- I 1280 × 720 kortas berättelsen till två rader, så att frågan och alla svar ryms.

## 2. Konsekvensögonblicket

Efter varje raketsvar (`simulation/consequence.ts`, `scene/consequenceCamera.ts`):
- **Normal hastighet.** Spelet går i 1× under ögonblicket och återgången, sedan i spelarens hastighet. Kontrollen körde 4× och fick 4 → 1 → 4 vid varje svar (`samples[].speedNow`). Test: *spelet går i normal hastighet under ögonblicket*.
- **Kameran** följer Designs tider:
  - står kvar till 0,45 s;
  - in till 7 m och sänks (rätt: en båge och 35°; fel: rakt in och 40°);
  - stilla till 2,3 s;
  - in mot 5,5 m till 3,8 s;
  - sedan tillbaka.
  - Bordet ramas på 62 % av bredden, till höger om kortet. I händelsernas manus går kameran mot manusets punkt.
  - **Uppmätt:** kameran är närmast **6,1 m** (`samples[].camDist`, minsta 6,08–6,12). Kamerans dämpning hinner inte ända fram till 5,5 m på 1,5 s.
  - Bilder: `check-*-svar-*-7m.jpg`, `check-*-svar-*-5m.jpg`.
- **Kortet** står kvar under de 3,8 sekunderna.
- **Raden som binder ihop svaret med gästens reaktion** står i bandet (`consequenceLine.ts`). Exempel ur kontrollen:
  - *Du valde Antal, allergier och när den ska ut → bord 10 beställer ett glas till · 1 ny gäst in · grannarna nickar*
  - *Du valde Fort, så att ljusen inte hinner brinna ned → en gäst vid bord 10 går utan att betala · grannarna suckar*
- **Händelsens slut** spelas ur Designs manus (D1:s `handelserManus.js`).
- **Gästerna** gör sina gester från 0,6 s, närmast händelsen först, 0,18 s isär. Symbolerna byts vid 1,1 s och mätaren vid 1,25 s.
- **Mätaren efter svaret** (`samples[].meter`): rätt svar höll den på nöjd; fel svar (en gäst går) tog den från nöjd (fyllningen 3,1) till otålig (1,6–1,7).
- **Ett svar som bara gäller kön** (ingen gäst vid bordet) skickade inte kameran någonstans i en tidigare körning (12 m). Kameran går nu dit raketen pekade. Rättelsen är inte prövad i den sista körningen, som inte hade något sådant svar.
- **Ett fel hittat i kontrollen:** vid 4× kunde ett svar renderas två gånger med några tick emellan. React lägger om klickets uppdatering på köade TICK. Notiserna såg då samma händelse två gånger, med två tider.
  - Simuleringen hade ett svar.
  - Notiserna och kameran räknar nu en reaktion vid samma bord inom en simsekund som samma händelse.
  - Svarets reducer kopierar dagen, så att en omlagd uppdatering inte räknar glasen två gånger (`reducer.ts` ANSWER_INCIDENT).

## 3. Notiserna

`ui/service/RoomNotices.tsx`:
- **En per händelse.** Notisen visar beloppet, vad som hände vid bordet och vem som tar över efter ett fel, och står i rummets fria del.
- **Visas i 3 s** och tonas sedan bort (0,4 s). Uppmätt: sista notisen syntes 3,2–3,35 s efter svaret, en åt gången (`samples[].notices`), och ingen stod kvar efter 10 s (`later`).
- **Upprepas inte**, och högst tre staplas.
- **Antalet gäster** i notisen är de som har kommit in sedan svaret (de släpps in en i taget), högst så många som släpptes in.
- **Orsaken till provspelets 15 minuter:** taggen över bordet var en drei-Html, som inte följer gruppens synlighet. Den stod kvar tills nästa svar.
  - Den är borttagen.
  - Bubblan över rummet visar bara den pågående följden. Den är ett tillstånd tills nästa händelse (provspelet 2026-09-27), inte en notis.
  - Utfallets text står i kortet; vem som tar över står i notisen.
- **Händelsens bildtext** hålls där ingen panel ligger: under HUD:en, och till höger om kortet när det står (`scene/safeCaption.ts`). Den bryts i stället för att klippas, på högst 320 px.

## 4. Kamerastyrningen

**Det som fanns** (rapporterat först):
- scrollen zoomar, och Q/E vrider;
- vänster knapp drog för att **panorera**, höger och mitten vred;
- nivåknapparna Byn, Kvarteret, Gatan och Krogen, och Tillbaka;
- gränserna 10–1 800 m och 18–78°;
- kapningen tar bort väggen mot kameran (`wineBarRoom.ts` `updateCutaway`).

Det fanns inga knappar för vrid, zoom eller återställ, och klick på ett bord gjorde ingenting för kameran.

**Det nya:**
- **Knappar** bredvid nivåerna: vrid åt vänster och höger, zooma in och ut, återställ till krogens vy (`ui/CameraButtons.tsx`).
- **Musen:** i krogen vrider vänster knapp och höger panorerar; ute i byn som förut. Scrollen zoomar, och Q/E vrider som förut.
- **Klick på ett bord** gör att kameran glider dit, högst 14 m bort. Ett drag räknas inte som klick.
- **Gränserna** (`camera/roomBounds.ts`): när kameran tittar på krogen hålls fokus inom rummet plus 2 m, och kameran står minst 30° över golvet. Den står då alltid utanför eller över väggarna, och kapningen fungerar. I byn gäller inga nya gränser. Konsekvensögonblicket och manusen går inte genom gränserna.

**Uppmätt** (`check-*.json` `camera`, samma i båda storlekarna):

| Steget | Avståndet | Vinkeln (yaw) |
|---|---|---|
| Start | 24 m | 0,40 |
| Zooma in | 19,4–19,5 m | |
| Vrid åt vänster | | 0,15 |
| Dra med vänster knapp | | −0,81 |
| Återställ | 23,7 m | 0,40 |
| Klick på ett bord | 14,2 m | |

Test: *fokus hålls vid rummet och kameran står högt nog för att väggarna kapas*.

## 5. Stämningen i rummet

**Värdet.** Gästerna har ett stämningsvärde i dag: `Guest.satisfaction`, 0..1. En ny gäst har 0,72. Det som påverkar det:
- väntan i kön (−0,007 per simsekund);
- servicen vid bordet (välkomstdrinken, beställningen, maten, värdekvoten, återbesöken);
- slut på en rätt;
- vinkylen;
- gästtyperna;
- mise en place;
- hovmästarens nålar;
- servicens chanser;
- raketsvaren och deras följder.

Mätaren bygger på det, som ordern säger.

**Gränserna** (`balance.ts` `MOOD_BALANCE`):

| Läget | Gränsen |
|---|---|
| Glad | minst 0,85 |
| Nöjd | 0,68 |
| Väntar | 0,55 |
| Otålig | 0,40 |
| Missnöjd | under 0,40 |

- **Varför de här talen:** på en vanlig kväll ligger gästerna i median på 0,72. 10 % ligger under 0,48 och 10 % över 0,87. En ny gäst är därför nöjd.
- **Rummets läge** byter först 0,02 förbi gränsen, så att mätaren inte fladdrar.
- **Ökning och minskning:** ett raketsvar flyttar de gäster som såg det, inom 3,5 m från bordet, med +0,06 vid rätt och −0,08 vid fel. Bordet självt får svarets följd som förut.
- **Avklingning:** väntan i kön är oförändrad, 0,014 per spelminut.

**Mätaren** (`ui/host/MoodMeter.tsx`) står i bandet där lyktornas linje satt, i den varma formen. Inga siffror. Den visar:
- etiketten och symbolen med ordet;
- ett spår i fem steg, där fyllningen står mellan gränserna;
- vid stigning: fyllningen lyser upp och symbolen lyfter;
- vid sjunkning: det förlorade står streckat i 1,6 s och symbolen skakar.

Den räknas som stigande eller sjunkande när fyllningen flyttat 0,2 steg, och efter ett svar räcker 0,02 steg.

**En vanlig kväll** (`stamning.json`; vecka 2, måndag, onsdag och fredag, tre frön, mentorns morgon, raketerna med 0,75 rätt per steg):

| Mått | Per kväll |
|---|---|
| Rummets läge (ordet och symbolen) stiger | 0,3 gånger |
| Rummets läge sjunker | 1,2 gånger |
| Mätarens fyllning stiger synligt | 6,4 gånger |
| Mätarens fyllning sjunker synligt | 7,0 gånger |
| Rörelser inom konsekvensögonblicket | 2,6 |
| Raketsvar | 2 |

- **Tid i varje läge:** nöjd 73 %, väntar 17 %, otålig 9 %, glad 1 %, missnöjd under 1 %.
- **Fredagen** är den som sjunker: fredag 1 och 2 låg 35–46 % av kvällen i otålig.

## 6. Symbolerna, gesterna och ansiktena

- **Symbolerna** (`scene/moodSymbols.ts`) ritas på en duk över scenen med Designs `drawMoodSymbol`, 24 px oavsett avstånd:
  - **Var:** över bordets mitt (1,6 m), över loungens mitt (1,75 m), eller 0,42 m över hjässan på en ensam gäst vid baren eller i kön.
  - **När:** väntar, otålig och missnöjd syns alltid; glad och nöjd i 4 s.
  - **Rörelsen:** bättre lyfter, sämre skakar.
  - Symboler som skulle överlappa flyttas isär med minst 4 px.
  - Med reducerad rörelse tonas de bara in.
- **Gesterna** (`scene/moodGestures.ts`): en gäst som bara sitter gör en gest ur `MOOD_GESTURES` när läget ändras, och därefter var 24–48:e simsekund.
  - Tempot följer hur långt in i läget gästen är; otålig är alltid stressad.
  - Beställningen, maten, notan och samspelen avbryts aldrig.
- **Ansiktena** (`figureFace.ts`) sitter på varje gäst och på personalen, som alltid är nöjd. De tänds från 9 m och syns helt vid 7 m, och uttrycket byts vid 0,6 s i ögonblicket.
  - Skalet kastar ingen skugga, enligt renderregeln om opacitet (ORDER 055).

## 7. Tester och bygge

- **Nya tester:**
  - `sim/__tests__/order299Stamning.test.ts` (8 tester: lägena, rummets värde, dödzonen, fyllningen, vittnena, hastigheten, inramningen och kamerans gränser);
  - mätningen `order299StamningKvall.test.ts`, styrd av `STAMNING`.
- **Ändrade tester:**
  - klippen är 115 (D1:s åtta gester);
  - kortet stängs efter konsekvensögonblicket, med raden.
- **Kontrollen i spelet:** `scripts/order299-check.mjs`.
- Hela sviten och bygget är gröna.

## 8. Öppet

- **Kameran når 6,1 m, inte 5,5 m**, eftersom dämpningen släpar. Kan dämpningen kortas under ögonblicket, eller räcker 6,1 m?
- **Ansikten på manusets figurer** i födelsedagen och gästen som vinglar är inte inkopplade. Rummets egna gäster och personal har dem. Manusets tidslinjer för ansiktena står i `stamningManus.js`, som leveransen säger att vi läser men inte monterar.
- **Raketsvar per vanlig kväll** är omkring två i mätningen (måndag 0). Därför rör sig mätaren efter svar mest på fredagar.
- **Nästa i ordningen:** 297 (byn i kvällsljus, D3 ligger på plats), 300, 301, 302.
