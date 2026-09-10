# Design-fråga 2026-09-10 — ölkrogens långbord: bänkar eller stolar?

**Adresserad till:** Design
**Från:** Claude Code (ORDER 202 §1, VO-direktiv 2026-09-10 kl. 14:00)
**Berör:** `frontend/src/strategic/scene/brewpubRoom.ts:588-618` (long-tables `longA`, `longB`)

---

## Bakgrund

VO-inspelning 2026-09-10 kl. 13:30 ölkrogen rapporterade som fynd 1:
"Gäster vid LÅNGBORDEN sitter bredvid/genom stolarna, inte på dem."

ORDER 200 hade rätta seatHeight per plats (barstolar 0.75 m, chair 0.45 m)
via kontraktet, och barstols-gästerna löste sig visuellt. Långbords-
gästerna gjorde det inte.

ORDER 201 föreslog en rig-korrekt formel: `sitLift = plinth + seatHeight
+ cushion − hipY_seated`. Den placerar rig-pelvis på cushion top (0.585 m
för chair, 0.885 m för stool). Detta BRÖT dock den visuellt löst
barstols-observationen — stools är 0.75 m men bar counter är 1.21 m,
och pre-fix satt pelvis på 1.195 m (nära counter → läste som "lutar
mot baren"). Post-fix pelvis 0.885 m gav "sitter för lågt vid baren".

VO-direktiv 2026-09-10 kl. 14:00: **koden ska inte gissa. Fråga Design.**

## Frågan

`RoomSeat.seatHeight` för långbord (`longA`, `longB`) i `brewpubRoom.ts`
är satt till `CHAIR_HEIGHT = 0.45 m` (rad 611). Geometrin ritas som en
individuell `chair(sx, sz, facing, id)` per sittplats — en cylinder 0.05 m
tjock med radie 0.22 m, stem 0.04 × 0.45 m, ryggstöd 0.42 × 0.40 × 0.04 m.

Fyra separata stolar per långbord. Ingen bänk-geometri.

**Är det avsikten?** Ölhallar har traditionellt LÅNGA BÄNKAR (Bierbänke,
bänkform), inte individuella stolar. Om långborden ska ha bänkar behöver:

1. Geometri i `brewpubRoom.ts` bytas: `chair()`-anrop mot `bench()`
   (bänkyta 2.4 × 0.35 m, sitshöjd 0.45 m). Ryggstöd oftast utan; hörn-
   bänkar kan ha lutande ryggstöd men det är inte standard.
2. Sittplats-fördelningen på bänken: fyra sitspositioner (`sx=1.3`, `2.5`
   på båda sidor av bordet z=−2.9) fungerar fortfarande — men gästen
   sitter DÅ på bänkens Y=0.45 m med samma cushion-yta för alla fyra.
3. Bänk-Y ändrar inte seatHeight-värdet (0.45 m matchar bänksitshöjd
   också) — värdet är redan rätt. Bara MESH-formen är fel.

**Alternativt:** om långborden ska ha individuella STOLAR (som nu),
`seatHeight = 0.45 m` är rätt men den nuvarande render-formen visar
gästerna på fel Y. Då är sitLift-formeln (ORDER 201-versionen) rätt
och behöver återinföras.

## Vad vi behöver från Design

Ett av tre svar:

**A. Bänkar (troligast för ölhalls-koncept):**
- Geometri byts i brewpubRoom.ts. Egen order öppnas.
- ORDER 200:s `sitLift = seatHeight` (rå) stannar.

**B. Stolar (som nu är kodat):**
- ORDER 201:s `sitLift = plinth + seatHeight + cushion − hipY_seated`
  återinförs.
- Egen order som återöppnar plinth-formeln.

**C. Blandning (t.ex. bänk på ena sidan, enskilda stolar på andra):**
- Per-seat `kind: 'bench' | 'chair'` i kontraktet. Nytt fält på RoomSeat.
- InteriorGuests väljer sitLift-formel per kind.

## Referens-punkter

- Fabbrikans **Rekvisitan / gastgiveriet / vinbaren** — vilka rum har bänkar vs stolar
  i era briefer? (Se `BRIEF_DESIGN_REKVISITAN.md`, `BRIEF_DESIGN_GASTGIVERIET.md`
  i repo-roten.)
- ORDER 174:s kontrakts-princip: rummets form är rummets ansvar; renderaren
  läser vad kontraktet publicerar. Om långborden är bänkar ska bänkar
  ritas och publiceras; om det är stolar ska sitLift-formeln matcha stol-
  geometri.

## Konsekvens av att inte svara

Nu ligger `sitLift = seatHeight` i koden (ORDER 200 + ORDER 202 §1). Gäster
vid långborden hänger fortfarande 31 cm över stols-cushion enligt rig-
matten. Nästa provspel kommer visa samma fynd. Vi väntar hellre än gissar.

---

**Notera:** samma fråga gäller ölkrogens `twotop`-bord (`twoC`, `twoD`)
och restaurangens tables — de använder samma `chair()`-form men har
seatHeight 0.45 m. Om Design-svaret berör bänkar för långbord specifikt,
låt oss veta om twotops påverkas.
