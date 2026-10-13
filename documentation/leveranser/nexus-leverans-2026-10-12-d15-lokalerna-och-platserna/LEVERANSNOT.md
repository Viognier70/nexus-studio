# D15: lokalerna och platserna

**Leverans** 2026-10-12 · **Till** Claude Code och Anders · **Från** Claude Design · **Beställning** Anders 2026-10-12 (etapp 1 i *Kvarteren, konkurrensen och spellägena*, beslut i avsnitt 7) · **Bygger på** D13 (Grillstugan), D12 (figurerna och temperamenten), D7 (vagnens ram) och spelets karta.

## 0. Beslut 2026-10-13 och tillägget samma dag

- **Campus flyttas** till [550,30; −70,42]. `TRUCK_SPOT_POINTS.maltid` ersätts av `SPOTS.campus`.
- **Väggarna inom 12 m från vagnen kapas vid Z**, med samma princip som taken. Vagnen och kön ska synas.
- **De tre husen** w193810970, w193810957 och Kärnhusets östra flygel är rekommenderade.
- **Väggarna ligger nu innanför husens mått** i data och i prototypen. Källaren är 14,72 × 9,79 m (`room` x −7,36…7,36, z −4,87…4,92) och salongen 28,89 × 10,24 m (x −14,44…14,45, z −5,12…5,12). Glashörnets `poly` är rummets insida 0,15 m innanför husets kant, och `outline` är husets kant. Källarens station och diskbänk och salongens diskbänk är flyttade in. Platserna är oförändrade (44, 35 och 36). Kontrollbilderna 19–27 är tagna om i båda storlekarna.
- **Glashörnet får ett påhittat namn: Flygeln** (`venue.glashornet.name`). Namnet låter som en campuskrog och knyter inte krogen till universitetet. Den har bara husets form. Ingen text står i bilderna, och namnet visas i HUD:en som andra krogar. Namnet är prövat mot kartans namn i byn och krockar inte, men det är inte prövat mot verkliga företag i Grythyttan.

Allt står på spelets riktiga karta (`grythyttan-world.json` via `byKarta.js`). Inga byggnader är ändrade. Kvarterens gränser ritar Code efter gatorna, så `quarter` säger bara vilket kvarter en plats eller lokal hör till.

Kontrollbilderna finns i 1440 × 900 och 1280 × 720, tagna från spelets kamera och utan text i bilderna. All text är nycklar `{ sv, en }`. Andelarna av gäster och lokalernas platser är förslag för balance.ts.

| Fil | Vad |
|---|---|
| `kvarterPlatser.js` | **Ny.** Data: `SPOTS` (foodtruckens fem platser i vagnens ram), `VENUES` (de tre lokalerna, med hus, ram, rum, dörr och trappa), `STREET_MIX` (gästerna per kvarter), `LAKE_MODES` och `localMap()`, som hämtar kartan runt en ram. |
| `kvarterRita.js` | **Ny.** three.js: omgivningen ur kartan (`buildSurroundings`: mark, gator, vatten, hus med fönster, gatlyktor, träd), sjöns strand och brygga, och de tre lokalerna (`buildVenue`). |
| `d15Manus.js` | Tidslinjerna: `spotScene()` och `venueScene()`, möbleringen (`venueLayout`, `VENUE_SEATS`) och gästerna på gatan (`streetWalkers`, `lanes`). |
| `d15Strings.js` | Texterna. |
| `prototyp/D15 - Lokalerna och platserna.html` | Prototypen med nio skärmar: sex platser och tre lokaler. Markisen kan slås på för platserna. |
| `kontrollbilder/1440x900/`, `kontrollbilder/1280x720/` | 32 bilder per storlek. |

## 1. Foodtruckens platser

Grillstugan från D13 står i alla fem platserna utan markis (den kan slås på i prototypen). Vagnens ram är D7:s: `C` är vagnens mitt och `th` längdaxelns vinkel. Lådan x −6,5…6,5, z −1,6…4,5 (vagnen, dragstången, kön och ståborden) är prövad mot husen, vattnet och körbanorna på kartan.

