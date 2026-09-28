# Leveransnot — Nexus v1, paket 1

**Projekt** nexus-studio · strategiska spåret
**Underlag** DESIGN_SPEC_NEXUS_V1 §2.1, §4, §5
**Lyder under** SD-004 (3D-scen, kroppar utan ansikten)
**Formmall** `brewpubRoom.ts` för rummet, `figureRig.ts` och `serviceScore.ts` för figurerna

Tre delar: vinbaren, figurerna, skärmarna.


## Rättelse 2026-09-26 — efter speldesignen och provspelet

Den här noten gäller före allt nedan där de säger emot varandra.

- **Nya:** `skarmar/01-M1-mentorn-dag-1.png` (mentorn på Campus första dagen, innan klassen är bestämd), `01b-B0a-forsta-bankmotet-foodtruck.png` och `01c-B0b-forsta-bankmotet-vinbaren.png`. Första bankmötet har två utfall. Provet godkänt ger food trucken. Provet felfritt (8 av 8) ger Vinbaren direkt. Tröskeln är vårt val, se FRAGOR §46.
- **Rättade efter speldesignen:** T1 (sommar, vecka 2 av 8, Grythyttedagarna), B1 (diagnos, byte till ölkrogen eller vad som saknas för restaurangen), K1 (stängt 23.00), S1 (personalfest, utbildning, ekologiska råvaror), O2 (åtta frågor, sex rätt), MD1 (Teatern med silver i två).
- **Utgår efter provspelet:** A1 och A2 (action-knappen) samt Q1 och Q2 (quizen). De ersätts av händelsekorten och kvällens lärdom i paket 6 (`nexus-design-2026-09-26-servicen`). `playerTakeOrder`, `playerCarry` och `playerCalmGuest` i `figureActs.ts` står kvar för händelsernas följder.
---

## 1. Vinbaren — `wineBarRoom.ts`

**Var den hör hemma:** `frontend/src/strategic/scene/wineBarRoom.ts`. Ersätter
filen med samma namn. Kontraktet i `businessRoom.ts` håller: `floorY`,
`seatSurfaceY`, `seatNodeId` och `capacity` publiceras nu, så
`createRoom('vinbaren')` får inga `null`.

### Beslutet som bär rummet

**Vinväggen står mitt i baren, inte mot en vägg.** Specen säger "central, med
synlig vinvägg". En vinvägg mot en vägg är en lodrät yta, och lodräta ytor
är det den strategiska kameran ser sämst — samma lärdom som glaspartiet i
ölkrogen och luckan i food trucken. Här är vinväggen en dubbelsidig ryggrad
med bardisken runt tre sidor och två bartenderstråk. Flaskorna ligger med
halsen ut mot båda stråken, och ovanifrån läser krönet som ett rutnät.

Det gör också att vinbaren inte ser ut som ölkrogen eller restaurangen, som
båda har baren mot en vägg. Specen kräver det.

### Planen

Planritningen: `bilder/vinbaren-planritning.png`. Ritad ur samma meshar som
renderas (`planRects()`). Lokal XZ i meter, norr uppåt, entrén i +X.

| Zon | Lokal X | Lokal Z | Innehåll |
| --- | --- | --- | --- |
| Bar | −3,60 … 2,40 | −1,80 … 1,80 | Disk 1,10 m runt tre sidor, öppen mot väster. Stråk 0,98 m på båda sidor om vinväggen. |
| Vinväggen, bas | −2,40 … 0,80 | −0,22 … 0,22 | 1,60 m hög, 4 plan per sida, 288 flaskor. |
| Vinväggen, platina | −2,90 … 1,20 | −0,22 … 0,22 | 2,06 m, 6 plan per sida, upplyst krön med magnumrad. |
| Barstolar | −2,70 … 0,00 | ±2,30 | Fyra per långsida, pitch 0,90, sits 0,75. |
| Ståplatser | 2,85 och 4,45–6,15 | −0,9 … 4,6 | Fyra vid barens östra kortände, fyra vid två ståbord. Utanför kapaciteten. |
| Lounge | −3,04 … 3,24 | 3,48 … 5,62 | Två grupper om tre separata dynor, sits 0,38, lågt bord 0,45. |
| Tvåor | −4,78 … 0,58 | −4,80 … −4,00 | Tre bord 0,80 × 0,80. |
| Kök | −7,60 … −4,60 | 1,60 … 5,70 | Halvväggar 1,5 m. Varm station (västra väggen), kallskänk (norra väggen), disk (södra). Pass X −4,6, Z 2,1–3,3. |
| DJ-hörnet | 4,40 … 7,40 | −5,60 … −3,30 | Platta 0,25 m, egen golvzon, fond mot södra väggen, pult 45° mot det öppna golvet. |
| Vinförråd | −7,60 … −5,60 | −5,55 … −1,40 | Klimatskåp och lådstaplar. |
| Entré | 7,05 | 0,00 | Dörr 1,40 m, matta som vågrät markering, klädhängare Z 1,1–2,3. |

