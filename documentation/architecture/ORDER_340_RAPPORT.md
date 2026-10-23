# ORDER 340 — flytten är ett omdöme (rapport)

*Anders 2026-10-23. Gren `order-340` från main `3164f175`.*

**Att avgöra:** frågorna under *Öppet* sist.

## A. Torget är det trygga valet
- **Inredningen:** en flytt till en annan lokal än Torget kostar inredning. Beloppet läggs på lånet när vinbaren tas över, och amorteras med det (`sim/ladder.ts payFitOut`). Talen står i `balance.ts PREMISES_MOVE`:
  - källaren 25 000 kr, salongen 45 000 kr, Flygeln 40 000 kr;
  - Torget är redan inrett.
  - `fitOutPayment: 'cash'` drar beloppet ur kassan i stället.
- **Genomströmningen:** krogen vid Torget får förbipasserande som går in, oavsett rykte (`economy.ts torgetWalkInsTonight`, i kvällens tak).
  - 6 en vanlig kväll och dubbelt så många på marknadsdagarna, gånger kalenderns gästfaktor.
  - Lokalerna och vagnen har inga sådana gäster.
  - Marknadsdagarna fanns redan: de andra kvarteren tappar gäster till torget de dagarna (`DISTRICTS.list.*.marketK`).
- **Valet syns:** vid varje lokal står hyran, inredningen och, vid Torget, raden om folket på torget (`business/PremisesPicker.tsx`).
  - I produktionsbygget (`reports/order340/bilder.json` A, bild `bilder/lokalvalet.png`): "Redan inrett" vid Torget, "Inredningen 25 000 kr, på lånet" vid källaren, 45 000 vid salongen och 40 000 vid Flygeln.
- **Den som läser kvarteret** är en ny spelartyp i harnessen, `lasare` (`order296Karnan.test.ts`), efter `KVARTEREN_KONKURRENSEN_SPELLAGEN.md` §1–2. Den spelar mentorns morgon och gör det lokalens kvarter vill ha:
  - studentkvarteret (källaren): AW på vardagarna;
  - Gästgivaregården (salongen): klokt i butiken och på nålarna, och kunskapen i svaren;
  - campus (Flygeln): proven mot stjärnan;
  - vid Torget spelar den som mentorn.
- **Harnessen tar över lokalen som spelaren gör:** lokalen går med `LADDER_TAKE`, så att inredningen betalas. Förut sattes lokalen direkt i tillståndet.
- Test: `src/sim/__tests__/order340Flytten.test.ts` A.

## B. Bistron i källaren
- **40 platser vid de fyra långborden** (`tablePlans.ts BISTRO_CELLAR_PLAN`): vinbarens långbord om tio med duk, och baren utan pallar. Förut sex bord för fyra och barens pallar, 28 platser.
  - Bild ur produktionsbygget: `bilder/bistro-kallaren-z.png`.
- **Bistrons tak är aldrig lägre än vinbarens i samma lokal** (`premisesScale.ts premisesCapK`, `reports/order340/laget.json` capK). Förut krympte taket i källaren från 4,84 till 0,82 när bistron togs över, eftersom taket räknades mot varje stegs platser vid Torget.
- **Bistrons nota är nu 1,35** (`LADDER.steps.bistro.billFactor`, förut 1,15). Med 1,15 sänkte bistrosteget mentorns resultat i fyra lokaler av fem (`reports/order340/kal1.json` goal.bistroStep, 10 frön). Det kom av insatsen, ombyggnaden på lånet (som amorteras inom säsongen) och de tre stängda dagarna.
  - Med 1,35 gav bistron mer än vinbaren i alla fem raderna (`reports/order340/kal2-bill/`), och så även i mätningen med alla spelartyper under E.
- **Notan 1,35 gäller i alla lokaler, också vid Torget.** Torget före (1,15) och efter (1,35), med alla spelartyper och 20 frön (`scripts/order340-torget.mjs`, `reports/order340/torget.json`):

