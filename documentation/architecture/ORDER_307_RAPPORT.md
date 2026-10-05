# ORDER 307 — Konceptet och varukorgen, utan frågebanken (rapport)

**Underlag:** Anders 2026-10-05:
- ORDER 304 §9 är godkänt i sin helhet.
- Delarna som inte rör frågebanken byggs nu: klassen, gästtyperna, de två ryktena, leverantörernas och utrustningens tabeller och butikens flikar.
- Avec kommer tillbaka som en investering: avecvagnen öppnar avec.
- Frågebanken per vara väntar på ORDER 306.
- Designs D5 (`nexus-leverans-2026-10-04-foljderna-och-konceptet`) har gästgrupperna, utrustningen och butikens flikar.

Gren `order-307` från `main` (`67650e0`). Designs tre leveranser 2026-10-04/05 är uppackade oförändrade i samma gren (`af48bae`).

## 1. Konceptet ur varukorgen

`sim/goods.ts`, talen i `balance.ts` `CONCEPT`:
- **Varans nivå** (`GOODS`): enkel, bistro eller soigné.
  - Det billiga och vardagliga är enkelt (soppan, linserna, desserterna, ölen och det alkoholfria).
  - Baspaketets kött och husets vin är bistro.
  - Viltet, flaskan Pinot Noir och de sällsynta varorna är soigné.
- **Konceptet** räknas ur det som står på menyn i kväll: varornas nivå, vägd med portioner kvar × pris, på skalan 0–2. Utrustningen i rummet lyfter mot sin nivå. Gränserna är 0,6 (bistro) och 1,4 (soigné).
- **Baspaketet ger bistro** (0,74). Bistro har dagens gästblandning, så att den som köper baspaketet spelar som förut.
- **Bokningen** bär kvällens koncept (`GuestBooking.concept`).
- **Morgonen** visar "I kväll: Bistro" i bokningsboken.
- **Skylten** i byn visar "Vinbar · Bistro".

## 2. Gästtyperna

- **Byns tre grupper** står kvar: studenter, medel och de betalningsstarka.
- **Vid vår dörr** blir en del av medelgruppen turister, och de betalningsstarka blir gourmeter eller affärsfolk (`CONCEPT.touristOfMiddle`, `gourmetOfHigh`). Typen dras ur fröet.
- **Andelarna per koncept** (`CONCEPT.share`):

| Koncept | Studenter | Medel (bybor, turister) | Betalningsstarka (gourmeter, affärsfolk) |
|---|---|---|---|
| Enkel | 0,4 | 0,5 | 0,1 |
| Bistro | 0,2 | 0,55 | 0,25 |
| Soigné | 0,05 | 0,35 | 0,6 |

- **Betalningsviljan** ligger i plånboken: gourmeterna och affärsfolket har den generösa. Turisterna betalar 1,1 ovanpå den vanliga (`GUEST_TYPES.payFactor`).
- **Förlåtelsen** (`GUEST_TYPES.forgiveness`) är som i 304:s tabell: studenter 0,6, bybor och turister 1, gourmeter 1,8 och affärsfolk 1,4.
- Byn räknar våra turister i medelgruppen och gourmeterna och affärsfolket i de betalningsstarka (`village.ts`).

## 3. De två ryktena

- **Krogens rykte** (`state.reputation`) är som förut. Byn, stjärnan och ankomsterna läser det.
- **Ryktet per koncept** (`state.reputationByTier`):
  - varje svar flyttar ryktet i kvällens koncept med ORDER 303:s poäng;
  - ett fel räknas gånger förlåtelsen hos bordets gästtyp;
  - varje natt drar det mot krogens rykte med 0,1 av skillnaden.
- **I soigné** kommer de betalningsstarka fullt när soigné-ryktet är minst 0,4. Under det kommer de i proportion, och platsen går till studenter och bybor (`CONCEPT.highFullAt`). Enkel och bistro påverkas inte.

## 4. Leverantörerna och utrustningen

**Leverantörerna** (`GOODS_SUPPLIERS`) öppnas med en medalj och krediter, en gång. Varorna står sedan i morgonens inköp och betalas där. Grossisten är öppen från start.

| Leverantör | Öppnas med | Varor |
|---|---|---|
| Fiskaren vid sjön | Metodköket brons, 20 krediter | gös (förut grossistens fiskpaket), rökt röding |
| Vinhandlaren | Stensöta silver, 40 krediter | Chablis och Riesling på glas, Priorat på flaska (cigarrerna kommer med humidorn) |
| Ostaffinören | Kalastorget brons, 30 krediter | Brie de Meaux, Munster, Västerbottensost |
| Charkuteristen | Metodköket silver, 40 krediter | Jamón ibérico de bellota |

**Utrustningen** (`EQUIPMENT`, 304 §6: "Krediterna köper tillgången, och kassan köper saken") öppnas med en medalj och krediter och köps sedan för kassan. Den lyfter konceptet mot sin nivå.

| Utrustning | Medalj | Krediter | Kassan | Drar mot |
|---|---|---|---|---|
| Finare vinkyl | Stensöta brons | 20 | 15 000 kr | soigné |
| Flamberingsvagn | Metodköket silver | 40 | 12 000 kr | soigné |
| Ostvagn | Kalastorget silver | 30 | 9 000 kr | bistro |
| Avecvagn | Stensöta silver | 30 | 8 000 kr | bistro |
| Humidor | Stensöta guld | 60 | 14 000 kr | soigné |

