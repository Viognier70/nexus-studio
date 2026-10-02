# LEVERANSNOT: vardagens koreografi

**Datum** 2026-10-01
**Till** Claude Code, via dig
**Från** Claude Design
**Gäller** Beställningen efter provspelet, där rörelserna inte kändes autentiska och personalen stod still i början. Den här leveransen innehåller även det som Codes inventering visade saknas i vinbaren: en egen värd med plats vid entrén, köplatser och klippen för ritualerna. Leveransen ska in efter leverans 3.

Regeln: ingen figur går omkring utan anledning. Varje steg i manuset är en uppgift med ett mål i rummet, och varje kapitel har ett syfte (`evd.why.*`) som prototypen visar.

---

## 1. Innehåll

| Fil | Var | Vad |
|---|---|---|
| `wineBarRoom.ts` | ersätter leverans 3 | Köplatserna, platserna för mise en place, trottoaren, tavlan och vinkylen. Värdens plats (`host`) och värdpulten är oförändrade från leverans 3. |
| `tableware.ts` | ersätter leverans 3 | Fyra nya föremål: brödkorg, karaff för dekantering, fördrinksglas och back med flaskor. |
| `figureClips.ts` | ersätter leverans 3 | 21 nya klipp, se §4. `validateClips()` ger inga fel. |
| `vardagManus.js` | läses, monteras inte | De fem scenerna som tidslinjer för teatern, med syfte per kapitel. Mallar för sim-lagret, se §6. |
| `teaterScen.js` | ersätter leverans 3 | Kritstrecken på tavlan (`chalk`), fyra gästutseenden till och samma förstoring (1,5 ×) för de nya föremålen på borden. |
| `everydayStrings.ts` | slås in i `STRINGS` | 131 nycklar, `{ sv, en }`: klippen, föremålen, platserna, köns tre lägen och prototypens kapitel och syften. |
| `prototyp/Vardagens koreografi.html` | läses, monteras inte | De fem scenerna med spelets kamera (24 m) eller nära (11–13 m), SV/EN och båda skärmstorlekarna. Kapitlen visar vad som händer och varför. *Spela in WebM* finns kvar. three.js och Babel hämtas från nätet. |
| `bilder/1440x900/`, `bilder/1280x720/` | — | 26 kontrollbilder i varje storlek, utan text. Se §7. |

## 2. Värden

**Codes inventering:** sommeliern spelar värd i dag. **I leverans 3** finns redan Per som hovmästare med en egen station bakom värdpulten: `STAFF_STATIONS` `host` vid [6,1, −0,55], vänd mot dörren, och pulten `hostDesk` vid [6,6, −0,55]. Den här leveransen bygger vidare på det, och värden har nu egna klipp för hela välkomnandet:

- `host.checkBook`: läser bokningarna på pulten och tittar upp mot dörren en gång per varv. Det är vad värden gör mellan gästerna, i stället för att stå still.
- `host.greetDoor`: tar ett steg fram mot sällskapet, öppnar handen, bugar kort och visar in mot rummet.
- `host.takeMenus`: tar menyerna från pulten, en per gäst.
- `host.presentMenu`: räcker över menyn till den som sitter. Gästen tar den (`give` → `guest.readMenu`).
- Sedan finns sedan tidigare `host.point`, `staff.escort` (går före i gästernas takt) och `staff.holdDoor`.

Sommeliern (Elin) är fri för vinet. I scenerna serverar hon fördrinken och dekanterar.

## 3. Rummet: köplatser och mise en place

**Köplatserna** (`room.queueSpots`, typ `QueueSpot`). En plats rymmer ett sällskap, och medlemmarna står inom 0,6 m från punkten. `order` 1 är först i kön.

| Id | Sida | Läge | Vänd |
|---|---|---|---|
| `queueIn1` | innanför, på dörrmattan | [7,2, 0,3] | mot väster, in i rummet |
| `queueIn2` | innanför, vid hängaren | [7,3, 0,85] | mot väster |
| `queueOut1`–`queueOut5` | trottoaren längs fasaden, söderut | x 8,35–8,75, z 0,1 till −7,5, 1,9 m mellan platserna | mot dörren |

**Trottoaren** (`pavement`) går 3,4 m ut från östra fasaden och 3,2 m förbi husets sydöstra hörn, med en kantsten mot gatan. Utan den står kön i tomma luften.

