# LEVERANSNOT — det varma designsystemet

**Leverans** 1 av 5 efter tredje provspelet
**Datum** 2026-09-29
**Till** Claude Code
**Från** Claude Design
**Gäller** Den varma formen: tokens som ersätter vitt och rött, och prototyper av morgonen, inköpen, raketkortet, lärdomen, tidningen och kvällens resultat (ny skärm)

Nästa leverans är 2: teaterns grund (namngivna klipp på riggen, tempo, handpunkter, rekvisita i meter).

---

## 1. Innehåll

| Fil | Status | Vart | Vad |
|---|---|---|---|
| `nexusTheme.warm.ts` | ny, ersätter Modernist-tokens | `src/ui/theme/` | Färg, ytor, rumsgradering, typsnitt, typskala, radier, skuggor, avstånd, stegens och svarsradernas tillstånd, knappar, ikoner. Längst ned `REPLACES`: vad varje gammal token blir. |
| `nexus-warm.css` | ny | `src/ui/theme/` | Samma värden som CSS-variabler (`--w-*`), för DOM-lagret. |
| `nexusStrings.varm.ts` | ny, 201 nycklar | slås in i `STRINGS` i `nexusStrings.ts` | All text på de sex skärmarna, `{ sv, en }` per nyckel. Engelskan är brittisk, som tidigare. |
| `prototyp/Varma formen - prototyper.html` | ny | läses, monteras inte | Alla sex skärmar i båda storlekarna, med SV/EN-växel. Plus och minus i inköpen och svaren i raketkortet går att trycka på. Fristående fil. Ikonerna hämtas från unpkg (lucide 0.460.0). |
| `skarmar/1440x900/1–6-*.png` | nya | — | Kontrollbilder i helskärm 1440 × 900 (16:10). |
| `skarmar/1280x720/1–6-*.png` | nya | — | Kontrollbilder i helskärm 1280 × 720 (16:9). |

Bilderna är skärmdumpar av prototypen och innehåller ingen text utöver den som kommer ur nycklarna. Rummen bakom panelerna är renderingarna från spelarens kamerahöjd (leveranserna 2026-09-26).

## 2. Beslut

**Trä för det man styr med, papper för det man läser.** HUD, stegen, svaren och mätarna ligger på valnöt med en tunn mässingskant (`surface.panel`). Menyn, bokningsboken, lärdomen och tidningen är papper (`color.paper`) som lutar högst 1,2° (`surface.paperTiltDeg`).

**Rött finns bara på ett ställe.** `color.ember` används för klockans sista halvtimme och för varmrätter som inte räcker till alla bokade. Handling, klarat och rätt svar är guld (`color.gold`), och det som pågår är ljuslåga (`color.candle`). Fel svar och förlorade steg är streckade i grädde, aldrig röda (`step.failed`, `answer.wrong`).

**Typsnitt:** Young Serif (endast vikt 400) för rubriker och siffror i HUD:en, Figtree 500–800 för text och knappar. Archivo utgår.

**Samma layout i båda storlekarna.** Storlekarna följer skärmhöjden, `max(minPx, vh)`. Typskalan i `WARM.type` anger båda värdena, och inget ord är mindre än 12 px vid 1280 × 720. Prototypen gör detta med containerenheter (`cqh`/`cqw`) på skärmroten. I spelet motsvarar det `vh`/`vw` i helskärm.

**Rummet graderas varmt bakom panelerna.** Filtren står i `WARM.roomGrade`: morgonen gyllene, servicen levande ljus och tiden efter stängning dämpad. Filtren gäller renderingarna i provspelet. När scenen renderas live ska ljussättningen göra samma sak.

**Knappar:** texten står till vänster och pilen till höger, som tidigare. Huvudknappen på trä är guld med mörk text, och på papper är den mörk med ljus text (`WARM.button`). Fokus är en ljus mässingsring, 2 px (`button.focus`).

## 3. Skärmarna

1. **Morgonen** (`brief.*`): mentorn i en pratbubbla på papper, dagens körschema på trä och bokningsboken på papper. Bokningsboken visar gästtyperna med sina färger ur `WARM.guest` och kopplar till leverans 4.
2. **Inköpen** (`buy.*`): menykortet med runda plus- och minusknappar, minst 36 px. Leveransen visar varmrätternas täckning, vinet och vad allt ger om det säljs.
3. **Raketkortet** (`rocketCard.*`, `step.*`, `conf.*`, `meter.*`): raketen börjar i rummet. En ring och en bildtext ligger på den som gör något, och en prickad tråd går till kortet. Stegen är tre lyktor. Därefter kommer fyra svarsrader på papper, *Stå för ditt svar* med tre säkerhetsnivåer, och ljuset som brinner ned på 20 s.
4. **Lärdomen** (`lesson.*`): raketerna gånger stegen som lyktor, *Hur säker du var* och lärdomen på papper, med ditt svar streckat bredvid det som hade hållit.
5. **Tidningen** (`paper.*`): Grythyttebladet på köksbordet, med serif, papperston och stjärnor. Detta ersätter G6-regeln från 2026-09-28 (*ingen serif och ingen papperston*).
6. **Kvällens resultat** (`evening.*`, ny): kvällen visas som händelser i tidsordning. Varje händelse har en ikon och de resurser den ändrade som små polletter. Till höger ligger nio medaljonger: pengar, krediter, rykte, kunskap, erfarenhet, ekologisk, ekonomisk och social hållbarhet samt svinn. Hållbarheterna visas som tio prickar där förra kvällens nivå är streckad, så att riktningen syns utan siffror. Nedgångar är streckade i grädde, uppgångar guld. Skärmen har inga tabeller.

## 4. Ikoner (lucide 0.460.0)

Kvällens resultat använder `coins`, `graduation-cap`, `star`, `book-open`, `sparkles`, `leaf`, `scale`, `heart-handshake` och `trash-2` (`WARM.icon.evening`). Händelserna använder `wine`, `chef-hat`, `glass-water`, `cake`, `badge-check` och `truck`, och pilarna `arrow-up-right` och `arrow-down-right`. På trä tonas ikonerna till grädde med `WARM.icon.onWoodFilter`. På papper används de ofiltrerade.

## 5. Behövs från sim-lagret

- **Kvällens resultat** behöver en händelselista per kväll: klockslag, händelse-id, antal klarade steg och en delta per resurs. Siffrorna i prototypen är platshållare, men de går ihop: krediter 90 + 60 = 150, rykte 6 + 8 − 2 = 12, erfarenhet 80 + 60 + 40 + 120 + 40 = 340.
- **De tre hållbarheterna** som nivåer 0–10 med förra kvällens nivå, så att skärmen kan visa riktningen.
- **Rykte och stjärnor** hänger ihop, men stjärnorna sätts av söndagstidningen. Hur rykte blir stjärnor avgör speldesignen. Det tas upp i leverans 5.

## 6. Kvar till senare leveranser

- Klippen och rekvisitan bakom raketkortets bildtext och ring kommer i leverans 2.
- Manusen för händelserna, med vad spelaren ser före frågan, kommer i leverans 3.
- Gästtypernas utseende i 3D kommer i leverans 4. Färgerna i `WARM.guest` gäller redan nu.
- Byn och stjärnorna på olika zoomnivåer kommer i leverans 5.
