# LEVERANSNOT: tillägg till leverans 2 (teaterns grund)

**Leverans** 2, tillägg
**Datum** 2026-09-29
**Till** Claude Code
**Från** Claude Design
**Gäller** Sittklipp för barstol och lounge, en rättad nyckelfil för leverans 1 och en regel inför leverans 3.

Tillägget ersätter två filer från leverans 2. Allt annat i leverans 2 gäller som förut. Menykortet, beställningsblocket och notamappen ligger kvar.

---

## 1. Innehåll

| Fil | Status | Vart | Vad |
|---|---|---|---|
| `figureClips.ts` | ersätter leverans 2 | `strategic/scene/` | 46 klipp (4 nya). `SEAT_KINDS`, `seatKindFromRoom()`, `seatLift()`, `sitClipFor()`, `leaveClipFor()`, `reseat()`, `plantFeet()`, `soleHeight()`. `Seat.kind` och `ClipCtx.seatKind` / `heightMult` är nya fält. |
| `theatreStrings.ts` | ersätter leverans 2 | slås in i `STRINGS` | Namnen på de fyra nya klippen, vinbarens kapitel och sitsarna. |
| `rattelse-leverans-1/nexusStrings.varm.ts` | ersätter leverans 1 | samma plats som förut | 38 nycklar har fått platshållare i stället för tal. Nyckelfilen har fortfarande 201 nycklar. |
| `prototyp/Teaterns grund - prototyp.html` | ersätter leverans 2 | läses, monteras inte | Ny flik: *Vinbaren*. I *Klipp* finns de fyra nya klippen i tre tempon. |
| `bilder/*.png` | nya | — | 15 kontrollbilder i 1440 × 900 med den varma graderingen. Se §5. |

## 2. Barstolen och loungen

Måtten är vinbarens (`wineBarRoom.ts`).

**Barstol** (`guest.sitStool`, `guest.leaveStool`). Sitsen är 0,75 m hög, disken 1,10 m, och disken står 0,50 m framför stolens mitt. Gästen kommer bakifrån och lite från sidan (`sitApproach`, 0,30 m åt sidan och 0,42 m bakom). Hen tar stöd mot disken med ena handen, sätter foten på ringen och glider upp på sitsen. Stolen flyttas inte. Ned går det åt andra hållet: gästen glider bakåt, sätter fötterna i golvet, tar ett steg bakåt och vänder sig mot dit hen ska. Sulan vilar på fotringen 0,30 m över golvet.

**Lounge** (`guest.sitLounge`, `guest.leaveLounge`). Dynan är 0,38 m hög och 0,72 m djup, med ryggstöd bakom. Gästen kommer rakt framifrån, vänder sig om på stället, backar två steg och sänker sig med bålen framåt som motvikt. Sedan lutar hen sig bakåt mot ryggstödet. När gästen reser sig lutar hen sig fram, trycker ifrån och kliver ut framåt, aldrig bakåt in i ryggstödet.

**Sittande loopar på alla tre sitsarna.** Klippen `seatedIdle`, `toast`, `gesture`, `lean`, `eat`, `pay`, `riseGreet`, `smellWine` och de andra sittande klippen är fortfarande författade för stol. `sampleClip` lägger om dem till den sits som `ctx.seatKind` anger (`reseat`). Höftens sänkning, benen och bålens lutning byts ut, men armarna behålls. På barstolen ligger disken lika högt över axeln som bordet vid en stol (0,21 m), så underarmarna hamnar på disken utan ändring. I loungen lutar sig gästen 0,18 rad bakåt.

**Sittregeln för alla sitsar.** `canSit(seat)` jämför med sitsens egen höjd (0,45, 0,75 eller 0,38, tolerans 3 cm). `sitClipFor(seat)` och `leaveClipFor(seat)` väljer klipp. `seatKindFromRoom()` översätter vinbarens `SeatKind`: `bar` blir barstol, `lounge` blir lounge och `twotop` blir stol.

## 3. Två rättningar som gäller alla sitsar

**Höften för en kort gäst på barstol.** Riggens sitsankare i `applyPose` är byggt för 0,41 m sänkning, men på barstolen sänks höften bara 0,11 m. Utan rättning hamnade en gäst med `heightMult` 0,9 sex centimeter under sitsen. `seatLift()` räknar ut den lyftning som saknas. För stol och lounge är den noll. `figureRig.ts` är oförändrad.

**Fötterna.** `plantFeet()` räknar ut knä och fotled så att sulan står plant i golvet eller på fotringen när gästen sitter. Det här är den enkla ben-IK som `figureRig.ts` FRÅGOR §3 och §5 efterfrågade, men bara för sittande. Den rättar också ett fel från leverans 2: en lång gäst (1,12) hade sulan 5,6 cm under golvet på en vanlig stol. Når benet inte ned hänger foten, som för en kort gäst på en hög sits. `soleHeight()` räknar sulans lägsta punkt ur posen. Den ligger inom 1 mm från den uppmätta punkten. När en gäst sätter sig eller reser sig lyfts kroppen med det som behövs för att ingen fot ska gå under golvet.

