# Tolv gästarketyper — utkast för granskning

**Status** utkast · rättas av Vision Owner innan implementation
**För** food truckens skepnad, senare restaurangen och Värdshuset
**Bygger på** `staff-guest-reel-extended` (två varianter: Cap, Bun)

---

## Vad en arketyp är

Fem egenskaper som tillsammans ger en silhuett man känner igen på håll:
**kroppsbyggnad**, **huvudbonad eller frisyr**, **hudton**, **prop**, och en
**hållning** som färgar hur mönstren 13, 14 och 20 spelas.

Silhuettprovet i `Yrkesroller` §01 mätte att huvudbonaden bär halva
igenkänningen och propen resten. Färg räknas inte på håll. Arketyperna nedan är
byggda mot det.

**Hudton anges som variabel, inte som fast värde.** Sex toner ur prototypen
fördelas över arketyperna utan att kopplas till roll eller status.

---

## De tolv

### 1. Barnet
Kort, smal. Rufsigt hår, ingen huvudbonad. Prop: glass eller pappmugg som hålls
med två händer. Hållning: rör sig ojämnt, stannar och startar, står inte still i
kön. Bob-amplitud ×1,4.

### 2. Tonåringen
Lång, mycket smal. Luvtröja med huvan uppe. Prop: telefon i handen, blicken ned.
Hållning: lutar 2° bakåt även i vila. Rör sig inte förrän kön rör sig.

### 3. Affärsgästen
Medellång, upprätt. Kortklippt, ingen huvudbonad. Prop: portfölj eller
axelväska. Hållning: rakast av alla, lutning 0°. Kollar tiden — mikro-nick nedåt
var åttonde sekund.

### 4. Efter skiftet
Medellång, tung. Arbetsjacka, keps. Prop: ingen — händerna i fickorna.
Hållning: lutning 4° framåt, låg bob. Trött men inte otålig; tempo 0,85×.

### 5. Turisten
Medellång. Solhatt eller mössa beroende på väder. Prop: kamera eller karta.
Hållning: tittar sig omkring — mikro-yaw ±12° @ 0,4 Hz, störst av alla.
Stannar oftare på väg fram.

### 6. Stamgästen
Medellång, satt. Ingen huvudbonad, grått hår. Prop: ingen.
Hållning: står stilla, minst bob av alla. Nickar mot luckan vid ankomst —
den enda arketyp som hälsar.

### 7. Kritikern
Lång, smal. Glasögon, ingen huvudbonad. Prop: liten anteckningsbok.
Hållning: lutning 3° bakåt, huvudet något högt. Rör sig långsamt och stannar
längre än nödvändigt framför luckan.

### 8. Rullstolsgästen
Sittande höjd genomgående. Prop: rullstolen är arketypen.
Hållning: ingen gångcykel — glidande förflyttning i 0,9 m/s, ingen bob.
**Ska aldrig placeras så att kön gör den svår att nå.** Det är en
tillgänglighetsfråga i spelvärlden, inte bara i gränssnittet.

### 9. Paret
Två figurer som rör sig som en enhet, alltid intill varandra i kön.
Prop: ingen. Hållning: vänder sig mot varandra med jämna mellanrum — mikro-yaw
som är motriktad mellan de två. Tar en köplats, inte två.

### 10. Hundägaren
Medellång. Mössa. Prop: koppel som går ned utanför bild.
Hållning: dras framåt ryckvis — små positionsavvikelser i kön som ingen annan
har. Står aldrig helt still.

### 11. Nattarbetaren
Lång, smal. Huva eller mössa, hög krage. Prop: termos eller mugg.
Hållning: lutning 5° framåt, händer nära kroppen. Störst bob-amplitud i gång
men lägst i vila — rör sig snabbt, står stilla.

### 12. Festsällskapet
Tre figurer med samma prop-familj men olika kroppsbyggnad. Högljudda i
hållningen: störst mikro-yaw i vila, oregelbunden bob, står inte i linje.
Tar tre köplatser men rör sig som en klump.

---

## Fördelning och sannolikhet

Arketyp väljs deterministiskt ur gäst-id, som `patternTransform` redan gör med
fasfröet. Fördelningen bör vikta mot tid på dygnet:

| Tid | Vanligare |
| --- | --- |
| Lunch | affärsgästen, efter skiftet, turisten |
| Eftermiddag | barnet, hundägaren, paret |
| Kväll | festsällskapet, nattarbetaren, tonåringen |

Stamgästen och kritikern är sällsynta i alla lägen — de ska betyda något när de
dyker upp.

---

## Att avgöra

**Antalet.** Tolv är prototypens siffra. Sex eller åtta räcker sannolikt för att
en kö ska kännas olikformig, och färre arketyper görs bättre. Det bör mätas i
bild innan alla tolv byggs.

**Paret och festsällskapet är inte enskilda gäster.** De tar flera köplatser och
rör sig som grupp. Det kräver att kön kan hålla grupper, vilket den inte gör i
dag. Antingen förenklas de till enskilda, eller så byggs gruppstöd — det senare
är en egen order.

**Rullstolsgästen ställer ett verkligt krav.** Att kön alltid ska vara
framkomlig är inte kosmetik. Om det inte kan garanteras i food truckens
kögeometri bör arketypen vänta tills det kan.

**Hudton och kroppsbyggnad ska inte korrelera med arketyp.** Affärsgästen är
inte en hudton; nattarbetaren är inte en kroppsbyggnad. Fördela oberoende, annars
byggs en typologi ingen bad om.
