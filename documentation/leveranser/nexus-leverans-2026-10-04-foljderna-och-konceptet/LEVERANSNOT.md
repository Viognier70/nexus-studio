# LEVERANSNOT: följderna och konceptet (D5)

**Datum** 2026-10-04
**Till** Claude Code, via dig
**Från** Claude Design
**Gäller** D5 i `ORDRAR_303-304_D5.md`, punkterna 1–8 under *Till Design*. Underlag för ORDER 303 (E–G) och 304 (§1–§4). D2, öppningen, gick före och ligger i `nexus-leverans-2026-10-04-oppningen-omtag`.

Allt bygger på det som finns: vinbaren i teatern (`teaterScen.js`, `wineBarRoom.ts`), rollringen (`staffRing.ts`), stämningen (`guestMood.ts`), rätt och fel (`nexusTheme.warm.rattfel.ts`), HUD:en och butiken (`hostShop.ts`). Inga speltal i texterna. Talen i prototypen är exempel, och i spelet kommer de från balance.ts.

---

## 1. Innehåll

| Fil | Var | Vad |
|---|---|---|
| `staffStatus.ts` | slås in | Orkringen (`ORK_RING`, `drawStaffRings`), trivseln (`WELLBEING_SYMBOL`, `drawWellbeing`, `wellbeingSvg`), statusläget (`STATUS_MODE`) och kortet (`STATUS_CARD`). Gränserna är platshållare: `staminaOf(v, bands)`. |
| `hudLayout.ts` | slås in | Panelernas platser i vanligt läge och i fokusläge (`layout`), fokuslägets regler (`FOCUS_MODE`), kontrollen `checkOverlaps` / `checkAll` och `placeCard` för korten. |
| `pyramidMoment.ts` | slås in | Pyramidens ögonblick: tider i ms, storlekar, raden och våningarnas punkter (`floorPts`). |
| `guestGroups.ts` | slås in | Fem gästgrupper med färger och ett tecken var (`GUEST_GROUPS`, `dressGroup`, `lookOf`). |
| `equipment.ts` | slås in | Fem saker som modeller i meter (`createEquipment`), hemplatserna (`EQUIPMENT`), vagnens läge när den skjuts (`cartPose`) och lågan (`createFlame`, `flameK`). |
| `figureClips.ts` | ersätter | Sju nya klipp (§7). Inget annat ändrat. `validateClips()` är tom. |
| `shopTabs.ts` | slås in | Butikens tre flikar, leverantörerna och utrustningen med vad som öppnar dem, och klassen (`VENUE_CLASS`). |
| `morningReviews.ts` | slås in | Kortet *Recensioner i morse* (`REVIEW_CARD`) och prototypens exempel. |
| `foljderStrings.ts` | slås in i `STRINGS` | Alla nycklar `{ sv, en }`. `hud.*` och `f5.*` är prototypens. |
| `foljderManus.js` | läses | Prototypens scener: kvällen i vinbaren med personalens läge, grupperna, utrustningen, flamberingen och ostvagnen. |
| `prototyp/Foljderna och konceptet.html` | läses | Tio skärmar. Tangenterna S, H och Esc fungerar. Klicka på en figur för att öppna kortet. three.js, Babel och ikonerna hämtas från nätet. |
| `bilder/`, `skarmar/` | — | 12 kontrollbilder utan text och 13 skärmar, i 1440 × 900 och 1280 × 720 (§11). |

## 2. Personalens status (D5.1)

**Orkringen** ligger utanför rollringen: 0,64–0,76 m, där rollringen är 0,42–0,56 m. Den är delad i tre bågar på 108° med 12° glipa. Den första bågen är vänd mot kameran.

| Läge | Bågar | Klipp |
|---|---|---|
| Pigg | tre fyllda | som vanligt |
| Trött | två fyllda, en tom | som vanligt, något lugnare tempo |
| Slut | en fylld, två tomma | `staff.tiredIdle` när hen står still |