## 4. Uppmätt

Mätt med `checkSeated()` och genom att räkna fram fotboxarnas hörn, för `heightMult` 0,72, 0,85, 1,00 och 1,12, genom alla sittande loopar.

| Sits | Höften mot sitsen | Sulan, sittande | Lägsta sula, på väg upp och ned |
|---|---|---|---|
| Stol 0,45 | högst 5 mm | 0 mm (0,85 och uppåt), hänger 11 cm vid 0,72 | −2 mm |
| Barstol 0,75 | högst 5 mm | på fotringen, 0,298–0,303 m | −2 mm |
| Lounge 0,38 | högst 5 mm | 0 mm (1,00 och uppåt), hänger 1–7 cm under det | −2 mm |

I vinbarens scen gjordes 171 mätningar på sittande gäster med längderna 0,82–1,12. Största höjdfel var 8 mm, och ingen mätning var utanför toleransen. `validateClips()` hittade inga fel.

## 5. Kontrollbilder

- `vinbar-01 … 06` visar spelets lutning på 12 m: ankomsten, upp på barstolen, ned i loungen, skålen i baren, värden i loungen som luktar på vinet (raketen från leverans 1) och en gäst som går ned från barstolen.
- `vinbar-07-hela-rummet-24m` visar samma ögonblick som bild 05 från 24 m.
- `sitsen-barstol-01 … 03` och `sitsen-lounge-01 … 03` är tagna på 5 m: stöd mot disken, foten på ringen och sittande, samt vänder sig om, sänker sig och sittande.
- `tempo-03` och `tempo-04` visar barstolen och loungen i lugnt, normalt och stressat tempo bredvid varandra.

Scenen är byggd efter vinbarens mått men är inte vinbarens rum. Jag byggde en egen hörna, eftersom `wineBarRoom.js` i modellerna är en äldre kopia med andra mått än `wineBarRoom.ts`.

## 6. Nyckelfilen för leverans 1

Antal, tider, datum, priser, krediter, bordsnummer, stjärnor och andelar är nu platshållare. De vanligaste är `{guests}`, `{tables}`, `{table}`, `{time}`, `{duration}`, `{week}`/`{weeks}`, `{stars}`, `{gain}`/`{loss}`, `{seconds}`, `{cleared}`/`{total}`, `{price}`, `{date}`, `{share}`, `{growth}` och `{waste}`. Tal som var utskrivna med bokstäver (*Sextiofyra*, *Nio av tolv*, *Dubbelt så många*) är också ersatta. Två saker är kvar med flit:

- **Årgångarna** i `buy.item.chablis` och `buy.item.barolo` är en del av vinets namn och inget speltal.
- **Artiklar** som *en stund* och *ett glas* är inga tal.

Plural: engelskan skriver *{tables} tables* och *{stars} stars*. Där talet kan vara 1 behöver koden välja singular. De nycklar som berörs är `brief.book.1–3.note`, `brief.book.stars`, `brief.greet.body` och `evening.gain.credits.cause`.

## 7. Frågor

- **Loungebordet står för långt bort.** I vinbaren står det 1,35 m framför dynans mitt, och en sittande gäst når 0,65 m. I scenen står bordet 1,00 m bort, men även det är för långt för att sträcka sig efter ett glas. Därför håller värden sitt glas i handen hela tiden i stället för att ta det från bordet. Förslag: flytta bordet till 0,95 m (`LOUNGE_TABLE_Z` 4,15) eller ställ ett litet sidobord vid varje dyna. Säg till vilket ni väljer, så gör jag ett klipp där gästen sträcker sig efter bordet.
- **Vinbarens barstolar saknar fotring.** Klippen sätter foten på en ring 0,30 m över golvet (`SEAT_KINDS.stool.footrest`). `wineBarRoom.ts` behöver en ring på den höjden, annars svävar fötterna.
- **Disken är 1,10 m i vinbaren men 1,05 m i `tableware.SURFACE.bar`.** Rummen ska skicka sin egen höjd när något ställs ned. I vinbaren gör manus redan det.

## 8. Inför leverans 3: kameran i manusen

Från 24 m syns inte klippen. Varje händelsemanus i leverans 3 beskriver därför också kameran, som en rad i tidslinjen:

- **Vart:** den figur eller punkt som raketen gäller (`actor` eller `[x, z]`) och vridningen.
- **Hur nära:** 10–14 m, med spelets lutning.
- **Hur länge:** inglidningen i sekunder, hur länge den stannar och när den går tillbaka till 24 m. Förslag: glida in under 1,2 s, stanna så länge klippet före frågan spelar och gå tillbaka när svaret är givet.
- **Strålkastaren:** resten av rummet dämpas medan kameran är nära och ljuset ligger kvar på den som gör något, så att raketen känns som en strålkastare på scenen. Hur mycket rummet dämpas bestäms i leverans 3.

Regeln är tillagd i projektets arbetsordning.
