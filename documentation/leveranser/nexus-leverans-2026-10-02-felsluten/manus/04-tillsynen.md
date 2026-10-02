# Manus 4 · Tillsynen (`event.inspection`)

**Raket:** Serveringsansvarig · ståbordet · ikon `badge-check`
**Kvällens resultat:** `evening.event.5` · **Morgonen efter:** brevet från kommunen, om det blev en påföljd

## Som i verkligheten

Tillsynen görs av kommunens tillståndsenhet, ofta tillsammans med polisen. Här kommer en **alkoholhandläggare från kommunen och en polis**, båda civilklädda, med var sin legitimation. De börjar med att iaktta, som vanliga gäster, och ger sig till känna efter en stund.

Påföljden bestäms inte på plats. Handläggaren skriver en rapport, och **kommunen beslutar efteråt**: ingen påföljd, **erinran**, **varning** eller **återkallat tillstånd** (vinbaren stänger). Det blir aldrig böter. I spelet visar kvällens resultat vad rapporten riskerar (`event.sanction.*`), och beslutet kommer i morgonens post (`morning.letter.*`).

När en brist leder till återkallelse i stället för varning, till exempel en andra varning, bestäms i `balance.ts`.

## Utlösare

Tillsyn från tillståndsenheten ikväll (när och hur ofta står i `balance.ts`). Tillsynen kan komma alla kvällar. Steg 3 väljs efter kvällens läge, i den här ordningen:

| Variant | Väljs när | Nyckel |
|---|---|---|
| A · den nekade gästen | en gäst har nekats i kväll (`refused`) | `event.inspection.refused.*` |
| B · ålderskontroll | unga gäster sitter i rummet | `event.inspection.age.*` |
| D · kravet på mat | köket har slut på mat i kväll (`kitchenOut`) | `event.inspection.food.*` |
| C · egenkontroll | annars | `event.inspection.selfcheck.*` |

## Deltagare

| Roll | Vem | Börjar |
|---|---|---|
| Handläggaren | kommunens alkoholhandläggare, civilklädd | utanför entrén |
| Polisen | civilklädd | ett steg bakom |
| Per | hovmästaren, kvällens anmälda serveringsansvarige | bakom pulten [6,1, −0,55] |
| Elin | sommelier, serverar vid barens östra kortände | [1,3, 0,74] |

## Plats

Barens östra kortände, `standBar3` och `standBar4` [2,85, 0,3] och [2,85, 0,9]. Därifrån ser man både de norra barstolarna och loungen. Per har tillståndet och egenkontrollen i en pärm i pulten.

## Tidslinje före frågan

| # | När | Vem | Klipp · tempo | Kamera |
|---|---|---|---|---|
| 1 | 0,0 s | Handläggaren, polisen | `guest.walk` · normalt, förbi pulten till barens östra kortände | Ingen rörelse ännu. |
| 2 | vid baren | båda | **ny** `guest.standBar` (armbågen på disken) | Glider in mot kortänden, 13 m, vriden 20° mot norr så att pulten syns i bildens högra kant. |
| 3 | samtidigt | Handläggaren | `guest.gesture` mot Elin, pratbubbla `say.order` | — |
| 4 | +2 s | Elin | `bar.pourWater`, `bar.setDown` | — |
| 5 | 6 s | båda | står kvar och tittar på rummet, rör inte glasen (`ctx.lookAt` vandrar) | Stannar. Spelaren ska hinna se att de iakttar. |
| 6 | 6 s | Per | `staff.walk` · normalt från pulten | — |
| 7 | när Per är framme | Handläggaren | **ny** `guest.showId`, pratbubbla `say.council` | — |
| 8 | +1,5 s | Polisen | `guest.showId`, pratbubbla `say.police`, bildtext `caption` | — |
| 9 | +1,2 s | — | — | **Kortet öppnas.** |

Uppbyggnaden tar 12–15 s. Det är längre än i de andra manusen, eftersom frågan bygger på att de har stått en stund och iakttagit.

## Det spelaren ser före frågan

Två gäster vid barens kortände beställer mineralvatten och blir stående utan att röra glasen. De tittar på rummet. När hovmästaren kommer fram visar de var sin legitimation.

## Steg 1 och 2

| Steg | Fråga | Rätt | Fel leder till |
|---|---|---|---|
| Episteme | `q1` Vem ska finnas på plats under hela serveringstiden? | `a1_3` Tillståndshavaren eller en anmäld serveringsansvarig | **Erinran.** Handläggaren kontrollerar listan: Per står där, men han visste inte vad som gäller. |
| Techne | `q2` Vad visar du dem? | `a2_4` Tillståndet, ansvarslistan och egenkontrollen | **Erinran.** Egenkontrollen visades inte. |

