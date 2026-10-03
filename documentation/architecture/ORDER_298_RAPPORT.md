# ORDER 298 — Gästerna och kvällskassan (rapport)

**Vision Owners provspel:** kl. 19.37 stod statusen på *Rusning*, rummet var tomt och kvällskassan visade 0 kr, 32 minuter efter öppning. *Byn i kväll* visade Tannin som 1:a med stort försprång. Insatsen var 10 112 kr.

Gren `order-298` från `main` (`6117bbe`). Talen pekar på filer under `frontend/reports/order298/`.

**Loggningen:** `order298Kvallen.test.ts` loggar varje sällskap med klockslag (när det genereras, går in och sätts vid bord). Var femte spelminut loggar den också ankomsterna, kön, de som sitter, notorna, kvällskassan, mise en place och ryktet.
- Kvällen spelas som i provspelet: nytt spel, vinbaren vecka 1 och baspaketet på morgonen.
- `kvallen-fore.json` och `kvallen-efter.json` innehåller måndag och fredag, frö 1–3, med spelets rykte.
- `kvallen-sen-fore.json` och `kvallen-sen-efter.json` innehåller den sena kvällen: måndag, frö 10, ryktet 0,2.

## 1. Varför gästerna kom sent

### Sällskapen med klockslag

Alla sällskap är på en person den första timmen. Tiderna anges som genererat / gått in / vid bord.

| Kvällen | Sällskap | Vid bord | Första fem sällskapen | Källa |
|---|---|---|---|---|
| Måndag, frö 1, spelets rykte | 23 | 23 | 19.05/19.08/19.08, sedan 19.11, 19.14, 19.17, 19.20 | `kvallen-fore.json` |
| Fredag, frö 3, spelets rykte | 44 | 35 | samma som ovan | `kvallen-fore.json` |
| Måndag, frö 10, ryktet 0,2, **före** | 7 | 7 | 19.21/19.24/19.24, 20.23/20.26, 21.07/21.10, 21.26/21.29, 21.28/21.33 | `kvallen-sen-fore.json` |
| Måndag, frö 10, ryktet 0,2, **efter** | 7 | 7 | 19.05/19.08, 19.05/19.11, 21.07/21.10, 21.26/21.29, 21.28/21.33 | `kvallen-sen-efter.json` |

Dörrarna öppnar 19.05. Hovmästaren släpper in ett sällskap ungefär var tredje minut, så de som står vid dörren sätts 19.08, 19.11, 19.14 och så vidare.

### Mise en place och lagret

Inget av dem höll tillbaka gästerna.
- **Lagret:** baspaketet täcker 17 kuvert på måndagen och 34 på fredagen (`morning.covers`). Marknadens tak för kvällen är 13 respektive 36 gäster (`morning.marketCap`). På måndagen räcker lagret alltså till fler än marknaden skickar.
- **Mise en place:** vid öppning står beredskapen på is 0,81, servetter 0,65, bestick 0,65, stationer 0,81 och garnityr 0,81 (`minutes[].readiness`). Det finns ingen eftersläpning (`backlogMin` 0).

### Regeln som höll tillbaka gästerna

Det var ankomstregeln, inte lagret, mise en place eller kön.
- Gästerna kommer jämnt fördelade över kvällens öppna fönster: marknadens tak delat med de öppna minuterna, gånger attraktionen.
- Vid öppning står bara `waitingAtOpening` vid dörren, alltså 6 × ryktet × vädret (högst 6, `reducer.ts` `openService`).
- Med lågt rykte eller dåligt väder avrundas det till 0. Då står ingen vid dörren, och första gästen kommer först när flödet hunnit ge en.

På den sena kvällen (ryktet 0,2, attraktionen 0,481) kom första gästen 19.21 och satt 19.24, alltså 19 minuter efter öppning. Nästa kom 20.23. Det stämmer med provspelet: tomt 32 minuter efter öppning.