| Spelartyp vid Torget | Nota 1,15 | Nota 1,35 | Skillnad | Säsonger med bistron |
|---|---|---|---|---|
| soigne | 331 409 | 448 272 | +116 863 | 19 |
| klok | 54 541 | 91 520 | +36 979 | 19 |
| enkel | 55 593 | 90 304 | +34 711 | 20 |
| mentorn, lasare | 35 627 | 59 300 | +23 673 | 16 |
| stjarna, bistro | 86 465 | 101 203 | +14 738 | 11 |
| forsiktig | 87 837 | 99 465 | +11 628 | 10 |
| mentornVinbar | 37 288 | 37 288 | 0 | 0 |
| per, rimlig, halva, halvbra, slarvig, ignorerar, ignorerarUtbildad | lika | lika | 0 | 0 |

  - De som aldrig når bistron är lika i båda körningarna, så det är bara notan som skiljer.
  - Med 1,15 sänkte bistron mentorns resultat också vid Torget: 35 627 kr mot 37 288 kr för mentorn som stannar i vinbaren.
- **Det högre priset syns för spelaren:**
  - På menyn om morgonen är rätternas och glasens priser bistrons, alltså vinbarens gånger 1,35 (`morningBuy.ts morningRows`). Det spelet räknar med som intäkt följer samma pris.
  - Raden "Bistrons priser: allt säljs för 35 % mer än i vinbaren" står överst på menyn (`MorningBuyScreen.tsx`, `buy-bistro-prices`).
  - I kvällens resultat står "Notan i bistron var 35 % högre än i vinbaren" under gästerna och vad de betalade per gäst (`ResultScreen.tsx`, `result-bistro-bill`).
  - Procenten räknas ur stegens nota (`business/bistroPrices.ts billAboveVinbarPct`), och raderna står på svenska och engelska.
  - I produktionsbygget (`bilder.json` P och D.bistroBill): menyns rad och priserna vid Torget ("Rotfruktssoppa … säljs för 128 kr", bild `bilder/bistro-meny.png`) och resultatets rad (bild `bilder/tomt-resultat.png`).
- Test: `order340Flytten.test.ts` B: platserna, taket, och att menyns priser är vinbarens gånger notan.

## C. Laget syns
- **Fler platser ger fler servitörer i rummet:** en servitör till för var tionde plats över Torgets för steget, högst fyra (`premisesScale.ts premisesExtraServers`, `PREMISES_SCALE.seatsPerExtraServer`, `maxExtraServers`).
  - Vinbaren: källaren 2, salongen 2, Flygeln 2.
  - Bistron: källaren 1, salongen 2, Flygeln 4.
  - Torget 0, som förut.
  - Talen och platserna står i `reports/order340/laget.json`, som skrivs av `order340Flytten.test.ts` med `WRITE_REPORTS=1`.
- **Figurerna är de befintliga, som i 330 H:** servitörens kläder och roll. De heter `floor1`–`floor4` i regissören (`wineBarDirector.ts FLOOR_KEYS`).
  - De tar servitörens uppgifter och dukar före dörrarna.
  - De står bredvid servitören när de väntar.
  - De är med i genomgången.
- Lönerna och tempot följer platserna som i ORDER 339, så det som kostar är också det som syns.
- Test: `src/strategic/scene/__tests__/order340Laget.test.ts` (regissörens egna prov, som rummet ritar). Bild: `bilder/bistro-kallaren-z.png`.

## D. Det tomma rummet känns
- **Mätaren:** det tomma rummets del av rummets stämning (`day.emptyRoomLift`, `reducer.ts emptyRoomTick`) går mot −0,2 när färre än 30 % av platserna är upptagna. Den går tillbaka mot 0 när rummet fylls, med 0,01 per spelminut (`balance.ts EMPTY_ROOM`).
  - Förut var golvet −0,08, och det gick aldrig tillbaka.
  - −0,2 är mer än ett av mätarens fem steg.
  - Test: mätaren sjunker minst ett steg och kommer tillbaka när rummet fylls (`order340Flytten.test.ts` D).
- **Gästerna tittar ut över de tomma borden:** under −0,05 vänder de sittande gästerna huvudet och bröstet mot en tom plats, 3,2 sekunder av var sjunde, en ny plats varje gång (`figureLife.ts applyEmptyRoomLook`, `WineBarFigures.tsx`). Med reducerad rörelse görs det inte.
  - Test: huvudet vänds mot den tomma platsen (`order340Laget.test.ts` D).