- **Avecvagnen öppnar avec:** när raketen klaras stannar bordet för avec, 0,2 av notan (`EQUIPMENT.avecvagn.avecShare`, `goods.ts avecShareFor`).
- **Händelserna** som utrustningen öppnar (flambering, ostvagnen, cigarren) kommer med frågebanken i ORDER 306. Vagnarna står i rummet (ORDER 309).

## 5. Butikens flikar

`ui/host/ShopTabs.tsx`, i Designs form (D5 `shopTabs.ts`, LEVERANSNOT §8):
- **Flikraden:** Förmågor, Leverantörer, Utrustning.
- **Krogens klass** överst i tre steg, med raden "Det du tar in avgör klassen, gästerna och frågorna".
- **Stenarna** i lägena din, öppen, räcker inte och låst.
- **Kortet** visar:
  - vad saken tar in eller öppnar;
  - nya frågor om (med raden att frågorna kommer med frågebanken);
  - klassen den drar mot;
  - medaljen och krediterna;
  - priset.
- **Knappen:** "Öppna för n krediter", sedan "Köp för … kr" för utrustningen. När saken är din står "Levererar från morgon" eller "Står i rummet".
- **Avvikelse:** varorna och villkoren är besluten i 304 §9, inte prototypens exempel (Design har Barolo, Comté, siklöja, kräftor, saucisson och rillettes, och andra paviljonger).

## 6. Harness

Talen står i `frontend/reports/order307/efter/`:
- trappan, 20 säsonger;
- stjärnan, 40 säsonger;
- 303 B;
- `koncept-*.json`: den enkla och den soigné varukorgen, 20 säsonger, med 0,85 och 0,6 rätt per steg.

`reports/order307/forsta/` är den första körningen, med turister i bistro.

**Trappan med baspaketet (bistro)** blir densamma som i 303c:

| Spelaren | Stängda | Kassa |
|---|---|---|
| Mentorn | 0 av 20 | 89 443 kr |
| Den kloka | 0 av 20 | 90 106 kr |
| Den förnuftiga | 0 av 20 | 76 434 kr |
| Halva | 6 av 20 | −16 948 kr |
| Alltid fel | 20 av 20 | −38 157 kr |
| Den slarviga | 20 av 20 | −60 601 kr |

- **Stjärnan:** 0,85 → 92 %, 0,75 → 38 %, 0,6 → 0 %.
- **"Alltid fel"** blir aldrig 1:a efter vecka 1.

**Konceptet (304 §7):**

| Varukorg | Rätt per steg | Stängda | Kassa vid säsongens slut |
|---|---|---|---|
| Enkel (nivå 0,31) | 0,85 | 20 av 20 | −42 476 kr |
| Enkel | 0,6 | 20 av 20 | −39 391 kr |
| Soigné (nivå 1,48) | 0,85 | 4 av 20 | −6 958 kr |
| Soigné | 0,6 | 20 av 20 | −56 479 kr |

- **"Soigné med 0,6 går sämre än enkel med 0,6":** uppfyllt (−56 479 mot −39 391 kr).
- **"Soigné med 0,85 tjänar mest av alla spelartyper":** inte uppfyllt. Soigné med 0,85 går bättre än enkel men sämre än mentorns bistro, och stänger 4 av 20.
- **Enkel stänger alltid,** också med 0,85. Notan per gäst är låg, medan hyran och lönerna är desamma som för bistro.

## 7. Att besluta

1. **Enkel och soigné** behöver kalibreras mot 304 §7. Spakar:
   - konceptets pris (rätterna och dryckerna på menyn);
   - fasta kostnader per koncept (personalen, hyran);
   - gästernas betalningsvilja.
   - Förslag: lägre personalkostnad för enkel, och högre pris och betalningsvilja i soigné.
2. **Turisterna i bistro:** 304:s tabell har turister i bistro och soigné. Med turisternas betalningsvilja (1,1) i bistro slutade de bästa på 94 000–96 000 kr, över målet. Nu kommer turisterna bara till soigné (och enkel). Ska de också till bistro, med målet för de bästa höjt?
3. **Gösen** kommer nu från fiskaren (304 §6), så grossistens fiskpaket kräver fiskaren.
4. **Butikens förmåga "Vinkyl"** (Stensöta silver, i facket) och utrustningen "Finare vinkyl" finns båda. Ska förmågan bort?

## 8. Tester och bygge

- **Nytt test:** `sim/__tests__/order307Konceptet.test.ts`, med 8 tester:
  - konceptet ur varukorgen och utrustningen;
  - leverantörens grind i inköpen;
  - stenarnas lägen;
  - utrustningen i två steg och avec;
  - blandningen och konceptets rykte;
  - bokningens koncept;
  - förlåtelsen och natten.
- **Ändrade tester:**
  - `order273` (Västerbotten är ett egennamn);
  - `order278` (lammet i stället för gösen);
  - `order287a` (de betalningsstarka som gourmeter och affärsfolk).
- **Harnessen:** spelarna `enkel` och `soigne` i `order296Karnan.test.ts`, och kvällens koncept per morgon.
