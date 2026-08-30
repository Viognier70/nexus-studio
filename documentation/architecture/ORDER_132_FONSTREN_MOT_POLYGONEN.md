# ORDER 132 — Fönstren mot polygonen

**Repo** `Viognier70/nexus-studio` · **Gren** `order-132` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-30
**Följer** ORDER 130 §6, följdorderförslag (1)

---

## 1. Läget

ORDER 130 mätte: **297 av 338 byggnader — 88 % — har minst ett fönster utanför
sin polygon.** 3 156 fönster totalt, det värsta 36,3 meter från fasaden.

Rotorsaken är fastställd: `windowsFor()` i `OsmBuildings.tsx:1152` placerar
fönster på OBB-facen (`ridgeW` / `ridgeD`), inte på polygonens kant. Varje hus
som inte är perfekt rektangulärt får fönster där den omslutande lådan sticker ut
utanför husets verkliga form.

**Felet är löst en gång redan.** ORDER 058 §1 lade en polygon-guard för
`buildFacade`-vägen. LOD-2-vägen i `OsmBuildings` fick den aldrig.

---

## 2. Vad som byggs

Samma guard som ORDER 058 §1, i `windowsFor()`.

**Läs 058:s lösning först** och följ den där det går. Två guards med olika logik
för samma problem är hur det här felet uppstod från början.

Ett fönster vars position faller utanför polygonen ska inte ritas. Om guarden i
stället kan **projicera** fönstret till närmaste polygonkant är det bättre — men
bara om 058 gör det. Uppfinn ingen ny strategi.

---

## 3. Vad som INTE får göras

**Polygonerna ändras inte.** OSM-footprints är källdata och rörs inte.

**OBB-beräkningen rörs inte.** Den används till annat än fönster — tak,
ridge-riktning, byggnadsvolym. Att ändra den för att lösa fönsterplaceringen
riskerar hela byn.

**`buildFacade`-vägen rörs inte.** Den har redan sin guard och fungerar.

Hus-mot-väg-felet (37 fall) hör till egen order. Det är ett dataproblem med annan
orsak och annan åtgärd.

---

## 4. Definition of Done

1. Guarden i `windowsFor()` följer ORDER 058 §1:s strategi; avvikelser
   motiverade.
2. **Mätningen körs om** med `frontend/scripts/order130-map-measurements.mjs` —
   samma skript som fann felet. Antal fönster utanför polygon redovisat före och
   efter.
3. Talet efter ska vara noll, eller så nära att kvarvarande fall räknas upp
   individuellt med skäl.
4. **Byggnaderna har fortfarande fönster.** Test som hävdar att ett representativt
   urval hus har fler än noll fönster — en guard som tar bort allt passerar
   annars punkt 3.
5. Skärmdump av samma vy som ORDER 130 §4 använde (`w193810921`, universitetet
   med 36 m överhäng), före och efter.
6. `git diff` visar att OBB-beräkningen och `buildFacade` är orörda.
7. Typecheck grön, hela sviten grön, båda CI-jobben gröna.
8. Registerpost i samma commit, och ORDER 130:s rad uppdaterad så att fyndet inte
   står öppet.

---

## 5. Om något inte går

Om guarden tar bort fönster från hus som borde ha dem — punkt 4 faller — är det
ett fynd. Då är polygonen och OBB:n mer olika än väntat för vissa byggnadstyper,
och lösningen kan behöva projicera i stället för att kassera.

Rapportera och stanna. Bygg inte en tredje strategi utan att den är beslutad.
