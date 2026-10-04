# ORDER 297b — Efter byn i kvällsljus (rapport)

**Underlag:** Anders 2026-10-04 (`ORDRAR_300-302.md`): ORDER 297 godkänd. Därefter 297b → 300 → 301 → 302.

Gren `order-297b` från `main` (`1c6b44c`). Talen pekar på filer under `frontend/reports/order297b/`:
- **`check-1440x900.json`, `check-1280x720.json`:** produktionsbygget i spelarens flöde, fredagens sparfil i vinbaren, med fyra nivåer vid 18.20, 19.30, 21.00 och 22.50 (`scripts/order297-check.mjs`).
- **`ljus-kalibrering.json`:** luminansen i bildens mitt, med percentiler (`scripts/luminance.mjs`).
- **`profil-1440x900.json`:** bildfrekvensen på byns nivå med en av scenens delar dold i taget, utan skuggor, med kvällen igång, och en CPU-profil (`scripts/order297b-profile.mjs`).
- **`utan-rattelse/profil-1440x900.json`:** samma mätning med de två rättelserna i §3 avstängda.
- **`fore/`:** den första kontrollen i 297b, före ljusändringarna.
- **`kalib/`:** prövning med en fast ljusfaktor.

## 1. Besluten efter 299 — redan gjorda

Alla tre punkterna gjordes i ORDER 299b (merge `2982412`). Inget är ändrat här.
- **Mätaren** står till höger om kassan, som i D1. Den börjar 13–15 px från kassans kant (`reports/order299b/check-*.json` `rockets[].layout.meter`). I 297 kördes kontrollen om efter att rummet vändes: mätaren 890 px mot kassans kant 875 px (`reports/order297/raketen/check-1440x900.json`).
- **Symbolerna** visas som D1 säger: väntar, otålig och missnöjd hela tiden, glad och nöjd i 4 s (`scene/moodSymbols.ts`, sedan ORDER 299).
- **Kunskap lyfter stämningen.** Tabellen nedan kommer ur `reports/order299b/stamning-*.json`: 48 kvällar per spelare, vinbaren vecka 2. Ekonomins trappa var identisk med 298b i 160 av 160 säsonger (`reports/order299b/trappa.json`).

| Spelaren | Läget stiger | Läget sjunker | Otåligt eller missnöjt ≥ 15 spelminuter |
|---|---|---|---|
| 0,85 rätt per steg | 2,1 | 1,9 | 19 av 48 |
| 0,6 rätt per steg | 2,0 | 2,3 | 33 av 48 |
| Slarvig | 0,9 | 3,4 | 48 av 48 |

Alla tre villkoren gäller. Marginalerna för de två skickliga spelarna är små (se `ORDER_299B_RAPPORT.md` §3).

## 2. Krogens nivå ljusare

**Rättelse först.** ORDER 297 skrev "krogen 116 mot Designs 141". Det talet kom från en tidigare körning. De incheckade bilderna i `reports/order297/` ger 138,1 vid 19.30 (`ljus-order297-bilder.json`). Rättelsen står också i `ORDER_297_RAPPORT.md` §3.

**Före ändringen** (`fore/ljus.json`, 1440 × 900):
- krogen gav 136,0 vid 18.20, 138,7 vid 19.30 och 129,4 vid 21.00;
- under 130 alltså kl. 21.00, när rummet är fullt och teaterns ljus står för en större del.

**Ändringen.** Kvällsljusets faktor på krogens nivå är höjd från 0,59 till 0,8 (`village/EveningLighting.tsx` `PALETTE_BY_LEVEL`). Teaterns strålkastare är inte ändrade.

**Efter** (`ljus-kalibrering.json`):

| Krogen 24 m | Medel | p90/p10 | p90 − p50 |
|---|---|---|---|
| Design (krogen-2-24m-kon) | 141,4 | 3,14 | 16,0 |
| 1440 × 900 18.20 | 139,6 | 2,63 | 23,1 |
| 1440 × 900 19.30 | 140,7 | 3,01 | 23,3 |
| 1440 × 900 21.00 | 131,2 | 3,65 | 25,4 |
| 1280 × 720 18.20 | 135,2 | 2,76 | 24,9 |
| 1280 × 720 19.30 | 136,4 | 3,00 | 25,0 |
| 1280 × 720 21.00 | **128,8** | 3,40 | 24,2 |

- **Strålkastarnas verkan** mäts som skillnaden mellan de ljusaste pixlarna och mittvärdet (p90 − p50). Den är 23–25, ungefär som före (24,5–26,1 i `fore/ljus.json`) och högre än i Designs bild (16,0).
- **Kontrasten** p90/p10 ligger i Designs nivå.
- **Avvikelse:** 1280 × 720 kl. 21.00 ger 128,8, alltså under 130.
- **Faktorn ger lite:** med 1,1 blev krogen 143,6 vid 19.30, men spridningen sjönk till 21,8 (`kalib/ljus.json`). Jag har stannat vid 0,8 för att inte ta verkan från strålkastarna. Beslut om 21.00 i den lilla storleken: höj faktorn, eller godta 128,8.
- Krogen kl. 22.50 mäts efter stängningen (23.40, `roomGrade` `afterClose`) och är mörk med avsikt (41,1).

