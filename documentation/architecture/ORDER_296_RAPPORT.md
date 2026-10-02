# ORDER 296 — Kärnan: talen och punkt 6 (rapport)

**Ordern** (Vision Owner 2026-10-02, efter provspelet av `64b27c0`): "Föreslå talen (startkapital, veckomål, mise en place-tid) och kör harness: en rimlig spelare ska klara säsongen, en slarvig ska riskera att stänga. Rapportera innan du bygger punkt 1–5. Punkt 6 kan du bygga direkt."

Besluten står i speldesignen under *Kärnan*. Gren `order-296` från `main` (`64b27c0`). Talen pekar på filer under `frontend/reports/order296/`.

## 1. Punkt 6 — byggd

| Felet | Rättningen | I produktionsbygget (`fixes.json`) |
|---|---|---|
| Tallrikarna stod på tomma bord | Tallriken står på bordet framför sällskapet: loungens bord, småbordens mitt och bardisken framför gästen (`wineBarRoom.ts` `PLATE_SURFACE`, `serviceFlow.ts` `tableAt`). | `fixes-dj-och-tallrikarna.jpg`. Tallrikarna står vid loungens gäster. |
| Den betalda DJ:n syntes inte | DJ:n står bakom båset de kvällar satsningen är vald, med kockens klipp tills hon har egna, som i händelserna. Från 21.00 pulserar båsets sken. Under en händelse med egen DJ står manusets DJ där i stället. | `djAtOpen` och `djAt2110`: `"1"`. Närbilden heter `fixes-dj-narbild.jpg`. |
| "För över" vid förlust | Vid förlust står det "Dras från kontot −323 kr". | `transferText` |
| Spelet öppnade utan råvaror | Räcker lagret till färre än hälften av de väntade gästerna, stoppar spelet och frågar: köp, öppna ändå eller avbryt (`morningBuy.ts` `openShortfall`, `OpenGuard.tsx`; `balance.ts` `MORNING_STAKE.askBelowCoverShare` 0,5). Frågan kommer från knappen *Öppna* och från inköpet. | `askedAfterBase`: `false`, alltså ingen fråga efter baspaketet. Testet visar frågan med tomt lager. |
| Ringarna hade ingen förklaring | Etiketten visas när muspekaren står över en anställd eller ringen: roll och uppgift, med Designs strängar (`ring.chip`). | `ringTag`: `"Diskare · Diskar"`, `fixes-ringens-etikett.jpg` |

**Tester:**
- `scene/__tests__/order296Fixes.test.ts` täcker tallriken vid sätena, frågan med tomt lager och strängarna vid förlust.
- Hela sviten är grön (2 261), och bygget är grönt.

## 2. Mätningen

`testHarness/__tests__/order296Karnan.test.ts` spelar 20 frön, vinbaren och brons i tre. Säsongen är åtta veckor från vecka 1, med introduktionshyran vecka 1–2. Utdata: `karnan.json`.

**Kassan.** Kassan är stor, så dagens nedgradering slår aldrig till. Veckans resultat (`opSek`) är resultatet före amorteringen och utan golvets påfyllnad.

**Förslagen räknas på samma veckor.** Kassan följs vecka för vecka från startkassan, med amorteringen enligt förslaget. Avvikelse: harnessen prövar inte om kassan räcker till inköpet. En spelare med liten kassa skulle i spelet kunna stoppas där.

**Spelarna** (`PLANS`):

| Spelaren | Inköpet | Raketerna |
|---|---|---|
| Mentorn | baspaketet varje morgon | bästa svaret |
| Rimlig | fyller på till bokningen | bästa svaret |
| Hälften rätt | baspaketet | rätt vartannat svar |
| Fel svar | baspaketet | sämsta svaret |
| Slarvig | för lite i lagret (`weakMorning`) | sämsta svaret |

Mätningen ändrar inget i spelet. Harnessen har fått svaret `'half'` (`weekHarness.ts`).

**Veckans resultat före amorteringen, i snitt** (`byWeek.meanOpSek`):

