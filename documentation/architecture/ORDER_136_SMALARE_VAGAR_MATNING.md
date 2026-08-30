# ORDER 136 — Smalare vägar, mätning innan beslut

**Repo** `Viognier70/nexus-studio` · **Gren** `order-136` (från `main`)
**Klass** AUTONOM · **Utredning, ingen rättelse**
**Datum** 2026-08-30
**Följer** ORDER 135 (som accepterades och stängde ORDER 133:s premiss)

---

## 1. Läget

Vision Owner har accepterat ORDER 135:s slutsats. Vägbeslutet från i morse
(ORDER 133) utgår — det byggde på en premiss (OSM-datan styr renderingen) som
inte stämmer.

Innan något rättas: mät utfallet av alternativa `ROLE_SPECS`-värden mot dagens.

---

## 2. Vad som ska mätas

**2.1 Dagens `ROLE_SPECS`.** Bredd och trottoar per roll, tabell. Jämför mot
vad en svensk bruksort faktiskt har (VGU-normer, referens i rapporten).

**2.2 Kollisionsräkning för minst två alternativ.** Föreslagna exempel:
- Alt A: trottoar primary/main 1,6 / 1,5 → 1,0 m (mindre trottoarbredd)
- Alt B: primary 10 → 7 m, main 9 → 7 m (mindre riksvägsbredd)
- Fritt att lägga fler om det ger insikt.

Räkna för varje: hur många av ORDER 135:s 32 envelope-kollisioner försvinner?

**2.3 Kvarvarande fall.** Vilka byggnader är kvar efter respektive alternativ,
och hur djupt går kollisionen då?

**2.4 Tre skärmdumpar av samma vy** vid dagens och de föreslagna bredderna.
Vision Owner vill se skillnaden. Kräver temporär patch av `ROLE_SPECS` under
screenshot-sessionen — commit får inte innehålla ändringen.

---

## 3. Ordern ändrar ingenting

Ingen bredd committas. Ingen guard läggs. Ingen `ROLE_SPECS` uppdateras i main.

Om alternativa bredder ska antas är det ett separat designbeslut som Vision
Owner tar efter att ha sett den här mätningens siffror och skärmdumpar.

Screenshot-genereringen får patcha `ROLE_SPECS` temporärt i arbetsträdet men
det får INTE följa med i commit.

---

## 4. Meta — regel för CLAUDE.md

Ordern noterar: **tre gånger på två dagar har en mätning läst annan geometri
än renderingen** (ORDER 128 för golvfärgen, ORDER 132 för fönstren, ORDER 135
för vägbredden). Rapporten föreslår en regel för `CLAUDE.md` om att mätningar
ska läsa samma källa som renderar — eller explicit dokumentera avvikelsen.

Regelförslaget är förslag, inte diktat. Vision Owner tar in det i CLAUDE.md
eller avfärdar det.

---

## 5. Definition of Done

1. §2.1 tabell med dagens `ROLE_SPECS` per roll + svensk bruksort-jämförelse.
2. §2.2 kollisionsräkning för minst två alternativ.
3. §2.3 kvarvarande fall listade individuellt per alternativ, med djup.
4. §2.4 tre skärmdumpar samma vy (`w193810921`-motivet från ORDER 130
   eller motsvarande värsta-fall från ORDER 135).
5. Rapport i `documentation/blueprints/`.
6. §4-regelförslag skrivet i rapporten (inte i CLAUDE.md än — Vision Owner
   beslutar).
7. `git diff main..HEAD -- frontend/src/` = tomt (`roadRoles.ts` orört i
   commit).
8. Typecheck grön, hela sviten grön.
9. Registerpost i samma commit.

---

## 6. Om något inte går

Om Alt A + Alt B tillsammans inte kan reducera kollisionerna under 5 fall
utan att göra vägarna orimliga tunna — då är det ett strukturellt fynd. Det
kan betyda att `OsmRoads` behöver polygon-guard (ORDER 132-analog) hellre än
smalare bredder. Rapportera fyndet, föreslå inget värde.
