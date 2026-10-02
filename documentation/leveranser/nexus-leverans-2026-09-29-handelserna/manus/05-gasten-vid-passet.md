# Manus 5 · Gästen vid passet (`event.kitchen`)

**Raket:** Kocken · passet · ikon `chef-hat`
**Kvällens resultat:** `evening.event.2` · **Lärdomen:** `lesson.rocket.2`

## Utlösare

En gäst som sitter ensam i lounge A har fått sina smårätter, och köket har full beläggning. Bokningen har flaggan *matskribent*, men det syns inte förrän i steg 3.

## Deltagare

| Roll | Vem | Börjar |
|---|---|---|
| Gästen | matskribenten | `loungeA1` [−2,6, 5,1] |
| Kocken | varm station | [−6,2, 3,9] |
| Sara | servitör | utanför passluckan [−4,1, 2,7] |
| Per | hovmästaren | där han är på golvet |
| Elin | sommelier | [1,3, 0,74] |

## Plats

Passluckan i kökets östra halvvägg (z 2,1–3,3) och köksdörren i den södra (x −5,5 till −4,7, z 1,6). Halvväggarna är 1,5 m. Kameran ser in över dem från 12 m.

## Tidslinje före frågan

| # | När | Vem | Klipp · tempo | Kamera |
|---|---|---|---|---|
| 1 | 0,0 s | Gästen | `guest.leaveLounge` · normalt, servetten på bordet | Glider in mot luckan (`passAnchor`), 12 m, vriden 25° mot väster så att kameran ser in över halvväggen. |
| 2 | +2,6 s | Gästen | `rocket.walkToKitchen` · normalt, snett mot luckan | Stannar. Gästen kommer in i bilden från höger. |
| 3 | samtidigt | Kocken | `cook.station` · stressat | — |
| 4 | vid luckan | Sara | `staff.dodge`, ett steg åt sidan | — |
| 5 | samtidigt | Gästen | **ny** `guest.peek` (lutar sig fram och tittar in genom luckan) | — |
| 6 | samtidigt | — | Pratbubbla `say.ask`, bildtext `caption` | — |
| 7 | samtidigt | Kocken | tittar upp från plattan (`ctx.lookAt`) | — |
| 8 | +1,0 s | — | — | **Kortet öppnas.** |

Uppbyggnaden tar 6–8 s.

## Det spelaren ser före frågan

En gäst reser sig mitt i rusningen och går rakt mot köket. Servitören kliver åt sidan. Vid luckan lutar gästen sig fram och tittar in, och kocken tittar upp från plattan.

## Raketen

| Steg | Fråga | Rätt |
|---|---|---|
| Episteme | `q1` Vad gäller när en gäst vill in i ett restaurangkök? | `a1_2` Skyddskläder, handtvätt och att någon följer med |
| Techne | `q2` Hur gör du det mitt i rusningen? | `a2_3` Ber henne vänta och visar från dörren, i förkläde |
| Phronesis | `q3` Hon skriver om mat i Grythyttebladet. | `a3_2` Erbjuder en rundtur efter servicen och en smakbit nu |

Försvarbara i steg 3: `a3_1` behandlar henne som alla andra (`near3_1`), `a3_4` en lugnare kväll (`near3_4`).

## Slutet vid rätt svar

- **Steg 1.** Kocken håller upp en hand och nickar (`staff.halt`, mjukt). Pratbubbla `ok1`.
- **Steg 2.** Kocken tar ett hopvikt förkläde från kroken (**ny** rekvisita `apron`), går till köksdörren och håller upp den (**ny** `staff.holdDoor`). Gästen går runt till dörren, knyter förklädet och tittar in (`guest.peek`, vänd mot köket). Pratbubbla `ok2`. **Kameran glider 1,5 m söderut** till köksdörren.
- **Steg 3.** Kocken lägger upp en liten tallrik (`cook.plate`, `cook.toPass`, `sidePlate`). Gästen går tillbaka till loungen och sätter sig (`guest.sitLounge`). Pratbubbla `ok3` från gästen. Sara bär tallriken dit (`waiter.carryPlate`, `waiter.serve`). **Kameran går tillbaka** när gästen sätter sig. Tallriken kommer fram efter återgången.

## Slutet vid fel svar

Per tar över i alla fel. Pratbubbla `fail`.

- **Steg 1.** Gästen går runt till köksdörren och in utan förkläde. Kocken går emot henne och följer ut henne (**ny** `staff.escort`).
- **Steg 2, *Sara visar runt*.** Sara lämnar luckan och går in med gästen. En tallrik blir stående på luckan (ångan slocknar). Per tar ut dem.
- **Steg 2, *tar in henne direkt*.** Gästen går in utan förkläde. Kocken måste kliva undan med en panna (`staff.dodge`). Per följer ut henne.
- **Steg 2, *köket tar inte emot*.** Gästen går tillbaka till loungen med sänkt huvud (`guest.walk` · lugnt).
- **Steg 3, *som alla andra*.** Gästen sätter sig och skriver i ett block (`staff.write`, som gäst). Det syns i tidningen (`paper.*`).
- **Steg 3, *Elin tar hand om henne*.** Elin kommer med ett glas och står kvar vid bordet. Gästen ser ut att tycka att det är för mycket. Det syns i tidningen.
- **Steg 3, *en lugnare kväll*.** Gästen nickar och betalar (`guest.pay`). Det syns i tidningen.

## Kameran

| Vart | Hur nära | Inglidning | Stannar | Tillbaka |
|---|---|---|---|---|
| `passAnchor` [−4,8, 2,7], 25° mot väster | 12 m | 1,2 s, när gästen reser sig | på luckan, sedan på köksdörren i steg 2 | när gästen sätter sig eller efter felslutet |

## Ny rekvisita och nya klipp

`apron` (hopvikt, greppet `book`). Klippen `guest.peek`, `staff.holdDoor`, och från de andra manusen `staff.halt`, `staff.escort` och `staff.write`.
