# D10: det som syns vid vagnen (order 320)

**Leverans** 2026-10-08, omtag samma dag · **Till** Claude Code · **Från** Claude Design · **Bygger på** D9 (`nexus-leverans-2026-10-07-d9-livet-vid-luckan`, tillägget och trängseln)

Leveransen innehåller sex nya situationer vid vagnen och den nya skylten. Allt är byggt på D9:s scen och spelets karta: vagnen står på Torget [17,00, −21,90] och Grillvagnen på [21,25, −12,75]. Kontrollbilderna finns i 1440 × 900 och 1280 × 720, och det står ingen text i bilderna. All text är nycklar `{ sv, en }`, och priserna är platshållare från balance.ts. Trängselregeln (`personalSpace.ts`) gäller för alla nya figurer.

| Fil | Vad |
|---|---|
| `truckSituations.ts` | **Ny.** De sex situationerna: steg, kamera, klipp och HUD-nålar. |
| `truckProps.d10.ts` | **Ny.** Föremål och platser: såser med lock, vegodelen, korvlådan, betalhyllan, vattenskålen, regnbordet, den täta kön och Grillvagnens skylt. |
| `d10Clips.ts` | **Ny.** 25 klipp (läggs in i `figureClips.ts`). |
| `truckMenu.ts` | **Ny.** Vagnens skylt rad för rad. |
| `vagnenStrings.ts` | 86 nya nycklar. Slås in i `luckanStrings.ts`. |
| `prototyp/Vid vagnen.html` | Prototypen, med en skärm per situation och steg i inställningarna. |
| `kontrollbilder/1440x900/`, `kontrollbilder/1280x720/` | 22 kontrollbilder per storlek. |

Medhjälparen heter Nils i prototypen, så som Code har byggt det (9feedc4a).

## 1. Regnet

- **Tråg med lock** (`truck.serveLidded`): Nils stänger locket innan tråget räcks ut. Gästerna som går tar tråget med sig under paraplyet.
- **Bordet flyttas** (`staff.liftTable`, `staff.carryTable`, `staff.setTable`): Nils går ut genom bakdörren, lyfter ståbord A och bär det in under markisen till [1,85, 2,00]. Bordet bärs 0,48 m framför honom, och luckan står tom under tiden (cirka 12 s). I regn har han en sandfärgad regnrock, så att han syns mot den mörka marken.
- **Tätt** (`guest.huddle`): kön står 0,55 m isär under markisen (`QUEUE_TIGHT`), med armarna in. Det är tätt men över trängselgränsen på 0,5 m. Tre gäster äter vid det flyttade bordet.

## 2. Getingen

- Getingarna flyger i öglor kring ketchupen på hyllan och kring en öppen läskburk på bord A. De ritas 7 gånger verklig storlek (`WASP_SCALE`, godkänt 2026-10-08), annars syns de inte. De syns bara på 6 m eller närmare.
- En geting flyger till gästens ansikte. Gästen stelnar till (`guest.freeze`) och backar 0,75 m bort från värmaren (`guest.backAway`). Hon slappnar av när getingen återvänder till burken.
- **Lock på såserna** (`staff.capSauces`): Nils går ut och sätter ett lock på var och en av de tre såserna. Getingarna vid hyllan lyfter och flyger i väg på 1,8 s. Den vid burken är kvar.
- Hyllan har nu tre såser: ketchup, senap och **mild senap** (`SHELF_D10`).

## 3. Kortläsaren

- Kortläsaren och Swish-skylten står på en utfällbar betalhylla under luckan (`PAY_LEDGE`, 0,70 × 0,32 m).
- **Fel:** gästen håller fram kortet, läsaren väntar (tre prickar) och visar sedan fel: en bruten ring som blinkar i mässing. Rött används inte, eftersom rött bara betyder fel svar. Meddelandet står i en HUD-nål: *Ingen kontakt. Försök igen.* Gästen försöker två gånger till. Nils lutar sig ut och trycker, och gästen tittar på klockan. Kön står still så länge.
- **Swish:** Nils pekar på skylten, och gästen tar fram telefonen och håller den över skylten. Telefonens skärm blir guld. Skylten visar en telefon och en QR-ruta som tecken, och namnet *Swish* står i HUD:en.

## 4. Korven tar slut

