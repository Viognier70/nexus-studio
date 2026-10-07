# Vinbarens möblering i huset

**Leverans** 2026-10-07 · **Till** Claude Code · **Från** Claude Design · **Gäller** ORDER 312b

Code har krympt rummet till husets mått, 14,47 × 10,05 m. Den här leveransen ger möbleringen som ryms i det: baren, loungerna, borden, köplatserna och personalens arbetsplatser. Allt utgår från spelets karta (`grythyttan-world.json`, huset `w869907975`). Ingen text är inritad i bilderna.

| Fil | Var | Vad |
|---|---|---|
| `wineBarHouse.ts` | ersätter talen i `wineBarRoom.ts` | Måtten, möblerna, platserna, ståplatserna, personalens platser, mise en place, köplatserna och gånggrafen. Varje punkt har både rummets och kartans koordinater. |
| `kontrollbilder/1440x900/`, `kontrollbilder/1280x720/` | — | 01 huset på kartan, 02 planen och 03 gångarna. |

## Platserna: 20, som förut

| Sort | Antal | Var |
|---|---|---|
| Lounge | 6 (2 × 3 dynor) | Mot norra väggen. |
| Tvåor | 6 (3 bord) | Mot södra väggen. |
| Barstolar | 8 (4 + 4) | Längs barens norra och södra sida. |
| **Summa** | **20** | `TOTAL_SEATS` är oförändrat. |

Åtta ståplatser finns som förut, fyra vid barens kortände och fyra vid två ståbord. De räknas inte i kapaciteten. Ekonomin kan alltså kalibreras på samma kapacitet som i dag. Rummet skulle rymma en fjärde tvåa (22 platser) i södra bandet öster om baren, men då blir golvet framför DJ:n trängre. Jag har inte lagt till den.

## Vad som ändrats

- **Baren** är 5,2 m i stället för 6,0 m och flyttad 0,4 m söderut. Stråken är oförändrade, 0,98 m.
- **Vinväggen** är 3,2 m i bas och 3,7 m i platina (var 4,1 m). Höjden och krönet är oförändrade.
- **Loungerna:** bordet är 0,45 m djupt i stället för 0,55 m, och benrummet till dynorna är 0,40 m.
- **Tvåorna** är 0,7 m i stället för 0,8 m.
- **Köket** är 2,44 × 3,43 m och har samma tre platser: varm station mot västra väggen, kallskänk mot norra väggen och disk mot kökets södra vägg. Passluckan sitter i östra halvväggen och köksdörren i den södra.
- **DJ-hörnet** är 2,74 × 2,08 m.
- **Vid dörren** står värdpulten, tavlan, klädhängaren, dörrmattan och de två köplatserna innanför på samma avstånd från dörrväggen som förut.
- **Vinkylen i baren** står i södra stråkets östra ände.

## Gångarna

Gångarna är mätta mellan sittande gästers rygg och nästa möbel:

- **Norra gången**, från barstolarna till loungeborden: 0,88 m.
- **Södra gången**, från barstolarna till tvåorna: 0,90 m.
- **Ryggen** från dörren, mellan barens kortände och ståbord 1: 0,90 m.
- **Köksdörren** till barens västra öppning: 1,4 m.

Gånggrafen har nya linjer i `LANES` (`spineX` 3,0, `northZ` 2,65, `southZ` −3,45, `loungeInnerZ` 3,72) och `STAFF_PATH_KITCHEN_TO_BAR`.

## På kartan

- Rummets hörn ligger inom 2 cm från husgrunden i OSM.
- Dörren ligger på fasaden i [30,71, −23,94], mot gatan Torget (`w122157681`).
- `doorShift` är 0,02 m, eftersom rummet nu är nästan lika stort som huset.
- Köplatserna utanför står på samma punkter som i kartkontrollen 2026-10-06, med minst 2,27 m till körbanan.
- Väntplatsen ligger 1,9 m ut och trottoaren är 2,2 m bred (`VENUE_OUTSIDE`).
- Köplatserna innanför ligger 0,5–0,6 m innanför fasaden.

## För Code

1. `MIN_WIDTH_M` och `MIN_DEPTH_M` blir 14,4 och 10,0 (`MIN_SIZE`). Med 14,6 och 11,0 ger rummet `fits: false`.
2. `checkCameraView()` och `checkSightLines()` bör köras igen i spelets scen. Baren står närmare loungerna, så sikten från loungerna mot vinväggen kan ha ändrats.
3. Personalens ringar i bilderna har kockens färg (#7fa8ff) för alla roller. Det är bara en markering i planen, inte rollernas färger.