| Plats | Kvarter | C | th | Gatan | Omgivningen |
|---|---|---|---|---|---|
| Torget | Torget | [17,00; −21,90] | −0,1098 | Torget w122157681 | D7:s plats, oförändrad. Spelarens vinbar w869907975 ligger 8,8 m bort. |
| Prästgatan | Studentkvarteret | [290,67; 38,97] | 0,187 | Prästgatan w122157689 | Södra sidan av gatan, luckan mot w193810970 (huset med källaren) och w193810972. |
| Gästgivaregården | Gästgivaregården och kyrkan | [62,34; 76,91] | −1,9201 | Artur Lindqvists gata w862853214 | Norr om Gästgivaregården (15,6 m), luckan mot öster. |
| Campus | Campus och Måltidens hus | [550,30; −70,42] | 1,7296 | gångvägen w122157690 | Bakom vagnen ligger Måltidens hus västra fasad (2,65 m), luckan mot väster. Elstolpen står mot fasaden. |
| Sjön | Vid sjön | [376,00; 236,00] | 0,126 | stigen w862853236 | `TRUCK_SPOT_POINTS.sjon`, luckan mot vattnet (r8482507, vattenlinjen 10 m bort). Stranden, en brygga och två bänkar mot vattnet. |

**Campus är flyttad.** På `TRUCK_SPOT_POINTS.maltid` [546,05; −67,84] står kön inne i Måltidens hus: fasaden ligger 6,6 m bort, och kön behöver 4,5 m framför luckan. Förslaget är att flytta platsen 4,9 m till [550,30; −70,42] och vända vagnen parallellt med fasaden.

**Sjöns två lägen (`LAKE_MODES`):**

- **Höstvardag:** en i kön, ingen vid borden och två på stigen. Medhjälparen väntar vid vagnen.
- **Sommarhelg:** sex i kön, familjer vid borden och nio på stigen. Ljuset är ljusare och träden gröna.

Hur många som kommer sätts i balance.ts. Bilderna visar bara hur det ser ut.

**På krogens nivå (Z)** kapas väggarna på husen inom 12 m från kamerans mål till 1,6 m, och taken tonar ut (`ROOF_BLEND`). Annars skymmer husen på Prästgatan vagnen och kön. Det är ett förslag, eftersom regeln förut bara gällde lokalens eget hus.

## 2. De nya lokalerna

En lokal per kvarter, i ett hus ur kartan. Torget har spelarens vinbar.

| | Källaren | Salongen | Glashörnet (Flygeln) |
|---|---|---|---|
| Kvarter | Studentkvarteret | Gästgivaregården och kyrkan | Campus och Måltidens hus |
| Huset | **w193810970**, Prästgatan (residential, 15,6 × 10,7 m, huvudkroppen). Utbyggnaden mot söder (trapphuset) hör inte till lokalen. | **w193810957**, 60 m öster om Gästgivaregården (10,8 × 29,5 m, ett långt hus). | **w193810921**, Kärnhusets östra flygel (A–B–C–D–E, cirka 280 m²). E–A är väggen mot resten av Kärnhuset. |
| Varför | Ett bostadshus mitt i studentkvarteret, med gaveln mot Prästgatan och plats för trappan längs fasaden. | Ett långt hus utan namn nära Gästgivaregården och kyrkan, med proportioner som en salong. | Den enda byggnaden på campus som inte är Måltidens hus. Flygeln står fri på fyra sidor, och hörnet mot sydost vetter mot gångvägen. |
| Ram (C, th) | [279,81; 50,42], 0,2096 | [116,72; 58,39], −1,6166 | [427,75; −87,70], 0,9062 |
| Golvet | 2,7 m under gatan | 0,45 m över gatan (sockel och tre steg) | i gatans höjd |
| I tak | 2,35 m, tegelvalv på tre pelare | 4,2 m, två ljuskronor | 3,6 m, pendlar |
| Karaktär | sten och tegel, långbord, bar mot östra muren, fönsterbrunnar högt upp | gul panel med vita knutar, mörkgrönt inne, parkett i fiskben, kakelugn och soffgrupp, runda bord med vit duk, kök bakom passet | tegel och betonggolv, glas från golv till tak i söder och öster, fönsterbänkar med pallar längs glaset, kök mot Kärnhuset |
| Dörren | norra fasaden x 5,2, längst ned i en trappa längs fasaden (x −0,6…6,5) | västra långsidan x 2,4, med lyktor | i södra glaset x 6,6 |
| Platser (`VENUE_SEATS`) | **44**: fyra långbord om 10 och fyra barpallar | **35**: åtta runda bord om 4 och tre i soffgruppen | **36**: tolv pallar längs glaset och sex bord om 4 |
| Ytan (innanför väggarna) | 144 m² | salong 236 m², kök 59 m² | cirka 270 m² |