**Platserna för mise en place** (`room.miseSpots`, typ `MiseSpot`): `board` framför tavlan [7,4, −1,75], `fridge` framför vinkylen [1,55, −0,72], `store` vid förrådets vinkyl [−6,25, −1,9], `polish` i södra stråket [−0,9, −0,74] och `setTables` norr om småborden [−2,1, −3,85].

**Nytt i rummet:**
- Tavlan på staffli söder om pulten, framsidan mot dörren. Kritstrecken växer medan Per skriver. Det är streck och inte text.
- Vinkylen står i södra stråkets östra ände, 1,45 m hög och med glasdörren mot väster. Först låg den under norra disken, men där skymde disken den som fyller den från spelets kamera.

## 4. Klippen, 21 nya

*Ritualerna som saknades:*
- **Välkomna i dörren:** `host.greetDoor`, `host.takeMenus`, `host.presentMenu`. Gästerna har `guest.hangCoat` och, när de går, `guest.takeCoat`.
- **Bröd och vatten:** `waiter.setBread` ställer korgen mitt på bordet med båda händerna. `waiter.pourWater` häller i två glas per gång, med vänster hand bakom ryggen.
- **Fördrinken:** `waiter.serveAperitif` tar ett glas från brickan och ställer det till höger om gästen, med brickan kvar i axelhöjd. Ett glas per klipp.
- **Duka upp ett bord:** `waiter.setTable` lägger ett kuvert, med gaffeln till vänster, kniven till höger och glaset snett ovanför. De tre `release`-händelserna är där föremålen ska visas.
- **Dekantera:** `somm.decant` håller flaskan högt och karaffen lågt och snett, med blicken på halsen. Klippet spelas lugnt.

*Mise en place:* `bar.polishGlass` (duken i kupan, glaset lyfts mot ljuset en gång per varv), `bar.stockFridge` (en flaska ur backen på golvet, upp på hyllan), `staff.carryCrate` (tyngden framför magen, korta steg) och `staff.writeBoard` (kritan i axelhöjd, ett halvt steg tillbaka för att se).

*Personalens små stunder:* `staff.chat` (pratar, lyssnar och nickar, skrattar till; blicken mot den andra), `staff.checkTable` (rättar ett glas, siktar längs bordet, nickar) och `staff.wipeTable`. Att torka disken är `bar.wipe` från leverans 2.

*Kön:* `guest.queueCalm` (händerna knäppta, pratar med sällskapet, en blick mot dörren ibland), `guest.queueImpatient` (armarna i kors och foten som slår, en blick på klockan, på tå för att se in) och `guest.queueLeaving` (klockan, en huvudskakning, vänder sig bort och kliver av). Lägena läses från 24 m på armarna och höjden, inte på ansiktet.

Bordet är lågt i loungen (0,45 m), så `serveAperitif`, `pourWater`, `checkTable` och `wipeTable` böjer knäna och lutar bålen långt fram.

## 5. Scenerna

| Scen | Längd | Det som händer, och varför |
|---|---|---|
| 1 · Mise en place | 44 s | Per skriver kvällens viner på tavlan, så att gästerna ser dem innan de sätter sig. Sara dukar småborden B och C, kuvert för kuvert, och kontrollerar dem. Elin bär en back från förrådet och fyller vinkylen, eftersom de vita behöver tid för att bli kalla. Mira putsar fyra glas och ställer dem på rad. Per går igenom bokningarna och öppnar dörren. |
| 2 · Värden i dörren | 58 s | Tre gäster kommer in. Per kliver fram och hälsar, två hänger av sig och sällskapet samlas. Per tar tre menyer och går före till lounge B i gästernas takt. Han räcker över menyerna en i taget när de sitter. Kocken ställer fram brödet och Sara bär ut det med vatten. Elin häller upp fördrinken och serverar den från brickan, ett glas i taget. |
| 3 · Sällskap som kommer och går | 50 s | En gäst kommer ensam, Per visar henne till baren och Mira kommer direkt. Tre reser sig i lounge A och går i den långsammastes takt till hängaren. Sara dukar av och torkar. Två väntar på mattan medan de tre tar sina rockar, och Per håller dörren. Därefter tar Per paret till lounge A. Samtidigt dekanterar Elin vinet vid lounge B. Fyra står vid ståbordet hela tiden. |
| 4 · Personalens små stunder | 38 s | Mira ställer ett glas på disken, och hon och Sara byter några ord över den innan Sara bär ut det. Mira torkar där glaset stod. Per kontrollerar ett dukat småbord, rättar och siktar. Elin fyller på vatten i lounge B innan någon ber om det. Kocken lägger upp och Sara bär ut. |
| 5 · Kön vid dörren | 48 s | Fullt hus. På mattan står två lugna, på trottoaren tre lugna, två otåliga och ett par längre bak. Per pratar först med dem på mattan och går sedan ut till de otåliga, som lugnar sig. Paret längst bak hinner han inte till. De ger upp och går. Ett par vid småbord B betalar och går. Sara gör bordet klart och ger Per ett tecken. Per tar paret från mattan till bordet, kön flyttar fram och de tre kliver in på mattan. |

