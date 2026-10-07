# ORDER 315a — Karriärstegen: datamodellen, erbjudandena och stjärnan i bistron (rapport)

**Underlag:**
- `~/Downloads/BESLUT_2026-10-07.md`, del 2 (Anders 2026-10-07).
- Förslaget `ORDER_315_FORSLAG.md` §1, §2 (kraven), §5 och §6.
- Ordertexten `~/Downloads/ORDRAR_314-316_D7.md`, ORDER 315.

**Gren:** `order-315a` från `main` (`3e7688db`, efter 316).

Varje tal pekar på en fil under `frontend/reports/order315a/`.

## 1. Datamodellen

**Stegen** (`balance.ts LADDER`):
- Alla åtta steg står i ordning (`order`). Spelbara i v1 är foodtrucken, vinbaren och bistron (`playable`).
- Varje steg har:
  - verksamhetens klass;
  - huset (vinbaren och bistron delar `w869907975`);
  - om stjärnan är möjlig (bara bistron);
  - faktorer på notan, lönerna och priset.
- **Bistron** byggs om från vinbaren i samma hus och spelas i vinbarens klass, med samma rum och samma frågebank.
  - Den har egna faktorer: notan 1,15, lönerna 1,08 och priset på en veckointäkt gånger 1,25.
  - Faktorerna är utgångspunkter och kalibreras i 315c.
- Bistrons egen frågebank (bistroklassiker, husmanskost och vin till maten) ingår inte i 315 och väntar på en senare order.

**Kraven** (`LADDER.requirements`, BESLUT del 2):

| Steg | Kassan vid dagens slut | Ryktet | Medaljerna |
|---|---|---|---|
| Vinbaren | 30 000 kr | 50 av 100 | brons i Stensöta |
| Bistron | 60 000 kr | 60 av 100 | silver i Metodköket och brons i Stensöta |

**Tillståndet:** `state.ladder` (`sim/ladderStep.ts LadderState`) innehåller:
- steget;
- dagen varje steg nåddes;
- Åsas erbjudande: steget, insatsen, lånet, `offered` eller `declined`, och dagen erbjudandet kom.

Spel från före ordern saknar fältet. Steget läses då ur verksamhetens klass.

**Modulerna:**
- `sim/ladderStep.ts`: steget och dess egenskaper. Ekonomin läser den.
- `sim/ladder.ts`: kraven, erbjudandet och köpet.

## 2. Erbjudandet

- **När:** vid dagens slut, efter veckoavräkningen (`offerAtNight` i nattens övergång i `reducer.ts`). Det kommer när kraven för nästa steg är uppfyllda.
- **Ett erbjudande står kvar.** "Inte än" (`LADDER_DECLINE`) kostar inget, och spelaren kan stanna i steget hela säsongen (BESLUT del 2, fråga 2).
- **Ta över** (`LADDER_TAKE`) går bara på morgonen och kräver att insatsen finns i kassan.
  - **Vinbaren:** klassbytet (`changeClass`) med vinbarens lån och lag. Ryktet följer med oförändrat (fråga 1, `LADDER.reputationFactorOnPurchase` 1); vid andra klassbyten halveras det fortfarande.
  - **Bistron:** insatsen dras ur kassan och ombyggnaden läggs till vinbarens lån. Huset, rummet och ryktet är oförändrade.
- **Insatsen** är 25 % av stegets veckogolv, som vid uppgradering. **Lånet** är stegets startlån: två veckors intäkt.

**Åsas kort** (`ui/LadderOfferCard.tsx`) visas på morgonen efter recensionerna.
- Det har avsändaren Åsa, steget, Åsas replik, priset, "Din väg" och knapparna "Ta över" och "Inte än".
- Repliken om vinbaren står ordagrant som i ordern: *"Grattis! Du har ett gott rykte i byn, och jag har hört att du fått in pengar. Nu kan du, helt frivilligt, ta över vinbaren."*
- Avböjt blir kortet en rad överst, "Åsas erbjudande står kvar: …", som öppnar kortet igen.
- Åsa äger inte huset. Repliken om bistron säger att ägaren låter spelaren bygga om.
- Formen väntar på Designs D7.

**"Din väg"** (`ui/DinVag.tsx`, knappen överst till höger på morgonen och på Åsas kort) visar:
- de åtta stegen och var spelaren står;
- stjärnans steg;
- de låsta med "Kommer senare";
- kraven för nästa steg med bocken för det som är uppfyllt.

## 3. Stjärnan

- Stjärnan delas bara ut i bistron (`settleWeek`: `starsPossible`). Vinbaren får den aldrig, inte ens med samma vecka.
- Butikens väg mot stjärnan har raden "Stjärnan delas ut i bistron." (`shop-star-bistro`).
- Öppningens rad "Målet är stjärnan" står kvar.

## 4. Harness: tiderna till stegen