| Spelaren | v1 | v2 | v3 | v4 | v5 | v6 | v7 | v8 | Intäkt v3–8 |
|---|---|---|---|---|---|---|---|---|---|
| Mentorn | +8 226 | +6 652 | +1 689 | +988 | +924 | +852 | −59 | −1 053 | ~49 500 |
| Rimlig | +8 226 | +4 759 | −556 | −2 136 | −2 726 | −3 170 | −3 612 | −3 846 | ~43 400 |
| Hälften rätt | −10 881 | −19 381 | −17 873 | −22 457 | −19 964 | −21 399 | −20 961 | −22 278 | ~33 700 |
| Fel svar | −11 494 | −17 924 | −20 343 | −23 673 | −21 553 | −25 067 | −21 573 | −21 959 | ~32 400 |
| Slarvig | −34 419 | −34 394 | −41 278 | −41 061 | −41 048 | −40 570 | −41 221 | −41 087 | ~4 400 |

## 3. Vad mätningen visar

1. **Amorteringen avgör allt med 25 000 kr i start.**
   - Lånet (84 180 kr) amorteras i dag på säsongens åtta veckor, 10 523 kr i veckan.
   - Med 25 000 kr stänger varje spelare, också mentorns, i 20 av 20 säsonger, omkring vecka 7 (`proposals["start25000-amort8-target0"]`).
2. **Med full hyra går den rimliga spelaren back före amorteringen, och mer för varje vecka.**
   - Intäkten faller från 49 476 till 41 840 kr.
   - Det är samma fall i ryktet som i förslaget om satsningarna (2026-10-02): en missnöjd gäst kostar mer än tre nöjda ger tillbaka.
   - Ett veckomål på resultatet missas därför av alla.
3. **Risken är binär.**
   - Den som svarar rätt på hälften går lika illa som den som alltid svarar fel: omkring −20 000 kr i veckan, med intäkten 33 700 mot 49 500 kr.
   - Båda stänger i alla 20 säsonger, oavsett startkassa.
   - Det finns alltså ingen spelare som *riskerar* att stänga. Den som gör fel stänger, och den som gör rätt klarar sig.
   - Varför hälften rätt kostar lika mycket som allt fel är inte utrett.

## 4. Förslaget

| | Förslaget | Utfallet (20 säsonger) |
|---|---|---|
| **Startkapital** | **25 000 kr**, banklånet som i dag (finansierar lokalen) | Med amorteringen nedan klarar mentorn och den rimliga spelaren säsongen i 20 av 20. Lägsta kassan är 5 426 och 6 255 kr. 40 000 kr ger samma utfall med mer marginal. |
| **Amorteringen** | **Ingen under säsongen.** Räntan betalas per dag som i dag, och lånet amorteras efter säsongen. | 16 veckors amortering och 25 000 kr: den rimliga spelaren stänger i 14 av 20. Därför ingen amortering. |
| **Veckomålet** | **Veckans intäkt minst 40 000 kr** (0,95 × vinbarens normala veckointäkt, 42 090 kr), alla veckor. Målet ska gälla intäkten, inte resultatet; se §3 punkt 2. | Mentorn når målet 94 % av veckorna v3–8 och 100 % v1–2, och omförhandlas i 0 av 20 säsonger. Den rimliga spelaren når 74 % och 88 %, och omförhandlas i 5 av 20. Hälften rätt omförhandlas i 20 av 20. |
| **Omförhandlingen** | Efter två missade mål i rad kallar banken till möte. Räntan dubblas, från 5 till 10 %, resten av säsongen. | Ännu inte mätt; räntan är omkring 525 kr i veckan i dag. |
| **Stängningen** | Kassan är under noll vid tre veckoavräkningar i rad. Det ersätter dagens nedgradering, som räknar tre dagsavslut. | Hälften rätt och fel svar stänger vecka 4, slarvig vecka 3, i 20 av 20 säsonger. |
| **Mise en place** | 1 spelminut per inköpt portion och 1 per bokad gäst. Varje anställd hinner 25 minuter före öppning. Den extra handen på morgonen ger 25 minuter till och kostar 1 200 kr (hyrpersonal hela kvällen kostar 5 000 kr). Det som inte hinns görs efter öppning: köket börjar så många minuter senare. | Mentorn har 3 anställda och 75 minuter. Måndag–torsdag behövs 66–71 minuter; det räcker inte 6–29 % av morgnarna, med 1–2 minuter. Fredag behövs 85 minuter och det räcker inte 82 % av morgnarna (+11 min). Lördag behövs 93 minuter och det räcker inte 90 % (+18 min). Extra hand behövs alltså på helgen och sällan i veckan. Den slarviga köper för lite för att märka något. |