- **Spelarens flöde i produktionsbygget:** bistron i Flygeln, 66 platser (`bilder.json` D).
  - Mätaren har nu `data-empty-room`, det tomma rummets del ur simuleringen. Den visar −0,2 från första provet (`atFloor`, kl. 20.06).
  - Kvällens resultat säger "Rummet kändes tomt: i snitt var 18 % av platserna upptagna" (`emptyRoom`).
  - Rummet var tomt från början, så det finns inget prov före. Mätarens fall syns därför i testet, inte i den här körningen.
  - Bilder: `tomt-z.png`, `tomt-nara.png`, `tomt-resultat.png`.

## E. Spelartyperna per lokal
Alla 16 spelartyper i fem rader, 20 frön per rad (`scripts/order340-lokaler.sh`, `order340-jamforelse.mjs`, `reports/order340/lokaler.json`).
- **Alla tar över vinbaren vecka 2** (`KARNAN_TAKEOVER_WEEK=2`): Åsas erbjudande kommer utan kraven, och lokalen tas med `LADDER_TAKE`.
  - Det behövs eftersom den slarviga, den halva, den halvbra och den som ignorerar aldrig når vinbaren i spelets egen ordning. De stannar i foodtrucken hela säsongen (`reports/order340/vem/`, 4 frön, och `fore/` för den slarviga per lokal före ändringarna, 10 frön).
  - De som klättrar tar erbjudandet vecka 2–4 i spelets ordning, så vecka 2 ligger nära.
- **20 frön i stället för 40:** 80 rader med 40 frön hade tagit omkring fem timmar till.

Medelkassan vid säsongens slut i kronor. Antalet stängda säsonger av 20 står inom parentes, och den bästa lokalen per spelartyp är fet.

| Spelartyp | Torget | Källaren | Källaren med AW | Salongen | Flygeln |
|---|---|---|---|---|---|
| bistro | 101 203 | 115 450 | 90 918 | **119 569** | 113 737 |
| enkel | 90 304 | 142 500 | 132 796 | 119 483 | **166 805** |
| forsiktig | 99 465 | **108 126** | 94 866 | 107 891 | 106 262 |
| halva | −49 726 (20) | −44 238 (20) | **−44 207 (20)** | −49 273 (20) | −53 526 (20) |
| halvbra | **−25 407 (20)** | −31 629 (20) | −33 735 (20) | −29 139 (20) | −39 541 (20) |
| ignorerar | −58 978 (20) | **−47 207 (20)** | −47 903 (20) | −62 801 (20) | −60 641 (20) |
| ignorerarUtbildad | −9 633 (12) | **−8 242 (14)** | −15 263 (18) | −21 551 (18) | −45 013 (20) |
| klok | 91 520 | 103 843 | 83 681 | **114 834** | 111 319 |
| lasare | 59 300 | 110 722 | 110 722 | 149 235 | **194 219** |
| mentorn | 59 300 | 117 993 | 110 722 | 97 815 | **123 296** |
| mentornVinbar | 37 288 | **100 465** | 84 829 | 60 694 | 58 828 |
| per | 34 302 | **74 087** | 56 427 | 45 975 | 52 286 |
| rimlig | 21 797 | **68 436** | 51 227 | 49 596 | 46 511 |
| slarvig | **−64 970 (20)** | −97 391 (20) | −98 811 (20) | −88 556 (20) | −88 434 (20) |
| soigne | 448 272 | −218 914 (20) | 12 211 (8) | **489 299** | 475 295 |
| stjarna | 101 203 | 115 450 | 90 918 | **119 569** | 113 737 |

**Målen** (`lokaler.json goal`):
- **Torget är bäst för den slarviga:** −64 970 kr mot −88 000 till −99 000 kr i lokalerna. Torget är också bäst för den halvbra.
- **De andra lokalerna lönar sig för den som läser kvarteret:** Flygeln 194 219 kr, salongen 149 235 kr och källaren 110 722 kr, mot 59 300 kr vid Torget.
- **Ingen lokal är bäst för alla:** den bästa lokalen är Torget för två spelartyper, källaren för sex, salongen för fyra och Flygeln för tre. För den halva är det källaren med AW.
- **Bistrosteget sänker inte den starka spelarens resultat** (`goal.bistroStep`). Mentorn med bistron mot mentorn som stannar i vinbaren: Torget 59 300 mot 37 288 kr, källaren 117 993 mot 100 465, källaren med AW 110 722 mot 84 829, salongen 97 815 mot 60 694 och Flygeln 123 296 mot 58 828.

