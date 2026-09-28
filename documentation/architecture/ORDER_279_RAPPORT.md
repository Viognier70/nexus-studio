# ORDER 279 — Frågorna och insatsen (rapport)

**Ordern** (Vision Owner 2026-09-28, andra provspelet): "Raketer där gäster frågar om kvällens rätter och drycker, utifrån menyn och dryckeslistan (druvan, fisken, råvarans ursprung). Rätt svar ger högre dricks. Action-knappen kommer tillbaka som live betting: spelaren startar själv en trestegsraket och satsar krediter, med vinst och förlust. Kassa och krediter tickar upp och ner med tydlig animation. Förlusterna ska kunna bli stora, och en dålig vecka ska kunna leda till nedgradering." Och: "mät slumpmålet efter 279. Stanna efter 279, så att jag kan spela."

Besluten står i speldesignen under Servicen > Händelserna i servicen och Servicen > Insatsen, med en tolkning att bekräfta (insatsen i krediter mot regeln att kassa och krediter aldrig byter plats).

## 1. Vad som byggdes

**Raketer om kvällens meny** (`content/incidents/menu.meta.json`, `menu.text.en.json`, `menu.text.sv.draft.json`):
- Nio raketer, var och en med episteme, techne och phronesis:

  | Raket | Gäller | Frågorna |
  | --- | --- | --- |
  | Grüner Veltliner? | Grüner Veltliner på glas och flaska | druvan och landet, temperaturen, vad på menyn som passar |
  | The Pinot Noir | Pinot Noir på glas och flaska | Bourgogne, temperatur och glas, jordiga rätter |
  | The pike-perch | gösen | sötvattensfisk från Hjälmaren, pochering vid 80 °C, en gäst med fiskallergi |
  | The chanterelles | kantarellerna | vilda skogssvampar, rensning utan vatten, en gäst med celiaki |
  | Is it vegan? | linserna | vad rätten innehåller, linser utan blötläggning, en vegansk dessert |
  | Lingonberries | sorbeten eller lingondrickan | bäret, bensoesyran, alkoholfritt till maten |
  | The soup | soppan | grädden (laktos), rostning av rotfrukter, en gäst som inte tål laktos |
  | A bottle for the table | flaskorna | fem glas per flaska, att öppna vid bordet, flaska eller glas |
  | The local beer | ölet | bryggeriet i Nora, att hälla upp, vin eller öl till fläsket |

- En raket kan bara komma när minst en av dess rätter eller drycker står på kvällens meny eller dryckeslista (`requiresOnMenu`, `incidentBank.ts` `fitsMenu`). Den väljs med sannolikheten `MENU_ROCKETS.share` framför bankens övriga.
- Faktan är allmän kunskap. Referenserna är tomma tills Vision Owner levererar dem, som i resten av banken. Texten finns på engelska (spelet) och svenska.
- Ett fel på hantverket eller omdömet, och personalen som tar över, håller kvar personalen vid bordet tills nästa raket, som i bankens övriga raketer.

**Rätt svar ger högre dricks** (`incidents.ts` `raiseTips`): varje klarat steg höjer dricksen hos bordets gäster med `MENU_ROCKETS.tipBonusPerClearedStep` av notan, och en hel raket med `tipBonusOnRocketCleared` till. Det gäller alla raketer. Dricksen räknas när gästen betalar (ORDER 278).

**Insatsen** (`incidents.ts` `canStartBet`, `startBet`, `settleBet`; `reducer.ts` `START_BET`; `scenario/BetPanel.tsx`):
- En panel i högerkanten under kvällen, när ingen raket står öppen: satsa 1, 3, 5 eller 10 krediter. Varje knapp visar vinst och förlust i kronor.
- Högst `BET.maxPerEvening` insatser per kväll, och aldrig fler krediter än spelaren har.
- Insatsen dras när raketen startar, från axeln med flest krediter. Raketen är helst en om kvällens meny. Raketkortet visar "Your stake: N credits".
- **Vinst** (alla tre stegen klarade): dubbla insatsen tillbaka i krediter, fördelade över de tre axlarna, och en intäkt i kassan.
- **Förlust** (fel svar eller tiden ute): krediterna är borta, och kassan tappar ett större belopp än vinsten hade gett. Förlusterna är stora (insatsen 10 kostar 37 500 kr).
- Kassabokens nya rad `bet`, och en rad i strömmen. Resultatet står kvar i panelen en stund.

**Kassa och krediter tickar** (`CashCounter.tsx`): krediterna står bredvid kassan överst och räknas upp och ner på samma sätt, med förändringen bredvid.