Sällskapen går tillsammans: medlemmarna har egna vägar med samma sluttid, så att alla går i den långsammastes takt. De samlas vid dörren eller hängaren innan de går vidare.

## 6. Till sim-lagret

- Scenerna är **mallar**, precis som ritualerna i `serviceRituals.ts`. Sim-lagret väljer vad som händer, och presentationen tar klippen, vägarna och platserna härifrån.
- **Kön:** tålamodet (SVAR §48, gästernas tillstånd) väljer klippet: `queueCalm` över ett gränsvärde, `queueImpatient` under det och `queueLeaving` när gästen går. Gränserna hör hemma i `balance.ts`. När värden pratar med ett sällskap i kön byter det till `queueCalm` (scen 5).
- **När kön flyttar fram** går varje sällskap till platsen med `order − 1`. Dörrmattan (`queueIn1`, `queueIn2`) är de som värden redan har hälsat på.
- **Personalens små stunder** fyller luckorna i `serviceFlow`. När en roll inte har någon uppgift väljs en stund med syfte i den här ordningen: kontrollera ett dukat bord, torka disken eller bordet, fylla på vatten, putsa glas, och sist byta några ord vid en överlämning. `staff.idle` används bara när figuren väntar på något bestämt, till exempel tallriken vid passet.
- **Mise en place** spelas under spelminuterna före öppning, en uppgift per roll från `miseSpots`.

## 7. Kontrollbilder

Från spelets kamera (24 m) och nära (10–13 m), i 1440 × 900 och 1280 × 720 och utan text:

- `mise-1-24m-en-kvart-fore`, `-2-11m-per-skriver-pa-tavlan`, `-3-11m-sara-dukar`, `-4-11m-elin-fyller-kylen`, `-5-11m-per-oppnar-dorren`
- `varden-1-24m-sallskapet-kommer`, `-2-11m-per-valkomnar`, `-3-13m-per-visar-vagen`, `-4-11m-menyerna`, `-5-11m-brod-och-vatten`, `-6-11m-fordrinken`
- `sallskapen-1-24m-tre-gar-tva-vantar`, `-2-12m-tre-reser-sig`, `-3-11m-elin-dekanterar`, `-4-11m-rockarna-och-dorren`, `-5-11m-paret-far-lounge-a`
- `stunderna-1-24m-mitt-i-kvallen`, `-2-10m-mira-och-sara`, `-3-11m-per-kontrollerar-bordet`, `-4-12m-sara-bar-ut`
- `kon-1-24m-kon-vid-dorren`, `-2-12m-lugn-otalig-pa-vag`, `-3-12m-paret-ger-upp`, `-4-12m-per-gar-ut`, `-5-12m-kon-flyttar-fram`, `-6-12m-menyerna-vid-bordet`

## 8. Att se över

- **Gästerna har ingen rock.** `hangCoat` och `takeCoat` är rörelser utan föremål. Rocken som rekvisita får vänta (beslut 2026-10-01).
- **Brickan i loungen:** Elin ställer fördrinken över loungebordet från den södra sidan, eftersom gästerna sitter med ryggen mot väggen. På en restaurang med stolar serveras glaset från gästens högra sida.
- **Kön** är utdragen söderut efter granskningen: 1,9 m mellan sällskapen, och trottoaren fortsätter förbi husets hörn.
- Gästerna i bakgrunden sitter och gör samma sak hela scenen. I spelet styr sim-lagret dem.
