# ORDER 284 — Felen och användbarheten (rapport)

**Ordern** (Vision Owner 2026-09-29, tredje provspelet): "(1) Knappar som behövs för att gå vidare ska alltid synas, på alla skärmstorlekar, och vyerna ska gå att scrolla. 'Open for the evening' hamnade under skärmen. Vägen från morgonen till inköpen ska vara tydlig. (2) Klockan täcker dagens namn och morgonens rubrik. (3) En gäst satte sig på golvet. (4) Back your knowledge: tiden ska räknas från att svaret är valt, eller förlängas, så att man hinner välja säkerhet. Två raketer gick ut på tid. (5) Maten tog slut 20.41 men 26 portioner blev svinn. Undersök och rätta. (6) Kvällsberättelsen säger 'nothing to learn' och listar sedan fem fel. (7) Om krediterna tar slut, visa hur man tjänar nya."

Besluten från samma provspel står i speldesignen (Användbarheten, Servicen som teater, Kvällens resultat, Gästerna, Stjärnorna, Byn, idén för version 2). Personalen (281) och ritualerna (282) är sammanslagna med 286 i registret.

## 1. Vad som rättades

**(1) Knapparna som behövs för att gå vidare.** Mätt i sju fönsterstorlekar (se §2). Det här var fel och är rättat:
- **M1, inköpen:** "Back" och "Open the doors" låg under skärmen i *alla* storlekar, också 1920 × 1080. Kolumnerna får nu krympa till fönstret, sidokolumnen skrollar, och knapparna står fast längst ned i den (`screens.css` `.nxs-buy-actions`). Under 900 px bredd står de i en list längst ned i fönstret.
- **L1, K1 och S1, kvällen:** knappen vidare låg under skärmen i 1280–1440. Foten står nu fast längst ned (`service.css` `.nx-evening-foot`). Sopbilens knapp ligger i samma sorts fot.
- **Kamerans Tillbaka** nere till höger låg över knapparna i helskärmsvyerna och över raketkortet. Den döljs när en helskärmsvy eller ett raketkort är öppet, och händelsepanelen slutar ovanför den.
- **Vägen från morgonen till inköpen:** utan lager är morgonens huvudknapp "Buy in for tonight" (`open-buy-foot`), inte en avstängd "Open for the evening". Med lager blir den "Open for the evening" (`DayActionBar.tsx`).
- **Back your knowledge:** säkerheten och "Back it" låg under kortets kant. Introduktionen står nu där raketen startas (händelsepanelen, före kvällens första raket), och stegrutorna döljs på kortet eftersom raketen till vänster visar stegen. När svaret är valt visar kortet bara frågan, svaret, säkerheten och "Back it".

**(2) Klockan.** Dagsmärket och klockan står i en rad uppe till vänster (`strategic.css` `.gb-topleft`), klockan alltid efter märket, så den kan inte täcka dagens namn. Morgonens rubrik står under klockan. På telefon på höjden står kassan i översta raden och dagen och klockan i raden under.

**(3) Gästen på golvet.** Loungens dyna låg på 0,38 m, och figuren är byggd för 0,45 m. Den sittande figurens rot (sits − `SEATED_HIP_Y`, `wineBarDirector.ts`) hamnade 7 cm under golvet, och benen gick genom det. Sitthöjden är nu 0,45 m som stolssitsen i enhetskontraktet (`wineBarRoom.ts` `LOUNGE_H`). Nytt test: ingen sittande gäst under golvet (`wineBarRoom.test.ts`). Felet hittades genom att läsa koden, eftersom provspelet inte angav vilken plats det gällde. Loungen är den enda plats där räkningen ger en rot under golvet.

**(4) Tiden i Back your knowledge.** Svaret låses när spelaren väljer det, och stegets klocka stannar (`incidents.ts` `pickBackAnswer`, `countDown`; `PICK_BACK_ANSWER`). Ett låst svar går inte att byta, så att pausen inte kan användas för att tänka om. Går tiden ut innan ett svar är valt räknas det som förut.

**(5) Maten tog slut men mycket blev svinn.** Tre saker samverkade:
- Svinnet räknades i råvaruenheter, så en osåld kycklingrätt var tre "portioner" (kyckling, rotfrukter, örter), men det visades som portioner.
- Rätter som delar råvaror tog slut för varandra: soppan kunde säljas på rotfrukterna och örterna som köpts till fläsket, och fläsket blev "slut" med köttet kvar i lagret.
- "Sold out" gällde en rätt i taget.

Rättat med en portionsbok (`state.dishPortions`): köpta portioner räknas per rätt, och en rätt säljs bara ur sina egna. Svinnet räknas i portioner, samma enhet som lagret under servicen och inköpen. En osåld portion sparas med andelen av sina råvaror vägd efter kostnad, och sparas hel. När alla rätter är slut säger strömmen "The kitchen is out of food". Inköpsskärmens portioner per rätt är nu exakta; avvikelsen "upp till" från 280 är borta.

**(6) Kvällsberättelsen.** Meningen "nothing to learn" valdes ur pengar och rykte, och listan ur raketernas logg. Meningen står nu bara när ingen raket gick fel; annars pekar berättelsen på listan (`eveningAccount.en.ts`, `.sv.ts`, `failedCount`).