Platserna: loungen 0–5, tvåorna 6–11, barstolarna 12–19. Gästernas
korridorer ligger på Z 3,10 (norr) och Z −3,25 (söder), båda ut ur
mittstråket på X 3,60.

### Specens kontroll, som kod

§1: skymmer en vägg eller ett grannhus interiören är det leveransens fel.

- **Varje vägg har två delar**: en sockel 0–0,90 m som alltid syns, och en
  överdel. `updateCutaway(room, camera)` döljer överdelen på de sidor
  kameran står utanför. Anropas när kameran vridits, inte varje bildruta.
- **`checkCameraView(room, camera, extra?)`** raycastar från kameran till
  kalotthöjd på varje plats och station. Mätt vid åtta vridningar på
  PLAYER_CAMERA:s lutning och avstånd: **20 av 20 platser, 7 av 7
  stationer och entrén syns från alla åtta.** Första körningen gav 6 av 7
  vid två västliga vinklar — köksfläkten skymde kocken. Kåpan är nu 0,75 m
  djup och kocken står 0,15 m längre ut.
- **Grannhus**: `maxNeighbourHeight(gap)` ger högsta hus som inte skymmer
  golvet vid väggens insida. Vid 48° och en sex meters gata: 6,8 m. Två
  våningar går, tre gör det inte. Grannhusen skickas som `extra` till
  provet. Se FRAGOR §25.

Bilderna 01–05 i `bilder/` är tagna från spelarens kamerahöjd, med kapning
och två våningars grannhus på sex meter.

### Kvällens två stämningar

`setMood(room, 'tidig' | 'helg')`. Tisdag klockan sex: sju gäster, ljus på
borden. Lördag klockan elva: tjugo gäster och åtta stående, ljus också på
disken och ståborden, DJ-kanten lyser. Rummet växlar bara geometri.
Beläggningen och ljusnivån finns som värden i `LIGHT_MOODS`, för sim-lagret
respektive DayLighting.

**Ljuset är DayLightings.** Rummet skapar inga ljuskällor. Pendlarna och
lågorna är självlysande material, och deras positioner finns i
`room.pendants` och `room.candles`. Kvällsljuset i bilderna är vårt förslag.

**Om kontrasten i dämpat ljus:** bandet är mätt mot golvfärgen, inte mot
ljuset (LEVERANSDIREKTIV §6). Vid jämnt dämpat ljus sjunker figur och golv
lika mycket och kvoten håller. Ljuskäglorna kring ljusen gör däremot golvet
ojämnt, så intill ett ljus kan kontrasten lokalt bli lägre än 1,8. Mät i
vyn. I bilderna ser vi det inte, men varmt ljus drar DJ:ns mauve mot
spelarens röda. DJ:n står på sin platta i sitt hörn, så platsen skiljer dem
åt också.

### Mätt i vyn

| | |
| --- | --- |
| Inredningens utbredning | 15,20 × 11,40 m |
| Platser lounge / bord / bar | 6 / 6 / 8, plus 8 ståplatser |
| Bartenderstråket | 0,98 m fritt |
| Platser som ser vinväggen | 20 av 20, båda lägena |
| Hyllplan en barstol ser på sin sida | 3 av 4 (bas), 5 av 6 (platina). Det nedersta ligger under diskens sikt och syns bara för personalen och kameran. |
| Platser som ser DJ:n | 20 av 20 (bas), 17 av 20 (platina — den högre väggen skymmer för tre barstolar) |
| Ljus | 7 på borden, 11 i helgstämningen |
| Kontrast figur ↔ golvzon | 2,00 – 2,75, inga av 75 par utanför bandet 1,8–3,6 |

