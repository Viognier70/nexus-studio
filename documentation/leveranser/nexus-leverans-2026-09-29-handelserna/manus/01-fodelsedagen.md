# Manus 1 · Födelsedagen (`event.bday`)

**Raket:** Hovmästaren · lounge A · ikon `cake`
**Kvällens resultat:** `evening.event.4` · **Lärdomen:** `lesson.rocket.3` och Techne-lärdomen från leverans 1 (texten ersatt, se leveransnoten §5)

## Utlösare

Ett sällskap på tre i lounge A har bokat med flaggan *födelsedag*, och smårätterna är avdukade. I lounge B sitter två gäster i ett affärsmöte.

## Deltagare

| Roll | Vem | Börjar |
|---|---|---|
| Värden | gäst | `loungeA1` [−2,6, 5,1] |
| Karin | gäst som fyller år | `loungeA2` [−1,8, 5,1] |
| Vännen | gäst | `loungeA3` [−1,0, 5,1] |
| Per | hovmästaren | där han är på golvet |
| Sara | servitör | utanför passluckan [−4,1, 2,7] |
| Kocken | varm station och kallskänk | [−6,2, 3,9] |
| Grannarna | två gäster i affärsmöte | `loungeB1`, `loungeB2` |
| Gäster på norra barstolarna | 2–4 gäster | `bar1`–`bar4`, med ryggen mot norra gången |

## Tidslinje före frågan

| # | När | Vem | Klipp · tempo | Kamera |
|---|---|---|---|---|
| 1 | 0,0 s | Värden | `guest.waveStaff` · lugnt | Glider in mot lounge A:s bord [−1,8, 4,15], 12 m, vriden 15° mot väster så att passluckan syns i bildens vänstra kant. |
| 2 | 0,4 s | Per | `staff.walk` · normalt, till `loungeA1.approach` | Stannar. |
| 3 | när Per är framme | Värden | **ny** `guest.whisper` (lutar sig fram från dynan) | — |
| 4 | samtidigt | Per | **ny** `staff.listen` (böjer sig ned, nickar) | — |
| 5 | samtidigt | Karin | `guest.gesture` mot vännen, ser inget | — |
| 6 | +1,0 s | — | Pratbubbla `say.whisper`, bildtext `caption` | **Kortet öppnas.** |

Uppbyggnaden tar 6–12 s, beroende på var Per står.

## Det spelaren ser före frågan

Ett sällskap i loungen. Värden lutar sig fram och viskar till hovmästaren medan de andra två pratar vidare.

## Raketen

| Steg | Fråga | Rätt |
|---|---|---|
| Episteme | `q1` Vad behöver köket veta först? | `a1_3` Antal, allergier och när den ska ut |
| Techne | `q2` Hur bär Sara ut en efterrätt med tända ljus? | `a2_2` Tänds vid luckan, bärs lågt och sakta i fri gång |
| Phronesis | `q3` Lounge B har affärsmöte, sällskapet vill sjunga. | `a3_3` Låter dem sjunga en vers och bjuder grannarna |

Försvarbara i steg 3: `a3_1` vänta tills grannarna har gått (`near3_1`), `a3_2` fråga grannarna först (`near3_2`).

## Slutet vid rätt svar

- **Steg 1.** Per går till passluckan. Kocken tittar upp (`cook.station`). Pratbubbla `ok1`.
- **Steg 2.** Kocken lägger upp tårtan vid kallskänken (`cook.plate`) och ställer den på luckan (`cook.toPass`). Sara tänder ljusen (**ny** `waiter.lightCandles`), lyfter brickan i midjehöjd (**ny** `waiter.carryCake` · lugnt) och går norra gången österut, bakom barstolarna. En gäst på `bar2` väntar med att kliva ned tills hon har passerat. Pratbubbla `ok2`. **Kameran följer Sara på 13 m.** Sara ställer ned brickan (`waiter.serve`). Sällskapet klappar (**ny** `guest.clap`).
- **Steg 3.** Sällskapet sjunger en vers (**ny** `guest.sing`, 6 s, bubblan `say.sing`). Elin bär två glas till lounge B (`waiter.carryTray`, `waiter.serve`). Pratbubbla `ok3` från Per. Grannarna höjer glasen mot sällskapet (`guest.toast`). **Kameran går tillbaka.**

## Slutet vid fel svar

Per tar över i alla fel. Pratbubbla `fail`.

- **Steg 1.** Tårtan kommer ut utan att köket visste om nötallergin. Per stoppar Sara vid luckan och går in till kocken (**ny** `staff.beckon`). Tårtan kommer senare utan att kameran följer.
- **Steg 2, *fort*.** Sara bär i stressat tempo (`waiter.carryCake` · stressat). Gästen på `bar2` kliver ned framför henne (`guest.leaveStool`). Hon svänger (`staff.dodge`), och ett ljus faller på loungebordet (**ny** tårtans händelse `candleDrop`). Per kväver det med en servett (**ny** `staff.smother`). Det är lärdomen i leverans 1.
- **Steg 2, *högt*.** Sara bär brickan på axelhöjd. Ljuslågorna kommer nära håret på en gäst på `bar2`, som drar sig undan (`guest.startle`). Per tar brickan.
- **Steg 2, *genom baren*.** Sara går in i barens stråk och möter Mira med en flaska (`staff.dodge`). Per leder ut henne på golvet.
- **Steg 3, *vänta*.** Sällskapet väntar, grannarna sitter kvar och sången blir aldrig av. Karin ser besviken ut (`guest.seatedIdle`, huvudet sänkt).
- **Steg 3, *fråga först*.** Grannarna säger nej med en gest (`guest.gesture`). Sällskapet ser besvikna ut.
- **Steg 3, *höja musiken*.** DJ:n höjer. Sällskapet sjunger, grannarna vinkar efter notan (`guest.waveStaff`, `waiter.presentBill`).

## Kameran

| Vart | Hur nära | Inglidning | Stannar | Tillbaka |
|---|---|---|---|---|
| lounge A:s bord, 15° mot väster | 12 m, 13 m när den följer Sara | 1,2 s, när värden vinkar | tills steg 3 är slut | efter skålen eller efter felslutet |

## Ny rekvisita och nya klipp

`lighter`, tårtan på brickan (`CATALOGUE.cake.restsOn` får `tray`), tårtans händelse `candleDrop`. Klippen `guest.whisper`, `staff.listen`, `waiter.lightCandles`, `waiter.carryCake`, `guest.clap`, `guest.sing`, `staff.beckon` och `staff.smother`.