**Annat i tabellen:**
- **Soigné i källaren går omkull** i alla 20 säsonger, med −218 914 kr. I de andra lokalerna ger soigné 448 000–489 000 kr. Studentkvarterets plånbok bär inte soigné.
- **Den som läser kvarteret och mentorn är lika vid Torget**, eftersom de spelar likadant där. Den som läser kvarteret har AW i källaren också i raden utan AW, så de två källarraderna är lika.
- **Bistro och stjärnjägaren har samma plan** i harnessen, och därför lika rader.

## Rättat på vägen
- **Trängseln i rummet (ORDER 319b):** med folket på torget fick bistron vid Torget fler gäster. En gång stod sommelieren 0,26 m från en sittande gäst.
  - Orsaken var att eftersläpningen bakom vägen (högst 0,9 m när figuren väjer) hade lagt den vid bordet, och den som sitter flyttas inte.
  - Nu hämtar en figur som går in eftersläpningen och står på sin väg när den fortfarande står för nära en sittande efter att trängseln lösts (`personalSpace.ts catchUpAtPinned`). Testet `order319bTrangseln.test.ts` går igen.
- **Lokalens servitörers väntplatser** ligger längs servitörernas gång, som den extras. Förut låg den tredje på kockens plats (`order313Arbetsplatser.test.ts`).

## Sviten
Hela sviten kördes ensam: 248 filer, 2 952 tester gröna och 26 överhoppade. Inget väntat fel finns kvar, eftersom 298b blev ett vanligt test. Typkontrollen och bygget är gröna.

Tester som ändrades eftersom reglerna ändrades:
- `economy.test.ts` och `order315bFoodtruck.test.ts`: kvällens tak vid Torget har folket på torget.
- `order333Lokalerna.test.ts`: lånet har inredningen i en annan lokal än Torget.
- `order298bGolvet.test.ts`: provsmakningen ger nu fler sittande sällskap över de fyra fröna, så `it.fails` blev `it`. Frågan från ORDER 314 om talet vid rykte 0,2 står kvar.
- `order339Storleken.test.ts` är oförändrat och går.

## Öppet
1. **De svaga spelartyperna klättrar inte, och foodtrucken lönar sig mer för dem.**
   - I spelets egen ordning når den slarviga, den halva, den halvbra och den som ignorerar aldrig vinbaren, eftersom ryktet inte räcker.
   - De slutar säsongen på 96 000–122 000 kr i foodtrucken. De som klättrar slutar på 26 000–81 000 kr, utom soigné (`reports/order340/vem/`, 4 frön, före ändringarna i den här ordern).
   - När de tvingas ta vinbaren vecka 2 går de omkull i nästan alla säsonger, i varje lokal.
   - Ska vagnen ge mindre, eller vinbaren mer, för den som inte kan sitt?
2. **Torget är det trygga valet men räddar inte den slarviga:** den går omkull i 20 av 20 säsonger också där, och förlusten är bara mindre. Ska folket på torget vara fler än 6 en vanlig kväll (`PREMISES_MOVE.walkIns`)?
3. **Bistrons nota 1,35** är ett nytt tal mot Anders 1,15 från ORDER 315b. Det höjer alla som når bistron, mest soigné vid Torget (+116 863 kr). Ett lägre tal kan räcka om ombyggnaden i stället amorteras över fler veckor än säsongen. Vilket föredras?
4. **Soigné i källaren går omkull** i alla 20 säsonger (−218 914 kr). Det är kvarteret som syns, men är det så hårt det ska vara?
5. **Mätarens fall i spelarens flöde:** bistron i Flygeln var tom från kvällens början, så mätaren har inget "före" samma kväll. Fallet på minst ett steg visas i testet. Vill du ha en kväll som först är full och sedan töms, till exempel en sparfil med fler bokningar?
6. **20 frön** i E i stället för 40. Raderna med 40 frön kan köras i natt om du vill ha dem.
