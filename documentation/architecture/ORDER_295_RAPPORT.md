# ORDER 295 — Felsluten (rapport)

**Ordern** (Vision Owner 2026-10-02): Designs leverans `nexus-leverans-2026-10-02-felsluten`, granskad och godkänd, är inkopierad oförändrad under `documentation/leveranser/`. Ordern omfattar:
- födelsedagens felslut i steg 1 och 3;
- tillsynens varianter B och C i steg 3;
- rumshändelsen `musicUp`;
- DJ:n vid födelsedagen på helgkvällar;
- att varje fel spelar sitt eget slut (F65).

**Numret.** 295 var reserverat för *Byn i kvällsljus*. Den ordern flyttas till 296 och är reserverad i registret.

Gren `order-295` från `main` (`001b628`).

## 1. Det som ändrats

**Manusen.** `scene/events/handelserManus.js` är leveransens version. Den har `birthday` med `wrong1`, `wrong2` och `wrong3`, och `inspection` med `wrongB3` och `wrongC3`. Leveransens manus och strängar ligger i leveransmappen.

**Strängarna.** Leveransen har inga nya nycklar i spelets `STRINGS` (LEVERANSNOT §3). `eventVideoStrings.ts` visas bara i prototypen och är inte inslagen.

**`musicUp`.** Bara rumshändelsen är förd över, inte hela `teaterScen.js`, som bygger på leverans 3:s version. Den finns i spelets teater, `scene/eventTheatre.ts`:
- Rummets eget DJ-sken (`wineBarRoom` `parts.djGlow`) pulserar i 120 bpm.
- Ett sken och en punktljuskälla står över pulten och tonar in på 1,2 s.
- När scenen är slut står rummets sken som det var.

Testet hittade ett fel under arbetet: första laddningen nollställde rummets DJ-sken. Det är rättat; skenet återställs bara när en `musicUp` har ändrat det.

**DJ:n vid födelsedagen** står bakom båset med kockens klipp och 0,25 m upp, som i manuset. Hon är med fredag och lördag. Andra kvällar tas hon ur manuset (`theatreEvents.ts` `scriptFor`). I `wrong3` en vardag går Elin ändå till båset och skenet pulserar, utan DJ i bild.

**Varje fel spelar sitt eget slut** (`theatreEvents.ts` `wrongVariant`):
- Fel i steg *k* spelar `wrong{k}`.
- Tillsynens B och C spelar `wrongB3` och `wrongC3` i steg 3.
- Alla fem händelser har nu fel i steg 1–3.
- Bara tillsynens variant D saknar eget slut i steg 3. Den spelar variant A:s `wrong3`, det närmaste som finns.

**Figurvakten.** Gränsen för "ligger" är 0,7 m för en figur som sitter på en sits (`figureAudit.ts` `HEAD_MIN_SEATED_M`). Den unga gästen i tillsynens variant B sitter i loungen med huvudet på 0,90 m och flaggades som liggande vid gränsen 0,9 m. Stående figurer har kvar 0,9 m.

## 2. I produktionsbygget

Fyra körningar, en fredag (`frontend/reports/order295/events.json`, `scripts/order293-events.mjs` med `RUNS`):

| Händelsen | Slutet | Klar | `maxDown` | Sidfel |
|---|---|---|---|---|
| Födelsedagen | fel i steg 1 | ja | 0 | 0 |
| Födelsedagen | fel i steg 3 | ja | 0 | 0 |
| Tillsynen, variant B | fel i steg 3 | ja | 0 | 0 |
| Tillsynen, variant C | fel i steg 3 | ja | 0 | 0 |

Variant B är omkörd efter rättelsen av figurvakten; den första körningen gav `maxDown` 1 (gästen `lb1`).

Bilderna `events-*.jpg` motsvarar Designs kontrollbilder, till exempel `fodelsedagen-8-13m-dj-hojer` och `tillsynen-12-13m-variant-b-handlaggaren-skriver`.

## 3. Tester

`scene/__tests__/order293Theatre.test.ts`:
- felsluten: alla händelser i steg 1–3, och B och C i steg 3;
- DJ:n bara på helgkvällar;
- `musicUp` pulserar rummets sken och lämnar det som det var;
- manusens personal, där DJ:n nu ingår.

Hela sviten och bygget är gröna.

## 4. Öppet

- Tillsynens variant D har inget eget slut i steg 3.
- DJ:ns egna klipp; tills vidare kockens.
- Födelsedagens felsvar *högt* och *genom baren* i steg 2 är beskrivna i manuset men inte ritade. De spelar steg 2:s slut, *fort*.
