# Manus 0 · Det som gäller alla händelser

Andra utkastet, för granskning. Inget är ritat ännu.

## Rummet

Alla fem manus spelar i vinbaren (`wineBarRoom.ts`), eftersom spelet börjar där. Restaurangen öppnar först i etapp 7 och får egna varianter då. Koordinaterna är rummets lokala XZ i meter: +X mot entrén, +Z mot norra väggen, med måtten efter tillägget till leverans 2.

| Plats | Id | Var |
|---|---|---|
| Baren, öppen mot väster | `barCounterN/S/E` | x −3,6 till 2,4, z −1,8 till 1,8. Vinväggen står mitt i. |
| Barstolar, norra sidan | `bar1`–`bar4` | x −2,7 / −1,8 / −0,9 / 0,0, z 2,3 |
| Barstolar, södra sidan | `bar5`–`bar8` | samma x, z −2,3 |
| Barens östra kortände, ståplatser | `standBar1`–`standBar4` | x 2,85, z −0,9 till 0,9 |
| Loungen längs norra väggen | `loungeA1–3`, `loungeB1–3` | dynor z 5,1, x −2,6 till −1,0 och 1,2 till 2,8. Borden vid z 4,15. |
| Småborden längs södra väggen | `twoA`, `twoB`, `twoC` | x −4,2 / −2,1 / 0,0, z −4,4 |
| Ståborden | `highTable1`, `highTable2` | [5,0, 2,9] och [5,6, 4,6] |
| Entrén | `entrance` | [7,05, 0]. Dörrmattan x 6,5–7,6, klädhängaren vid x 7,5, z 1,1–2,3. |
| Värdpulten, **ny** | `hostDesk` | [6,6, −0,55], söder om dörrmattan. Se manus 2. |
| DJ-hörnet | `dj` | x 4,4–7,4, z −5,6 till −3,3 |
| Köket, passluckan och köksdörren | `kitchen` | x −7,6 till −4,6, z 1,6–5,7. Luckan z 2,1–3,3, köksdörren x −5,5 till −4,7. |
| Gångarna | | tvärgången x 3,6, norra gången z 3,1, södra z −3,25, loungens z 4,45 |

## Personalen

| Namn | Roll | Station |
|---|---|---|
| Per | hovmästare och kvällens anmälda serveringsansvarige. **Ny station** bakom värdpulten. | [6,1, −0,55] |
| Mira | bartender | norra stråket i kväll, [−0,9, 0,74] |
| Elin | sommelier | [1,3, 0,74] |
| Sara | servitör | utanför passluckan, [−4,1, 2,7] |
| Kocken | varm station, **dessutom** kallskänken om det behövs | [−6,2, 3,9] |
| DJ:n | helgstämningen | SO-hörnet |

Per behöver en station i vinbaren: `STAFF_STATIONS` får `host`. Namnen Per, Sara och Elin finns redan i leverans 1. Mira är nytt.

## Hur en händelse går

1. **Utlösaren** slår till i sim-lagret. Villkoren och sannolikheterna står i `balance.ts`.
2. **Uppbyggnaden** spelar i rummet medan kameran glider in.
3. **Frågeögonblicket.** Deltagarna loopar och raketkortet öppnas med steg 1.
4. **Stegen** kommer i ordning: Episteme (vad), Techne (hur), Phronesis (när och varför).
5. **Rätt svar** spelar stegets slut (1–6 s) och öppnar nästa steg.
6. **Fel svar** eller ett slocknat ljus avslutar raketen. **Scenen spelas ändå alltid klart:** stegets felslut spelar, och sedan tar en kollega över och gör klart i lugnt tempo. Lärdomen visar `{cleared}` av `{total}` steg.
7. **Tillbaka.** Kameran går tillbaka till 24 m, och kvällen fortsätter.

## Svaren

- **Ungefär lika långa.** De fyra svaren i ett steg skiljer sig högst 13 tecken på svenska. Det rätta är aldrig ensamt längst. Code blandar ordningen när kortet öppnas.
- **Felsvaren är verkliga misstag,** sådant en anställd faktiskt gör eller tror: bära fort för att ljusen inte ska brinna ned, servera öl men inte sprit, lita på en kurs i stället för listan.
- **Phronesis har minst två försvarbara svar.** Det näst bästa har en egen förklaring (`near3_N`), som lärdomen visar i stället för den vanliga.
- **Ärlighet är aldrig fel.** Ett ärligt svar kan ge en sämre följd, men räknas som rätt. Se tillsynen, variant A.

## Kameran

- **Vart:** ett ankare, en figur eller en punkt `[x, z]`, i vänstra tredjedelen av bilden, mitt emot kortet.
- **Hur nära:** 12 m som standard. 11 m när det viktiga är litet, 13 m när två platser ska synas.
- **Vridning:** högst 35° från spelarens egen, åt det håll som visar ansiktena. Vinväggen (upp till 2,06 m) och kökets halvväggar (1,5 m) får aldrig stå mellan kameran och ankaret.
- **Inglidning:** 1,2 s, när uppbyggnaden börjar.
- **Följa:** 0,4 s eftersläpning, samma avstånd.
- **Tillbaka:** 1,6 s till 24 m och spelarens vridning, när slutet har spelat klart.
- **Spelaren rör kameran:** den går direkt tillbaka till 24 m. Kortet ligger kvar.

## Strålkastaren

Resten av rummet sänks till 45 % ljus och 60 % mättnad medan kameran är nära. Den som gör något får en ljuspöl på golvet på 1,2 m i `color.candle`. Prototypen visar 30, 45 och 60 %.

## Text

Allt som syns står i `eventStrings.ts` som `{ sv, en }` under `event.<id>.*`. Tal är platshållare: `{time}`, `{seconds}`, `{place}`. Lagens åldersgräns (18 år) står utskriven, eftersom den inte är ett speltal.

## Klippnamn

Klipp som finns i `figureClips.ts` skrivs som de heter. Nya klipp är markerade **ny** och samlade i leveransnoten, §4.
