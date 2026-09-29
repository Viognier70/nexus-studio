# INSTRUKTION till Claude Code — kassan och kvällen

**Från** Claude Design
**Gäller** Provspelet 2026-09-28: morgonens inköp, lagret, händelseströmmen, Back your knowledge, sopbilen och den nya klockan
**Prototyp** `Skarmarna - kassan och kvallen.dc.html` (M1, L1, H1, B1, S1, K1). Den är spelbar: öppna den, klicka och titta på tempot.

Den här mappen kompletterar `nexus-leverans-2026-09-28`. Allt som inte står här gäller som där.

## Filer

| Fil | Status | Var | Vad |
| --- | --- | --- | --- |
| `economy.ts` | ny | `frontend/src/strategic/economy/` | Ren logik: `buyBatch`, `coverage`, `stockStatus`, `serviceTick`, `closeService`, `serviceClock`, `settleWaste`, `backAnswer`, `canBack`, `recordCalibration`, `calibrationNote`. Ingen DOM. Slumpen injiceras (`rng`). |
| `juice.ts` | ny | `frontend/src/strategic/ui/juice/` | Animationerna: `bump`, `slam`, `shake`, `popIn`, `flash`, `countTo`, `fly`. Web Animations API. |
| `nexusStrings.kassan.ts` | ny | slås in i `frontend/src/content/nexusStrings.ts` | Alla nya texter, sv + en. `clock.*` ersätter `hud.clock.*`. |
| `skarmar/M1 … K1` | nya | — | En bild per skärm. |

Provmenyn (`MENU_SAMPLE`) är ett exempel. I spelet kommer menyn från lokalens innehåll, och antalet bord kommer från bordsplanen.

## 1. En kassa, en kväll

Alla skärmar läser **samma** kassa. Flödet är:

1. **M1:** varje inköp drar från kassan direkt.
2. **H1:** bara `pay` lägger till i kassan. `tip` går till personalens pott och aldrig till kassan.
3. **S1:** bara `fee` dras. Svinnets värde är redan betalt i M1 och visas bara.

Kassan i HUD:en ska aldrig hoppa. Den ändras bara genom `countTo`, och först när en `fly`-lapp har landat (`onfinish`).

## 2. Känslan (juice.ts)

Balatro-principen: **räkna i steg, inte mjukt.** Varje steg skriver en ny siffra och knuffar den. Stegen går allt fortare, och det sista smäller.

| Tillfälle | Lapp | Räknare | Steg | Slut |
| --- | --- | --- | --- | --- |
| Inköp (M1) | `−1 440 kr` i accent, knapp → kassa, 900 ms | kassa ↓, inköp ↑ | 9 / 7 | slam + accent-200-blink på kassarutan |
| Ångrat inköp | `+…` i bläck | kassa ↑ | 9 | slam + neutral-200-blink |
| Betalning (H1) | `+1 840 kr` i bläck, rad → kassa | kassa ↑, betalt ↑ | 8 / 10 | slam |
| Dricks (H1) | `+120 kr` i accent, 0,35 s efter betalningen | dricks ↑ | 6 | slam |
| Rätt svar (B1) | se §5 | krediter i rutan ↑, krediter i HUD ↑ | 18 / 12 | slam 1,7× + skak 14 px |
| Fel svar (B1) | `−120` faller ur krediterna, `fall` | krediter ↓ | 8 | slam |
| Svinn (S1) | — | svinn ↑ | 12 | slam |
| Miljöavgift (S1) | `−612 kr` i accent, avgift → kassa | avgift ↑, kassa ↓ | 14 / 10 | slam 1,7× + blink |

Siffror sätts i **Archivo 700 med `tabular-nums`**, i en span med `display: inline-block` och `transform-origin: left center`, så att de växer från vänsterkanten (flush left). Räknarnas text skrivs med `textContent` i en span som React inte äger. Då renderas inte hela HUD:en om vid varje steg.

**Inställning:** Animationer · Balatro / Lugn (`setJuice`). Lugn skalar alla utslag till 35 %. Vid `prefers-reduced-motion` används Lugn och skaket stängs av.

## 3. M1 Morgonen

- Varje rad har steg [−] antal [+], 56 px rutor. + fyller med bläck och blir accent vid hover.
- **+** köper ett parti (`item.step`): 5 portioner eller 2 flaskor. **−** ger tillbaka inköpspriset.
- Räcker inte kassan skakar kassarutan (12 px) och ingenting köps. Går − under noll skakar knappen (6 px).
- Täckningen: huvudrätter (`main`) mot bokade gäster. Stapeln är accentfärgad så länge den är under 100 %.
- **Öppna dörrarna 18.00** går till servicen med `startService(menu)`.

## 4. L1 Lagret och H1 Händelserna

- Köket räknar portioner och baren glas. Baren visas som hela flaskor plus glas i den öppna flaskan (`bottlesAndGlasses`).
- `stockStatus`: **Snart slut** vid högst 20 % eller högst 3 portioner, och för baren vid högst 5 glas. Raden får accent-100-grund, stapeln blir accent och etiketten fylls med accent. **Slut** ger streckad etikett, genomstruken siffra och 55 % opacitet.
- Statusbyte ger en `stock`-händelse (en gång per nivå) och en knuff på raden (1,03). Inget blinkar.
- En gäst som beställer något som är slut ger `miss`. Den hamnar både i strömmen och i varningarna.
- Strömmen visar 13 rader, nyaste överst. En ny rad glider in 28 px från vänster på accent-100 i 900 ms.
- Färger: beställt i neutral-600 (pengar på väg), betalt i bläck 700, dricks i accent-700.
- Tempo: 1× = 600 ms, 2× = 300 ms, 4× = 150 ms per spelminut. Tempoknapparna i HUD:en styr detta.

