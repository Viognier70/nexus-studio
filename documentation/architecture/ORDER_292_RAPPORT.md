# ORDER 292 — Följden syns (rapport)

**Ordern** (Vision Owner 2026-10-01, provspel av `316b4c3`: "Tekniken fungerar, men spelet är inte roligt än: spelaren tittar mest på, kunskapens följder syns inte, och varje kväll är likadan"):
- insatsen före svaret;
- följden efter svaret i rummet och i kassan;
- kameran vid alla raketer;
- rusningarna;
- följder nästa dag;
- personalen som aldrig står still;
- kassan som står still efter servicen.

Med beslutet efter inventeringen (`INVENTERING_DESIGNLEVERANSER_2026-10-01.md`) kom också:
- samspelen, `IDLE_RULE`, otåligheten och turordningen;
- handrekvisitan och huvudbonaderna;
- klippen `bar.wipe` och `guest.riseGreet`;
- ringens färger;
- de fyra gamla testerna.

Besluten står i speldesignen (Servicen, beslut 2026-10-01, och Idéer för version 2).

Gren `order-292` från `main` (`ea51830`). Talen nedan pekar på filerna under `frontend/reports/order292/` och fälten där.

## 1. Kassan står still efter servicen

**Orsaken:** lönerna, räntan och satsningarnas följd i kronor drogs vid dygnsskiftet, alltså efter kvällens skärmar. Köket kostade dessutom per minut på morgonen.

**Rättelsen:**
- Dygnets kostnader dras när servicen stänger, också när kvällen faller ihop (`strategic/simulation/dayEnd.ts` `chargeDayEnd`, flaggan `day.dayEndCharged`). Kassan vid stängningen är därmed kontot efter överföringen (T2).
- Dygnsskiftet drar dem bara för en dag utan service.
- Köket kostar bara under servicen (`reducer.ts` `costPerMinuteToTick`).

**Testet** (`order292Consequences.test.ts`, *kassan står still*, sex frön): kassan är exakt densamma från stängningen, genom tio spelminuter på kvällens skärmar, natten och två spelminuter in på nästa morgon.

**De fyra gamla testerna:**
- `order290EveningEconomy`: kassan vid dagsavslut är kassan när kostnaderna är dragna (`economy.ts` `dayEndCash`).
- `order230LunchDinnerMetrics`, tre fall: kvällens redovisning räknar kostnaderna från stängningen, och dygnsskiftet drar inga löner om de redan dragits.

## 2. Insatsen och följden

**Insatsen före svaret.** Raketen får bordets insats när den öppnas (`sim/incidents.ts` `tableStake`):
- notan räknas med beställd nota per gäst, och kvällens snittnota för den som inte har beställt (utan notor i kväll `ANSWER_EFFECTS.stakeDefaultBillSek`, 350 kr);
- antalet gäster och gästtyperna räknas också.

Kortet visar den överst: "Bord 4: 200 kr och en gäst" (`scene.json` `rockets[0].stake`). Gästen med socialt kapital nämns ("en av dem tar med sig byn"). Stamgäster med namn kommer med 287b.

**Följden efter svaret** (`answerConsequence`):
- **Rätt svar:** bordet beställer ett glas husets vin till, ur lagret och till listans pris. Beloppet går in i kvällskassan direkt och flyger dit från kortet, och stapeln fylls och hoppar när lappen landar (`TillBar.tsx`). Utan vin i lagret gäller sex procent av bordets nota, som förut men nu direkt.
  - I produktionsbygget: +115 kr per klarat steg, kvällskassan 0 → 115 → 230 → 345 kr (`scene.json` `rockets[0..2].bandAmount`, `tillBefore`, `tillAfter`).
- **Fel svar:** gästen med störst nota vid bordet går utan att betala. Stolen blir tom, beloppet streckas över och tonas bort, och de andra vid bordet blir missnöjda.
  - När felet köar en följdraket vid samma bord sitter gästerna kvar och notan sänks med sex procent, eftersom följdraketen är följden.
  - I produktionsbygget: −130 kr, gästen vid bord 6 går (`scene.json` `rockets[3].bandAmount`). I en tidigare körning med samma skript: −713 kr, "En gäst vid bord 8 går · stolen står tom" (`scene-21-raket-2-steg-0-wrong.png`).
- **I rummet:** händelsen står över bordet, med beloppet och texten (`RoomReactionTag.tsx`). Rummets reaktioner ritades inte alls före den här ordern (`day.roomReactions` fanns bara i simuleringen).

**Kameran** glider in vid varje raket:
- också den spelaren startar själv och den utan figur;
- mot figuren, annars bordet, annars rummets mitt;
- saknas punkten väntar glidningen tills den finns (`theatreStage.ts` `camera`, `ServiceCamera.tsx`).