**Rätt, steg 1.** Per visar på sig själv (**ny** `host.introduce`). Pratbubbla `ok1`.
**Rätt, steg 2.** Per går till pulten, hämtar pärmen (**ny** `host.fetchFolder`) och lägger den öppen på disken (**ny** `staff.openFolder`). Handläggaren bläddrar. Pratbubbla `ok2`.

**Fel, steg 1.** *Kursen:* Per pekar på Mira, som har gått kursen. Handläggaren skakar på huvudet och skriver (`staff.write`). *Bartendern:* samma. *Krögaren:* Per säger att Ingrid inte är här. Handläggaren frågar vem som är ansvarig då. I alla tre visar Per till slut att han står på listan, men handläggaren skriver. Pratbubbla `fail`.
**Fel, steg 2.** Per lägger fram det han valde. Handläggaren frågar efter egenkontrollen och skriver. Per hämtar den. Pratbubbla `fail`.

## Steg 3 · Phronesis, fyra varianter

Kameran glider 2 s mot det handläggaren eller polisen tittar på och tillbaka till kortänden när svaret är valt.

**A · den nekade gästen.** Polisen nickar mot gästen från manus 3, som sitter på `bar3` med vattenglaset.

| Svar | Följd |
|---|---|
| `a3_4` Säger som det är: nekad `{time}`, och visar lappen | **Rätt.** Mira räcker Per blocket, Per visar det. `event.sanction.none`. |
| `a3_4_unnoted` Säger som det är: nekad, men tiden skrevs inte upp | **Rätt**, visas i stället för `a3_4` när `refusalNoted` saknas. Per öppnar blocket och sidan är tom. Pratbubbla `ok3_unnoted`. `event.sanction.remark`. Lärdomen visar `why3_unnoted` och pekar tillbaka på anteckningen i manus 3. |
| `a3_3` Hänvisar till Mira, som var den som nekade honom | Försvarbart (`near3_3`). Mira förklarar. `event.sanction.remark`. |
| `a3_1` Säger att han bara har druckit vatten i kväll | Polisen har sett honom vingla. **Varning.** |
| `a3_2` Ber vännerna ta med honom hem innan de frågar | Handläggaren ser det. **Erinran.** |

Om `overserved` är satt (han fick alkohol efter att han var märkbart påverkad) kommer **varningen från serveringen**, vilket svar spelaren än väljer. Det ärliga svaret är ändå rätt och visar `ok3_unnoted` eller `ok3`, men rapporten tar med serveringen.

**B · ålderskontroll.** Två unga gäster i lounge B beställer vin av Sara.

| Svar | Följd |
|---|---|
| `a3_2` Ber Sara be om legitimation innan hon häller | **Rätt.** Sara ber om legitimation (**ny** `staff.checkId`), gästerna visar. `event.sanction.none`. |
| `a3_3` Ber om legitimation av alla i loungen, äldre också | Försvarbart (`near3_3`). Lagligt, men de äldre gästerna ser misstrodda ut. `event.sanction.none`, sämre nöjdhet. |
| `a3_1` Frågar hur gamla de är och litar på svaret | **Varning** om en av dem är under 18 (sim-lagret bestämmer), annars `remark`. |
| `a3_4` Litar på Sara | samma som `a3_1`. |

**C · egenkontroll.** Handläggaren bläddrar i egenkontrollen och frågar hur personalen vet vad som står i den.

| Svar | Följd |
|---|---|
| `a3_4` Alla nya går igenom den, och vi ser över den ofta | **Rätt.** `event.sanction.none`. |
| `a3_2` Alla har gått kursen i ansvarsfull servering | Försvarbart (`near3_2`). `remark`. |
| `a3_1` Den ligger i pärmen vid kassan | **Erinran.** |
| `a3_3` Jag skrev den själv, så jag svarar för den | **Erinran.** Handläggaren frågar Mira, som inte vet. |

**D · kravet på mat.** Under uppbyggnaden säger kocken `food.say.out` genom luckan till Sara. Handläggaren hör det och vill beställa något att äta. Lagad mat ska gå att beställa under hela serveringstiden. Kvällen utlöses av sim-lagret när köket har slut på det som står på menyn.

