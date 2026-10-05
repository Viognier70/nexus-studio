# LEVERANSNOT: kvitt eller dubbelt (tillägg till D5)

**Datum** 2026-10-05
**Till** Claude Code, via dig
**Från** Claude Design
**Gäller** Tillägget till D5 som beställdes när D2 och D5 godkändes 2026-10-05: de tre besluten, pyramidens ögonblick som satsning (fyra lägen), och rättelserna efter verifieringen. Bygger på `nexus-leverans-2026-10-04-foljderna-och-konceptet`.

Inga speltal i texterna. Potten i prototypen (1, 3, 7 krediter) är ett exempel med 1 kredit per steg. I spelet kommer stegets kredit från balance.ts (`STEP_CREDIT`).

---

## 0. Tillägg samma dag: spelets regler (ORDER 305, förslag B)

Det här avsnittet gäller före §2–§4 där de säger något annat. Låset vid 0,9 s, väntan och avgörandet vid 3,8 s står kvar.

| Vad | Förut | Nu |
|---|---|---|
| Säkerheten | Gissar / Tror det / Vet det i kortet, präglad på marken | **Borttagen.** Kortet har bara svaren och *Stå för ditt svar*. Valet mellan Stanna och Gå vidare är säkerheten. |
| Potten | kronor (170 → 340 kr) | **Krediter**, med kreditsymbolen (`graduation-cap`) och aldrig *kr*. |
| Raden | Vet det × Steg 2 → +340 kr | **Steg 2 · Techne · potten 1 → 3 om rätt.** Fältet *Om rätt* tonas till 38 % vid avgörandet, när potten har nått dit. |
| Dubblingen | potten × 2 | **potten × 2 + stegets kredit** (`potAfter` i `pyramidStake.ts` och `foljderManus.js`). Rätt i steg 1 ger 1, i steg 2 ger 3 och i steg 3 ger 7. Hela vägen ger 7 krediter. Vid steg 1 är potten tom, och fältet heter *Stegets kredit*. |
| Valet | bara efter steg 2 | **Efter varje rätt steg som inte är det sista**, alltså efter steg 1 (*Stanna: 1 kredit är din · Gå vidare: Techne 1 → 3 om rätt, 0 om fel*) och efter steg 2 (*3 krediter är dina · Phronesis 3 → 7 om rätt, 0 om fel*). Efter steg 3 kommer inget val. |
| Nedräkningen | 5 s | **8 s.** Ringen pulserar i ljuslåga de tre sista sekunderna, och `choice.tickHigh` hörs då. När tiden går ut stannar spelaren och krediterna är hens. |
| Fel efter Gå vidare | potten slocknar | **Hela potten slocknar:** beloppet streckas och faller. Vid steg 1 var potten tom, och fältet heter *Potten var tom*. Ryktet, gästerna och stämningen följer svaret som förut, oberoende av potten. |
| Marken | säkerheten i skåror | kreditsymbolen och potten som står på spel. Vid steg 1 syns bara symbolen. |
| `pot.roll` | 14 steg | 8 steg, från 880 Hz och 90 Hz uppåt för varje steg. |

- **Prototypen:** panelen har fått valet *Steget* (steg 1 eller 2), så att båda valen kan ses. Scenen är 8,8 s längre vid rätt, så att nedräkningen hinner klart.
- **Kontrollbilderna** i `skarmar/` är tagna om efter tillägget. `kvitt-8-valet-efter-steg-1` är ny. Bilderna utan text i `bilder/` är oförändrade, eftersom de inte har någon HUD.
- **Den sista genomgången av layouten** hittade inga fel. Kontrollen ger 0 överlapp i båda storlekarna, båda lägena och båda stegen. Två små rättelser gjordes ändå: *1 kredit är din* i singular, och *Stegets kredit* i stället för *Dubbelt + steget* när potten var tom.
- **Nycklar som utgår:** `pyr.security.term`, `conf.*` (i raketen) och `rocket.conf`. Nya nycklar: `stake.ifRight`, `stake.first`, `stake.none`, `stake.stay.sub1` och `f5.stake.step`. Nycklarna `stake.stay.sub`, `stake.goOn.sub`, `stake.doubled` och `stake.picked.stay` har ny text. Allt finns i `kvittStrings.ts`.

