# ORDER 324 — Beslut om FÖR_GRANSKNING_323.md och layouten i små skärmar (rapport)

*Anders 2026-10-10. Gren `order-324` från main `396f191b`.*

## A. Besluten i spelet

Beslutsfilen ligger i `documentation/blueprints/BESLUT_GRANSKNING_323.md`, oförändrad. Allt i den är infört på svenska och engelska samtidigt, utom ft06 (se nedan). Testet `frontend/src/content/__tests__/order324Beslut.test.ts` läser samma tabeller som spelet och låser besluten.

**Vagnens fikadilemman** (`content/fikaStrings.ts`, `content/fika/dilemmas.ts`)
- Kylboxen: svar A kostar `discardGoodsSek` (900 kr i `sim/balance.ts` `FIKA.economy`). Förklaringens andra mening är ny: "Värmen på grillen dödar många bakterier, men en del hinner bilda gifter som inte förstörs av värme." Lagtexten står kvar ogranskad (`legalReviewed: false`) tills Anders har läst den.
- Kön: oförändrad.
- Dricksen: frågan, de tre svaren och förklaringen är omskrivna enligt beslutet. Nivåerna är oförändrade (A väl, B svagt, C delvis).
- Benen: oförändrad. Lagtexten står kvar som `false` tills juristen anger rätt AFS; det står som en kommentar i `dilemmas.ts`.
- Kortet: nytt svar A, "… en reserv när tekniken krånglar: Swish och en andra läsare."

**Termerna** (`nexusStrings.ts`, `fikaStrings.ts`, `d8Strings.ts`, `design/*Strings.ts`, `vinbar.text.en.json`)
- Kvarteret: "Block" på nivåraden, "The Block" i platsnamnet, "the block" i texterna. Nivåerna heter Village, Block, Street, Your place.
- Kassan:
  - "Cash" för spelarens pengar: mätarna, risktexterna, inköpen och "Not enough cash".
  - "Tonight's takings" för kvällskassan: HUD:ens etikett som förut hette "Tonight", serviceläget, avräkningen och bokföringen.
  - "till" bara för den fysiska kassan (pulten, kassarapporten).
- Ork och trivsel heter Stamina och Morale.
- "Back to your place", "The house puts together …", "your venue's contact".
- Satsningar heter Initiatives, också i bokföringen. Investering (kurserna, banken) står kvar som investment.
- Drinks list (morgonens inköp). Vinlistan i vinbaren står kvar som wine list.
- Truck i Byn i kväll och i Designs prototyptexter.
- Bin lorry överallt.
- "SEK n" i stället för "n kr" på sex rader.
- The income floor; kolumnen i bokföringen heter "Inc. floor", eftersom kolumnerna är förkortade.
- Rollerna: maître d', chef, kitchen porter (diskmaskinen heter fortfarande dishwasher).
- Grepp står kvar som grip. Rekvisitans rubrik heter Hold, och eldens "low grip" heter "low hold".
- Fikats nivåer: Well/Partly/Weakly grounded.
- Avräkningen: "the rest of the outlay".
- Pulten: host stand överallt.
- Brittisk engelska: genomgången hittade två amerikanska ord, "wine store" → "wine shop" och "first in line" → "first in the queue".

**Onaturlig engelska, frågebanken och svenska fel**
- Alla förslag i 2.2 är införda.
- Pyramiden följer triaden: "Vad och varför, hur och när. Du kunde alla tre." / "What and why, how and when. You knew all three."
- Frågebanken: stensota-brons-02 well-aged, kalastorget-brons-06 och stensota-brons-10 a touch of sweetness. Ändringarna är gjorda i `bank.text.en.json` och i källfilen `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`, som testet `stensotaBrons.test.ts` prövar mot.
- Utkasten: somm-dg2 enligt förslaget. somm-h2 är omskriven till "Låt flaskan stå upprätt ett dygn, svalt." / "Stand it upright for 24 hours, somewhere cool." Utkasten har ingen källfil i dokumentationen.
- mn02 "i ett glas med vid kupa"; ft13 "bara lite mer än hälften så mycket" (på båda språken); Måltidsbiblioteket.
- Hjulsjö står i den engelska repliken (vb02) och i testet över tillåtna svenska namn.

**somm-h7, sammanhanget.** Frågan gäller ett vin som "redan efter tre sekunder" har "en skarp, unken doft", och rätt svar är att det är korksmakat (TCA). Förklaringen beskriver alltså ett fel i vinet. "mustig" är därför ändrat till "möglig": "TCA-korksmak … känns igen som en fuktig, möglig, unken ton." Engelskan ("damp, mouldy, musty") var redan rätt.

**ft06-stangningen, steg 2, för Claude** (`content/incidents/foodtruck/bas.text.sv.draft.json` och `.text.en.json`). Inget är ändrat; svar A skrivs om av Claude.
- Situationen: "Kön har tagit slut, det ligger korv kvar i varmhållningen, och en sista gäst läser på förpackningen."
- Steget: phronesis, frågeformat 20, märkt `legal: true`. Fel svar ger stämningen −0,04 och ryktet −0,5 (`bas.meta.json`).
- Frågan: "Kvällen är slut, och det finns tio grillade korvar kvar. Vad gör du?"

