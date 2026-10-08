# Tillägg till D9: frågekortet, repliken, marschallerna och kroppsspråket

**Leverans** 2026-10-07 · **Till** Claude Code · **Från** Claude Design · **Gäller** `nexus-leverans-2026-10-07-d9-livet-vid-luckan`

Rättelsen och svaren på D9:s fyra öppna frågor. Allt annat i D9 gäller som det är. Kontrollbilderna är i 1440 × 900 och 1280 × 720, och ingen text är inritad i scenen. All text är nycklar `{ sv, en }`. Speltalen är platshållare från balance.ts.

| Fil | Var | Vad |
|---|---|---|
| `curiousCard.ts` | ersätter `CURIOUS_TALK` i `curiousMarker.ts` | **Ny.** Frågekortet, de tre utfallen, vilken fråga som kommer och repliken från luckan (§1–2). |
| `tillaggClips.ts` | läggs in i `figureClips.ts` | **Nya klipp:** `guest.checkWatch`, `guest.armsCrossed`, `guest.shakeHead`, `guest.turnToHatch`, `staff.walkLighter` och `staff.lightTorch`. `guest.hesitate` ersätts (§3–4). |
| `torchLighting.ts` | ersätter `TORCHES.stepE` i `truckEvening.ts` | **Ny.** Medhjälparens runda med marschallerna, vägen och regeln för lång kö (§3). |
| `guestBodyLanguage.ts` | monteras | **Ny.** När kropparna utanför visar vad gästen känner (§4). |
| `luckanStrings.tillagg.ts` | slås in över `luckanStrings.ts` | 42 nya nycklar: kortet, tre exempelfrågor, repliken och marschallerna. |
| `prototyp/Livet vid luckan.html` | läses | D9:s prototyp med tillägget. |
| `prototyp/Din vag och vagnen.html` | läses | D7:s prototyp med konsolfelet rättat (§5). |
| `kontrollbilder/1440x900/`, `kontrollbilder/1280x720/` | — | 13 kontrollbilder per storlek. |

## 1. Frågekortet vid en nyfiken gäst

Klicket på bubblan vinkar inte längre fram gästen. Det öppnar ett kort med en fråga, i samma form som situationskortet men mindre (`curiousCard.ts`).

**Kortet** står till höger, mitt på höjden, och täcker inte gästen:

- rubriken *Nyfiken gäst* och vad spelaren ser, t.ex. *Läser skylten och tittar på klockan*
- frågan
- fyra svar av ungefär samma längd
- tidsbågen uppe till höger: en ring som krymper med sekunderna i mitten (`CURIOUS.cardS`, prototypen 8 s)

Medan kortet är öppet tvekar gästen och bubblan är guld.

**Efter svaret** följer kortet WARM_RIGHT_WRONG:

- **Rätt:** grönt, raden lyfter.
- **Nästan:** papper med mässingskant och ½, raden stiger in.
- **Fel:** rött, raden skakar.

Det rätta svaret får streckad grön kant och *Det här hade hållit* när spelaren svarade något annat. Efter 650 ms kommer förklaringen på papper, lika vänlig vid alla tre. Kortet stängs efter 4 s.

**Utfallen i scenen:**

| Svar | Gästen | Medhjälparen |
|---|---|---|
| **Rätt** | Vänder sig mot luckan (`guest.turnToHatch`), går till köns sista lediga plats och ställer sig i kön. Bubblan står kvar i guld tills gästen står där. | Lutar sig ut och vinkar fram gästen (`truck.beckon`), med en replik (§2). |
| **Nästan** | Tvekar och står kvar: tvekar, tittar på klockan och tvekar igen. Sedan bestämmer gästen själv (`CURIOUS.joinChance`). Bubblan tonas ut och kortet kan inte öppnas igen. | — |
| **Fel** | Skakar på huvudet (`guest.shakeHead`) och går vidare. | — |

Utan svar innan bågen är slut tonar kortet ut, och gästen bestämmer själv.

**Frågorna** väljs efter vad gästen gör när spelaren klickar:

- *skylten*, när gästen saktar in, läser, tittar på klockan eller tvekar
- *röken*, när gästen luktar och pekar
- *kylan*, en sval kväll

De tre frågorna är exempel (`q.*`). Codes frågor efter granskning skrivs i samma form: `moment`, `q`, `a1–a4` och `why1–why4`. Bedömningarna står i `CURIOUS_QUESTIONS.grades`.

## 2. Repliken från luckan

När gästen vinkas fram säger medhjälparen en kort replik i en pappersbubbla vid luckan, med avsändaren *Elin, medhjälpare* som i D6. Namnet kommer ur personallistan. Det finns fyra varianter, som tas i tur och ordning:

1. *Kom fram, den är alldeles nygrillad!*
2. *Välkommen! Det tar bara ett par minuter.*
3. *Kom hit och smaka, senapen är hemgjord.*
4. *Hej! Ställ dig här, så fixar vi det.*