**(7) Nya krediter.** När krediterna inte räcker till mer än en gissning visar händelsepanelen och kortet hur man tjänar nya: en för varje rätt svar när man övar eller gör prov i Måltidens hus, och för det bästa svaret i kvällens raketer.

## 2. Tal

**Knapparna och klockan** (`frontend/reports/order284/layout.json` och `layout-*.png` @ `order-284`, skript `frontend/scripts/order284-layout.mjs`): produktionsbygget, sju fönsterstorlekar (1920 × 1080, 1440 × 900, 1366 × 768, 1280 × 720, 1024 × 768, telefon på bredden 844 × 390 och på höjden 390 × 844). För varje skärm (morgonen, M1, servicen, raketkortet, Back your knowledge med låst svar, S1, L1, K1) mäts varje knapp som behövs för att gå vidare: hela rutan i fönstret och knappen överst i sin mittpunkt. Klockan mäts mot dagsmärket, rubriken och kassan (bara synligt överlapp). Alla skärmar är gröna i alla storlekar (`screens.<skärm>.ok` true). Före rättningarna föll M1 i alla storlekar, L1 och K1 i 1280–1440, Back your knowledge i sex av sju, och klockan låg över dagsmärket på telefon.

**Klockan i Back your knowledge** (`layout.json` `backClock`): före valet 12 → 10 s (`runsBeforePick` true), efter valet 9 → 9 s under sex sekunder (`stopsAfterPick` true), ett svar kvar på kortet (`optionsShownAfterPick` 1).

**Kvällsberättelsen** (`layout.json` `story`): tre fel i listan och ingen "nothing to learn" (`agrees` true).

**Spelarens flöde** (`frontend/reports/order284/dod.json` och `dod-*.png` @ `order-284`), produktionsbygget från bussen till söndagen och X1, 1920 × 1080, utan fel i sidan (`errors` tom): utan lager är huvudknappen inköpen (`stock.buyIsPrimary` true), öppna är avstängd i M1 före köpet (`startDisabledBefore` true), M1 visar exakta portioner (`stock.qty` soppan 5, i 280 stod 15 eftersom rätterna delade råvaror), Back your knowledge med låst svar gick som förut (`backs`).

**Ekonomin efter portionsboken.** Mindre svinn gav den rimliga spelaren mer: vid hyran 0,15 var kalibreringens spelare 11,8 %, över målet 5–10 %. Hyran är nu 0,17:
- kalibreringens spelare (`frontend/reports/order284/rent-check.json` @ `order-284`, tio frön): `rows[0].reasonable.meanShare` 0,099 (`meanResultSek` 5 076 kr av 46 722 kr);
- veckospelarna (`frontend/reports/order284/week-players.json` @ `order-284`, 20 veckor): `mean.rimlig.resultShare` 0,050 (2 775 kr av 44 539 kr), `mean.svag.resultSek` −33 793 kr;
- den svaga nedgraderas efter vecka 3 i alla tio frön (`rent-check.json` `rows[0].weakDowngradeWeeks`).

Båda mätningarna av den rimliga spelaren ligger nära var sin kant av målet. De skiljer sig med ungefär fem procentenheter, och målet är fem procentenheter brett. De bör bli en mätning (F54).

**Harnessens svaga spelare** köpte lösa råvaror med ett kommando som inte finns i spelarens inköp i vinbaren. Med portionsboken gick de inte att sälja, och den svaga sålde ingenting (intäkt 0 kr). Hon köper nu samma råvaror som portioner i klasser med paket (`scenarios.ts` `weakMorning`), och som förut i övriga klasser.

**Slumpmålet** (`frontend/reports/order284/randomness.json` @ `order-284`, 1 000 veckor): `winShare` 0,735. Målet är 70–80 %.

**Tester:** `frontend/src/sim/__tests__/order284FixesAndUsability.test.ts` (6 tester: soppan tar inte fläskets råvaror, svinnet i portioner, köket slut, klockan stannar och svaret går inte att byta, kvällsberättelsen, sparfilen till layoutskriptet), `wineBarRoom.test.ts` (ingen sittande gäst under golvet), `order271Screens.test.tsx` (inköpen som huvudknapp utan lager), `order275Stock.test.ts` (en sparad portion sparas hel). Hela sviten är grön (134 testfiler, 2 172 tester, varav 4 överhoppade som förut, en testfil överhoppad).

## 3. Avvikelser och öppet

- Layoutskriptet laddar en sparfil (måndag vecka 2 i vinbaren) i stället för att spela från bussen, och byter fönsterstorlek på samma sida. Spelarens flöde från bussen prövas i veckoskriptet i 1920 × 1080 (`dod.json`, se §2).
- Lösa råvaror (`BUY_STOCK`) i klasser med paket hamnar utanför portionsboken. Spelaren kan inte köpa dem där; bara äldre tester och harnessen gjorde det.
- Hyran ligger nära målets kanter i båda mätningarna (F54).
- På telefon på höjden syns knapparna, men designens mått skalas ned med skärmen och texten blir liten. Det är en egen fråga om en mobil layout.
- Veckoskriptet tar porten ur `PORT` (4174 som förut): under ordern användes 4174 av ett annat projekts preview.

Öppen fråga F54. Gren `order-284` från `main`.