**Kön** höll inte tillbaka någon vid öppningen. Först på fredagen med frö 3, när rummet var fullt, fick 9 av 44 sällskap aldrig bord: de vände vid kön eller gick innan de fick plats.

### Varför kvällskassan stod på 0 kr

Gästen betalar när den går, efter 60–90 spelminuter vid bordet. Första betalningen kom 19.35–20.25 beroende på kväll (`minutes[].till`); på den sena kvällen 20.25 (285 kr). Kassan stod alltså på 0 kr den första timmen även när rummet var fullt. Det är inget fel i kassan, men stapeln ensam säger inte hur kvällen går. Därför finns prognosen (§3).

## 2. Rättelsen

### De bokade står vid dörren

Vid öppning står minst två sällskap vid dörren (`balance.ts` `OPENING.minPartiesAtDoor` = 2, avsnittet *Servicen*), med samma tak som förut. Det är de bokade till öppningen.

- På den sena kvällen sitter första sällskapet 19.08 och andra 19.11 (`kvallen-sen-efter.json`).
- Resten av kvällen är oförändrad. Med ryktet 0,2 kommer bara 7 sällskap hela kvällen, och nästa efter de två första kommer 21.07. **En kväll med lågt rykte är fortfarande tunn.** Rättelsen tar bort den tomma starten, inte den tunna kvällen. Om lågt rykte ska ge fler gäster än så är det ett beslut om balansen.
- Kvällarna med spelets rykte är oförändrade; `kvallen-fore.json` och `kvallen-efter.json` är identiska. Där stod redan fler än två vid dörren.

### Testet i simuleringen

`order298Gasterna.test.ts` *sitter vid ett bord senast 10 minuter efter öppning med normalt inköp, också med lågt rykte*:
- ryktet: spelets och 0,2;
- frö 1, 2, 3 och 10;
- måndag och fredag;
- baspaketet på morgonen.

Utan rättelsen (`minPartiesAtDoor` satt till 0) faller testet: första sällskapet sitter 19 minuter efter öppning, och 19 > 10.

## 3. Det som räknas syns

### Kvällens gäster är de som satt vid ett bord

Förut räknade ekonomin och byn ankomsterna (`arrivalsToday`). Där ingick de som vände vid en full kö och de som gick innan de fick bord. Fredagen med frö 3 räknade 44 sällskap, men bara 35 satt vid ett bord.

Nu:
- räknas en gäst när den sätts vid ett bord första gången i kväll (`service.ts` `setGuestSeated` → `day.seatedTonight`);
- använder kvällens rad i ekonomin den räkningen (`economy.ts` `recordEvening` `guests`);
- använder spelarens rad i byn samma räkning, både i kväll och i veckans lista (`villageLive.ts`).

Testet *kvällens gäster i ekonomin och byn är de som satt vid ett bord* jämför räkningen med de gäster som fått en plats.

### I rummet

Produktionsbygget (`check-efter.json`) läser simuleringens sittande (`simSeated`) och figurerna som sitter i rummet (`roomSeated`) i samma bildruta:

| Klockan | Simuleringen | Rummet |
|---|---|---|
| 19.20 | 4 | 2 |
| 19.40 | 6 | 6 |
| 20.20 | 11 | 10 |
| 21.40 | 16 | 15 |
| 22.50 | 3 | 3 |

Skillnaden är gången från kön till stolen: simuleringen sätter gästen, och figuren går dit. Ingen gäst räknas utan att figuren går till ett bord.

### Kvällskassan stiger löpande

Det gjorde den redan; den stiger när varje nota betalas. I produktionsbygget (`check-efter.json`): 231 kr 20.20, 1 073 kr 20.30, 2 000 kr 21.10, 4 021 kr 21.50 och 6 765 kr 22.50. Testet *kvällskassan stiger medan gästerna betalar, före stängningen* kräver fler än tre olika belopp innan kvällen stängs.

### Prognosen

