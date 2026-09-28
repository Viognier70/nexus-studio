# Leveransnot — Nexus v1, paket 3: restaurangen

**Projekt** nexus-studio · strategiska spåret
**Underlag** DESIGN_SPEC_NEXUS_V1 §2.3
**Lyder under** SD-004
**Formmall** `wineBarRoom.ts` (paket 1): samma kontrakt, kapning och kameraprov

**Var den hör hemma:** `frontend/src/strategic/scene/restaurantRoom.ts`.
Filen ersätter den med samma namn. Exporterna har samma namn där de
finns kvar (`createRestaurantRoom`, `walkPathToSeat`, `exitPathFromSeat`,
`resolveWorldPositions`, `eyeHeightForSeat`, `measureRestaurantRoom`,
`checkSeatContract`, `checkPaletteAgainstFloors`, `paletteContrastRange`,
`disposeRestaurantGeometry`). Kö-, avvisnings- och ankomstplatserna och
leveransfickan finns kvar med samma form.


## Rättelse 2026-09-26

- **Byggnaden är beslutad.** Restaurangen ligger på en egen adress, i en byggnad på minst 22,0 × 14,8 m, med 60 platser, bar och stort kök. En verksamhet i taget, och lokalen byts vid uppgradering. Det blockerar inte längre designen, men scenen måste välja byggnad innan monteringen.
- **Lunchläget är borttaget.** Dagens tre lägen heter nu `'mise'` (mise en place 17.00, före servicen), `'tidig'` (första sittningen 18.30, 34 gäster plus 2 i baren) och `'middag'` (20.30, fullt). Bilderna 03, 04 och 06 är tagna om: `restaurangen-03-mise-en-place-spelarens-kamera.png`, `-04-mise-en-place-koket.png` och `-06-tidig-kvall-vriden.png`.
---

## Sextio platser kräver en annan byggnad

Den förra restaurangen hade 16 låsta platser i w869907975 (15,6 × 11,8 m).
Sedan paket 1 hör den byggnaden till vinbaren. Specen vill ha 60 platser,
en bar och ett stort kök, och det ryms inte där: matsalen behöver runt
150 m² och kök, disk och kyl runt 100 m². Rummet är ritat på
**23,4 × 15,6 m** (MIN 22,0 × 14,8). Vilken byggnad det blir är öppet och
**blockerar monteringen** (FRAGOR §32).

## Planen

`bilder/restaurangen-planritning.png`. Lokal XZ i meter, norr uppåt, entrén i +X.

| Zon | Lokal X | Lokal Z | Innehåll |
| --- | --- | --- | --- |
| Kök | −11,50 … −4,80 | −7,60 … 3,00 | Varma linjen mot västra väggen (grill, spis, sås och garnityr) under en kåpa med överkant 2,40. Kallskänken mot söder, bakverket mot norr, mittbänken 1,8 × 5,2 m. |
| Passet | −5,50 … −4,80 | −3,00 … 1,00 | Stålbänk 1,05 m, värmelampor på 1,95 m, bongskena på kökssidan. Köksmästaren på X −6,10, servitören på X −4,25. |
| Disk och kyl | −11,50 … −4,80 | 3,00 … 7,60 | Disklucka Z 3,40–4,60. Maskin och ho längs köksväggen. Kylrum i NV-hörnet, leveransdörr i västra väggen. |
| Personaldörr | −4,80 | 1,40 … 2,40 | Mellan passet och diskluckan. Personalens väg, inte servisens. |
| Servisstråket | −4,80 … 9,05 | −3,20 … 4,80 | Kalksten. Upphämtningen vid passet, mittgången Z −1,80…0,10, vändningen i öster och norra gången Z 2,45…4,05. |
| Fyror | −1,80 · 1,10 · 4,00 · 6,90 | −6,10 · −3,00 · 1,30 | Tolv bord 1,0 × 1,0 med vit duk, stolarna 0,72 m från mitten. |
| Tvåor | −2,80 … 1,40 och 9,90 | 4,60 och −6,0 / −3,6 / 2,9 | Tre längs norra väggen och tre längs östra. Bord 0,78. |
| Bar | 4,20 … 10,20 | 5,10 … 7,60 | Disk 1,10 m, sex barstolar på Z 4,60, stråk 1,0 m, lågt bakre skåp med flaskor. |
| Entré | 8,90 … 11,50 | −2,30 … 2,30 | Dörr 1,60 m, hovmästarpulten, garderob. |

Platserna: fyrorna 0–47 rad för rad söderifrån, tvåorna 48–59 och
barstolarna 60–65. `checkSeatContract()` prövar antal och ordning.

## Tre beslut

**1. Servisen är en slinga på golvet.** Specen vill att spelaren ser
servisens flöde, och ett flöde syns uppifrån bara om det har en riktning.
Köksväggen har därför två öppningar, fem meter isär mitt till mitt:
**passet** (mat ut) och **diskluckan** (disk in). Servitören tar tallriken
vid passet, går ut längs mittgången, vänder i öster och går tillbaka längs
norra gången till diskluckan. Slingan har en egen golvzon av grå kalksten,
det enda i matsalen som inte är parkett. Den är 33,1 m runt.
`SERVICE_LOOP` är slingan som data och `serviceLoopPoint(u)` ger punkt, kurs
och om servitören är på väg ut eller in. I modellen går tre servitörer på
slingan, en tredjedel isär.