- **Färgen:** fylld båge är bläck (`rgba(42,28,19,.88)`) med en kant i papper. Tom båge är bara en streckad kant. Rollringarna är ljusa och har färg, och hovmästarens är grädde och kockens vit. Därför är orkringen mörk och skiljs från dem på formen och ljusheten. Den har inget rött, inget grönt och ingen ljuslåga, och den pulserar inte.
- **När den syns:** i statusläget syns den på all personal. Utanför statusläget syns den bara på den som är slut, så att det märks utan att man frågar.
- **Trivseln** visas med en platta bredvid ringen, mot kameran. Plattan är kvadratisk med rundade hörn, eftersom gästernas stämning är rund. Den är 20 px, i valnöt med en kant i mässing. Glöden har tre lägen: **trivs** är en hel låga, **lagom** en liten låga och **trivs inte** en släckt veke med rök.
- Kunskapen som saknas syns i `staff.hesitate`, där handen går till hakan och blicken söker en kollega. Code väljer klippet när en händelse kräver ett område som personen saknar (ORDER 303 E).

## 3. Kortet (D5.2)

- **Klick** på en figur öppnar ett kort i papper bredvid den, med en prickad tråd i ljuslåga från huvudet, som hovmästarens nålkort. Esc eller krysset stänger. Bara ett kort är öppet åt gången.
- **Personal:** roll, namn, ork (minibild av ringen och ordet), trivsel (plattan och ordet), dricks i kväll, och *Kan* med fyra kunskapsområden. Varje område har tre prickar, eller *Saknas* med streckad kant. Underst står en rad om vad läget betyder.
- **Gäst:** grupp, sällskapets namn, stämningen (symbolen från D1) och hur mycket gästen förlåter (*mycket*, *en del* eller *lite*).
- **Placering:** `placeCard` öppnar kortet åt den sida som har plats och håller det mellan ställningen och knapparna nertill. Det läggs aldrig över en panel. Kortet räknas med i `checkOverlaps`.

## 4. Pyramidens ögonblick (D5.3)

Ögonblicket kommer bara när svaret är rätt. Tiderna räknas i ms från att svaret låses:

| ms | Vad |
|---|---|
| 120–320 | Svarsraden blir grön, som förut. |
| 300–650 | Pyramiden lyfts ur kortet till mitten av den fria ytan och växer från 18 till 46 % av höjden. Rummet dämpas till 70 %. |
| 650–1 550 | Steget tänds: grönt stiger nedifrån i våningen. Ljudet *våning* kommer vid 1 550. |
| 1 200–1 700 | Multiplikatorn räknas upp, till exempel ×1,2 → ×1,6, bredvid *Steg 2 av 3 · Techne*. |
| 1 450–1 750 | Raden **Säkerhet × steg → kvällens utfall** tonas in: tre fält i papper, grönt och guld. |
| 650–2 150 | Pyramiden står i mitten i 1,5 s. |
| 2 150–2 600 | Den krymper tillbaka till kortet, eller till vänsterlisten i fokusläget. |

- **Mitten** är mitten av ytan till höger om raketkortet, så att ögonblicket aldrig ligger över kortet. I fokusläget är det skärmens mitt.
- **Ett fel svar** spricker i kortet som förut och lyfts inte. Ett stort ögonblick för fel vore ett straff, och förklaringen ska vara lika vänlig som förut.
- **Rättat fel:** i prototypen från 2026-09-30 ritades våningarnas konturer med höjden noll. `floorPts(f, fill)` räknar nu fyllnaden nedifrån, och konturen är `fill = 1`.

## 5. Fokusläget (D5.4)

- **Slås på** när kameran går under 14 m, eller med H. Det slås av först över 15,5 m, så att det inte fladdrar. H växlar.
- **Står kvar:** klockan, kassan och mätaren, krympta till en rad på 5,4 % av höjden.
- **Fälls till lister:**
  - Ställningen blir en tunn rad lyktor under den raden.
  - Raketkortet blir en list i vänsterkanten, med pyramiden i liten skala och *Raketen*.
  - Flikarna blir en mindre rad i nederkanten.