Under stapeln står raden *I den här takten: X kr* (`TillBar.tsx`, `eveningEconomy.ts` `tillForecast`).
- **Uträkningen:** kvällskassan plus det som beställts men inte betalats av gästerna vid borden, delat med minuterna sedan öppning, gånger kvällens öppna minuter.
- Beställningarna räknas med eftersom notan betalas först när gästen går. Annars skulle prognosen visa nära 0 den första timmen.
- **När den visas:** först efter 30 minuters service (`OPENING.forecastAfterMinutes`). I produktionsbygget dök den upp 19.40, med 8 393 kr (`check-efter.json`). Den slutade på 7 734 kr 22.50, när kassan stod på 6 765 kr.

Test: *prognosen i kvällskassan visas först efter 30 minuters service*.

## 4. Byn i kväll

- **Vad placeringen mäter.** Under placeringen står *Placering efter kvällens gäster vid bord*. Spelarens gäster räknas mot byns krogar och vagnar.
- **Inte 1:a med 0 gäster.**
  - Förut var placeringen 1 + antalet rivaler med fler gäster, så alla med 0 gäster var 1:a.
  - Nu finns ingen placering utan gäster; bandet visar *Väntar på gäster*.
  - Vid lika antal står spelaren efter rivalen.
  - Test: *det går inte att vara 1:a med 0 gäster och 0 kr* (`villageLive.ts` `villageRank`).
- **Före öppning:** *I går: 2:a i byn* (gårdagens kväll i veckans lista), eller *Byn öppnar 19.05* om det inte finns någon gårdag. I produktionsbygget stod *Byn öppnar 19.05* fram till öppning (måndag i vecka 1), och sedan *1:a i byn* från 19.10, när första gästen satt (`check-efter.json` `bandState`, `bandGuests`).

## 5. Statusen

Förut följde *Rusning* bara klockan (`CLOCK.rushFromMinutes`), oavsett om någon var där. Nu bestäms statusen av rummet (`serviceClock.ts` `serviceLabel`):

| Statusen | När |
|---|---|
| *Väntar på gäster* | ingen sitter och ingen står i kön |
| *Rusning* | trycket (de som sitter plus kön, delat med platserna) är minst 0,8 (`OPENING.rushPressure`) |
| *Lugnt* | annars |

*Förberedelser*, *Sista beställning* och *Stängt* följer klockan som förut. I produktionsbygget (måndag) stod *Lugnt* nästan hela kvällen och *Rusning* 21.40, när 16 satt vid bord (`check-efter.json`). Test: *Rusning bara när rummet är fullt*.

## 6. Reglaget "Tannin"

Den gula pricken på en linje var vår lykta i Byn i kväll (ORDER 296, punkt 4).
- Den stod på en linje tillsammans med rivalernas lyktor och bar krogens namn (*Tannin*, spelarens namn på krogen).
- Pricken låg där gästerna delat med de flesta gästerna i byn placerade den.
- **Den styrde ingenting.** Den visade bara ställningen och gick inte att dra i.

Linjen med lyktorna är borttagen (`RivalBand.tsx`). Mätaren som ersätter den kommer i ORDER 299.

## 7. Tester och bygge

- **Nya tester:** `order298Gasterna.test.ts` (6 tester).
- **Loggningen:** `order298Kvallen.test.ts`, styrd av `KVALL_DAYS`.
- **Produktionskontrollen:** `scripts/order298-check.mjs`.
  - Den läser klockan, statusen, kassan, prognosen, bandet och rummet i en enda läsning per prov.
  - En första körning läste fälten ett i taget och fick därför *1:a i byn* vid 18.50: bandet lästes efter att dörrarna öppnat.
- Hela sviten och bygget är gröna.

## 8. Öppet

- **Den tunna kvällen med lågt rykte** (7 sällskap med ryktet 0,2) är ett beslut om balansen (§2).
- **ORDER 299:** mätaren i Byn i kväll.