Platserna skiljer sig i storlek, i höjd (2,35, 3,6 och 4,2 m) och i hur tätt det står. Källaren har flest platser på minst yta, salongen har mest yta per gäst, och glashörnet ligger mitt emellan.

**Krogens nivå:** taket tonar ut och väggarna kapas till 1,05 m mellan 40 och 26 m, som husen i byn (`updateVenue`). I källaren tonar hela huset ovanpå ut, och murarna står kvar upp till gatan. Valven, ljuskronorna och pendlarna tonar ut med taket, så att borden syns från 24 m.

**Att tänka på:**

- Kärnhuset och Måltidens hus tillhör universitetet i verkligheten. En krog i Kärnhusets flygel är ett påhitt för spelet. Ingen verklig verksamhet får påhittade egenskaper (avsnitt 7, punkt 4), och inget av de valda husen har ett företagsnamn på kartan.

## 3. Gästerna på gatan

Gästerna på gatan är D12:s figurer med temperamenten lugn, livlig och reserverad, och gatans färger (`guestGroups`, where `street`). De går på trottoarerna längs kartans gator (`lanes`: gatans kant + 0,95 m), håller till höger 0,35 m (trängseln) och går i sällskap om en till tre. I lokalerna har gästerna rummets färger.

| Kvarter | På gatan (`STREET_MIX`, förslag) | Hur de rör sig |
|---|---|---|
| Torget | bybor 0,4, turister 0,2, studenter 0,2, konferens 0,1, gourmeter 0,1 | blandat |
| Studentkvarteret | studenter 0,75, bybor 0,25 | i grupper om tre med ryggsäck, var fjärde har bråttom (`street.walkHurried`) |
| Gästgivaregården | kulturturister 0,55, gourmeter (hotellets gäster) 0,35, bybor 0,1 | turisterna går långsamt och stannar och tittar (`street.stopLook`), gourmeterna går i par |
| Campus | konferens 0,6, turister 0,2, studenter 0,2 | i par som pratar med varandra |
| Sjön | familjer 0,55, bybor 0,3, turister 0,15 | en vuxen och ett barn hand i hand (D12, `CHILD_SIDE` 0,81) |

I lokalerna är det studenter i källaren, gourmeter och kulturturister i salongen och konferensfolk i glashörnet.

## Kontrollbilder (båda storlekarna)

| Bild | Vad den visar |
|---|---|
| 01–03 | Torget: Z, 10 m, 42 m |
| 04–06 | Prästgatan |
| 07–09 | Gästgivaregården |
| 10–12 | Campus |
| 13–15 | Sjön en höstvardag |
| 16–18 | Sjön en sommarhelg |
| 19–21 | Källaren |
| 22–24 | Salongen |
| 25–27 | Glashörnet |
| 28 | Studenterna på Prästgatan, 10 m |
| 29 | En kulturturist vid Gästgivaregården, 10 m |
| 30 | Konferensfolk på campus, 10 m |
| 31 | Familjerna vid sjön, 10 m |
| 32 | Torget, 10 m |

## Öppet

1. **Husen:** Anders sista ord om w193810970, w193810957 och Kärnhusets östra flygel (Flygeln).
2. **Talen:** `STREET_MIX`, `LAKE_MODES`, platsernas avgifter och tillstånd, och lokalernas hyra sätter Code i balance.ts.
