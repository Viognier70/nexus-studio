# Brief till Claude Design — Food trucken

**Projekt** nexus-studio · strategiska spåret
**Lyder under** SD-004 §6.1 — beslut 2026-08-29: food trucken blir 3D, inget
sidovy-undantag
**Formmall** `brewpubRoom.ts` — samma struktur, samma kontrakt

---

## 1. Vad som är annorlunda den här gången

Ölkrogen, vinbaren och gästgiveriet är rum. **Food trucken är ett fordon.**

Den har ingen byggnad, ingen inredning och inget golv. Vagnen är kroppen, luckan
är gränssnittet mot gästen, och kön står på gatan.

Det gör den till det svåraste av rummen att bygga och det enklaste att göra
oläsbart. En vagn uppifrån är en låda om den inte får något som förklarar vad
den är.

Filen heter `foodTruckRoom.ts` och byggs i samma form som `brewpubRoom.ts` — ren
three.js, imperativt en gång, ingen egen klocka, ingen simuleringslogik,
platsspecar, gångvägsfunktioner, minimimått med `fits: false`, FLAGS-block.

---

## 2. Vad som ska finnas

**Vagnen.** Kropp, hjul, lucka, och det som händer runt luckan. Markis eller
tak över serveringsytan om det hjälper läsbarheten.

**Kön på gatan.** Gäster ställer sig i rad utanför luckan. Köns riktning och
plats är en del av rummet, inte något sim-lagret ska räkna ut.

**Och arbetsytan inuti.** En eller två stationer. Personalen står i vagnen, inte
utanför den — det är den enda verksamheten där personal och gäst skiljs av en
vägg.

Det tidigare SVG-arbetet beskrev det som "vagnen som bakvägg, luckan som
öppning, kön på gatan som scen". Den läsningen fungerade i 2D och är värd att
bära med sig.

---

## 3. Golvet är en öppen fråga — flagga den

De andra verksamheterna har interiörgolv med kända färger, och
`silhouetteContrast.ts` prövar figurernas läsbarhet mot dem. Zonregistret har
`foodtruck: []` — tomt.

Food trucken står på gatan, och gatan är byns geometri, inte vår. **Just nu är
den dessutom osäker:** en mätning fann nitton vägar som går rakt genom
byggnader, och en polygon-guard som klipper vägytor är beställd men inte byggd.

Så: bygg vagnen och kön. **Sätt inget golv, och flagga frågan** — vilken yta
figurerna står på, och därmed vad kontrastbandet ska mäta mot, avgörs när
vägarna är stabila.

Om vagnen har en egen yta framför luckan — en matta, en avsats, en markerad zon
— så säg vilken färg den har. Den ytan kan bli food truckens enda kända golv.

---

## 4. Måtten och kameran

Meter, samma som scenens världskoordinater. Figurer 1,70 m höga, axelbredd
0,46 m för gäst och 0,40 m för personal.

**Vagnens mått är dina att välja**, men de ska vara rimliga för ett fordon som
kan köra på Rv 244. Och luckans höjd avgör hur gäst och personal möts — en gäst
som står och en person som arbetar innanför.

Kameran står högt och lutande. Ovansidor och silhuetter syns. En vagn syns
uppifrån som ett tak; det som gör den läsbar är luckan, kön och det som sticker
ut.

---

## 5. Vad som INTE ingår

Gäster och personal — `figureRig.ts` finns. Rekvisita och huvudbonader. Gatan,
byggnaderna, ljuset — byggt. De andra verksamheterna.

**Och den befintliga SVG-vyn rörs inte.** `FoodtruckScene.tsx`, `rig.ts` och
`Figure.tsx` lever tills 3D-versionen läses i vyn. Utfasningen är egen order.

Ingen simuleringslogik.

---

## 6. Flagga i stället för att uppfinna

Ölkrogens fem och vinbarens sju flaggor var leveransernas bästa delar.

Troliga fall här: **beställning vid lucka** — ölkrogen flaggade `counterOrder`
för att gästens tillståndsmaskin saknar "går fram, beställer, bär tillbaka", och
food trucken är helt byggd på det. **Kön som plats** — en gäst i kö har ett
tillstånd, men om kön har ordnade platser eller bara en riktning vet inte
sim-lagret. Och **golvet**, per §3.

Flagga också om vagnen behöver ett tillstånd för öppen eller stängd lucka.