Källor: `players.<spelare>.proposals["start25000-amort0-target0"]` (stängningen och kassan), `mise[2]` (mise en place), `byWeek` (intäkten). Veckomålet på intäkten är räknat ur `runs` med samma definition.

**Förslaget uppfyller beställningen bara till hälften.** Den rimliga spelaren klarar säsongen, men den slarviga *stänger*; hon riskerar det inte. För att det ska bli en risk föreslås två ändringar innan talen låses:
- **Ett fel ska kosta mindre än i dag.** Följden av ett fel svar utreds på samma sätt som ryktet i förslaget om satsningarna: vad som sänker intäkten med 16 000 kr i veckan.
  - Mål: den som har hälften rätt stänger i 30–50 % av säsongerna.
  - Mål: den som alltid svarar fel stänger nästan alltid.
- **Ryktet ska hålla över en vecka för den rimliga spelaren.** Det är förutsättning 2 i förslaget om satsningarna. Då går den rimliga spelaren plus också med full hyra, och veckomålet kan stå på resultatet om Vision Owner hellre vill det.

## 5. Punkt 1, 3 och 4 — det som byggs

Inga nya tal behövs utöver dem ovan; de som behövs prövas när punkterna byggs.

**1. Hovmästarens beslut.**
- Köns *Bord först* finns redan.
- Nytt:
  - *bjud* på en gäst som väntat över tålamodet (tålamodet tillbaka, och kvällen bär kostnaden för ett glas);
  - *sälj in en flaska* vid ett sällskap som sitter (flaskan i stället för glasen, om lagret har den);
  - *flytta personal*: rollen följer dit spelaren pekar tills uppgiften är klar.
- Besluten visas som kort i rummet vid den det gäller.
- Taket på tre raketer per kväll tas bort för händelserna i rummet.
- Mål: ett beslut med 5–10 sekunders mellanrum när rummet är fullt, mätt i spelarens flöde.

**3. Följderna.**
- En missnöjd gäst med socialt kapital går ut genom dörren och vidare i byn till rivalens krog. Det är en figur, och den syns i byns nivåer.
- Nästa morgon står avbokningarna i posten och i bokningsboken.
- Recensenten skriver i tidningen dagen efter.
- Ryktet står i HUD:en och rör sig under kvällen, med pil.

**4. Konkurrensen.** HUD:ens band visar kvällens gäster per krog och uppdateras när en grupp väljer. Byns figurer för rivalernas gäster finns sedan 288, och syns nu också i krogens och gatans nivåer.

## 6. Ordningen, om förslaget godkänns

1. Risken (punkt 2) och mise en place (punkt 5), med talen ovan.
2. Felets kostnad och ryktet (§4), mätt med samma harness tills den som har hälften rätt riskerar att stänga.
3. Hovmästarens beslut (punkt 1).
4. Följderna (punkt 3) och konkurrensen (punkt 4).

## 7. Öppet

- Talen i §4 väntar på Vision Owner.
- Varför hälften rätt kostar lika mycket som allt fel (§3 punkt 3).
- Rapporten `reports/order271/wineBar-camera-view.json` räknar 8 stationer sedan DJ:n kom med i 295. Den skrivs om av testerna och är inte ändrad här.
