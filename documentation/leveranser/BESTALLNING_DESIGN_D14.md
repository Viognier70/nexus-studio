# Beställning till Design, D14: det som behövs för att varje val ska synas

Från Code, 12 oktober 2026 (ORDER 331 D). Anders skickar den till Design.

## Bakgrund

Grundregeln från 11 oktober (CLAUDE.md och konstitutionen, "EVERY CHOICE IS SEEN"):

> Allt spelaren väljer som påverkar spelet ska alltid synas i spelet.

Genomgången i ORDER 330 H gick igenom alla spelarens val. I ORDER 330 och 331 är det byggt som gick med de figurer, klipp och föremål som redan finns:
- den extra servitören och Jonas vid vagnen;
- leveransbilen;
- laget som det är anställt;
- genomgången och provningen före dörrarna;
- lådorna med de lokala råvarorna;
- värdens bjudning;
- vagnarna och vinkylen i bruk.

Det som står nedan går inte att bygga med det vi har. Tills det finns räknas valet som ofullständigt.

**Allmänt för allt nedan:**
- Måtten följer enhetskontraktet: 1 enhet är 1 meter. Personalen och gästerna är 1,70 m, bordshöjden 0,74 m och tallriken 0,27 m. Rekvisitan visas i 1,5 gånger storlek (ORDER 290).
- Klippen följer formen i `figureClips.ts`: id, roller, loop eller inte, travel, sekunder, `holds` och `next`.
- Vinbaren och bistron delar regissör och klipp. Det som beställs för vinbaren gäller därför båda, om inget annat står.

## Beställningen

### 1. DJ:ns klipp
- **Plats:** vinbaren och bistron, i DJ-båset (`WINE_BAR_PLAN.dj`).
- **Tillfälle:** satsningen "En DJ i kväll" (`book-dj`). Musiken börjar 21.00.
- **Vad som ska synas:** DJ:n som spelar, med händerna på skivspelaren och mixern och huvudet i takt. Gärna ett kort klipp när en låt byts.
- **I dag:** DJ:n står i båset med kockens klipp `cook.station`, och skenet tänds 21.00.
- **Leverans:**
  - klippet `dj.play` (loop, inte travel);
  - gärna `dj.cue` (inte loop, 2–3 s);
  - om det behövs en rekvisita för skivspelaren.

### 2. Recensenten
- **Plats:** vinbaren och bistron, vid ett bord. I vagnen i kön och vid ståbordet.
- **Tillfälle:** recensenten kommer i kväll. Förmågan "Förvarning om recensenten" (`ab.critic`) säger på morgonen att hen kommer, men inte när. Signaturrätten (`ab.signature`) är rätten recensenten frågar efter.
- **Vad som ska synas:** en gäst som går att känna igen som recensenten, men inte för tydligt. Hen sitter ensam, antecknar diskret, smakar noga och fotograferar tallriken.
- **I dag:** recensenten syns inte. Det syns bara i texten och i recensionen nästa morgon.
- **Leverans:**
  - en gästtyp eller ett utseende (`guestLooks`) med anteckningsbok;
  - klippen `critic.note` (sittande, inte loop) och `critic.photo` (sittande, inte loop);
  - rekvisitan anteckningsbok och telefon.

### 3. Skylten "Stängt"
- **Plats:** vid krogens dörr, alla klasser. Vid vagnen på luckan.
- **Tillfälle:** spelaren stänger lunchen eller middagen (`CLOSE_SERVICE`). Det gäller också söndagen, som är stängd.
- **Vad som ska synas:**
  - från gatan och byn: att stället är stängt i kväll, med skylten i dörren eller på trottoarpratan;
  - på nivån Gatan: ljuset släckt (`venueLight`; det kan Code göra);
  - vid vagnen: luckan stängd och skylten på luckan.
- **I dag:** byn visar stället som öppet.
- **Leverans:**
  - en skylt för dörren och en för vagnens lucka, med texten på svenska och engelska i strängtabellen;
  - gärna en trottoarprata som vänds från "Öppet" till "Stängt".

### 4. Provsmakningsbordet på torget
- **Plats:** torget, nära spelarens krog (`TorgetPlaza.tsx`).
- **Tillfälle:** satsningen "En provsmakning på torget" (`TASTING.activityId`), på eftermiddagen före servicen.
- **Vad som ska synas:**
  - ett bord med vinet och smakbitar;
  - en i personalen som häller och bjuder;
  - förbipasserande som stannar, smakar och sedan går mot krogen.
- **I dag:** det syns bara som en längre kö på kvällen.
- **Leverans:**
  - bordet med duk, glas och fat i meter;
  - klippen `tasting.offer` (personalen räcker fram) och `guest.tasteStand` (stående, smakar och nickar).

### 5. Gästkockens kläder
- **Plats:** vinbarens och bistrons kök, vid kallskänken (`cookCold`).
- **Tillfälle:** satsningen "Gästkock i kväll" (`guest-chef`).
- **Vad som ska synas:** en andra kock som spelaren ser är en gäst i köket och inte husets kock.
- **I dag:** (ORDER 331 C) en andra kock står vid kallskänken hela kvällen med `cook.station`, i husets kökskläder. Samma figur används när spelaren anställer en kock till.
- **Leverans:** en uniform som skiljer gästkocken från husets kök, till exempel en annan färg på förklädet eller en mössa. Gärna också `cook.taste` (inte loop), där kocken smakar av.

