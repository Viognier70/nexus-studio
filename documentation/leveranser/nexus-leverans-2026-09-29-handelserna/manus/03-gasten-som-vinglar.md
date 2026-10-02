# Manus 3 · Gästen som vinglar (`event.drunk`)

**Raket:** Bartendern · baren · ikon `wine-off`
**Kvällens resultat:** `evening.event.3` · **Lärdomen:** `lesson.rocket.4`

## Utlösare

Tre stamgäster sitter på de norra barstolarna. En av dem har passerat gränsen för märkbart påverkad (gränsen står i `balance.ts`). Han ska gå till sin rock vid klädhängaren. Samtidigt bär Sara en bricka med två glas från barens nordöstra hörn västerut i norra gången, till lounge A.

## Deltagare

| Roll | Vem | Börjar |
|---|---|---|
| Gästen | stamgäst | `bar3` [−0,9, 2,3] |
| Vännerna | två stamgäster | `bar2`, `bar4` |
| Mira | bartender | norra stråket, mitt emot `bar3` [−0,9, 0,74] |
| Sara | servitör | [2,6, 2,0], med bricka |
| Gäster som ser | lounge A och `bar1` | sina platser |

## Tidslinje före frågan

| # | När | Vem | Klipp · tempo | Kamera |
|---|---|---|---|---|
| 1 | 0,0 s | Sara | `waiter.carryTray` · normalt, västerut i norra gången | Glider in mot `bar3`, 12 m, vriden 30° mot norr så att kameran ser över loungen in mot disken och Mira syns bakom den. |
| 2 | +1,5 s | Gästen | `guest.leaveStool` · lugnt, men steget bakåt blir ett för långt, ut i gången | Stannar. |
| 3 | samtidigt | — | Pratbubbla `say.going` | — |
| 4 | +0,4 s | Gästen, Sara | Krock bakom `bar3`. Gästen **ny** `guest.balance` (tar tag i stolsryggen), Sara **ny** `waiter.trayWobble` (glasen står kvar) | — |
| 5 | +0,2 s | — | Pratbubblor `say.sorry` (gästen) och `say.whoops` (Sara), bildtext `caption` | — |
| 6 | samtidigt | Mira | slutar torka (`bar.wipe`), blicken mot gästen | — |
| 7 | +1,0 s | Gästen | **ny** `guest.stagger`, två svajande steg på stället | — |
| 8 | +1,0 s | — | — | **Kortet öppnas.** |

Uppbyggnaden tar 5–6 s.

## Det spelaren ser före frågan

En gäst glider ned från barstolen, tar ett steg för långt bakåt och går rakt in i Saras bricka. Glasen står kvar. Han håller sig i stolen och svajar, och bartendern ser det över disken.

## Raketen

| Steg | Fråga | Rätt |
|---|---|---|
| Episteme | `q1` Vad säger alkohollagen om en gäst som är märkbart påverkad? | `a1_4` Han får inte serveras mer alkohol |
| Techne | `q2` Hur säger Mira det till honom? | `a2_2` Lugnt och lågt, och bjuder på vatten och mat |
| Phronesis | `q3` Vännerna vill beställa åt honom. | `a3_2` Säger nej, skriver upp tiden och erbjuder en taxi |

Försvarbara i steg 3: `a3_1` serverar vännerna men ber dem inte ge honom (`near3_1`), `a3_3` ber hela sällskapet gå (`near3_3`).

## Slutet vid rätt svar

- **Steg 1.** Mira lutar sig fram över disken (**ny** `bar.leanIn`). Sara går vidare med brickan. Pratbubbla `ok1`.
- **Steg 2.** Gästen sätter sig på `bar3` igen (`guest.sitStool`). Mira häller vatten (**ny** `bar.pourWater`) och ställer fram en skål med smårätter från luckan (`bar.setDown`). Vännerna pratar vidare med varandra. Pratbubbla `ok2`.
- **Steg 3.** Vännen på `bar4` vinkar (`guest.waveStaff`). Mira skakar på huvudet (**ny** `staff.decline`) och skriver på blocket vid kassan (**ny** `staff.write`, `pad`). Pratbubbla `ok3`. **Kameran går tillbaka.** Flaggan `refusalNoted` sparar `{time}` till tillsynen.

## Slutet vid fel svar

Per kommer från pulten och tar över i alla fel. Pratbubbla `fail`.

- **Steg 1, *om han äter* eller *öl*.** Mira häller upp (`bar.pour`), och gästen dricker. Flaggan `overserved` sätts. Per ställer glaset åt sidan.
- **Steg 1, *lämna lokalen*.** Mira pekar mot dörren. Gästen slår ut med armarna (`guest.gesture` · stressat), och vännerna vänder sig om. Per lugnar.
- **Steg 2, *så att vännerna hör*.** Vännerna skrattar och klappar honom på ryggen. Han skäms och blir högljudd (`guest.gesture` · stressat).
- **Steg 2, *baren stänger*.** Gästen pekar på de andra som dricker. Per kommer fram.
- **Steg 2, *lättöl utan att säga något*.** Mira häller upp, gästen beställer vin igen efter en stund. Per förklarar.
- **Steg 3, *serverar vännerna*.** Vännen skjuter sitt glas till honom. `overserved` sätts. Ingen tid skrivs upp.
- **Steg 3, *hela sällskapet går*.** Vännerna reser sig sura och går mot klädhängaren. Ingen tid skrivs upp.
- **Steg 3, *låter dem beställa*.** Glaset går vidare till gästen. `overserved` sätts. Ingen tid skrivs upp.

Nekades han i steg 1 eller 2 men ingen tid skrevs upp, sätts `refused` utan `refusalNoted`. Det avgör tillsynens variant A.

## Kameran

| Vart | Hur nära | Inglidning | Stannar | Tillbaka |
|---|---|---|---|---|
| `bar3`, 30° mot norr | 12 m | 1,2 s, när Sara börjar gå | tills steg 3 är slut | efter anteckningen eller efter felslutet |

## Ny rekvisita och nya klipp

Ingen ny rekvisita. Klippen `guest.stagger`, `guest.balance`, `waiter.trayWobble`, `bar.leanIn`, `bar.pourWater`, `staff.decline` och `staff.write`. `waiter.takeOrder` har redan blocket och kan vara grunden för `staff.write`.