---

## 1. Innehåll

| Fil | Var | Vad |
|---|---|---|
| `pyramidStake.ts` | ersätter `pyramidMoment.ts` | De fyra lägena i ms (`STAKE_MOMENT`), ljudlägena (`STAKE_SOUNDS`), våningarna (`FLOORS`, `floorPts`), stegens mitt (`FLOOR_CENTRE`) och pulsen i väntan (`waitPulse`). |
| `kvittStrings.ts` | slås in i `STRINGS` | Alla nya nycklar `{ sv, en }`. `f5.*` är prototypens panel. `conf.*` finns redan i den varma formen och har samma text. |
| `foljderManus.js` | läses | Ny scen `stake(outcome)`: familjen Weber i lounge B, Elin, och kamerans väg (`STAKE_T`, `STAKE_FRAME`). Inget annat ändrat. |
| `guestGroups.ts` | ersätter | Studenternas luva i ryggsäckens kontrastfärg (§2). |
| `prototyp/Kvitt eller dubbelt.html` | läses | D5-prototypen med två nya skärmar: *3 · Kvitt eller dubbelt* (ersätter pyramidens ögonblick) och *9 · Veckoavräkningen*. Rätt eller fel väljs i panelen. Ljudskisserna slås på i panelen. Tangenterna 1 och 2 väljer i valet. |
| `bilder/`, `skarmar/` | — | 4 kontrollbilder utan text och 8 skärmar, i 1440 × 900 och 1280 × 720 (§8). |

## 2. Besluten

- **Säkerheten** i raden är spelarens valda säkerhet: *Gissar*, *Tror det* eller *Vet det*. Raden läses **Vet det × Steg 2 → +340 kr**. Det tredje fältet är potten. Nyckeln `pyr.security` (en: *Secured*) utgår och ersätts av `pyr.security.term` (*Säkerhet* / *Confidence*).
- **Ryggsäcken** syns inte framifrån på 14 m (prövat i D5:s `grupper-14m-staende`). Därför har luvan fått ryggsäckens kontrastfärg. Den ligger nedfälld som en krage runt halsen och syns från alla håll. Sjalen hänger ned framtill, men luvan gör det inte. Så skiljs de åt fast båda har varma färger (`grupper-14m-luvan`).
- **Veckoavräkningen** har fått raden för social hållbarhet. Den har samma form som de andra raderna: medaljong, *n av 10*, tio prickar med förra veckan som kontur, och orsaken. Under raden visas varje person med veckans ork (ringen) och trivsel (plattan) och ett ord. Den som var slut har streckad kant. Underst står en rad om vad som lyfter laget. Ekonomisk och ekologisk hållbarhet står ovanför som förut.

## 3. Kvitt eller dubbelt: tidslinjen

Tiderna räknas i ms från att spelaren trycker *Stå för ditt svar*. Avgörandet (D) kommer vid **3 800 ms**, när gästens reaktion syns.