**Harnessen:** planen kan satsa (`MorningPlan.betStake`). Harnessens spelare satsar inte i slumpmätningen.

## 2. Tal

**Slumpmålet** (`frontend/reports/order279/randomness.json` @ `order-279`, 1 000 veckor, fast fröslump): `winShare` 0,734 (`betterWins` 734, `ties` 0). Målet är 70–80 %. Det är den mätning som gäller efter lagret, gästflödet, morgonen som insats, servicen som syns och frågorna (Vision Owner: "mät slumpmålet efter 279"). Harnessens spelare satsar inte, eftersom insatsen är spelarens eget val och harnessen svarar rätt i varje steg; en insats i mätningen skulle bara mäta harnessen.

**Rimlig mot svag** (`frontend/reports/order279/week-players.json` @ `order-279`, 20 veckor): `mean.rimlig.resultSek` 14 374 kr i veckan, `mean.svag.resultSek` −24 236 kr, `svagMinusWeeks` 20 av 20.

**En dålig vecka med stora insatser** (`frontend/reports/order279/bet-downgrade.json` @ `order-279`, frö 7, vecka 2, 40 krediter per axel): den svaga spelaren som satsar 10 krediter så ofta det går har kassan −115 279 kr efter tisdagen och −314 858 kr efter fredagen, och `bettor.downgradedTo` är `foodtruck` vid veckoavräkningen. Samma spelare utan insats har kvar 88 779 kr (`calm.downgradedTo` null).

**Tester:** `frontend/src/sim/__tests__/order279QuestionsAndStake.test.ts` (9 tester) prövar
- menyraketerna (nio, knutna till menyn; fisken och kantarellerna kommer inte med baspaketet; menyn ger sina raketer);
- att rätt svar höjer dricksen hos bordets gäster, per steg och för hela raketen;
- insatsen: krediterna dras och en egen raket öppnas; vinst ger dubbla krediterna och en intäkt; förlust tar krediterna och ett större belopp; tiden ute förlorar; högst tre per kväll och aldrig fler krediter än spelaren har;
- att en dålig vecka med stora insatser leder till nedgradering, och samma spelare utan insats klarar sig.

`order270Incidents.test.ts` räknar nu 31 + 9 raketer och prövar menybanken. `order267Pressure.test.ts` (fredagens kö) är grön med `MENU_ROCKETS.share` 0,35 (se F52). Hela sviten är grön (2 154 tester, varav 4 överhoppade som förut).

**Spelarens flöde** (`frontend/reports/order279/dod.json` och `dod-*.png` @ `order-279`), produktionsbygget från normal start, bussen till söndagen och X1, utan fel i sidan (`errors` tom):
- Insatspanelen med insatserna och vinst och förlust i kronor (`dod-38-insatsen.png`).
- Insats 1, bästa svaret: raketen var en menyraket, `bets[0].id` `mn07-soppan` ("What makes the soup creamy?", `dod-39-insats-raket-fraga.png`, där krediterna visar −1 när insatsen drogs). Krediterna 22 → 21 vid insatsen och 26 efter (`bets[0].before`, `afterStake`, `after`: två tillbaka för insatsen och en för varje bästa svar). Kassan 117 419 → 119 066 (`dod-40-insats-vinst.png`).
- Insats 1, fel svar: `bets[1].id` `mn04-kantareller`; krediterna 26 → 25, kassan 119 065 → 115 310 (`dod-40-insats-forlust.png`).
- Kassans och krediternas animation mitt i ett köp visas i ORDER 277 (`reports/order277/dod-27-kassan-raknas-ner.png`). I den här körningen hann animationen bli klar innan bilden togs (`bets[*].mid.cashShown` lika med `cash`).
- En menyraket som kom av sig själv fångades inte på bild (`menuRocket` saknas i `dod.json`): båda menyraketerna den kvällen var insatsens egna.

## 3. Öppet (F52)

- Tolkningen av insatsen i krediter mot regeln att kassa och krediter aldrig byter plats (speldesignen, att bekräfta).
- Insatsens storlek, vinst och förlust, och hur ofta menyraketerna kommer, är valda tal. Med insatsen 10 och tre insatser per kväll kan en kväll kosta 112 500 kr, mer än två och en halv veckors normal intäkt för vinbaren (42 090 kr i veckan). Det är stort med avsikt ("förlusterna ska kunna bli stora"), men Vision Owner bör pröva om det är för stort.
- Menyraketernas fakta är allmän kunskap, utan referenser tills Vision Owner levererar dem.
