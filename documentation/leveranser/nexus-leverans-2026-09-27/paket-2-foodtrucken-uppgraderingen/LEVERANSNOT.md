# Leveransnot — Nexus v1, paket 2

**Projekt** nexus-studio · strategiska spåret
**Underlag** DESIGN_SPEC_NEXUS_V1 §2.2, §4.4, §5 (uppgradering)
**Lyder under** SD-004, SVAR_TILL_DESIGN (2026-08-30)

Två delar: food trucken och uppgraderingsskärmen.


## Rättelse 2026-09-26 — kvällen och uppgraderingens riktning

Den här noten gäller före allt nedan där de säger emot varandra.

**Servicen är 18–23.** Lunchtopparna är borta. `SITES` har kvällskurvor: torget efter jobbet och sedan avtagande, Måltidens hus med en rusning vid sex efter kvällens pass, och sjön med en topp vid åtta. Modellkurvan i antal i kön, vid sol:

| | 18.00 | 18.30 | 19.00 | 20.00 | 21.00 | 22.30 |
| --- | --- | --- | --- | --- | --- | --- |
| Torget | 8 | 7 | 6 | 4 | 3 | 1 |
| Måltidens hus | 8 | 7 | 5 | 1 | 0 | 0 |
| Sjön | 4 | 5 | 6 | 8 | 7 | 2 |

Bilderna 01–10 är tagna om vid kvällstider, och filnamnen säger klockslaget (`foodtruck-01-torget-sol-1830.png` och så vidare).

**Uppgraderingen går åt andra hållet.** Food trucken ligger under Vinbaren. U1–U4 är omgjorda:
- **U1:** bankmötet vid veckoavräkningen, där brons i tre varav Stensöta räcker.
- **U2:** det som följer med och det som ändras. Personalen är ett val, ryktet börjar om till hälften, banken vill se en fjärdedel av en veckas golv som insats och vagnen lämnas tillbaka.
- **U3:** food truckens morgon.
- **U4:** "Vinbaren är din."

Bankmötet finns vid varje uppgradering (U1, B1) och första dagen (B0a, B0b i paket 1). Avsnitt 2 nedan beskriver den gamla riktningen och gäller inte längre.
---

## 1. Food trucken — `truckPitch.ts`

**Var den hör hemma:** bredvid `foodTruckRoom.ts` i
`frontend/src/strategic/scene/`. Vagnen är samma fordon som förut, med
samma tre varianter, mått och serveringsgeometri. Specen lägger till det
som finns runt vagnen, och det hör inte till fordonet: fordonet kör vidare
men platsen ligger kvar (ORDER — food trucken §5).

### Montering

```ts
const truck = createFoodTruckRoom({ variant, queueLength: 8 });
scene.add(truck.group, truck.pitch);
const pitch = createTruckPitch(truck, 'torget', { weather: 'sol' });
scene.add(pitch.group);                       // där truck.pitch ligger
setWeather(pitch, truck, 'regn');             // när vädret byts
updateTruckCutaway(pitch, truck, camera);     // när kameran vridits
updateTruckPitch(pitch, truck, t, gust);      // varje bildruta, allokerar inget
```

Vimpeln och takets list monteras på `truck.group`, så de åker med vagnen.
Allt annat ligger på platsens grupp.

### Tre platser, tre sorters dag

| Plats | Karaktär | Möbler | Mark (L torr · våt) |
| --- | --- | --- | --- |
| Torget | Folk hela dagen, flest vid lunch och efter jobbet | 2 ståbord, 1 bänk | gatsten 0,303 · 0,218 |
| Vid Måltidens hus | En kort, hård lunch, sedan tomt | 3 ståbord | grus 0,359 · 0,256 |
| Vid sjön | Sommarkväll när det är fint, ingen alls i regn | 2 bänkar mot vattnet | gräs 0,338 · 0,244 |

Samma vagn blir alltså tre verksamheter. Läget i byn deklareras i
`content/grythyttan.ts` bredvid `TorgetPlaza` (SVAR §2). `SITES` innehåller
utformningen, inte koordinaterna. Planritningarna finns i `bilder/foodtruck-plan-*.png`.