Engelska finns i `line.1–4`. Repliken står i 3,6 s. Bubblan sitter till vänster om spetsen, så att den inte hamnar under kortet.

## 3. Medhjälparen tänder marschallerna

Marschallerna tänds inte längre av sig själva (`torchLighting.ts`).

- **När:** när kvällen passerar e 0,55 går medhjälparen ut genom dörren i bakgaveln med en lång tändare.
- **Ordningen:** först de två vid kön, sedan däcket medsols, och tillbaka norr om däcket.
- **Klippen:** `staff.walkLighter` (1,3 m/s) och `staff.lightTorch` (2,40 s). Medhjälparen böjer sig fram, tändarens låga syns och marschallen tänds vid u 0,55.
- **Luckan står tom så länge.** Ingen serverar, och gästen som beställer väntar. Grillaren grillar vidare.
- **Lång kö:** med fyra eller fler i kön (`TORCH.queueMax`) väntar medhjälparen, men går senast vid e 0,80 (`TORCH.latestE`).
- **Hur lång tid:** rundan tar cirka 40 s. I prototypen tar kvällen 80 s.

## 4. Kroppsspråket i stället för stämningssymbol

Det finns ingen stämningssymbol utomhus. Spelaren läser gästerna på kroppen (`guestBodyLanguage.ts`, `tillaggClips.ts`):

- **Tvekan är starkare:** ett halvt steg mot kön och tillbaka (0,24 m), blicken mellan kön och gatan, och handen vid hakan.
- **En blick på klockan** (`guest.checkWatch`, 1,60 s): vänster underarm upp och huvudet ned mot den.
  - De nyfikna gör det mellan att lukta och tveka.
  - I kön kommer blicken efter `QUEUE.patienceS` (prototypen 7 s) och sedan var `QUEUE.watchEveryS` (6 s), förskjutet per gäst.
  - Den som svarade *nästan* tittar på klockan mitt i tvekan.
- **Armarna i kors när det är kallt** (`guest.armsCrossed`): alla som står still en sval kväll, alltså kön, de nyfikna och rivalens kö. Men inte den som äter, håller något eller går.
- **Ett skakat huvud** vid fel svar: ett mjukt nej tack, inte ilska.

## 5. Konsolfelet i D7

`Din vag och vagnen` hade samma fel som D9: `componentDidUpdate` läste föregående läge, som prototypens ram inte skickar med. Det är rättat, och scenen anpassar sig nu till fönstret även när det får sin storlek sent. Konsolen är ren vid laddning. Det rättade är bara prototypen. Inget i D7:s data är ändrat.

**Kontrollen:** D9 och D7 laddas med hela scenen synlig. Alla 23 kontrollbilder i D9:s 1280 × 720 är genomgångna. Två saker är rättade i prototypen:

- I bild 14 stod två gäster på varandra vid sopkorgen. Den andra gästen torkar sig nu vid bordet.
- Planteringslådornas skuggor låg för långt ut och såg ut som egna lådor.

Ljuset från marschallerna är också tätare och varmare, så att det inte ser ut som dimma. D9:s kontrollbilder är inte tagna om. Bild 07 (*prata, vinkar fram*) och 22 (*marschallerna tänds*) ersätts av bilderna 02–03 och 11–13 här.

## Kontrollbilder (båda storlekarna)

| Bild | Vad den visar |
|---|---|
| 01 | Frågekortet öppet: gästen tvekar och bubblan är guld. |
| 02–03 | Rätt: grönt, förklaringen, repliken från luckan. Sedan går gästen till kön med guldbubblan. |
| 04–05 | Nästan: papper och ½. Sedan står gästen kvar och tittar på klockan. |
| 06–07 | Fel: rött och det rätta svaret streckat i grönt, gästen skakar på huvudet. Sedan går gästen vidare. |
| 08 | Tvekan: det halva steget mot kön. |
| 09 | En blick på klockan i kön, på 12 m. |
| 10 | Sval kväll: armarna i kors i kön och hos den nyfikna, med frågan om kylan. |
| 11 | Lång kö vid e 0,66: medhjälparen står kvar i luckan och marschallerna väntar. |
| 12 | Medhjälparen tänder den tredje marschallen, på 12 m. De två vid kön lyser redan. |
| 13 | Skymning med alla sex tända och medhjälparen tillbaka i luckan. |

## Öppet

1. **Frågorna:** de tre är exempel. Codes frågor till de nyfikna behöver granskas.
2. **Talen:** `CURIOUS.cardS`, `CURIOUS.okHoldS`, `CURIOUS.joinChance`, `TORCH.queueMax`, `TORCH.latestE`, `QUEUE.patienceS` och `QUEUE.watchEveryS` sätter Code i balance.ts.
