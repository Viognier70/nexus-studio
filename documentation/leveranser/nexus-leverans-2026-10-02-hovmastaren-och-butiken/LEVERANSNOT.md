# LEVERANSNOT: hovmästaren och butiken

**Beställning** efter provspelet 2026-10-02. Spelets kärna går före byn, och byn i kvällsljus är pausad.
**Datum** 2026-10-02
**Till** Claude Code (passar in i förslaget till ORDER 296)
**Från** Claude Design
**Gäller** Hovmästarens beslut under servicen, bandet med kvällens ställning mot rivalerna, jämförelsen efter kvällen och butiken mellan kvällarna. Ritat färdigt i den godkända riktningen: 1l (nålar och handgrepp), 1e (lyktor på en lina) och 1i med facket ur 1h. Skisserna ligger i `nexus-leverans-2026-10-02-hovmastaren-och-butiken-skisser`.

---

## 1. Innehåll

| Fil | Vart | Vad |
|---|---|---|
| `hostShop.ts` | `src/ui/` (eller där ORDER 296 lägger det) | Reglerna för nålarna, handgreppen, bandet, jämförelsen och butiken, förmågorna som data, och vad sim-lagret behöver lämna (`HostShopSim`). Inga speltal. Det som Code sätter har en `*_KEY` mot `balance.ts`. |
| `hostShopStrings.ts` | slås in i `STRINGS` | 128 nycklar, `{ sv, en }`, brittisk engelska. Återanvänder `hud.*`, `money.*` och `serviceMode.*`. `venue.*` har samma namn som `byk.venue.*` och `byTruckar.js`. |
| `prototyp/Hovmastaren och butiken.html` | läses, monteras inte | Sju skärmar i båda storlekarna, med SV/EN. Nålarna, svaren (tangenterna 1 och 2, Esc), handgreppen, lyktorna (hovring) och stenarna (köp, lägga i facket och ta ur) går att trycka på. *Visa omkörningen* visar hur lyktorna glider. Fristående, men ikonerna hämtas från unpkg (lucide 0.460.0) som i tidigare leveranser. |
| `bilder/1440x900/1–7-*.png`, `bilder/1280x720/1–7-*.png` | — | Kontrollbilder i helskärm, granskade i full storlek. |

Rummet bakom är renderingen av vinbaren från 24 m med servicens gradering (`WARM.roomGrade.service`), samma bild som i serviceläget. Ringar, nålar och markeringar ligger i bildens koordinater, så de står på samma plats i båda storlekarna.

## 2. Nålarna (skärm 1 och 2)

- **När ett beslut är moget** sätter sig en nål där beslutet finns: vid dörren, vid ett bord eller över baren. Nålen är en rund pappersknapp med en ikon på en kort stjälk, och en prick i ljuslåga på golvet. Ringen runt knappen brinner ned medurs. Det är tiden som återstår (`PIN.timeout_KEY`).
- **Ett klick öppnar kortet åt sidan**, ut över en vägg eller gatan, aldrig över ett bord (`PIN.cardSide`). En prickad tråd i ljuslåga går tillbaka till nålen, som i raketkortet. Kortet är papper med platsen, situationen och två svar som är ungefär lika långa. Tangenterna 1 och 2 svarar och Esc stänger.
- **Pers svar är det säkra, inte det bästa**, så att det lönar sig att välja själv. Det svaret har streckad kant, ljusare papper och märket *Per · säkert*. Under svaren står `pin.safeNote` (*Det säkra går aldrig fel, men det ger sällan mest*) och `pin.per`. Strecket under brinner ned i samma takt som ringen. I `balance.ts` ska Pers svar ge mindre än det bästa svaret, men aldrig förlust.
- **Bara en nål är öppen åt gången.** Under en raket väntar nålarna och tiden står still.
- **Nålen ska inte förväxlas med raketen.** Frågan står i Figtree, inte i serif, och nålen har inga lyktor. Svaren är val, inte rätt eller fel, så inget blir grönt eller rött. Efter svaret visas en guldpill med vad som händer, och rummet spelar det.
- **Exemplen** i prototypen är dörren (fyra gäster, två små bord lediga), bord 2 (tittar länge på vinlistan) och baren (hinner inte med). Fler nålar beskrivs med `HostPin`.

## 3. Handgreppen (skärm 3 och 4)

Allt som nålarna frågar om går också att göra direkt. Nålarna hjälper den som är ny, och handgreppen passar den som är van.

- **Ge bord:** klicka på ett sällskap i kön. Borden där det får plats lyser i ljuslåga, och tråden följer musen. Klicka på bordet, så visar Per dem dit. Kön är densamma som på trottoaren i byn.
- **Bjuda och sälja in:** klicka på ett sällskap som sitter, så fäller *Bjud* och *Sälj in* ut ovanför dem. Innehållet beror på läget: medan de äter erbjuds dessert eller ett glas till, och som bjudning ett glas eller kaffe.
- **Flytta personal:** dra ringen. En streckad ring i rollens färg visar vart, och etiketten säger vilken del av rummet (golvet, baren, loungerna). Ringens färger kommer ur `staffRing.ts`.

