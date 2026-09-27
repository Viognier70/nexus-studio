# Leveransnot — Nexus v1, paket 4: ölkrogen med bryggeriet

**Projekt** nexus-studio · strategiska spåret
**Underlag** DESIGN_SPEC_NEXUS_V1 §2.4, §4.4 (bryggare vid kärlen)
**Lyder under** SD-004
**Formmall** `wineBarRoom.ts` och `restaurantRoom.ts`: samma kontrakt, kapning och kameraprov

**Var den hör hemma:** `frontend/src/strategic/scene/brewpubRoom.ts`.
Filen ersätter den med samma namn. Exporterna har samma namn:
`createBrewpubRoom`, `updateBrewpubRoom(room, phase, t?)`,
`walkPathToSeat`, `exitPathFromSeat`, `measureBrewpubRoom`,
`checkSightLines`, `resolveWorldPositions`, `eyeHeightForSeat`,
`checkPaletteAgainstFloors`, `paletteContrastRange` och
`disposeBrewpubGeometry`. Nya är `setMood`, `setBrewDay`, `updateCutaway`,
`checkCameraView` och `planRects`.


## Rättelse 2026-09-26

Vardagsläget är tisdag 18.30, inte 16.00. Servicen är 18–23. Bilderna är oförändrade.
---

## Tre beslut

**1. Bryggeriet är ett eget rum, som kameran läser på kanten.** Förra
versionen hade kärlen i gästernas rum, eftersom glas inte syns uppifrån.
Det stämmer fortfarande, men specen vill ha ett eget rum med egen personal.
Rummet har därför en tegelbröstning på 1,0 m, glas upp till 2,1 m och en
mässingslist överst. Uppifrån läses rummet på tegelkanten, listen och
golvet av våt betong. Glaset är till för gästerna i ögonhöjd. Det räknas
inte som hinder i kameraprovet och skymmer inte siktlinjerna. Bryggeriet
har egen dörr ut (malt in, drav ut) i västra väggen och egen dörr in bakom
disken.

**2. Kopparen står mot gästerna.** Mäskkaret och kokkärlet står direkt
bakom glaset, bakom tappdisken. Från en bänk går blicken från disken till
bartendern, genom glaset och till kopparen, se bild 05. Uppifrån är kärlen
två kopparcirklar och sex stålcirklar i ett rutnät. Bryggaren på däcket
mellan kopparkärlen står vänd mot gästerna. Mittgången går från entrén
rakt mot tappdisken, så kopparen syns från dörren.

**3. Långbord och bänkar, inget annat.** Specen säger 20 platser vid
långbord och bänkar. Förra versionens 8 barstolar och 2 tvåor utgår.
Rummet har två långbord med tio platser vardera. Helgens trängsel står
framför tappdisken och vid fyra ståtunnor. De 12 ståplatserna finns som
geometri men räknas inte i kapaciteten. Se FRAGOR §38 om de nya id:na.

## Planen

`bilder/olkrogen-planritning.png`. 15,6 × 11,8 m, samma mått som vinbarens
byggnad (FRAGOR §37).

| Zon | Lokal X | Lokal Z | Innehåll |
| --- | --- | --- | --- |
| Bryggeriet | −7,60 … −2,60 | −5,70 … 2,00 | Eget rum, 38,5 m². Bröstning, glas och list. Våt betong. |
| Bryggverket | −3,55 | −3,80 · −1,50 | Mäskkar och kokkärl i koppar, Ø 1,32 m. Däck mellan dem för bryggaren. |
| Jästankar | −7,00 · −5,90 | −5,00 · −3,90 | Fyra i stål på ben. Källarbryggaren står på (−6,45, −2,70). |
| Serveringstankar | −7,00 · −5,95 | 0,90 | Två, lägre. Maltsäckar längs västra väggen. |
| Kök | −7,60 … −2,60 | 2,00 … 5,70 | Litet. Spisen med grytan under en kåpa, en prepbänk och en ho. Passlucka mot hallen. |
| Tappdisk | −1,60 … −0,95 | −4,80 … 0,80 | Disk i trä mot glasväggen, tapptorn i mässing med 8 kranar, stråk 1,0 m. |
| Långbord | 0,80 … 4,40 | −3,40 · 1,00 | Två bord 3,6 × 0,9 m, fem platser per bänk med 0,75 m mellanrum. |
| Tunnor | 0,6 · 3,2 · 5,6 | 3,7 · 4,2 · −5,0 | Fyra ståtunnor för två personer vardera. |
| Entré | 7,40 | −1,20 | Mitt för mittgången. |

