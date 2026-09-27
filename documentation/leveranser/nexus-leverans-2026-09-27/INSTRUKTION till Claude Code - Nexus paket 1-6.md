# INSTRUKTION till Claude Code — Nexus v1, paket 1–6

**Från** Claude Design · 2026-09-27
**Gäller** sex leveransmappar enligt DESIGN_SPEC_NEXUS_V1 §6, NEXUS_SPELDESIGN_V1 och provspelet 2026-09-27

| Paket | Mapp | Innehåll | Behövs till etapp |
| --- | --- | --- | --- |
| 1 | `paket-1-vinbaren-veckan-figurerna/` | Vinbaren, skärmarna för en vecka, mentorn, figurerna | 5 |
| 2 | `paket-2-foodtrucken-uppgraderingen/` | Food trucken, uppgraderingsskärmen | 6 |
| 3 | `paket-3-restaurangen/` | Restaurangen | 7 |
| 4 | `paket-4-olkrogen/` | Ölkrogen med bryggeriet | 8 |
| 5 | `paket-5-gastgiveriet/` | Gästgiveriet | 9 |
| 6 | `paket-6-servicen-raketer/` | Servicen som raketer (episteme, techne, phronesis), mätare, lärdom, rutan utan verksamhet, koreografi | alla |

Den senaste `FRAGOR till Claude Code.md` (§1–50) ligger i roten av den här mappen. Läs `LEVERANSNOT.md` i varje mapp innan du monterar. Den listar varje fil,
vad den är och var den hör hemma.

---

## 1. Ta alltid den senaste versionen

Vissa filer har uppdaterats i flera paket. **Använd bara versionen i
senaste paketet** och kasta de äldre.

| Fil | Senaste version | Äldre versioner att kasta |
| --- | --- | --- |
| `figureActs.ts` | paket 5 | paket 1–4 |
| `FRAGOR till Claude Code.md` | paket 6 (§1–50) | alla äldre |
| Bankmötet (B1) | `paket-1/skarmar/11-B1-bankmotet.png` (omgjord efter speldesignen) | `paket-2/skarmar/11-B1-bankmotet-reviderad.png` |
| Uppgraderingen (U1–U4) | `paket-2/skarmar/` (food trucken → Vinbaren) | den äldre riktningen i paket 2:s LEVERANSNOT §2 |

Övriga filer finns bara i ett paket.

**Speldesignen styr, och provspelet efter den.** Varje paket har en rättelse överst i sin `LEVERANSNOT.md`. Den gäller före resten. **Bygg inte A1, A2, Q1 och Q2, och inte händelsekorten H1–H3.** Raketerna i paket 6 ersätter dem.

## 2. Var filerna hör hemma

Alla i `frontend/src/strategic/scene/`:

| Fil | Paket | Anmärkning |
| --- | --- | --- |
| `wineBarRoom.ts` | 1 | Ersätter befintlig. Innehåller `PLAYER_CAMERA` som de andra läser. |
| `figureActs.ts` | 5 | Ny. Bredvid `figureRig.ts`. Importerar `figureRig.ts` och `serviceScore.ts`. |
| `truckPitch.ts` | 2 | Ny. Ligger ovanpå `foodTruckRoom.ts`, som är oförändrad. |
| `restaurantRoom.ts` | 3 | Ersätter befintlig helt. 16-platsersrummet utgår. |
| `brewpubRoom.ts` | 4 | Ersätter befintlig. Platsernas id och lägen är nya (FRAGOR §38). |
| `innDay.ts` | 5 | Ny. Ligger ovanpå `innRoom.ts`, som är oförändrad. |
| `serviceFlow.ts` | 6 | Ny. Bredvid `serviceScore.ts`. Kvällens koreografi och händelserna. |

Skärmarna (`skarmar/*.png`, 1920 × 1080) är bilder att bygga från. Bild
`00-SYS-systemet.png` i paket 1 är typografi, rutnät, knappar och färg för
alla skärmar. Bygg den en gång.