## 4. Bandet (alla serviceskärmar)

- **Placering:** under klockan och kvällskassan, lika brett som de två tillsammans. Till vänster står *Byn i kväll* och vår plats (`rival.rank`).
- **Ställningen mäter kvällens gäster.** Varje krog är en lykta på linjen, och x är gäster delat med flest gäster i byn i kväll. Ledaren står längst till höger.
- **Food trucks räknas som rivaler** och har mindre lyktor (`RIVAL_BAND.lantern.truck`).
- **Vår lykta** är guld, ligger överst och har alltid sitt namn (`{company}`). Det löser också namnkrocken från byns nivå. Musen över en annan lykta visar namnet och kvällens gäster på papper under bandet.
- **Omkörning:** lyktorna glider i 1,4 s. När vi kör om någon visas `rival.overtake` under vår lykta i 2,8 s, och ljudet *kassan* spelas i svagare form (se `LJUDEN.md` i `…-ratt-fel-pyramiden`).

## 5. Efter kvällen: byn i kväll (skärm 5)

En ny skärm efter *Kvällens resultat* och före butiken. Raderna står i samma ordning som bandet (efter gäster) med tre kolumner: gäster, intäkt per gäst och intäkt per stol. Vår rad är tonad i guld. Vagnarna har inga stolar och visar `cmp.noSeats`. Så syns det att en krog kan komma tvåa i gäster men etta per stol.

Siffrorna är platshållare, men de går ihop: intäkt = gäster × per gäst, per stol = intäkt / stolar (vinbaren 38 460 kr / 38 = 1 012, / 20 = 1 923).

## 6. Butiken (skärm 6 och 7)

- **Vägen mot stjärnan** går från *I dag* till stjärnan. Det finns en gren per paviljong, och grenarna växlar upp och ned: Stensöta, Metodköket, Måltidsbiblioteket och Kalastorget. Gastronomiska Teatern är sista grenen, och den leder upp till stjärnan.
- **Medaljen är grinden.** Den öppnar stenarna men förbrukas inte. Krediterna betalar. Vägen är guld fram till den sista grinden som är öppen.
- **Stenarnas lägen:** köpt (guld), öppen (papper med ljuslåga), krediterna räcker inte (dämpad) och låst (streckad, med *Kräver {medal}*). En ring i rollens färg runt stenen betyder att förmågan är en kurs för personalen. Personalens kurser ingår alltså i grenarna.
- **Papperet till höger** visar den valda stenen: vad den ändrar i morgon, om den är en kurs, vilken medalj som krävs och om du har den, och knappen. Knappen har fem lägen: *Köp för {price}*, *Krediterna räcker inte*, *Medaljen öppnar den*, *Lägg i facket* och *Ta ur facket*.
- **Facket** (ur 1h) är det som följer med till nästa kväll. Facket har få platser: två i början (`balance.shop.slots`) och fler när spelaren når stjärnan (`balance.shop.slotsAtStar`). Platsen som öppnas vid stjärnan syns redan nu, streckad med en stjärna och texten *Fler platser vid stjärnan*. Rubriken räknar hur många platser som är använda (`shop.slot.count`). I skärm 6 är facket fullt, så vinkylen behålls efter köpet men gäller först när spelaren lägger den i facket i stället för något annat.
- **Förmågorna** är Vision Owners startförslag, tre per paviljong och två i Teatern (`ABILITIES`). Kraven i `proposedRequires` (brons, silver, guld i grenens ordning) och priserna i prototypen är förslag. Code sätter dem i `balance.ts`.

## 7. Beslut (Vision Owner 2026-10-02)

- **När tiden på en nål går ut väljer Per**, och servicen stannar aldrig. Pers svar är det säkra, inte det bästa, och skillnaden syns på nålen (§2).
- **Köpta förmågor behålls.** Facket bestämmer vad som gäller nästa kväll. Det har två platser i början och fler när spelaren når stjärnan, och det syns i butiken (§6).
- **Jämförelsen efter kvällen** är en egen skärm mellan *Kvällens resultat* och butiken.

## 8. Behövs från sim-lagret

Se `HostShopSim` i `hostShop.ts`:

- Nålar som är mogna och när de började.
- Kön med storlek och gästtyper.
- Lediga platser per bord och sällskapens läge.
- Gäster i kväll per krog och vagn, live.
- Gäster, intäkt och stolar per krog efter kvällen.
- Medaljer per paviljong, krediter, köpta förmågor och vad som ligger i facket.

## 9. Frågor till dig

Inga öppna frågor. Talen (tiden på nålarna, priser, medaljkrav och antal platser) sätter Code i `balance.ts`.