## 5. B1 Back your knowledge

Säkerhetsbaserad bedömning inuti servicens raket (samma tre steg som R1–R3). Spelaren står för sitt svar med **kunskapskrediter**. Utfallet avgörs **bara** av om svaret är rätt. Det finns ingen slump.

- **Krediterna** tjänas på proven i Måltidens hus och på raketerna i servicen. De kan aldrig köpas för riktiga pengar och växlas aldrig mot kassan. De visas i HUD:en bredvid kassan, med accentkant upptill.
- **Flödet per steg:** välj svar (1–4) → välj säkerhet → **Stå för svaret**. Låsknappen är tonad till 45 % tills båda är valda. Trycker man ändå skakar panelen.
- **Säkerhet** (`CONFIDENCE`): Gissar +20 / ±0 · Tror det +40 / −40 · Vet det +60 / −120. Knappen visar vinsten redan multiplicerad med steget. En nivå man inte har krediter nog att förlora är tonad, och krediterna i HUD:en skakar om man trycker på den.
- **Steget** multiplicerar bara rätt svar: episteme ×1, techne ×1,5, phronesis ×2. Ett fel kostar insatsen utan multiplikator och avslutar raketen, som i servicen. Går tiden ut räknas det som fel med Gissar (±0).
- **Raketen** till vänster står i det steg som pågår och lyfter ett steg för varje rätt svar (700 ms, studs). Klarade steg fylls med bläck och det pågående har accentkant. Vid fel tippar raketen 24°, sjunker 44 px och blir neutral-500, och steget blir streckat.
- **Rätt svar:** rutorna säkerhet (bläck, 300 ms), steg (accent, 560 ms) och krediter (820 ms) smäller in. Krediterna räknas upp i 18 steg från 95 till 25 ms. Sista steget smäller 1,7× och skakar panelen 14 px, och åtta marker flyger till krediterna i HUD:en med 60 ms mellanrum.
- **Fel svar:** panelen skakar 16 px och två streckade rutor visas (säkerhet · fel = krediter). `−120` faller ur HUD:en. Vid Gissar blir det `±0` och inget faller.
- **Hur säker du var** (under raketen): kvällens träffsäkerhet per nivå med en stapel, och en mening ur `calibrationNote`. Det är den pedagogiska poängen: den som satsar högt och har fel ser att hon trodde sig kunna mer än hon kunde.

**Ordlista.** Inga casinodrag: inga hjul, spelautomater, tärningar, kort eller marker som liknar jetonger, och ingen slumpad kraschkurva. Orden "betting", "satsa", "jackpott", "odds" och "spel" används inte i UI:t. Funktionen heter **Back your knowledge** (sv: Stå för ditt svar).

## 6. S1 Sopbilen

- Spelas upp automatiskt vid `close` (23.00, skylt 23.40), med kvällens riktiga lager från `settleWaste(menu, state)`.
- Bilen rullar in från höger på 1,4 s. Därefter läggs fyra fraktioner fram med `popIn`, 0,65 s isär. Matsvinnets värde räknas upp i svinnrutan.
- Miljöavgiften: `kg × 2,90 + 420`. Den räknas upp i 14 steg, flyger till kassan 1,3 s senare och dras där.
- Rådet (`advice`) visas sist på bläckgrund: den rätt som kostade mest i svinn, med antalet avrundat nedåt till partistorlek.

## 7. K1 Klockan

Svar på frågan: **ja.** Klockan flyttar ur mätarpanelen till mitten av översta raden (x 740, 440 px bred).

- Klockslaget är 60 px, `tabular-nums`, med fast bredd 176 px och `white-space: nowrap`. Det kan inte brytas (buggen i G1).
- Etikett (16 px versaler) och tid kvar (22 px) står på var sin rad till höger.
- Etiketten växlar mellan Servicen, Rusning (19.30–21.00), Sista beställning (sista 30 min, accent-700) och Stängt.
- Tio halvtimmesrutor från 18 till 23. Passerade rutor är fyllda och den aktuella fylls från vänster. Den sista rutan har accentkant hela kvällen och fylls med accent.
- Mätarpanelen nere till vänster behåller bara Kassa, Gästerna och Personalen.
- `serviceClock(min)` i `economy.ts` ersätter `serviceClock(lang, min)` i `nexusStrings.ts`. Formateringen görs med `clock.*`-nycklarna.

## 8. Godkänt när

- [ ] Kassan i M1, H1, S1 och HUD:en är samma värde och hoppar aldrig utan att en lapp har landat.
- [ ] `serviceTick` med låst `rng` ger samma kväll varje gång (enhetstest).
- [ ] 4× tempo i 60 s tappar inga bildrutor på provmaskinen (räknarna renderar inte om React).
- [ ] B1 har ingen slump: samma svar och samma säkerhet ger alltid samma krediter (enhetstest av `backAnswer`).
- [ ] Inga krediter kan köpas, och ingen väg leder från krediter till kassan.
- [ ] Klockan bryts inte vid 200 % textstorlek eller på engelska.
- [ ] Lugn och reduced motion ger inga skak.

## 9. Beslut och öppna frågor

1. **Krediterna — beslutat.** Kunskapskrediter från proven i Måltidens hus och raketerna i servicen. Kassa och krediter byter aldrig plats.
2. **Åldersgränsen — beslutat.** Kunskapsinsats, inte spel om tur: bara svaren avgör, inga casinodrag och inga köpbara krediter. Det bör ändå stämmas av med IARC-formuläret innan provspelsbygget skickas.
3. **Svinnets fraktioner** är schablonvärden (`WASTE`). Byt till lokalens riktiga taxa om den finns.
