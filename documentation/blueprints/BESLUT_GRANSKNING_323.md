# Beslut om FÖR_GRANSKNING_323.md

Granskat av Claude 2026-10-10, med beslut från Anders. Gäller `documentation/blueprints/FÖR_GRANSKNING_323.md` (main 396f191b). Allt nedan ska föras in i spelet på svenska och engelska samtidigt.

---

## Del 1. Vagnens fem fikadilemman

Alla fem passar en foodtruck och har tre olika hållningar. Tre behöver ändras.

### fika-vagn-kylboxen: godkänd med ändringar
- **Kostnaden i svar A blir 900 kr**, som när alla varor slängs. Svaret säger att allt som legat varmt slängs, och det är hela boxen.
- **Förklaringen,** ny andra mening: "Värmen på grillen dödar många bakterier, men en del hinner bilda gifter som inte förstörs av värme." Det är mer exakt än "tar inte bort allt som hunnit växa".
- **Lagtexten** (SFS 2006:804 och EG 852/2004) stämmer. Anders granskar den själv som livsmedelsexpert och sätter `legalReviewed: true` när han har läst den.

### fika-vagn-kon: godkänd som den är

### fika-vagn-dricksen: skrivs om
Den nuvarande frågan säger att spelaren "lade dricksen i kassan förra veckan". Det motsäger spelets regel att dricksen går till personalen. Ny version:

**Nils frågar:** "Det låg mycket i dricksburken i kväll. Vi stod båda i luckan. Ska du som äger vagnen ha del av den?"

| Svar | Nivå | Text |
|---|---|---|
| A | Väl grundat | Dricksen är er. Jag tar ut min lön ur vagnen, inte ur burken. Och vi bestämmer regeln nu, så att den gäller varje kväll. |
| B | Svagt grundat | Den går in i kassan. Det är vagnens gäster. |
| C | Delvis grundat | Vi delar lika i kväll, så ser vi sen. |

**Förklaringen:** Dricksen är gästernas tack till dem som serverar. När ägaren tar del av den blir det otydligt vad den är till för. En regel som alla känner till i förväg skyddar mot misstankar, också när summan är liten.

### fika-vagn-benen: godkänd, lagtexten till jurist
- Texten och svaren godkänns.
- **Lagtexten:** att rast ska ges efter högst fem timmar stämmer (arbetstidslagen 15 §). Hänvisningen till Arbetsmiljöverkets föreskrifter behöver kontrolleras. Sedan 2025 är stående arbete (belastning) och kyla uppdelade på flera nya föreskrifter, och AFS 2023:2 gäller det grundläggande arbetsmiljöarbetet. Juristen anger rätt AFS, och `legalReviewed` står kvar som `false` tills dess.

### fika-vagn-kortet: svar A ändras
"Eller att de får betala nästa gång" krockar med situationen Kortläsaren (ft10), där det svaret bara ger halvt grepp. Nytt svar A:

> Vi sätter upp en skylt om hur man kan betala, och har en reserv när tekniken krånglar: Swish och en andra läsare.

---

## Del 2. Termer och språk

### 2.1 Termerna: alla förslag godkänns, med tre ändringar
- **Kvarteret (C):** "The block" i stället för "The district". Det ligger närmast svenskans kvarter, och knapparna blir korta: Village (V), Block (C), Street (X), Your place (Z).
- **Grepp:** behålls som **"grip"** ("Half grip", "Full grip"). "The double grip" är Anders begrepp och ska inte ändras. Det är i stället rekvisitans texter som slutar använda "grip" och säger "hold".
- **Engelskan i hela spelet är brittisk:** bin lorry, neighbours, kitchen porter, maître d'.

### 2.2 Onaturlig engelska: alla förslag godkänns, med en ändring
- **pyramid.full.sub:** svenskan blir **"Vad och varför, hur och när. Du kunde alla tre."** Engelskan blir **"What and why, how and when. You knew all three."** Det följer triaden: episteme (vad och varför), techne (hur) och phronesis (när).

### 2.3 Frågebanken: alla förslag godkänns, med en ändring
- **somm-h2:** "i rumstemperatur" stämmer inte för ett äldre rött vin, som ska vara svalare. Svenskan blir "Låt flaskan stå upprätt ett dygn, svalt." Engelskan blir "Stand it upright for 24 hours, somewhere cool."
- Ändringen görs i både `bank.text.en.json` och källfilen.

### 2.4 Svenska fel
- **mn02-pinot:** "vidt" finns inte, och "vitt" kan läsas som färgen. Skriv **"i ett glas med vid kupa"**.
- **ft06-stangningen, steg 2, svar A:** svaret motsäger sig själv. Code skickar frågan med alla fyra svaren, så skriver Claude om svaret. Det gäller livsmedelssäkerhet, så rätt och fel måste vara tydliga.
- **ft13-priset, halvt grepp:** blir **"bara lite mer än hälften så mycket"** (13 av 23 kr är 57 %). Felet var Claudes.
- **somm-h7:** blir **"möglig"**, om förklaringen beskriver ett fel i vinet. Annars står "mustig" kvar. Code kontrollerar sammanhanget.
- **Måltidsbiblioteket:** rättas.