**2. Mise en place syns som ett rutnät av kantiner.** Från 23 m är en kantin
7 × 6 pixlar. På morgonen står 24 kantiner i sex färger på mittbänken, med
skärbrädor vid stationerna och plåtar vid bakverket, och tre kockar står
vid mittbänken och fyller dem. Under servicen är mittbänken tom och sju
tallrikar står under värmelamporna på passet. 14 kantiner står kvar i
stationerna hela dagen. Se bild 04 och 05.

**3. Ljusare än vinbaren, i golvet och i dukarna.** Figurerna tillåter golv
upp till L 0,426 mot den mörkaste figuren. Vinbaren ligger på 0,25–0,31 och
restaurangen på 0,34–0,38, med ljus ek i matsalen. Resten av ljusheten
kommer från vita dukar, ljusa väggar med grågrön boasering, björkstolar och
fem fönster i södra väggen. **Dukarna ingår inte i kontrastbandet**: en
kalott mot vit duk har kvot runt 7, och det är avsiktligt. Bordet ska lysa,
och figuren läses mot golvet runt det.

## Specens kontroll, som kod

`checkCameraView()` raycastar från kameran till kalotthöjd på alla 66
platser, alla 13 stationer, entrén och åtta punkter längs slingan, efter
`updateCutaway()`. Provet körs från åtta vridningar på PLAYER_CAMERA:s
lutning och avstånd:

**66 av 66 platser, 13 av 13 stationer, 8 av 8 punkter på slingan och
entrén syns från alla åtta. Inget skymmer.**

Kåpan fick 0,8 m djup och överkanten 2,40 m från början. Det är lärdomen
från vinbaren, där en djupare kåpa skymde kockens kalott från väster.
Interna väggar är 1,5 m höga, som i vinbaren.

Grannhus är inte prövade, eftersom byggnaden inte är vald. Kör provet med
dem som `extra` när den är det.

**Om bildutsnittet:** rummet är 23,4 m långt, och vid spelarens avstånd
(23 m) ryms inte hela rummet i en 16:9-bild. Bild 01 är spelarens
kamera. Bild 02 är samma lutning på 31 m, för att visa hela rummet.

## Dagens tre lägen

`setDayMode(room, mode)`:

| Läge | Gäster | Kök | Matsal |
| --- | --- | --- | --- |
| Morgon | 0 | 24 kantiner på mittbänken, tre kockar fyller dem | Två servitörer och spelaren dukar |
| Lunch | 34 + 2 i baren | Tallrikar på passet | Inga ljus, fullt dagsljus |
| Middag | 60 + 6 | Värmelamporna lyser | Ljus på alla 18 bord |

Beläggningen är ett presentationsmål (FRAGOR §35). Ljuset i bilderna är
vårt förslag till DayLighting. Rummet skapar inga ljuskällor.

## Mätt i vyn

| | |
| --- | --- |
| Inredningens utbredning | 23,00 × 15,20 m |
| Platser fyror / tvåor / bar | 48 / 12 / 6 |
| `checkSeatContract()` | 66 av 66, ordning ok, bordsplatser först |
| Matsal, bar och entré | 247,8 m², 4,13 m² per bordsplats |
| Kök, disk och kyl | 101,8 m² |
| Servisslingan | 33,1 m runt |
| Passet → diskluckan | 5,00 m, mitt till mitt |
| Kåpans överkant | 2,40 m |
| Kontrast figur ↔ golvzon | 2,61 – 3,25 (band 1,8–3,6) |
| Par utanför bandet | inga av 90 |

## Palett

Sex golvzoner: matsal, servisstråk, entré, barstråk, kök och disk. Samma
åtta gästtoner som i alla rum. Personalen har samma fem färger som
vinbaren, med nya roller:

| Roll | Färg | Samma som i vinbaren |
| --- | --- | --- |
| Hovmästare | `#445269` | sommeliern |
| Servitör | `#5e4f37` | servitören |
| Bartender | `#455d5f` | bartendern |
| Kock och diskare | `#425741` | köket |
| Köksmästaren vid passet | `#664958` | DJ:n |

Spelaren `#933945` och mentorn `#585b31` är oförändrade.

## Nya rörelser i `figureActs.ts`

| Funktion | Läses som |
| --- | --- |
| `posePassCall` | Köksmästaren lutar sig över passet, vänder sig om och ropar ut. Stressad: varannan sekund i stället för var fjärde. |
| `poseLayTable` | Dukning: böjer sig in över bordet fyra gånger per varv. Anroparen flyttar figuren runt bordet. |

Allt annat i modellen använder rörelser som redan fanns: servitören
(`poseServe`), kocken, diskaren, bartendern, receptionisten som hovmästare,
spelarens insatser och gästernas väntelägen.

## Flaggor

`FLAGS` har åtta poster. **`building` är blockerande** (FRAGOR §32).
`seatLock` (§33) avgör om spelet klarar klassbytet.