**Ingen `.js` ska in i repot.** `restaurantRoom.js`, `foodTruckRoom.js`
och de andra speglarna är gamla modellfiler.

## 3. Montering i ordning

1. `figureActs.ts`. Kontrollera att `serviceScore.ts` finns i `main`
   (leveransen servicekoreografin). `figureActs` lånar sex gester därifrån.
2. `wineBarRoom.ts`. Montera med `updateCutaway(room, camera)` när kameran
   vridits och kör `checkCameraView()` mot spelets riktiga kamera.
3. `truckPitch.ts` med `createTruckPitch(truck, siteId)`. Anropa
   `updateTruckCutaway()` vid kameravridning, annars syns inte besättningen.
4. `restaurantRoom.ts`. **Montera inte förrän byggnaden är vald**, se §4.
5. `brewpubRoom.ts`. Uppdatera allt som läser platsernas id ur den gamla filen.
6. `innDay.ts` med `createInnDay(inn)`. Anropa `updateInnCutaway()` vid kameravridning, annars skymmer salens väggar och loftgången.

Varje rum har ett kameraprov i kod. Kör det i test mot spelets kamera, och
med grannhusen som `extra`. Referensvärdena står i varje `LEVERANSNOT.md`.

## 4. Blockerande — sim-lagrets eller scenens, inte monteringens

| FRAGOR | Fråga | Vad som stoppas |
| --- | --- | --- |
| §21 | Tålamod 0..1 per gäst | Väntans tre lägen. Utan värdet visas bara "lugn". |
| §28 | Vädertillstånd per dag eller timme | Allt väder i food trucken. |
| §32 | Restaurangens byggnad: beslutad (egen adress, minst 22,0 × 14,8 m). Scenen väljer vilken. | Monteringen av restaurangen. |
| §33 | Kapacitet per klass (20 / kö / 66 / 20) | Klassbytet. En konstant på 16 går sönder. |
| §37 | Byter klasserna adress, eller ligger de på olika platser? | Avgör om restaurangen och ölkrogen behöver egna byggnader. |
| §40 | Rumsnummer per gäst | Incheckningen och kvällens väg upp till rummen. |
| §49 | Raketbank, vem som tar över, följdens gästtillstånd | Servicen som raketer. |
| §50 | Klass `null` och minsta insats | Rutan utan verksamhet och pengar (X1). |

## 5. Beslut som gäller

- **Uppgraderingen går från food trucken till Vinbaren.** En verksamhet i taget, och lokalen byts. Bankmötet hålls första dagen (B0a, B0b) och vid varje uppgradering (U1).
- **Första klassen avgörs av introduktionens prov.** Godkänt ger food trucken och felfritt (8 av 8) ger Vinbaren. Tröskeln är vår, se §46.
- **Restaurangen** ligger på en egen adress, i en byggnad på minst 22,0 × 14,8 m.
- **Servicen är 18–23.** Lunchläget är borttaget. Gästgiveriets frukost står kvar.
- **Servicen är raketer** (episteme, techne, phronesis). Action-knappen, quizen och händelsekorten utgår.
- **Text på skärmarna** som inte står i speldesignen är platshållare: namn, repliker, raketernas innehåll.
- **Kameravärdena är övertagna** (§25). `PLAYER_CAMERA` kommer från SD-004-modellerna och är inte läst ur spelet.

## 6. Definition of done, gemensam för alla rum

- Kameraprovet är tomt från åtta vinklar med spelets kamera och grannhusen.
- `checkPaletteAgainstFloors()` är tom (bandet 1,8–3,6).
- Platsordningen håller (`checkSeatContract()` där den finns).
- Kroppar är monterade utanför `room.group`, med färgerna ur rummets palett.
- Inget skapas i renderloopen.

## 7. Kvar att leverera

Nattklubben, paviljongerna, portfolion och säsongsavslutet.