I produktionsbygget stod kameran på 12 m vid båda kvällens raketer (`scene.json` `rockets[].camDistance`).

## 3. Rusningarna

**Vågorna** (`strategic/simulation/rush.ts`, talen i `balance.ts` `RUSH`, F61):
- **Bilarna** från Örebro och Karlstad kommer 19.30 onsdag till lördag: höginkomsttagare i sällskap om två till fyra.
- **Bussen** kommer 20.15 fredag och lördag: medelinkomsttagare i sällskap om tre till fem.
- Vågens gäster är kvällens tak gånger andelen gånger rummets dragningskraft (`arrivals.ts` `arrivalAttraction`, utbruten ur ankomsterna). Det jämna flödet minskas lika mycket, så att kvällens gäster blir ungefär lika många men kommer i vågor (testet *ungefär lika många*, sex frön).
- Måndag och tisdag är lugna, som speldesignen säger.
- I produktionsbygget en fredag: "Bilarna från Örebro och Karlstad är här · 8 gäster i 2 sällskap" och "Bussen är här · 16 gäster i 4 sällskap" (`scene.json` `waves`). Kön med väntande sällskap nådde tre (`queue.maxParties`).

**Kön vid dörren** (`ui/service/QueuePanel.tsx`): sällskapen som väntar, i ankomstordning, med storlek, vem de är, väntan och tålamod.
- Tålamodet räknas mot samma gräns som gästen ger upp vid (`queuePatienceSeconds`).
- Gästen blir otålig efter `serviceFlow.ts` `IMPATIENT_AFTER`.
- Aviseringen om vågen står överst en stund.

**Turordningen** (`service.ts`): den som kom först får bord först.
- En nyanländ gäst ställer sig sist i kön i stället för att ta en ledig plats förbi den.
- Med *Bord först* får det valda sällskapet varje plats som blir ledig tills alla i det sitter, och de andra väntar.
- Simuleringstestet visar att det valda sällskapet får plats före dem som stod före i kön. I produktionsbygget lämnade inget av de tidigare sällskapen kön före det valda (`scene.json` `queue.goneBeforeChosen` 0).

**Sommeliern som värd i dörren** (`wineBarDirector.ts` `hostAtDoor`), tills Design levererar en egen värd:
- När någon står i kön går hen till entrén, välkomnar den som kommer (`poseWelcome`) och håller kön under uppsikt (`poseAttend`).
- Ringen har värdens färg så länge (`staffMarks.ts` `setStaffMarkRole`).

Köplatserna räknas i koden (tio på rad utanför dörren, `WineBarFigures.tsx`).

## 4. Följder nästa dag

När servicen stänger blir kvällens raketer bokningar till nästa servicedag (`sim/nextDay.ts`, `NEXT_DAY`):
- en klarad raket ger två bokningar, en fälld kostar en;
- de står per raketens spår.

Marknadens tak den dagen följer (`economy.ts` `dailyGuestCap`). Bokningsboken visar dem överst som egna rader: "3 bokningar tack vare gårdagens vin", eller "1 avbokning efter gårdagens mat" (`BookingBook.tsx`). Testet visar båda riktningarna.

## 5. Teatern

- **`IDLE_RULE`** (`serviceScore.ts`): ingen står utan arbete i bild mer än 2 s, också före öppning.
  - Bartendern torkar baren (`bar.wipe`), kocken och diskaren arbetar vid sina stationer.
  - Servitörerna får `poseFillWork`.
- **Samspelen** (`theatreInteractions.ts`, Designs `figureInteractions.ts`). Regissören bestämmer vem som gör vad och när, och samspelets schema ger båda parterna klipp med samma tid:
  - beställningen och notan (servitören och gästen);
  - vinserveringen (sommeliern och gästen som provar);
  - skålen och samtalet (två vid samma bord);
  - passet (kocken och servitören);
  - disken (servitören och diskaren);
  - mötet i gången (den som inte bär väjer).
- **`guest.riseGreet`:** den som redan sitter reser sig och hälsar när någon i sällskapet kommer till bordet.
- **Handrekvisitan och huvudbonaderna** (`figureProps.ts`):
  - varje gästfigur har en frisyr eller bonad;
  - portföljen syns hos bilarnas gäster och kameran hos bussens, medan de går eller står i kön.
- **Ringens färger** är Designs från 2026-09-30: inget rött eller grönt, och värden i grädde. Ingen senare färgleverans finns.

## 6. Skärmarna