- Lådan med korv står bredvid grillen, 20 platser, med locket uppfällt. Tomma platser syns som papper. I bilderna är tre kvar. Var gränsen för "få kvar" går sätter Code i `SAUSAGE.lowAt`.
- Grillaren tar en korv ur lådan och lägger den på grillen (`staff.takeFromBox`).
- **Vegokorven** ligger på grillens västra del, bakom en list (`GRILL_VEG`). Den har en egen tång med mässingshandtag, som alltid ligger på vegodelen. Grillaren lägger ned den vanliga tången, tar vegotången, vänder de två vegokorvarna och byter tillbaka (`staff.switchTongs`, `staff.turnVeg`). Vegodelen finns kvar i alla situationer.

## 5. Hunden

- En hund i koppel sitter vid ståbord A hos sin ägare. Hunden reser sig och nosar mot gästen bredvid, och gästen tar ett steg åt sidan (`guest.stepAside`).
- Vattenskålen står vid bord B, längst bort från luckan (`WATER_BOWL`), alla kvällar. I steg 2 står ägaren vid bord B, och hunden dricker och lägger sig.

## 6. Grillvagnen

- Grillvagnen har en ny skylt: en gatupratare med en gul lapp i Grillvagnens färg. Texten *Halv special {price}* står i en HUD-nål. I prototypen visas 25 kr enligt ordern, och priset sätts i `RIVAL.halfSpecial`.
- **Stamgästen står vid vår vagn** (beslut 2026-10-08, `TRUCK_REGULAR` i `truckProps.d10.ts`). Hen står söder om markisen, öster om kön, på [1,30, 3,50] i vagnens ram, utanför gästernas väg till sopkorgen. Hen har en kaffekopp med lock som spelaren har bjudit på, och en keps i mässing.
- Var sjätte sekund dricker stamgästen en klunk (`fika.sipCup`, 1,6 s). Sedan vänder hen sig mot Grillvagnens skylt, cirka 8,5 m bort på andra sidan torget, och skålar (`guest.toastCup`, 2,2 s): höger hand med koppen sträcks 0,5 m fram mot skylten.
- `RIVAL_REGULAR` är borttagen. Grillvagnens kö är som förut.

## 7. Menyn

Vagnens skylt har nu åtta rader: grillad korv, halv special, tunnbrödsrulle, korv med mos, **vegokorv**, **mild senap**, läsk och **kaffe**. De nya raderna har ett tecken var i kritan: ett blad, en droppe och en kopp. *Läsk och kaffe* är nu två rader. Mild senap har inget pris. Texten står i HUD:en när man pekar på skylten (`truckMenu.ts`).

## Kontrollbilder (båda storlekarna)

| Bild | Vad den visar |
|---|---|
| 01 | Regn: Nils räcker ut ett tråg med locket stängt, på 8 m. |
| 02–03 | Ståbord A bärs in under markisen och ställs ned. Luckan står tom. |
| 04 | Kön står tätt under markisen, och tre äter vid det flyttade bordet. |
| 05 | Getingar vid ketchupen och den öppna burken, på 6 m. |
| 06–07 | Gästen stelnar till och backar. |
| 08–09 | Nils sätter lock på såserna, och getingarna flyger i väg. |
| 10–11 | Fel på kortläsaren med HUD-nålen, och Nils lutar sig ut. |
| 12–13 | Swish: telefonen över skylten, och skärmen blir guld. |
| 14 | Tre korvar kvar i lådan, och grillaren tar en. |
| 15 | Vegodelen med egen tång. |
| 16 | Hunden nosar, och gästen tar ett steg åt sidan. |
| 17 | Hunden dricker vid bord B. |
| 18 | Grillvagnens nya skylt på 20 m med HUD-nålen. Stamgästen syns vid vår vagn. |
| 19 | Stamgästen vid vår vagn skålar mot Grillvagnens skylt, på 13 m. Båda vagnarna syns. |
| 20–21 | Vagnens skylt efter och före, med HUD-kortet. |
| 22 | De tolv nya föremålen, uppifrån och från sidan. |

## Beslut 2026-10-08

Stamgästen står vid vår vagn och skålar mot Grillvagnen (ändrat i detta omtag). Godkända: getingarna 7 gånger verklig storlek, mässing i stället för rött på kortläsaren, och mild senap på hyllan.

## Öppet

1. **Talen:** `SAUSAGE.lowAt`, `RIVAL.halfSpecial`, `PRICES.truck.veg`, `PRICES.truck.soda` och `PRICES.truck.coffee` sätter Code i balance.ts.