- **Stängs:** nålkorten (nålarna står kvar) och kortet för gäst och personal.
- Panelerna fälls på 280 ms. Ett klick på en list fäller ut panelen igen.
- **Kontrollen:** `checkAll()` ger 0 överlapp i båda storlekarna och båda lägena. Den hittade det som provspelet såg: raketkortet började på 13 % och låg över ställningen. Nu börjar det 2,4 % under ställningen.

## 6. Gästgrupperna (D5.5)

| Grupp | Tecken på 14 m | Färger | Klasser | Betalar / förlåter |
|---|---|---|---|---|
| Studenter | ryggsäck och luva | blått, ryggsäck i senap | enkel | lite / mycket |
| Bybor | platt keps | oliv, brunt | enkel, bistro | mellan / en del |
| Turister | ljus solhatt med brätte, kameraremmen | sand, ljusgrått | bistro, soigné | mellan / en del |
| Gourmeter | tjock sjal i mässing eller bärnsten | plommon, kol | soigné | mycket / lite |
| Affärsfolk | vit skjorta i kavajens V, slips | blågrå, grafit | soigné | mycket / lite |

- Tecknen sitter på huvudet och överkroppen, eftersom gästerna oftast sitter. På 14 m syns hatten och sjalen först och kepsen och skjortan sedan. Ryggsäcken syns när gästen sitter med ryggen mot kameran, och luvan syns framifrån.
- Kroppsfärgerna ligger nära de befintliga utseendena och ska prövas med `checkPaletteAgainstFloors` när de är inslagna. Affärsfolkets kavaj är ljusare än hovmästarens för att inte förväxlas med Per.

## 7. Utrustningen i rummet (D5.6)

| Sak | Mått (b × d × h) | Hemplats | Öppnar |
|---|---|---|---|
| Vinkylen | 0,62 × 0,64 × 1,86 | södra väggen mellan tvåan C och DJ-hörnet | rätt temperatur på vinet |
| Humidorn | 0,72 × 0,50 × 1,44 | östra väggen norr om klädhängaren | cigarren |
| Flamberingsvagnen | 0,56 × 0,96 × 0,88 | västra hörnet söder om köket | flambering vid bordet |
| Ostvagnen | 0,60 × 1,02 × 0,86 | bredvid, med kupan | ostvagnen vid borden |
| Avecvagnen | 0,56 × 0,92 × 0,90 | närmast köksdörren | avec, bord som stannar |

Vagnarnas handtag sitter på 0,92 m i −z. Vagnen följer den som skjuter den (`cartPose`). Delarna är namngivna `part.*`: kupan, pannan, lågan, osten och flaskorna.

**Nya klipp i `figureClips.ts`:**

| Klipp | Längd (normalt) | Vad |
|---|---|---|
| `trolley.push` | gång, kortare steg | båda händerna på handtaget |
| `trolley.present` | 2,6 s | ena handen på handtaget, den andra sveper mot gästerna |
| `cheese.cut` | 3,6 s | lutad över brädan, två drag med kniven och sedan en bit upp på kniven |
| `flambe.pour` | 2,4 s | häller en skvätt, och lågan tar sig vid u 0,82 |
| `flambe.tilt` | 3,4 s | lutar pannan, drar sig lugnt bakåt, två varv och visar sedan rätten |
| `staff.tiredIdle` | 4,4 s, loop | låg ork |
| `staff.hesitate` | 2,2 s | kunskapen saknas |

**Lågan:** den tar sig på 0,15 s, står i 0,8 s och är som högst 0,55 m. Sedan sjunker den i 2 s. Den är additiv, i ljuslåga och bärnsten, och en punktljuskälla lyser upp gästernas ansikten.

**Scenerna** finns i `foljderManus.js`:

- `flambe()`, 17 s: Per skjuter vagnen till tvåan B, visar, häller och flamberar. Gästerna lutar sig fram, och grannarna tittar.
- `cheese()`, 22 s: Elin lyfter kupan och skär vid tvåan A. Sedan går hon vidare till tvåan B.