| ms | Läge | Vad |
|---|---|---|
| 0–350 | 1 · Låset | Pyramiden lyfts ur kortet till kolumnen i mitten av den fria ytan. Den växer från 18 till 34 % av höjden. |
| 150–780 | | Marken glider från *Vet det* i kortet upp på steget, i en båge på 6 % av höjden. Marken är i mässing och har säkerheten präglad: 1, 2 eller 3 skåror. |
| 780–900 | | Mässingslåset slår igen över marken med ett *klick* vid 900 ms. Kortet tonas till 45 % och knappen visar *Låst*. Inget i kortet kan ändras efter det. |
| 900–3 800 | 2 · Väntan | Steget pulserar från glöd till ljuslåga, och perioden kortas från 900 till 320 ms. Marken glöder i takt med pulsen. Raden *Vet det × Steg 2 → Potten 170 kr* står under pyramiden. |
| 200–1 800 | | Kameran går in till bordet, 24 → 11 m. Under 14 m fälls panelerna (fokusläget). Kortet blir listen, och kolumnen står kvar där den stod. Bordet syns till vänster om kolumnen. |
| 3 500–3 800 | | Gästen smakar, och reaktionen börjar: `guest.nodApprove` vid rätt, `guest.pushPlate` vid fel. Avgörandet kommer när reaktionen syns, inte när svaret låses. |
| D −120–D | 3 · Avgörandet | Tickandet tystnar. |
| **Rätt** D+0–500 | | Låset öppnas. Grönt stiger nedifrån i steget, och steget blixtrar 500–750 ms. |
| D+200–900 | | Potten rullar upp i 14 steg från 170 till +340 kr. Fältet växer till 1,35 och tillbaka, och etiketten blir *Dubbelt*. Steget i raden blir grönt. |
| **Fel** D+0–240 | | Steget skakar 6 px, mörknar till `floor.cracked` och spricker i rött (180–520 ms). Våningen ovanför tonas till 38 %. |
| D+200–900 | | Marken och låset faller 16 % av höjden med tyngd, vrids 40° och tonas ut. Potten slocknar: beloppet streckas, sjunker och tonas, och etiketten blir *Potten är borta*. |
| D+1 800–3 800 | | Kameran går tillbaka till 24 m. Över 15,5 m fälls kortet ut med det rätta svaret (grön kant), ditt svar i rött och *Det här hade hållit*. Förklaringen är lika vänlig som förut. |
| **Rätt** D+1 200–6 200 | 4 · Valet | Två val står under raden: **Stanna, och ta det du har** (+340 kr till kassan) och **Gå vidare, med allt på spel** (Phronesis: 680 kr eller inget). Mellan dem räknas 5 s ned i en ring. De två sista sekunderna pulserar ringen i ljuslåga. Rummet dämpas till 65 %. Den övre våningen får en streckad kant i ljuslåga. |
| D+6 200 | | Tiden är ute: spelaren stannar, och potten går till kassan. Det följer regeln från 2026-10-02 att tiden ute ger det säkra. |

- **Ögonblicket visas vid både rätt och fel.** Det ersätter D5 §4, där bara rätt svar fick ögonblicket.
- **Rött betyder bara fel svar**, alltså sprickan, kanten och svarsraden. Ljuslågan är väntan och nedräkningen. Grönt är rätt.
- **Raketen slutar vid första felet, men scenen spelas alltid klart.** Gästens reaktion syns i båda fallen.
- **Valet efter det sista steget** (Phronesis) finns inte, eftersom potten går till kassan med full pyramid som förut (`pyramidFull`).
- **Reducerad rörelse:** pulsen står still på 100 %, potten byter värde utan att rulla, och marken tonas in på steget i stället för att glida dit. Tiderna är oförändrade.
- **Kolumnen** läggs till i `checkOverlaps` som `stakePyramid`, `stakeRow` och `stakeChoice`. Det ger 0 överlapp i båda storlekarna och båda lägena.

## 4. Ljudlägena (tillägg till LJUDEN.md)

Samma regler som förut: material före syntar, C-dur, och nivåerna räknas mot rummets sorl (0 dB). Skisserna hörs i prototypen när *Ljudskisserna* är på.

| Läge | Känsla | Recept | När | Nivå |
|---|---|---|---|---|
| `lock.slide` | en mark som skjuts över filt | brus genom lågpass som sveper 300 → 900 Hz på 600 ms | 150 ms | −16 dB |
| `lock.click` | ett mässingslås som går i lås | brus genom bandpass på 1,8 kHz i 15 ms, en metallton på 3 150 Hz i 50 ms och en kropp på 420 → 260 Hz i 70 ms | 900 ms | −6 dB |
| `wait.ticks` | en fickklocka på bordet, allt tätare | brus genom bandpass på 2,4 kHz (Q 4) i 8 ms och ett trästavsljud på 1 200 Hz i 30 ms. Takten stiger från 1,4 till 4,2 Hz | 1 150 ms → D−120 | −18 → −12 dB |
| `wait.drone` | en ton som håller andan | triangelvåg på G2 (98 Hz) genom lågpass 260 → 700 Hz. Den stiger under väntan och tystnar på 80 ms vid D−120 | 900 ms → D−120 | −26 → −16 dB |
| rätt | som förut | *Rätt* (LJUDEN §1) | D | −8 dB |
| `pot.roll` | mynt som räknas upp | 14 trästavsljud från 880 Hz och 55 Hz uppåt för varje steg, med 50 ms mellan | D+200–900 | −14 dB |
| våning | som förut | *Våning* (LJUDEN §3) | D+500 | −10 dB |
| fel | som förut | *Fel* (LJUDEN §2) | D | −9 dB |
| `token.drop` | marken som faller på träbordet | tre studsar: sinus 180, 160 och 140 → 90 Hz i 90 ms, med brus på 900 Hz. Studsarna kommer 0, 110 och 190 ms efter varandra och blir 4 dB svagare för varje studs | D+380 | −10 dB |
| `choice.tick` | en träkloss för varje sekund | triangelvåg på 880 Hz i 50 ms och brus på 3 kHz i 10 ms | varje sekund i valet | −14 dB |
| `choice.tickHigh` | de två sista sekunderna | samma på 1 320 Hz | de två sista | −11 dB |