**Gatans och kvarterets nivå** är också mörkare än Designs bilder sedan rummet vändes: gatan 67,1 mot 98,8 och kvarteret 73,0 mot 81,6 vid 19.30.
- Gatan reagerar knappt på faktorn: 75 vid 0,8 och 84 vid 1,1 (`kalib/ljus.json`). Ett stort träd står mitt i gatans bild, och krogen hamnar uppe till vänster (`check-1440x900-1930-gatan.jpg`).
- Det hör ihop med ORDER 300 §7 ("på gatunivån syns spelarens krog tydligt") och tas där.

## 3. Bildfrekvensen

**Vad som kostade mest.** Mätningen gjordes på byns nivå 660 m kl. 19.30 i 1440 × 900.
- **Simuleringen, inte ritandet.** Med kvällen pausad gav scenen 43–46 bilder per sekund, och kvällen igång (2×) bara 15,1 (`utan-rattelse/profil-1440x900.json` `all` och `running`).
- **Processortiden** gick till React (`hy` 14,8 %, R3F:s jämförelse av props `equ` 8,4 %, skräpsamling 5,8 %) och drei `Instances`, som räknar om varje instans matris i varje bildruta.
- **Orsak 1 — hela scenen renderades om vid varje simuleringssteg.** `StrategicApp` läser simuleringen, och `StrategicScene` var inte memoiserad. Därför renderade `<Canvas>` om hela trädet med byns tusentals `<Instance>`-barn varje gång kvällen tickade.
- **Orsak 2 — de stillastående lagren räknades om.** drei `<Instances>` räknar som förval om alla matriser i varje bildruta (`frames = Infinity`). 58 sådana lager i 16 filer (träd, staket, gårdar, fönster …) står stilla.
- **Skuggorna** kostade 43,4 → 52,8 i pausat läge. De är kvar.
- **Med en del dold i taget** gav ingen enskild del mer än några bilder per sekund (`profil-1440x900.json` `parts`). Ritandet var inte flaskhalsen.

**Åtgärder:**
1. `StrategicScene` är memoiserad (`scene/StrategicScene.tsx`). Komponenterna som följer simuleringen läser den själva.
2. Byns stillastående `<Instances>` har `frames={STATIC_INSTANCE_FRAMES}` (3; `scene/staticInstances.ts`). Räknaren i drei nollställs vid varje rendering, så en ändring kommer ändå med. Testet `order297bByn.test.ts` kontrollerar att alla `<Instances>` i scenen har det.
3. Kyrktornets ljus (§4) sökte först tornet i hela scenen i varje bildruta, vilket var 12,8 % av processortiden (`profil-1440x900-tornet-sokt.json`). Det söks nu en gång.

**Efter** (`profil-1440x900.json` `running`): 59,6 bilder per sekund med kvällen igång, mot 15,1 före.

**I kontrollen** (`check-*.json` `fps`, körd innan tornet cachades):

| Nivå | 1440 × 900 | 1280 × 720 |
|---|---|---|
| Byn 660 m | 53,9–57,3 | 51,9–58,0 |
| Kvarteret 90 m | 60,0–60,1 | 60,0 |
| Gatan 42 m | 60,0–60,2 | 60,0–60,1 |
| Krogen 24 m | 59,9–60,1 | 60,0–60,1 |

60 är skärmens takt. ORDER 297 gav 25,4–45,3 (`reports/order297/check-*.json`).

**Mätverktyget.** `lib/RenderProfileProbe.tsx` är aktivt bara med localStorage `nexus.renderProfile`.
- Scenens delar är namngivna grupper (`part:<komponent>`) i `StrategicScene.tsx`.
- Probe:n kan dölja dem en i taget, stänga av skuggor och pausa kvällen (farten 0).
- Skriptet: `REPORT_ORDER=order297b node scripts/order297b-profile.mjs`.

## 4. Billiga detaljer

**Kyrktornet** belyses från marken när lyktorna tänds, som i Designs `byKvall.js` (`village/EveningAccents.tsx`, `LIGHTS.church.on`):
- tornets material lyser (0,32 vid fullt);
- en ljuscirkel ligger vid foten (0,35).

**Sjön** tar himlens sjöfärg (`SKY.lake`) efter kvällens gång:
- materialets färg sätts så att ytans medelfärg blir himlens sjöfärg;
- stranden behåller sin gradient.

Ingen ny ljuskälla. Bildfrekvensen står i §3.

## 5. Beslut som står kvar (§13)

- **Ingen efterbehandling** (färggradering, vinjett) nu. Den kan prövas när bildfrekvensen har marginal. Byns nivå ligger nu på 52–60 i kontrollen, så det finns marginal.
- **Matvagnens lampor** och **riktiga ljuskällor vid de andra krogarna** väntar.

## 6. Tester och bygge

- `sim/__tests__/order297bByn.test.ts`, med 3 tester: memo, `frames` på alla `<Instances>`, tornet och sjön.
- Hela sviten: 2 329 gröna och 15 överhoppade.
- Typecheck och bygge är gröna.