All mark, våt eller torr, och pölarna (L 0,223) ligger i figurernas
fönster L 0,188–0,432 (`allowedGroundWindow()`). Vätan sänker ljusheten
inom bandet men aldrig under det. `checkSiteGrounds()` är provet.

### Vädret syns på marken och på folket, inte i luften

Från 23 meter är regnstrimmor och löv brus. Det kameran läser är:

| | Mark och vagn | Folket |
| --- | --- | --- |
| **Sol** | markisen helt ute, vimpeln hänger | lång kö, borden och bänken fulla, solhattar, glass |
| **Regn** | marken en ton mörkare, pölar | kort kö under **paraplyer**, ingen vid borden, huvor på resten |
| **Blåst** | markisen 55 % utfälld och fladdrande, vimpeln rakt ut, löv | hela kön lutar åt samma håll |

Paraplyet är det starkaste vädertecken som finns uppifrån. **Duken har
gästens egen plaggfärg:** den täcker kalotten, men uppifrån ersätts hjässan
av en större skiva i samma färg. Identiteten flyttar upp och försvinner
inte. Kontrasten mot marken är plaggfärgens och är redan prövad. Se
`FLAGS.umbrella` om `checkCrownCoverage()`.

**Parasollen valdes bort.** Den var första idén för solen, men den skymmer
just dem som äter under den, och det är det fel specen §1 förbjuder.

### Kön växer och krymper

- `presentationQueueLength(site, hour, weather)` är köns längd, 0–8, ur
  en kurva per plats gånger vädret (sol 1,0, blåst 0,55, regn 0,45, och
  sjön faller till en fjärdedel av det i regn). **Det är en modellkurva.**
  Spelet ska ta längden ur efterfrågan. Se FRAGOR §29.
- `queueStep(t, interval)` stegar kön. Varje betjäning tar alla ett steg
  fram samtidigt, 0,9 s. Anroparen lägger `(1 − step) · 0,75` bakåt på varje
  plats och driver `poseQueueStep` med samma `step`.
- Längden ändras i svansen: en ny gäst ansluter bakifrån, och den som ger
  upp går från svansen. Den främste lämnar aldrig kön utan att bli
  betjänad, för det vore att straffa den som väntat längst.

Modellkurvan i antal i kön, vid sol:

| | 08.00 | 11.30 | 12.00 | 15.00 | 18.00 | 21.00 |
| --- | --- | --- | --- | --- | --- | --- |
| Torget | 1 | 6 | 8 | 2 | 6 | 2 |
| Måltidens hus | 0 | 8 | 8 | 1 | 0 | 0 |
| Sjön | 0 | 1 | 2 | 3 | 8 | 5 |

I regn: torget 3 vid lunch och 3 vid sex, Måltidens hus 4, sjön högst 1.

### Specens kontroll, som kod — och vad den hittade

`checkPitchView(pitch, truck, camera)` raycastar till kalotthöjd på varje
köplats, hämtplatsen, varje ätplats och besättningen, med grannarna med.
Provet körs från åtta vinklar på PLAYER_CAMERA:s lutning och avstånd, för
tre platser och tre vagnar.

Vid första körningen fanns två fel, båda leveransens:

1. **Taket skymde köket helt.** Strålen mot besättningens huvud passerar
   serveringsväggen på 2,8 m, alltså över luckans överkant på 2,15 m.
   Uppmätt med taket på: **0 av 16** för alla tre vagnarna.
   `setTruckCutaway()` döljer takskivan, kupolen och luckans överstycke och
   lägger en list i livery runt takkanten. Liveryn finns kvar som ram
   uppifrån, och köket syns innanför. Skyltlådan på boxvagnen står kvar,
   eftersom den är variantens kännetecken och står över baksidan.
2. **Markisen skymde kön bakifrån.** Uppmätt med solid markis syntes 66 /
   54 / 58 av 72 köplatser och hämtplatser (klassikern / boxvagnen / hytt
   och box). `updateTruckCutaway()` skjuter två strålar, mot hämtplatsen
   och köns första plats. Träffar någon av dem markisen blir den ett spöke
   med 30 % opacitet. Formen finns kvar, och kön syns igenom. Det sker i
   4 av 8 vinklar. En första regel på kamerans sida missade vyn längs kön
   bakifrån, därför strålarna.