- **Tystnaden** de sista 120 ms före avgörandet är en del av ljudet. Ingenting får fylla den.
- **Sorlet** sänks 4 dB till under väntan, utöver de 6 dB som gäller när raketkortet är öppet. Det kommer tillbaka på 1,2 s när kameran går ut.
- **Stanna** spelar *Kassan, notan betalas* (LJUDEN §6) när potten går till kassan. **Gå vidare** spelar `lock.click` 3 dB svagare när nästa insats läggs.

## 5. Kameran

- Kameran glider in till lounge B från 200 ms, är framme på 11 m vid 1 800 ms och står kvar (10,6 m vid rätt) genom avgörandet och valet.
- Målet förskjuts med `STAKE_FRAME` (1,7 och −1,5 m vid 11 m), så att bordet hamnar till vänster om kolumnen och gästens ansikte syns.
- Vid fel går kameran tillbaka till 24 m mellan D+1 800 och D+3 800. Vid rätt går den tillbaka efter valet, som när raketen slutar.

## 6. Kortet

- Kortet har nu raden *Gissar · Tror det · Vet det* och knappen **Stå för ditt svar** längst ned, som i leverans 1. I D5:s prototyp saknades de (§7).
- Svaret som valts har en bläckkant fram till avgörandet. Om svaret var rätt eller fel syns inte i kortet förrän avgörandet har kommit.

## 7. Rättelser efter verifieringen

1. **Kortet i D5 saknade säkerheten och knappen.** De är tillbaka, och svaren är lägre (`max(34px, 4,6 vh)`), så att allt får plats i 1280 × 720 utan att något överlappar.
2. **Raden i pyramidens ögonblick** visade ett säkrat belopp. Den visar nu den valda säkerheten (§2).
3. **Ögonblicket bara vid rätt** (D5 §4) gäller inte längre (§3).
4. **Kontrollbilderna:** 3D-duken kan ge föregående bild när en skärmbild tas utan att rummet ritas om. De nya bilderna tas från en färsk ritning. D5:s bilder är kontrollerade och visar rätt bild.

## 8. Kontrollbilder

**Med HUD:en, i `skarmar/`:**

- `kvitt-1-laset`, `kvitt-2-vantan`;
- rätt: `kvitt-3-ratt-potten-dubblas`, `kvitt-4-valet`, `kvitt-5-valet-sista-sekunderna`;
- fel: `kvitt-6-fel-avgorandet`, `kvitt-7-fel-forklaringen`;
- `veckoavrakningen`.

**Utan text, i `bilder/`:** `kvitt-11m-vantan-vid-bordet`, `kvitt-11m-ratt-reaktionen`, `kvitt-11m-fel-reaktionen` och `grupper-14m-luvan`.

## 9. Att se över

- **Insatsen per säkerhet** och faktorn per steg är balance.ts. Prototypen dubblar potten (×2) för att visa formen. Om stegen ska ha olika faktorer, till exempel ×1,5 och ×2 som i kassan 2026-09-28, behöver bara fältet *Steg 2* ändras.
- **Valet efter episteme** ser ut som valet efter techne. Om det första steget ska gå vidare utan val behöver bara `choice` hoppas över.
- **Nedräkningen på 5 s** är ett förslag. Under 3 s känns valet stressat, och över 7 s tappar det spänningen.