Golvzonerna är oförändrade från förra versionen. Paletten har fått två
personalfärger och två egna:

| | Färg | |
| --- | --- | --- |
| Bartender | `#455d5f` | ny |
| Kök (kock + diskare) | `#425741` | diskaren delar köksuniform. Rollen läses av platsen, som i gästgiveriet. |
| Spelaren | `#933945` | den enda mättade kalotten, ΔE ≥ 29 mot alla gäster |
| Mentorn | `#585b31` | oliv, ΔE ≥ 13 mot personalen, ≥ 17 mot gästerna |

Minsta roll-ΔE i personalen: 14,6 (krav 12).

### Flaggor

`FLAGS` har tolv poster. De nya: `wineWallLevel` (kräver medaljtillståndet),
`mood` (kräver veckodag och klockslag), `lighting`, `camera` (övertagna
värden), `cutaway`, `neighbours`. Ingen av dem är blockerande för
monteringen.

---

## 2. Figurerna — `figureActs.ts`

**Var den hör hemma:** bredvid `figureRig.ts`. Importerar riggen och
`serviceScore.ts`. Inga nya led, mått eller buffertar.

### Det som syns på 23 meter

En gäst är ungefär trettio pixlar hög från spelarens kamera. Det som syns
är höjd, riktning och tempo, inte händer. Så har väntans tre lägen
byggts:

| Läge | Kroppen | Signal |
| --- | --- | --- |
| Lugn | lutar sig bakåt, underarmarna på bordet, långsam blick | lutning |
| Otålig | bålen fram, huvudet rycker mot köket var 2,2 s, underarmen slår mot bordet på 3,2 Hz | riktning + lutning |
| På väg att gå | reser sig, tar jackan från stolen, drar på den, blickar mot dörren | **höjd** — den enda stående bland sittande |

Specen skriver att den otåliga gästen trummar med fingrarna. Fingrar syns
inte från kamerahöjd, så här slår hela underarmen. Så ser trummandet ut på
23 meter. Bilden `anim-01` visar de tre lägena bredvid varandra.

### Stress i tempot

Varje personalpose tar `stress` 0..1 för hållningen: bålen fram och en blick
som rycker upp mot kön. Tempot kommer från anroparen:

```ts
clock += dt * staffTempo(stress).rate;   // 1,0× lugn … 1,7× stressad
```

Gång 1,10 → 1,60 m/s, steg 1,0 → 1,3×. Multiplicera inte väggtiden med en
faktor, för det ger ett hopp i rörelsen varje gång stressen ändras.
Receptionisten avviker med flit: stressad tittar hon aldrig upp, och det
är just det som ser fel ut.

### Katalogen

`ACTS` listar alla trettio med vem, etikett, vad kameran läser och vad som
driver dem (sekunder, gångfas eller framdrift). Mappa sim-tillstånden mot den.

- **Gäster (15):** ankomma, vänta ×3, sätta sig, läsa menyn, beställa,
  äta, dricka, skåla, prata, be om notan, betala, gå nöjd, gå missnöjd.
- **Personal (9 × lugn/stressad):** kock, servitör, bartender, diskare,
  sommelier, vakt, bryggare, receptionist, DJ.
- **Spelaren (3):** ta en beställning, bära ut en rätt, lugna en gäst.
  Lugna är den nya: hon går ner på huk vid bordet, 0,14 m lägre, och för
  handen lugnt nedåt. En figur som krymper vid ett bord läses som en
  personlig insats, inte som servering.
- **Mentorn (3):** förklarar, visar, godkänner.

### Insatsringen

`createActionRing()` / `updateActionRing(ring, progress)`. Platt ring 5 mm
över golvet, inre 0,53 m och yttre 0,62 m. En hel ring på 25 % och en båge
som fylls medurs från klockan tolv. Byggs en gång, och uppdateringen skriver
bara `drawRange`.

### Flaggor

