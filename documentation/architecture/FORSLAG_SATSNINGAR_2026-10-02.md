# Förslag: DJ, springare och kurser som lönar sig när de används klokt (2026-10-02)

**Beställningen** (Vision Owner 2026-10-02): "skicka förslaget om hur DJ, springare och kurser ska kunna löna sig när de används klokt. Bygg inget förrän jag har sett det."

**Ingenting i spelet är ändrat.** Mätningarna är gjorda i en separat arbetskopia av `main` (`cb47a5d`), som inte är mergad. Dess ändringar står i `frontend/reports/satsningar-2026-10-02/prototyp.patch`. De går att slå av och på (miljövariablerna `PROTO_NO_SHARE` och `PROTO_NO_REPMULT`, och `SATS_VARIANT`).

Förslaget bygger vidare på förslaget från 2026-10-01 (`FORSLAG_SATSNINGAR_2026-10-01.md`) och är mätt om efter 288, 293 och 294.

## Mätningen

Två mätningar, båda i vecka 2: vinbaren, brons i tre paviljonger, bästa svaret och baspaketet efter bokningen.

**Parad mätning** (`satsningarBalans.test.ts`, 20 frön):
- Varje kväll spelas från samma morgon, en gång utan och en gång med satsningen.
- Skillnaden i kvällens resultat (`day.transfer.resultSek`, samma tal som T2 och R1, med priset inräknat) är vad satsningen gav.
- Utdata: `idag.json` och varianterna.
- Veckan spelas med tre spelare: *utan*, *klokt* (DJ fredag och lördag, springare vid bokning från 45) och *varjeKvall*. Utdata: `vecka-*.json`.

**Ryktet och ankomsterna** (`probeRep.test.ts.txt`, 10 frön):
- Per kväll: marknadens tak, dragningskraften, ankomsterna och ryktets förändring efter orsak (`metrics.reputationBreakdown`).
- Utdata: `ryktet-idag.json` och `ryktet-utanDubbelRykte.json`.

## Läget i dag

**Satsningarna går med förlust varje kväll.**

| Satsningen | Kvällens resultat | Fredag |
|---|---|---|
| DJ | −1 338 till −1 657 kr | −1 657 kr |
| Springare | −1 770 till −1 864 kr | −1 809 kr |

Källa: `idag.json` `summary`.

**Veckan:**

| Spelaren | Veckans resultat |
|---|---|
| Utan satsningar | +9 940 kr |
| Klok | +4 744 kr |
| Varje kväll | −7 723 kr |

Källa: `vecka-idag.json`.

**Kurserna** finns inte i den parade mätningen, men reglerna är enkla (`activities.ts`):
- Utbildningen av salen kostar 3 000 kr och ger +0,04 socialt kapital den kvällen.
- Vinprovningen med laget kostar 2 000 kr och ger tillbaka 1 000 kr den kvällen.

Båda redovisas som investeringar (ORDER 291), men de verkar bara en kväll. De kan alltså aldrig betala sig.

**Varför går satsningarna aldrig plus?**

**1. Ryktet räknas tre gånger in i ankomsterna.**
- I gästernas val av krog (stjärnorna, `sim/village.ts`, 288).
- I ryktets multiplikator (`reputationArrivalMultiplier`).
- I den gamla rivalmodellens andel från ORDER 166 (`competitors.ts` `computeShareFactor`), som står kvar i `arrivals.ts` fast byns rivaler nu delar gästerna.

När ryktet faller under veckan sjunker dragningskraften från 1,05 på måndagen till 0,46 på fredagen (`ryktet-idag.json` `attr`). Då kommer 25 gäster en fredag mot bokningens 46.

**2. Ryktet faller varje kväll, också för den rimliga spelaren.**
- Missnöjda gäster kostar 0,12–0,22 i rykte per kväll; nöjda ger tillbaka 0,04–0,07 (`reputationBreakdown.unhappy` och `.happy`).
- En missnöjd gäst kostar 0,020 och en nöjd ger 0,006 (`reputation.ts`), alltså mer än tre gånger så mycket.
- Ungefär en tredjedel av gästerna går missnöjda.
- Ryktet faller från 0,60 på måndagen till 0,16 på lördagen.

**3. Satsningarna verkar på något som inte begränsar.**
- DJ:n höjer marknadens tak med 15 %, men taket nås aldrig.
- Springaren har ingen verkan i simuleringen utöver socialt kapital.
- Rummet fylls inte: med 20 platser och tre sittningar tar det fler gäster än som kommer.

## Det som är prövat

