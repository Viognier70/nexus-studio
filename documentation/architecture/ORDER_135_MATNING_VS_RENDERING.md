# ORDER 135 — Mäter mätningen samma geometri som renderas?

**Repo** `Viognier70/nexus-studio` · **Gren** `order-135` (från `main`)
**Klass** AUTONOM · **Utredning, ingen rättelse**
**Datum** 2026-08-30
**Följer** Vision Owner obs 2026-08-30 (vägar korsar hus i meter, inte cm)

---

## 1. Läget

Vision Owner har sett kartan i dev-servern och ORDER 133:s slutsats stämmer
inte med vad som syns. Vägar går rakt in i och under byggnader — meter, inte
centimeter.

ORDER 133 rapporterade **33 av 37 kollisioner som verkliga smågränsöverlappningar
under 1 m** och avfärdade behovet av åtgärd. Ordern skrivs som en tvist mot den
slutsatsen — inte mot mätningen som sådan, utan mot **att mätningen mätte samma
geometri som renderas**.

Två skärmdumpar bifogas av Vision Owner:
- den svarta byggnaden där vägen tar slut
- den stora röda längan tvärs över gaturummet

---

## 2. Vad som ska fastställas

**2.1 Bredd i mätningen kontra bredd i renderingen.** Vad använder
`order133-road-width-audit.mjs` för att beräkna vägbanan? Vad använder
`OsmRoads.tsx` för att extrudera vägshapen? Är det samma tal?

**2.2 Om inte — hur stor är skillnaden per vägtyp och per konkret väg?**
Redovisa både carriageway och envelope (med trottoar) mot vad mätningen
använde.

**2.3 Hur ser fyndlistan ut med rätt bredder?** Räkna om ORDER 130-mätningen
med renderad bredd och rapportera nya kollisioner + värsta överlapp.

**2.4 Vilka av ORDER 133:s fall försvinner respektive tillkommer?**

---

## 3. Ordern rättar inget

Ingen bredd ändras. Ingen roadRoles.ts-parameter justeras. Ingen mätning
uppdateras. Ingen ORDER 133-rapport skrivs om.

Om mätningen visar sig mäta fel geometri är åtgärden att antingen (a) uppdatera
mätningen så framtida audits läser rätt värden, (b) uppdatera renderingen så
mätningen blir korrekt, eller (c) bygga en polygon-guard i OsmRoads analogt
med ORDER 132. Alla tre är egna beslut, ingen ryms i den här utredningen.

---

## 4. Definition of Done

1. §2.1 besvarad med exakt sökväg + funktionsnamn för båda regimer.
2. §2.2 — bredd per väg-roll, tabell.
3. §2.3 — kollisioner rapporterade under tre regimer: (A) ORDER 133-bredd,
   (B) renderad carriageway, (C) renderad envelope.
4. §2.4 — listor för nya och försvunna fall.
5. Rapport i `documentation/blueprints/`.
6. Slutsats om vilken av ORDER 133:s påståenden som håller, och vilka som fallit.
7. `git diff main..HEAD -- frontend/src/` = tomt (ingen produktionskod rörd).
8. Typecheck grön, hela sviten grön.
9. Registerpost i samma commit. Rad 133 uppdateras med not att slutsatsen är
   reviderad.

---

## 5. Om något inte går

Om det visar sig att renderingen har ännu ett tredje bredd-system (utöver
`ROLE_SPECS` och OSM-taggar) — t.ex. LOD-beroende, kamera-avstånds-beroende
eller separat post-processing-buffer — rapportera det. En trefaldig tabell är
en signal om djupare fel än bara "två system bredvid varandra".

Och om värsta överlappet i renderad envelope visar sig vara betydligt större
än 4 m — säg 10+ m — kan det vara ett symptom på transformbugg som ORDER 130
§3.3 uteslöt för snabbt. Det öppnar ny utredning.