### 6. Komposttunnan
- **Plats:** vid disken i köket (`dish`), och en tunna vid bakdörren.
- **Tillfälle:** satsningen "Genomgång av kökets kompost" (`compost-audit`), på morgonen före dörrarna.
- **Vad som ska synas:** Per och diskaren går igenom flödet vid tunnorna. Någon lyfter locket och pekar på vad som ska var.
- **I dag:** (ORDER 331 C) Per pekar vid disken (`host.point`). Det finns inga tunnor att visa.
- **Leverans:**
  - komposttunnan och en sorteringsbänk i meter;
  - klippet `staff.sortWaste` (inte loop, 3–4 s), där locket lyfts och något läggs i.

### 7. Menytavlan som blir kortare
- **Plats:** tavlan vid vinbarens entré (Per skriver på den före dörrarna, `staff.writeBoard`). Vid vagnen menyskylten vid luckan.
- **Tillfälle:** "Korta menyn" (`SHORTEN_MENU`) och "Tunnare vinlista" (`THIN_WINE_LIST`) på morgonen.
- **Vad som ska synas:** tavlan har färre rader när menyn är kortad, och vinlistan på tavlan eller i mappen är tunnare.
- **I dag:** tavlan är densamma. Välkomstdrinken slutar serveras när vinlistan är tunn, men det syns bara indirekt.
- **Leverans:** tavlan i två eller tre lägen (full, kortad, tunn vinlista), där raderna kan gömmas, som namngivna delar (`part.*`) så att Code kan släcka dem.

### 8. Kaffekoppen
- **Plats:** vid borden i vinbaren och bistron.
- **Tillfälle:** värden bjuder sällskapet på kaffe (`HOST_COMP` kaffe). Kaffet hör också till fikat.
- **Vad som ska synas:** koppen bärs till bordet och står där.
- **I dag:** (ORDER 331 C) servitören bär ett glas till bordet, eftersom det inte finns någon kopp bland föremålen.
- **Leverans:** en kopp med fat (`cup`) i `tableware.ts`-form, med storlek, fäste och var den kan stå.

### 9. Förmågorna i butiken som inte syns
Varje förmåga ändrar kvällen, men ingen av dessa syns i rummet i dag:

| Förmåga | Vad den gör | Vad som kunde synas | Behövs |
|---|---|---|---|
| Allergenkort (`ab.allergen`) | Servitören behöver inte fråga köket | Servitören visar ett litet kort vid bordet när gästen frågar | Rekvisitan kort, och klippet `waiter.showCard` |
| Menyns berättelse (`ab.menuStory`) | Gästerna läser längre och väljer det som kostar mer | Gästen läser längre i menyn och pekar; servitören berättar | Klippet `waiter.tellStory` (stående vid bordet, gest mot menyn) |
| Signaturrätten (`ab.signature`) | En rätt som bara finns hos dig | En egen tallrik som går att känna igen | En tallrik med signaturrätten i `tableware.ts` |
| Mise en place-rutinen (`ab.mise`) | Kocken har allt framme före dörrarna | Kockens station med allt uppställt och märkt | Rekvisitan gastronormer och märklappar på kallskänken |
| Dagens rätt av resterna (`ab.leftovers`) | Mindre svinn | Dagens rätt på tavlan och kocken som tar ur kylen på morgonen | En rad på tavlan (punkt 7) och klippet `cook.fromFridge` |
| Stamgästboken (`ab.regulars`) | Per känner igen stamgästerna | Per slår upp boken vid dörren och hälsar med namn | Kan byggas med `host.checkBook` och `host.greetDoor`; Code tar det |

### 10. Fikat vid vagnen
- **Plats:** vid vagnen efter stängning.
- **Tillfälle:** fikat efter kvällen, både dilemmana och det vanliga fikat (ORDER 316 och 329).
- **Vad som ska synas:** laget sitter på kanten av vagnen eller står vid ståbordet med var sin kopp. Den som frågar vänder sig till spelaren.
- **I dag:** i vinbaren sitter laget vid bordet (`FikaAtTable.tsx`). Vid vagnen syns ingenting, utom texten.
- **Leverans:**
  - klippen `staff.sitEdge` (sittande på vagnens kant, loop) och `staff.cupStand` (stående med kopp, loop);
  - koppen från punkt 8.

## Synpunkter från bygget i ORDER 331

- **Vagnarnas parkering.** Flamberings-, ost- och avecvagnen står med handtaget mot väggen (D5 `equipment.ts`: "handtaget mot väggen"). Den som hämtar en vagn står därför vid vagnens andra ände, och vagnen vänds när den börjar skjutas. Code mjukar upp vändningen, men den syns. Om vagnarna parkeras med handtaget mot rummet kan de tas direkt.
- **Humidorn** har ingen försäljning i simuleringen än (cigarrerna "säljs först med humidorn och dess händelse"). Den syns som skåp men används inte. Den hör till frågebanken (ORDER 306) och inte till den här beställningen.

## Prioritering, förslag från Code

1. Skylten "Stängt" (3). Ett beslut som inte syns alls i dag, och den är enkel.
2. Recensenten (2). Två förmågor och recensionen hänger på den.
3. Menytavlan (7). Två val och dagens rätt hänger på den.
4. Kaffekoppen (8) och fikat vid vagnen (10).
5. DJ:ns klipp (1), provsmakningsbordet (4), gästkockens kläder (5), komposttunnan (6) och förmågorna (9).