## 8. Butikens nya flikar (D5.7)

- Butiken har tre flikar: **Förmågor** (som förut), **Leverantörer** och **Utrustning**. Krogens klass visas överst med tre steg (*Enkel*, *Bistro*, *Soigné*) och raden *Det du tar in avgör klassen, gästerna och frågorna*.
- Varje sak är en sten i samma lägen som i butiken: *din*, *öppen*, *krediterna räcker inte* och *låst*. Under namnet står vad saken tar in (leverantör) eller öppnar (utrustning).
- Kortet till höger visar:
  - vad saken tar in eller öppnar;
  - vilka nya frågor den ger, eftersom frågorna följer varukorgen;
  - vilken klass den drar mot;
  - vad som öppnar den: medaljen i en paviljong och krediterna;
  - vad den kostar. Utrustningen köps för kassan, och leverantören kostar i veckans inköp.
- Knappen är guld när saken går att öppna. När saken är din står det *Står i rummet* eller *Levererar från morgon*.

## 9. Recensioner i morse (D5.8)

- Recensionerna är ett kort i tidningspapper över morgonens rum, före inköpen. Överst står *Ryktet som bistro* med *62 → 60* och en stapel som visar båda lägena.
- Kortet har högst fyra rader, med den största ändringen först. Varje rad har:
  - en bricka (*Ryktet −4* i valnöt med pil ned, eller *Ryktet +3* i papper med pil upp);
  - citatet i Young Serif;
  - vem som säger det och varför.
- Det finns inget grönt eller rött, eftersom de bara betyder rätt och fel i stunden.
- Kortet kommer 600 ms efter morgonen, och raderna kommer en i taget med 180 ms emellan.

## 10. Till spelet

- **Statusläget (S)** dämpar inte rummet och pausar inte tiden. Knapparna *Status* och *Fokus* står nere till höger och visar sina tangenter.
- **Prototypen ritar ringarna över allt**, utan djuptest. I spelet gäller staffRing.ts: en svag kopia av ringen syns bara där något skymmer.
- **Dricksen** står på kortet som *Dricks i kväll*. Bokslutets rad för social hållbarhet är inte ritad, eftersom D5 inte bad om den. Säg till om den ska med.

## 11. Kontrollbilder

**Utan text, i `bilder/`:**

- statusläget: `status-24m-statuslage`, `status-24m-vanligt`, `ork-10m-lounge`;
- grupperna: `grupper-14m-staende`, `grupper-14m-i-rummet`;
- utrustningen: `utrustning-24m-hela-rummet`, `utrustning-11m-vagnarna`, `utrustning-13m-skapen`;
- flamberingen: `flambering-1-10m-visar`, `flambering-2-9m-lagan`;
- ostvagnen: `ostvagnen-1-10m-kupan`, `ostvagnen-2-10m-skar`.

**Med HUD:en, i `skarmar/`:**

- `statuslage` och `kortet-1-elin`, `-2-sara`, `-3-gast`;
- pyramiden: `pyramiden-1-lyfts`, `-2-steget-tands`, `-3-raden`, `-4-tillbaka-i-kortet`;
- fokusläget: `fokus-1-24m`, `fokus-2-under-14m`;
- butiken: `butiken-leverantorer`, `butiken-utrustning`;
- `recensioner-i-morse`.

## 12. Att se över

- **Säkerheten** i raden: jag läser den som det belopp raketen har säkrat före steget, gånger stegets multiplikator, vilket ger kvällens utfall. Om ORDER 303 menar något annat (till exempel svarets säkerhet) behöver bara fältets etikett och värde ändras.
- **Orkringen är mörk.** På DJ-hörnets mörkare golv är kontrasten lägre (prövad i `ork-10m-lounge` och statusläget, och den räcker). Säg till om ni vill ha den ljusare.
- **Ryggsäcken** syns inte framifrån. Om studenterna ska läsas från alla håll kan luvan få kontrastfärgen.
- **Frågebanken** för varorna och utrustningen (ORDER 304 §5) är innehåll och ingår inte här.
