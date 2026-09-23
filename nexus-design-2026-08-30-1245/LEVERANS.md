# LEVERANS.md

**Från** Claude Design
**Till** Claude Code
**Datum** 2026-08-30, 12:45
**Zip** `nexus-design-2026-08-30-1245.zip`
**Lyder under** SUPERSEDING_DIRECTIVE_004 · leveransdirektiv 2026-08-30

**Detta paket ersätter allt tidigare.** Har du filer i `handoff/` från
förmiddagen: byt ut dem mot dessa, jämför inte. Byteantalen nedan är
exakta och går att verifiera med `wc -c`.

Elva filer: tio `.ts` plus `LEVERANSNOT.md`. Inga `.js`-speglar, inga
HTML-dumpar, inga orderdokument.

---

## Nya sedan förra leveransen

| Fil | Byte | Vad den är |
| --- | --- | --- |
| `businessRoom.ts` | 13 775 | Gemensamt rumskontrakt över alla sex klasserna. **Monteras först** — se nedan. |
| `nightClubRoom.ts` | 44 910 | Sjätte och sista verksamhetsklassen. 150 platser, tre barer, tre mörka golvzoner. |

---

## Reviderade

| Fil | Byte | Vad som ändrades |
| --- | --- | --- |
| `foodTruckRoom.ts` | 52 526 | Tre fordonsvarianter i stället för en, färdläge som fäller markisen och lyfter stödbenen, hjulrotation ur tillryggalagd sträcka, och karosseridetalj — hjulhus, kupat tak, räfflor, nederband, lyktor. Serveringsmattan flyttad till en egen grupp `room.pitch`, eftersom den är platsen och inte fordonet. |
| `silhouetteContrast.zones.ts` | 11 996 | Nycklarna till bestämd form; `kvarterskrogen` och `foodtrucken` tillagda; `paletteZoneCheck` gjord iterativ med batch-varianten ovanpå. |

---

## Oförändrade, följer med för fullständighet

| Fil | Byte |
| --- | --- |
| `restaurantRoom.ts` | 39 433 |
| `brewpubRoom.ts` | 35 113 |
| `wineBarRoom.ts` | 43 124 |
| `innRoom.ts` | 66 020 |
| `figureRig.ts` | 29 800 |
| `figureProps.ts` | 30 148 |

`restaurantRoom.ts` är **samma byteantal som kopian i `handoff/`** —
just den filen var alltså aktuell. Risken gällde de fyra ovan.

Summa alla tio: 366 845 byte.

---

## Inte med, och varför

**`.js`-speglarna.** Varje rumsfil har en webbläsarkopia som mina
modeller kör; de skiljer sig bara på import-raden och strippade typer.
De ligger utanför leveransen från och med nu.

**De åtta orderdokumenten.** Ersatta av `LEVERANSNOT.md` i det här
paketet — samma substans, inga ordernummer, ingen DoD-numrering.
Ordrar utfärdas ur registret, inte härifrån.

**`roomProps.ts`.** Beställd men inte påbörjad: den kommer efter att
rummen är monterade. Ett dukat bord i ett rum som inte går att välja
hjälper ingen.

**Barnets höjd.** `figureRig.ts` har fortfarande 1,70 m låst för både
gäst och personal. Preciseringen av SD-004 §3.3 är beslutad men inte
committad, och jag rör inte riggen förrän den är det.

---

## Monteringsordning

`businessRoom.ts` går först. De sex rumsfilerna har sex nästan-lika
API:er, och monteringskod mot dem direkt får sex specialfall för sex
saker som gör samma sak.

```ts
import { createRoom, resolveWorldPositions, blockingFlags } from './businessRoom';

console.table(blockingFlags());          // kör detta först

const room = createRoom('kvarterskrogen', { width: obb.w, depth: obb.d });
room.group.position.set(obb.centre[0], 0, obb.centre[1]);
room.group.rotation.y = -obb.angle;
const world = resolveWorldPositions(room);
```

Nycklar i bestämd form: `kvarterskrogen`, `ölkrogen`, `vinbaren`,
`gästgiveriet`, `foodtrucken`, `nattklubben`. En okänd nyckel kastar.

Alla sex klasserna är inlagda i kontraktet. Det stod fyra rader kvar
när jag skickade förra zipen; de är gjorda nu.

---

## Tre blockerare, alla sim-sidiga

1. **`BusinessClass` saknar fyra klasser** — `ölkrogen`, `vinbaren`,
   `gästgiveriet`, `nattklubben`.
2. **Kapaciteten är ett platsantal.** Gästgiveriet 100 mot
   `TOTAL_SEATS = 16`, nattklubben 150 mot 24 stolar, foodtrucken noll.
3. **Gästens tillståndsmaskin saknar barbeställning.** Ölkrogen och
   vinbaren klarar sig med bordsservering. Foodtrucken och nattklubben
   är byggda på den och gör det inte.

`blockingFlags()` returnerar dem ur koden så listan inte kan bli
inaktuell.

---

## Mätningarnas giltighet

Varje tal i filerna är mätt i renderad geometri, inte räknat på
papper. Hittar du en avvikelse är det ett fel i min leverans.

**Där jag inte kan mäta, och säger det:** golvfärgerna är mätta mot
FÄRGEN, inte mot hur `DayLighting` och kvällscykeln renderar den.
För fem av sex klasser är skillnaden liten — en jämn nedsänkning av
exponeringen sänker figur och golv proportionellt, så kontrastkvoten
består.

**För nattklubben kan den bli stor.** Ett rörligt klubbljus som lyser
upp golvfläckar sänker inte proportionellt: en upplyst fläck blir en ny,
ljusare zon som ingen deklarerat, och den kan hamna i det förbjudna
luminansmellanrummet. Det är utskrivet som `FLAGS.movingLight` och i
`LEVERANSNOT.md`.
