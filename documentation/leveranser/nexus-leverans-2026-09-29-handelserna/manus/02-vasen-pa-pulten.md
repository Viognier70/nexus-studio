# Manus 2 · Vasen på pulten (`event.vase`)

**Raket:** Servitören · entrén · ikon `accessibility`
**Kvällens resultat:** `evening.event.vase`

## Utlösare

Ett sällskap med en gäst i rullstol har bokat `twoC`, där en stol är borttagen. Vasen står på värdpultens hörn, och pulten står där gäster som ska till småborden svänger vänster från dörren. Händelsen kan bara hända så länge vasen står kvar. Rätt svar i steg 3 sätter flaggan `entranceCleared`: vasen flyttas för gott och pulten skjuts 0,5 m österut mot väggen.

**Felet ligger alltid hos krogen.** Ingen rad, inget klipp och inget svar låter gästen i rullstol vara den som gjorde fel.

## Deltagare

| Roll | Vem | Börjar |
|---|---|---|
| Gästen i rullstol | gäst | utanför entrén |
| Följeslagaren | gäst | bredvid, ett halvt steg bakom |
| Per | hovmästaren | bakom pulten [6,1, −0,55] |
| Sara | servitör | barens nordöstra hörn [2,6, 2,0], där hon hämtar vin |
| Gäster som ser | ståborden och `standBar1–4` | sina platser |

## Plats

Värdpulten (**ny**, `hostDesk`) vid [6,6, −0,55], söder om dörrmattan: en smal pult på en fot, 1,05 m hög, med vasen på det västra hörnet. Den som ska till småborden svänger vänster runt pulten. För en rullstol är svängen för snäv, och handen på drivringen tar i pultens hörn. Code bekräftar mot golvzonerna att svängen är trängre än rullstolens vändradie.

## Tidslinje före frågan

| # | När | Vem | Klipp · tempo | Kamera |
|---|---|---|---|---|
| 1 | 0,0 s | Gästen, följeslagaren | **ny** `guest.wheel` · lugnt och `guest.walk` · lugnt, in över dörrmattan | Glider in mot pulten, 11 m, vriden 25° mot söder så att dörren och pulten syns och rullstolen kommer mot kameran. |
| 2 | vid mattan | Per | **ny** `host.welcome`, sedan **ny** `host.point` mot småborden | Stannar. |
| 3 | samtidigt | — | Pratbubbla `say.welcome` | — |
| 4 | +2,0 s | Gästen | **ny** `guest.wheelTurn`, vänster runt pulten | — |
| 5 | vid pultens hörn | — | Handen tar i pulten, pulten gungar och vasen faller (**ny** `vase.fall`: vatten, skärvor, en fläck på golvet) | — |
| 6 | +0,3 s | Gästen | stannar, händerna från ringarna, **ny** `guest.startle` | — |
| 7 | samtidigt | Följeslagaren | **ny** `guest.comfort` (handen på axeln) | — |
| 8 | samtidigt | Gäster som ser | vänder huvudet mot entrén (`ctx.lookAt`) | — |
| 9 | +0,6 s | — | Pratbubbla `say.oops` från gästen, bildtext `caption` | **Kortet öppnas.** |

Uppbyggnaden tar 7–9 s.

## Det spelaren ser före frågan

En gäst i rullstol blir välkomnad vid dörren och svänger runt pulten. Handen tar i pultens hörn, vasen faller, och vatten och skärvor ligger framför hjulen. Följeslagaren lägger handen på gästens axel.

## Raketen

| Steg | Fråga | Rätt |
|---|---|---|
| Episteme | `q1` Vad är risken just nu? | `a1_3` Glassplitter och vatten där gäster går in |
| Techne | `q2` Hur tar du hand om det? | `a2_2` Frågar hur gästen mår, spärrar av, sopar och torkar |
| Phronesis | `q3` Gästen skäms och vill gå hem. | `a3_3` Säger att felet var vårt, flyttar vasen och visar vägen |

Försvarbara i steg 3: `a3_1` bjuder på kvällen (`near3_1`), `a3_4` bokar en annan kväll (`near3_4`). Fällan är `a3_2` *det kan hända vem som helst*: vänligt, men det lägger felet hos gästen.

## Slutet vid rätt svar

- **Steg 1.** Sara går lugnt fram och stannar en meter före skärvorna med handen ute (**ny** `staff.halt`). Pratbubbla `ok1`. Per ställer sig i dörren så att nästa sällskap väntar.
- **Steg 2.** Sara böjer sig ned vid gästen (**ny** `staff.kneelTalk`), pratbubbla `ok2`. Sedan sopar hon upp skärvorna (**ny** `staff.sweep`) och torkar (**ny** `staff.wipeFloor`). Vattnet försvinner sist.
- **Steg 3.** Per tar vasen från pulten och bär den till baren (`waiter.carryTray`, vasen i båda händerna). Sara skjuter pulten mot väggen (**ny** `staff.push`). Pratbubbla `ok3`. Per visar vägen (`host.point`), och gästen rullar till `twoC` (**ny** `guest.wheelToTable`). Följeslagaren sätter sig (`guest.sit`). **Kameran följer till tvärgången och går tillbaka** när gästen är vid bordet.

## Slutet vid fel svar

Per tar över i alla fel. Pratbubbla `fail`.

- **Steg 1.** En gäst från ståbordet går mot dörren, rakt över vattnet, och halkar till (**ny** `guest.slip`). Sara springer fram. Per och Sara städar som i steg 2.
- **Steg 2, *torkar först*.** Sara torkar och skjuter skärvorna framför trasan. En skärva hamnar under hjulet. Per sopar.
- **Steg 2, *för hand*.** Sara plockar en skärva, drar tillbaka handen och håller om den (`rocket.holdHand`). Per tar över med borste och skyffel.
- **Steg 2, *sopar direkt*.** Sara sopar runt gästen utan att säga något. Följeslagaren frågar själv om gästen är oskadd. Per böjer sig ned vid gästen.
- **Steg 3, *bjuder*.** Sällskapet stannar, men gästen sitter tyst vid bordet. Vasen står kvar på pulten.
- **Steg 3, *det kan hända vem som helst*.** Gästen nickar kort och rullar till bordet. Vasen står kvar.
- **Steg 3, *en annan kväll*.** Följeslagaren vänder rullstolen och de går ut (`guest.wheelTurn`, `guest.wheel`). Vasen står kvar.

## Kameran

| Vart | Hur nära | Inglidning | Stannar | Tillbaka |
|---|---|---|---|---|
| pulten [6,6, −0,55], 25° mot söder | 11 m | 1,2 s, när rullstolen kommer in | tills steg 3 är slut | när gästen är vid bordet eller sällskapet har gått |

## Ny rekvisita och nya klipp

`hostDesk` (värdpulten, med en station för Per), `wheelchair`, `vase` (vatten, skärvor, en fläck på golvet), `broom`, `dustpan`. Klippen `guest.wheel`, `guest.wheelTurn`, `guest.wheelToTable`, `guest.startle`, `guest.comfort`, `guest.slip`, `host.welcome`, `host.point`, `staff.halt`, `staff.kneelTalk`, `staff.sweep`, `staff.wipeFloor`, `staff.push` och `vase.fall`. Gästen i rullstol blir en egen figur i leverans 4. Här räcker riggen med höften på sitsen, som i `guest.seatedIdle`.