| Varianten | Ankomster fredag | Ryktet lördag morgon | DJ fredag | Veckan (utan / klok / varje kväll) |
|---|---|---|---|---|
| I dag | 25,3 | 0,16 | −1 657 kr | +9 940 / +4 744 / −7 723 kr |
| Utan den gamla rivalmodellen | — | — | −1 363 kr | +9 941 / +5 020 / −7 618 kr |
| Utan dubbelräkningen av ryktet (båda multiplikatorerna borta) | 36,5 | 0,12 | −1 548 kr | +10 334 / +5 446 / −8 326 kr |
| Utan dubbelräkningen, och DJ:ns sena runda (tre glas, nästa glas 0,85) | 36,5 | 0,12 | −1 444 kr | +10 334 / +5 898 / −7 712 kr |

Källor: `ryktet-*.json`, `*.json` `summary.dj.fri.meanGainSek` och `vecka-*.json` `plans`.

**Utan dubbelräkningen** kommer fler gäster en fredag (36,5 mot 25,3), och dragningskraften står kvar omkring 1 hela veckan. Men ryktet faller ändå. Rummet fylls inte heller, så DJ:n och springaren tjänar fortfarande inget. Den sena rundan minskar DJ:ns förlust med ungefär 100–450 kr per kväll, och mer gör den inte.

## Förslaget

### Förutsättningarna

**1. Ta bort dubbelräkningen.**
- Den gamla rivalmodellens andel (ORDER 166) och ryktets multiplikator tas bort ur ankomsterna, eftersom byns val av krog (288) redan räknar ryktet.
- Effekt (uppmätt): fler gäster de dagar bokningen är stor, ankomsterna närmare bokningsboken (fredag 36,5 mot 43 bokade), och en vecka med liten skillnad i resultat.
- Bokningsboken lovar då ungefär det som kommer.

**2. Ryktet ska hålla över en vecka för den som spelar rimligt.**
- Ta reda på vad som gör en tredjedel av gästerna missnöjda: väntan i kön, väntan på maten, slutsålt, plånboken, raketernas följder och slumpens händelser.
- Varje källa till lägre nöjdhet loggas, som ryktet redan gör.
- Balansera sedan den som väger tyngst, eller jämka förhållandet 0,020 mot 0,006 mellan missnöjd och nöjd.
- **Mål** (samma mätning): den rimliga spelarens rykte ska vara lika på lördagen som på måndagen, ±0,05.

Det här är förutsättningen för allt annat. Utan det blir rummet aldrig fullt en fredag.

### DJ:n

DJ:n lönar sig när rummet är fullt efter 21. Den verkar på det som begränsar en full kväll, inte på marknadens tak:
- Från 21.00 dricker gästerna mer: den sena rundan, tre glas och nästa glas 0,85.
- Fler gäster stannar en sittning till. Sittiden efter 21 ökar med en fjärdedel för den som sitter, så att baren säljer längre.
- En kväll med kö ger DJ:n ingen fördel. Därför lönar den sig bara när det är fullt.

**Mål:** plus de flesta fredagar och lördagar med full bokning, och minus en måndag. Priset är oförändrat, 1 500 kr.

Det prövas efter förutsättningarna. Prövat i dag ger den sena rundan för lite, eftersom rummet inte är fullt.

### Springaren

En springare lönar sig när bokningen är stor. Den gör borden snabbare:
- Beställningen tas upp fortare, maten bärs ut fortare och bordet dukas av fortare, med 25 % kortare väntan. Färre går missnöjda och ryktet håller.
- Bord blir lediga tidigare, och kön kortare.
- I dag gör den ingenting i simuleringen. En extra hand som bemanningen prövades 2026-10-01 och gav nästan ingen effekt.

**Mål:** plus de kvällar bokningen är minst 45 gäster, minus en lugn kväll. Om vinsten mest syns i ryktet de följande kvällarna, redovisas den så i kvällens resultat ("ryktet höll").

### Kurserna

En kurs ska vara en investering som betalar sig över flera kvällar, inte en kostnad som ger något samma kväll:
- **Utbildningen av salen** (3 000 kr) ger personalen kortare väntan på beställningen och notan, 10 %, resten av veckan. Den går att ta igen; effekten avtar i vecka två.
- **Vinprovningen med laget** (2 000 kr) ger mer vin per gäst resten av veckan: 15 % fler glas, och flaskan oftare till sällskap. Den ersätter dagens engångsbelopp på 1 000 kr.
- Kvällens resultat visar vad kursen gav den kvällen, och veckoavräkningen visar vad den gett sammanlagt.

**Mål:** utbildningen betalar sig på omkring sex servicedagar och vinprovningen på fyra, för den rimliga spelaren. Två kurser samma kväll ger inte dubbelt.

### Priserna

Priserna föreslås oförändrade. Ett lägre pris räcker inte, eftersom satsningarna i dag inte tjänar något alls före sitt pris.

## Ordningen, om förslaget godkänns

1. Förutsättningarna: dubbelräkningen och ryktet, mätta med samma test.
2. DJ:n och springaren.
3. Kurserna.

Varje steg mäts med den parade mätningen och veckan, och hyrans kalibrering mäts om. Steg 1 ändrar den rimliga spelarens vinst.