Efter rättningen är det samma resultat för alla tre vagnar på alla tre
platser: **kön 64 av 64, hämtplatsen 8 av 8, ätplatserna alla, besättningen
16 av 16, skymt av: inget.**

Bild 10 (`foodtruck-10-torget-tak-pa-felet.png`) visar felet, och bild 08
visar vyn bakifrån efter rättningen.

### Besättningen

Specen: en till två personer, en grill och en arbetsbänk. Planchan under
kåpan i `foodTruckRoom.ts` är grillen, och prepbänken är arbetsbänken.
`poseGrill` vänder med spaden, och `poseHatchServe` lutar sig ut över
hyllan. Stressen följer kön. Med en person står hon vid grillen och går till
luckan vid varje betjäning. Hur många som arbetar avgör sim-lagret.

### Nya rörelser i `figureActs.ts`

| Funktion | Läses som |
| --- | --- |
| `poseQueueWait` | Händerna i fickorna, blicken upp mot tavlan och ned |
| `poseQueueStep` | Hela raden flyttar ett steg samtidigt |
| `poseEatStanding` | Lutad över ståbordet, handen till munnen |
| `poseEatBench` | Kartongen i knät |
| `withUmbrella` | Paraplyarmen, läggs på vilken stående pose som helst |
| `poseHunchRain` | Axlarna upp, huvudet ned, för den utan paraply |
| `poseWindBrace` | Lutar, håller kragen. Hela raden lutar åt samma håll |
| `poseHatchServe` | Lutar sig ut över hyllan (lugn / stressad) |
| `poseGrill` | Vänder med spaden (lugn / stressad) |

Kön står i gångriktningen mot luckan med huvudet vänt mot vagnen. Den
ställer sig inte med ansiktet mot plåten.

### Flaggor

`truckPitch.FLAGS` har sju poster. **`weatherState` är blockerande** för att
vädret ska synas (FRAGOR §28). `standing` gäller fortfarande enligt SVAR
§5: vagnen monteras utan gäster tills beställning och hämtning finns.

---

## 2. Uppgraderingsskärmen — `skarmar/U1 … U4`

| Bild | Läge | Mått |
| --- | --- | --- |
| U1 | Veckoavräkningen: veckan i en mening, bankens erbjudande och en låst klass | Två klasskort à 5 kol., 520 px. Låst 45 %. "Stanna i Vinbaren" alltid synligt |
| U2 | Vad följer med, vad ändras | Två kolumner à 6, rad 104 px, ikon 34 |
| U3 | Första platsen, och sedan varje morgon | Tre kort à 4 kol., bild från spelarens kamera 300 px, vädret som mening överst |
| U4 | Bytet, ögonblicket | Bild i helbild, bläckfält 8 kol., rubrik 120 px, tidslinje under |

Samma system som skärmarna för en vecka (bild 00 i paket 1).

**Två beslut:**

- **Det som lämnas kvar sägs rakt ut.** U2 har fyra rader om vad som följer
  med och fyra om vad som ändras. Den sista är "Vinväggen stannar i
  Vinbaren": platina i Stensöta ger dig kunskapen, men väggen får du inte
  med dig. Ett byte som bara räknar upp vinster känns som en fälla när
  spelaren väl märker vad som saknas.
- **Bytet får inget rött fält.** Rött fält är medaljens ögonblick (MD2).
  Bytet är ett beslut spelaren tagit och inte något hen vunnit, så det står
  i bläck. Tidslinjen: fältet skjuts upp på 0,35 s, bilden klipps till
  vagnen på torget, rubriken skrivs ut och hålls vid 1,10 s. Luckan i
  bilden fälls upp på 0,8 s som vagnens första rörelse.

**Byte, inte tillägg.** Specens "vad som följer med" läser vi som ett byte.
B1 i paket 1 sa "Vinbaren behålls". Den meningen är struken och B1 följer
med som reviderad. Se FRAGOR §27.

Namn, repliker och vad som följer med är våra platshållare (FRAGOR §26).