## Specens kontroll, som kod

`checkCameraView()` raycastar från kameran till kalotthöjd på alla 20
platser, 12 ståplatser, 6 stationer och entrén. Provet körs från åtta
vridningar på PLAYER_CAMERA:s lutning och avstånd.

**Efter rättningarna syns 20 av 20 platser, 12 av 12 ståplatser, 6 av 6
stationer och entrén från alla åtta vinklar. Inget skymmer.**

Första körningen hittade två fel, båda leveransens:

1. **Kåpan skymde kocken norrifrån.** Den är nu 0,55 m djup med överkant
   2,30 m, och kocken står 0,2 m längre ut.
2. **Pendeln över långbordet skymde en sittande kalott** från två av åtta
   vinklar. Den flyttades upp till 2,67 m och sedan till 2,98 m, och varje
   gång hittade provet en ny kalott. En lampa över ett långbords mitt
   skymmer alltid någon från någon vinkel. **Pendlarna är borttagna.** Ljuset
   över borden är DayLightings, och varje bord har två levande ljus.

## Bryggdagen och kvällens två lägen

`setBrewDay(room, on)` tänder ångan över kokkärlet och sätter omröraren i
mäskkaret igång. Ett vitt moln över en kopparcirkel syns på 23 m. En vanlig
dag står kärlen stilla, och båda bryggarna går på `poseCellarCheck`.

`setMood(room, 'vardag' | 'helg')`:

| | Gäster | Ståplatser | Ljus |
| --- | --- | --- | --- |
| Tisdag 16.00 | 8 | 0 | Inga |
| Fredag 21.00 | 20 | 12 | På borden och tunnorna |

## Mätt i vyn

| | |
| --- | --- |
| Inredningens utbredning | 15,20 × 11,40 m |
| Platser · ståplatser | 20 vid 2 långbord · 12 |
| Bryggeriet | 38,5 m², 8 kärl (2 i koppar, 4 jästankar, 2 serveringstankar) |
| Högsta kärlet | 2,45 m |
| Bröstning · glas | 1,00 m · till 2,10 m |
| Platser som ser kopparen | 18 av 20 |
| Platser som ser något kärl | 20 av 20 |
| Tappdisken | 5,60 m, 8 kranar |
| Kontrast figur ↔ golvzon | 1,97 – 2,80 (band 1,8–3,6) |
| Par utanför bandet | inga av 70 |

De två platser som inte ser kopparen sitter längst österut vid bord B och
har tapptornet i siktlinjen. De ser jästankarna.

## Palett

Fem golvzoner: hallen (varma plankor), stråket bakom disken, ytan framför
disken, bryggeriet (våt betong, kallare och ljusare) och köket. Väggarna är
tegel ovanför en mörk panel med mässingslist i kapkanten.

Personalen har samma färger som i de andra rummen. Bryggarna får den blå
`#445269`, som är hovmästarens i restaurangen och sommelierns i vinbaren.
Bartender `#455d5f`, servitör `#5e4f37`, kök `#425741`.

## Ny rörelse

| Funktion | Läses som |
| --- | --- |
| `poseCellarCheck` | Källarbryggaren böjer sig mot provkranen, rätar på sig och håller glaset upp mot ljuset. Cykeln är 9 s. Armen upp syns ovanifrån. |

Bryggaren vid kopparen använder `poseBrew` från paket 1 med paddeln i
handen.

## Flaggor

`FLAGS` har sju poster. Ingen blockerar monteringen. `building` hänger
ihop med FRAGOR §32 och §37, `seatMix` med §38 och `brewery` och `brewDay`
med §39.