- Köpanelen slutar före kvällskassan, så att insatskortet inte täcker den.
- Bemanningens erbjudande ("Hyrpersonal erbjuds") har den varma formen och står ovanför flikarna. Förut låg det över dem.
- Raketens utfall över rummet sänks när kameran är nära, så att det inte klipps i överkanten (`IncidentOutcomeBubble.tsx`).

## 7. Balansen

| Mätning | Värde | Fil och fält |
|---|---|---|
| Slumpen, den bättre spelaren vinner (mål 70–80 %) | 80 % av 1 000 veckor | `randomness.json` `winShare` |
| Den rimliga spelarens vinst av veckointäkten (mål 5–10 %, F59) | 20,7 % | `rent-check.json` `rows[0].reasonable.meanShare` |
| Den svaga spelaren nedgraderas | vecka 3 i alla 20 frön | `rent-check.json` `weakDowngradeWeeks` |
| Första veckan som mentorn säger: veckor med förlust | 0 av 20 | `first-week.json` `players.mentorn.weeksWithLoss` |
| Första kvällen som mentorn säger, medel / sämsta | +1 326 / −2 459 kr | `players.mentorn.firstEvening` |

Mot ORDER 291 (77,6 % och 19,2 %) har ekonomin ändrats på fyra sätt: glaset vid rätt svar, köket som bara kostar under servicen, vågorna och gårdagens bokningar. Mätningen skiljer inte på dem. Hyran väntar till 288a (F59). Den rimliga spelarens rykte vid veckans slut är oförändrat (0,128 mot 0,133 i 291, `randomness.json`, medel av `pairs[].baseline.reputationEnd`); att ryktet faller under veckan är samma fynd som förslaget om satsningarna (`FORSLAG_SATSNINGAR_2026-10-01.md`).

## 8. Spelarens flöde

**Veckan från bussen** i produktionsbygget, på svenska (`scripts/order271-dod-from-start.mjs`, `REPORT_ORDER=order292 GAME_LANG=sv`), med bara spelarens knappar. Utdata `frontend/reports/order292/dod.json` och `dod-*.png`.
- Alla fem kvällarna går S1 → T2 → R1 → L1 → K1 (`eveningSequences`). Inga sidfel (`errors` tom), 29 fps under servicen (`fpsService`).
- Måndagens resultat: T2 +686 kr (`t2.result`), R1 +686 kr (`r1[result-money].delta`).
- Ryktet föll 41,4 poäng på måndagen (`r1[result-reputation]`, i 291 20,5). Skriptet svarar med avsikt fel på den andra raketen, och fel svar låter nu en gäst gå. Den rimliga spelaren i harnessen slutar veckan med samma rykte som i 291 (avsnitt 7).
- Bokningsboken på tisdagen: "2 avbokningar efter gårdagens vin" och "4 bokningar tack vare gårdagens mat" (`dod-46-bokningsboken-2.png`).
- Lördagen: händelsen över bordet, "+115 kr · Bord 4 beställer mer" (`dod-22-lordag-figurerna-1.png`).
- Samma körning visade att morgonens innehåll gick in under HUD:en när skärmen rullades (rubriken klipptes). Ett band bakom HUD:en rättar det (`screens.css`); bilden efter rättelsen är `scene-00b-morgonen-rullad.png` (`scene.json` `morningScrolled` 400).

## 9. Tester och skript

- `frontend/src/sim/__tests__/order292Consequences.test.ts`: kassan står still; vågorna; lika många gäster; *Bord först*; följder nästa dag.
- Ändrade tester: `order290EveningEconomy` (insatsen och följden), `order230LunchDinnerMetrics` (kassan efter servicen).
- `frontend/scripts/order292-scene.mjs`: en fredag i produktionsbygget (morgonen rullad, vågorna, kön, raketerna, kameran, kassan), utdata `scene.json` och `scene-*.png`.
- Hela sviten: 2 237 gröna, 6 överhoppade. Typecheck och bygget gröna.

## 10. Avvikelser och öppet

- **Samspelen** är inkopplade, men inte uppmätta bild för bild:
  - passets och diskens samspel startar ur regissörens segment och närhet, inte ur Designs `syncs` på händelsenivå;
  - `checkInteractions` mäter Designs schema, inte rummet.
- **Bord först** prövas i simuleringen. Skriptet ser bara att sällskap lämnar kön och kan inte skilja på bord och att ge upp (`scene.json` `queue.goneBeforeChosen`).
- **Rykte:** en kväll med fel svar sänker ryktet mer än förut, eftersom en gäst går. Att den rimliga spelarens rykte faller under veckan gäller fortfarande (förslaget om satsningarna).
- **Stamgäster med namn** i insatsen kommer med 287b.
- **F61:** orderns valda tal (vågorna, glaset, bokningarna).
- **F59:** vinsten är 20,7 %, över målet. Hyran väntar till 288a.