| Svar | Följd |
|---|---|
| `a3_2` Ber kocken laga något enkelt av det som finns kvar | **Rätt.** Kocken lägger upp en enkel rätt (`cook.plate`, `cook.toPass`), Sara bär den till kortänden. `event.sanction.none`. |
| `a3_4` Är ärlig och pausar alkoholen tills det finns mat | Försvarbart (`near3_4`). Mira ställer undan flaskorna (`staff.decline` mot nästa beställning). `event.sanction.none`, men baren tappar intäkter resten av kvällen. |
| `a3_3` Bjuder på oliver och nötter från baren i stället | **Erinran.** Snacks är inte lagad mat. |
| `a3_1` Säger att köket stänger tidigare än baren i kväll | **Varning.** Serveringen har pågått utan mat, och det var avsiktligt. |

Allergener hör till livsmedelskontrollen och blir en egen händelse senare, där livsmedelsinspektören kommer på besök.

## Slutet

Efter steg 3 säger handläggaren `say.report`. Båda går mot dörren (`guest.walk`). **Kameran går tillbaka** när de har passerat pulten. Kvällens resultat visar `evening.event.5.line.clean`, `.unnoted` eller `.sanction`, och den värsta påföljden från någon av de tre stegen. Påföljder från flera steg läggs inte ihop. Den värsta gäller.

## Ritade felslut i steg 3, variant B och C (2026-10-02)

Steg 1 och 2 är desamma i alla varianter, och felsluten där (`wrong1`, `wrong2`) gäller även B och C. Nu är steg 3 ritat fel också i B (`wrongB3`) och C (`wrongC3`), som i A (`wrong3`). Steg 1 och 2 är rätt och spelas som i rätt variant fram till frågan i steg 3. Rapporten och påföljden står i tabellerna ovan.

### B · ålderskontroll, fel (`a3_1`, och `a3_4` som har samma följd)

| När | Vem | Klipp · tempo | Kamera |
|---|---|---|---|
| 42,2 s | Sara | `staff.listen` vid lounge B: frågar hur gamla de är | Kvar vid lounge B, 11 m. |
| 42,4 s | Gästen på `loungeB1` | `guest.gesture` mot Sara: svarar | — |
| 44,4 s | Sara | `staff.walk` till barens norra disk, tar flaskan (`wineBottle` på disken) | Glider ut något, 11 m. |
| 48,0 s | Sara | `staff.walk` tillbaka, `somm.pour` två gånger. Två vinglas på bordet | — |
| 49,6 s | — | — | Glider så att både lounge B och kortänden syns, 13 m. |
| 50,4 s | Handläggaren | `staff.write` | — |
| 50,6 s | Polisen | `staff.decline` mot Per | — |
| 55,0 s | Båda | `guest.walk` mot dörren | **Tillbaka till 24 m** när de har passerat pulten. |

Kontrollbilder: `tillsynen-10-11m-variant-b-sara-fragar`, `tillsynen-11-11m-variant-b-sara-haller-upp`, `tillsynen-12-13m-variant-b-handlaggaren-skriver`.

### C · egenkontroll, fel (`a3_3`)

`a3_1` (*den ligger i pärmen vid kassan*) har samma slut utan Miras del: handläggaren skriver direkt efter svaret.

| När | Vem | Klipp · tempo | Kamera |
|---|---|---|---|
| 42,0 s | Per | `host.introduce`: *jag skrev den själv* | Kvar vid kortänden, 12 m. |
| 45,0 s | Handläggaren | `staff.beckon` mot Mira | — |
| 46,8 s | Mira | `staff.walk` innanför disken till kortänden | Glider så att Mira syns, 12 m. |
| 49,2 s | Mira | `staff.decline`: vet inte vad som står i den | — |
| 51,6 s | Handläggaren | `staff.write` | — |
| 55,5 s | Båda | `guest.walk` mot dörren | **Tillbaka till 24 m** när de har passerat pulten. |

Kontrollbilder: `tillsynen-13-12m-variant-c-mira-vet-inte`, `tillsynen-14-12m-variant-c-handlaggaren-skriver`.

## Kameran

| Vart | Hur nära | Inglidning | Stannar | Tillbaka |
|---|---|---|---|---|
| barens östra kortände, 20° mot norr | 13 m | 1,2 s, när de ställer sig vid baren | på kortänden, 2 s mot det de tittar på i steg 3 | när de har passerat pulten på väg ut |

## Ny rekvisita och nya klipp

`councilId` och `policeId` (två olika legitimationer), `licenceFolder`. Klippen `guest.standBar`, `guest.showId`, `host.introduce`, `host.fetchFolder`, `staff.openFolder` och `staff.checkId`, plus `staff.write` och `bar.pourWater` från manus 3. Handläggaren och polisen blir gästtypen `civil` i leverans 4.