`scripts/order315a-harness.sh` kör samma 16 körningar som 314 och den nya spelartypen "försiktig".
- "Försiktig" är som stjärnjägaren med 0,85, men väntar en vecka med erbjudandet (`MorningPlan.ladder: 'careful'`).
- Övriga spelare tar erbjudandet första morgonen det står (`weekHarness.ts answerLadder`).
- Säsongen börjar i vinbaren med brons i tre som förut. Foodtrucken som start kommer i 315b.
- Fältet `ladder` i varje rapport ger hur många som nådde vinbaren och bistron och veckorna (`efter40/<namn>.json` `players.<spelare>.ladder`).

| Spelaren | Stängda | Kassan i slutet | Nådde bistron | Median, veckan | Stjärnan |
|---|---|---|---|---|---|
| Stjärnjägaren 0,85 | 0 av 40 | 94 522 kr | 19 av 40 | 5 | 9 av 40 (23 %) |
| Stjärnjägaren 0,75 | 0 av 40 | 52 488 kr | 0 | — | 0 |
| Stjärnjägaren 0,6 | 34 av 40 | −13 739 kr | 0 | — | 0 |
| Försiktig 0,85 | 0 av 40 | 92 633 kr | 17 av 40 | 6 | 10 av 40 |
| Enkel 0,85 | 0 av 40 | 59 449 kr | 29 av 40 | 5 | 25 av 40 |
| Soigné 0,85 | 1 av 40 | 134 965 kr | 34 av 40 | 3 | 30 av 40 |
| Den kloka | 0 av 40 | 65 126 kr | 0 | — | 0 |
| Mentorn | 0 av 40 | 46 520 kr | 0 | — | 0 |
| Halva | 29 av 40 | −11 360 kr | 0 | — | 0 |
| Ignorerar | 40 av 40 | −53 661 kr | 0 | — | 0 |

**Läsningen:**
- Stjärnjägaren med 0,85 får stjärnan i 23 % av säsongerna, mot målet omkring 50 %. Med 0,75 får den aldrig stjärnan, mot målet 10–25 %. Det kalibreras i 315c, med säsongen från foodtrucken.
- Den kloka och mentorn gör inga prov och når aldrig silver i Metodköket, alltså aldrig bistron. Anders nya mål är "nå bistron och vara bland de tre bästa". Deras planer behöver därför prov mot bistrons medaljer, och det görs i 315c.
- Ryktet 60 nås sällan. Det genomsnittliga ryktet vid sista avräkningen är 0,35 för stjärnjägaren med 0,85 (`meanRepAtSettlement`). Kravet är en utgångspunkt och vägs i 315c.
- Halva stänger nu 29 av 40, mot 19 av 40 i 314. Halva når inte bistron, så skillnaden kommer från 316:
  - orken sjunker nu under kvällen;
  - fikat ger kostnader och en ändrad trivsel.
  - Vilken av dem som väger mest är inte mätt. Kalibreringen görs om i 315c.

## 5. Körningar och spelarens flöde

- `npm run typecheck`: grönt. `npm run build`: grönt.
- `npx vitest run`: 184 filer gröna och 13 hoppade; 2 520 tester gröna, 2 förväntade fel och 18 överhoppade.
- Två tester ändrade med regeln:
  - `order296cStar` står nu i bistron (`ladder.step`);
  - kravets fält heter `medalsRequired`, så att `order264Knowledge` inte läser kravet som en skrivning av medaljerna.
- **Nytt test:** `src/sim/__tests__/order315aStegen.test.tsx`, 13 fall. Det prövar:
  - stegen och kraven;
  - erbjudandet, Inte än och Ta över för både vinbaren och bistron;
  - ryktet;
  - stjärnan bara i bistron;
  - kortet;
  - Din väg;
  - Åsas replik ordagrant.
- **Spelarens flöde i produktionsbygget:** `scripts/order315a-offer-check.mjs`, med sparfilen måndag vecka 2 i vinbaren och kraven för bistron och ett erbjudande satta (`offer-en.json`, `offer-sv.json`, `ok: true`).
  - Kortet kommer efter recensionerna, med Åsa, bistron, priset och Din väg: åtta steg varav fem "Kommer senare".
  - Inte än ger raden. Din väg visar vinbaren som "Du är här".
  - Ta över ger bistron.
  - Bilderna heter `offer-<sv|en>-{kort,avbojt,dinvag,taget}.png`.
- **Inte kontrollerat i spelarens flöde:** att erbjudandet uppstår vid dagens slut. Det prövas i testet (`offerAtNight`).

## 6. Frågor

1. **Bistrons faktorer** (notan 1,15, lönerna 1,08 och priset 1,25) är valda som utgångspunkt. Ska bistron ha egna mål för kassan, eller bara stjärnan som mål?
2. **Ryktet 60 för bistron** nås sällan med dagens rykte. Ska kravet sänkas, eller ryktet gå lättare att bygga?