Sex stycken. **`patience` är blockerande** för väntans lägen. Se FRAGOR §21.
De övriga gäller stress per roll, insatstillståndet, jackan (en gest utan
föremål), lånen ur `serviceScore.ts` och mentorns pärm.

---

## 3. Skärmarna — `skarmar/`

Sexton bilder i 1920 × 1080. Bild 00 är systemet: typografi, rutnät,
knappar och färg. Det gäller alla skärmar och ska byggas en gång.

| Bild | Skärm | Läge |
| --- | --- | --- |
| 01 M1 | Mentorn | måndag, första morgonen: porträtt och dialogruta, steg 1 av 4 |
| 02 S1 | Morgonens schema | vardag: två platser, satsningar och paviljonger, meny, inköp, lagerprognosen som en mening |
| 03 S2 | Morgonens schema | söndag: fyra platser, veckans inköp, ingång till tidningen |
| 04 M2 | Mentorn | första servicen: pekar på action-knappen, steg 2 av 4 |
| 05 A1 | Action-knappen | kön öppen: 2 kvar av 3, fyra uppgifter, mest brådskande överst, markörer i vyn |
| 06 A2 | Action-knappen | insats pågår, plus knappens fyra lägen (3/2/1/0 kvar) |
| 07 K1 | Kvällsberättelsen | det som gick bra först, sedan det som gick fel med orsak |
| 08 Q1 | Quizen | fråga 1 av 3, hoppa över alltid synligt |
| 09 Q2 | Quizen | efter svaret: förklaringen störst, fel svar streckat och aldrig rött |
| 10 T1 | Söndagstidningen | recension, marknaden, bankens ord, nästa högtid |
| 11 B1 | Bankmötet | samtal, diagnos i ord, erbjuden klass |
| 12 O1 | Öva | frågeställaren förklarar efter fel svar |
| 13 O2 | Prov | resultatet: tio rutor i stället för en poängsiffra, medaljen |
| 14 MD1 | Medaljerna | fem paviljonger × fyra steg, Teatern låst |
| 15 MD2 | Ny medalj | ögonblicket, med tidslinjen 0–1,2 s under bilden |

### Systemet i korthet

- **Typografi:** Archivo genomgående. Display 88/0,95, rubrik 56/1,05,
  mellan 36/1,15, bröd 28/1,4, etikett 20 versal med 0,14 em spärr. Ingen
  text under 20 px.
- **Rutnät:** marginal 72 px, tolv kolumner à 126 px, mellanrum 24 px.
- **Knappar:** 72 px höga, etiketten flush vänster, pil till höger. Primär
  röd, sekundär med 2 px kant, tyst som bara text.
- **Färg:** grund `#f3f2f2`, bläck `#201e1d`, accent `#ec3013`. Text i
  accentfärg sätts i det mörkare steget accent-700, för kontrastens skull. Accenten betyder handling eller spelaren. Rött
  som fält används bara när en medalj just tagits.
- **Hörn 0, linjer 2 px, inga skuggor.** Medaljerna är den enda runda
  formen.
- **Ikoner:** Lucide.

### Två regler vi drog ur specen

**Inga siffertavlor.** Det enda talet på skärmarna är "kvar av tre" och
klockslaget. Provresultatet är tio rutor. Lagret är en mening,
recensionen är vinglas och bankens bedömning är en diagnos i ord.

**Fel svar ska inte kännas som straff.** Ett fel svar markeras streckat
och grått, aldrig rött, och rubriken är "Nästan.". Förklaringen är det
största på skärmen. I övningen kommer frågan tillbaka. I provet står
missarna som "två frågor fick vänta".

### Medaljens ögonblick

0,00 s skärmen blir röd på ett slag. 0,15–0,55 s faller medaljen in med
40 px översläng. 0,55–1,20 s växer två ringar ut och rubriken skrivs rad
för rad. Vid 1,20 s hålls bilden med replik och knapp, och spelet går
inte vidare av sig självt. Vid platina tillkommer en rad om vad som ändras
i lokalen. I Stensöta är det vinväggen.

### Platshållare

Namn och repliker är våra, i väntan på speldesignen: Ingrid Malm,
Sparbanken Grythyttan, Grythyttebladet, satsningarna och frågorna. Formen
står sig, men orden ska bytas. Se FRAGOR §26.