| Svar | Kvalitet | Svar (sv) | Förklaring (sv) | Svar (en) | Förklaring (en) |
|---|---|---|---|---|---|
| A | fel | Kyler dem i varmhållningen och säljer dem i morgon. | Varmhållen mat ska inte säljas igen nästa dag. | Cool them in the warmer and sell them tomorrow. | Food kept hot should not be sold again the next day. |
| B | bäst | Kastar dem som stått varmhållna, och planerar mindre till nästa kväll efter hur kön gick. | Rätt. Det som stått varmt slängs, och nästa kväll grillar du efter kön. | Throw away those that stood in the warmer, and plan fewer for the next evening by how the queue went. | Right. What has stood hot is thrown away, and next evening you grill to the queue. |
| C | fel | Ger dem till medhjälparen att ta hem utan att tänka på hur länge och hur varmt de har förvarats. | Det gör inte maten säkrare att den äts hemma. | Give them to the helper to take home, without thinking about how long or at what heat they have been kept. | Eating it at home does not make the food safer. |
| D | fel | Lägger tillbaka dem i förpackningen. | Grillad korv blir inte rå igen. | Put them back in the packet. | A grilled sausage does not turn raw again. |

Om steget misslyckas: "Det som blev över hanteras fel." / "What was left over is handled wrongly."

**Följdändringar i testerna**
- `order300bBorjan.test.ts` (settlements).
- `m2.test.ts` (Initiative effect).
- `order273NoSwedishPlayerText.test.ts` (Hjulsjö).
- Speldesignens språkrad sedan 323b nämnde ordernumret, och `balance.test.ts` läste 323 som ett speltal; testet föll alltså på main efter 323b. Raden säger nu "efter provspelet 2026-10-09". Datum räknas inte som tal.

## B. Layouten i små skärmar

| Krav | Ändring |
|---|---|
| Panelflikarna får inte ligga över kameraknapparna | Under 1280 px bredd står flikarna utan tangenttipset "1–3 öppnar · Esc stänger". Ikonerna har sina etiketter vid hovring, och tangenterna gäller som förut (`service.css`, sista blocket). |
| Stämningsmätaren får inte ligga över fartknapparna | Under 1280 px slutar raden uppe till vänster 150 px före högerkanten (plus marginalen). Mätaren tar det som blir över, minst 120 px. Kassarutan är bredare under raketen, så en fast bredd räckte inte; det visade den första omkörningen. |
| Ingen text under 12 px | Golvet 12 px på `.nxs-row-sub`, `.nx-sender-sub` och alla teckenstorlekar i `service.css` som skalar med fönstret upp till 24 enheter (24 regler, bland dem raketens berättelse, räknare och fot). |
| Morgonens lista rullar så att allt kan nås | Listorna rullade redan. Rullisten ritas nu tunn och synlig (`scrollbar-width`, `scrollbar-color`); i den huvudlösa webbläsarens bilder syns den inte, så det är inte belagt med bild. Kontrollen prövar i stället att varje paviljong går att rulla fram. |

**Kontrollens kriterium för listan är ändrat** (`scripts/order300-layout.mjs`, `shelfHidden`). Förut, enligt ORDER 300 §3, skulle alla paviljonger synas utan att listan rullas. Nu gäller Anders krav att allt ska kunna nås. En rad räknas som dold om den inte står i en lista som rullar och ligger i fönstret, eller om den inte står helt i listans ruta när kontrollen rullar fram den. Raderna som kräver rullning redovisas för sig (`shelfBelowEdge`).

**Kontrollen i sju storlekar** (produktionsbygget, svenska; `frontend/reports/order324/layout.json`):
- 16 skärmar × 7 storlekar = 112 rader, alla godkända, inga sidfel.
- Före (`frontend/reports/order323b/layout.json`): 4 underkända i 1180 × 660 och 13 i 1024 × 600.
- I 1024 × 600 kräver Gastronomiska Teatern rullning i fem skärmar (öppningen, regelkortet, mentorn, första morgonen och reglerna). Där syns den helt när listan rullas.
- Bilderna `layout-servicen-1024x600.png`, `layout-servicen-1180x660.png`, `layout-raketen-1024x600.png` och `layout-morgonen-dag1-1024x600.png` ligger i samma mapp.

## Tester och bygget

- Hela sviten: 2 748 gröna, 1 förväntat fel, 19 överhoppade.
- Typecheck grön. Bygget grönt (layoutkontrollen bygger själv).

## Återstår

- ft06 steg 2, svar A: Claude skriver om det, och sedan förs det in.
- Lagtexterna: kylboxen väntar på Anders, benen på juristen (rätt AFS).
- Den engelska texten är inte mätt i layoutkontrollen; den körs på svenska. Under 1280 px bredd är tangenttipset vid flikarna dolt.
