# Förslag: satsningarna som lönar sig när de används klokt (2026-10-01)

**Beslutet** (Vision Owner 2026-10-01): "Satsningarna ska löna sig när de används klokt: en DJ när det är fullt en fredag eller lördag, en springare när bokningen är stor. I dag ger de förlust varje gång. Föreslå en balans och kör harness, men ändra inget innan jag har sett förslaget."

**Ingenting i spelet är ändrat.** Förslagen prövades i en separat arbetskopia som inte är mergad. Prototypens ändringar står i `frontend/reports/satsningar-2026-10-01/prototyp.patch`; med prototypen avslagen ger den samma tal som spelet.

## Mätningen

Test `frontend/src/strategic/testHarness/__tests__/satsningarBalans.test.ts`, 20 frön, vecka 2: vinbaren, brons i tre paviljonger, bästa svaret och baspaketet efter bokningen.

- **Parad mätning:** varje kväll spelas från samma morgon utan och med satsningen. Skillnaden i kvällens resultat (`day.transfer.resultSek`, samma tal som T2 och R1, priset inräknat) är vad satsningen gav den kvällen. Utdata: `idag.json` och `forslag.json`, fältet `summary.<satsning>.<veckodag>`.
- **Veckan:** tre spelare.
  - *utan* tar inga satsningar.
  - *klokt* tar DJ:n fredag och lördag, och springaren när morgonens bokning är minst 45 gäster.
  - *varjeKvall* tar båda varje kväll.
  - Utdata: `vecka-idag.json` och `vecka-forslag.json`, fältet `plans`.

## Varför satsningarna aldrig lönar sig i dag

**1. Helgen är inte fullare än måndagen.** Bokningen ökar med veckan, men notorna ligger på omkring 24 varje kväll (`idag.json`, `summary.dj.<dag>.meanBooked` och `meanBillsWithout`):

| | mån | tis | ons | tor | fre | lör |
|---|---|---|---|---|---|---|
| Bokade | 27 | 32 | 39 | 46 | 60 | 64 |
| Notor | 24,8 | 23,1 | 23,2 | 24,0 | 23,5 | 25,0 |

**2. Ryktet faller varje kväll, också för den rimliga spelaren.** Missnöjda gäster drar ned ryktet med omkring 0,15 per kväll (`meanUnhappyWithout`, −0,14 till −0,17). I en vecka med frö 3 föll ryktet från 0,60 på måndagen till 0,15 på lördagen.
- Dragningskraften följer ryktet: ryktets multiplikator föll från 1,08 till 0,72 och andelen mot rivalerna från 1,00 till 0,55.
- På fredagen kom därför lika många gäster som på måndagen, fast marknadens tak var 2,4 gånger högre.
- Rummet fylls aldrig: högst 15–17 av 20 platser.
- *(Frö 3 mättes med en tillfällig sond, `arrivals.ts` `reputationArrivalMultiplier` och `competitors.ts` `computeShareFactor`, som inte är sparad.)*

**3. Satsningarna verkar på fel sak.**
- **DJ:n** höjer marknadens tak med 15 %. Taket är inte det som begränsar, så de extra gästerna blir inga notor; inte heller med 50 % ökar notorna (prövat med 10 frön).
- **Springaren** har ingen verkan i simuleringen utöver +0,03 i socialt kapital.
- Resultatet i dag: DJ:n −994 till −1 895 kr per kväll, springaren −1 779 till −1 911 kr (`idag.json`, `meanGainSek`). Ingen dag lönar sig i mer än 4 av 20 kvällar.

## Det prövade förslaget

Två ändringar prövades i prototypen (`forslag.json`, `vecka-forslag.json`):

- **DJ:ns sena runda:** DJ:n spelar från 21.00. Gäster som beställer efter det tar upp till tre glas, och nästa glas med sannolikheten 0,85 i stället för 0,5. Priset är oförändrat, 1 500 kr.
  - Förlusten halveras: fredag −658 kr, lördag −710 kr, torsdag −24 kr.
  - DJ:n tjänar före sitt pris 409–1 476 kr per kväll. Den tjänar per gäst i rummet efter 21, och skulle löna sig när rummet är fullt, men rummet blir aldrig fullt.
- **Springaren som en extra hand i kväll**, som bemanningen:
  - Nästan ingen verkan: fredag −1 442 kr, de missnöjda gästerna oförändrade.
  - Personalens antal är inte det som begränsar.
- **Veckan:**

  | Spelaren | I dag | Med förslaget |
  |---|---|---|
  | utan | +9 401 kr | +9 401 kr |
  | klokt | +1 631 kr | +4 512 kr |
  | varjeKvall | −8 890 kr | −4 965 kr |

  Den kloka spelaren tjänar alltså fortfarande mindre än den som inte satsar alls.

**Slutsats:** satsningarna kan inte löna sig "när det är fullt en fredag" så länge det aldrig blir fullt en fredag. Det som måste rättas först är ryktet.

## Förslaget

1. **Först, som förutsättning: helgen ska bli fullare.**
   - Ta reda på varför gästerna går missnöjda hos den rimliga spelaren (tiden från beställning till mat, 14–58 s i snitt per kväll, sittiden, priset eller rätterna).
   - Balansera så att ryktet håller över en vecka för den som spelar rimligt.
   - **Mål, mätt med samma test:** notorna fredag och lördag ska vara ungefär 1,3–1,4 gånger torsdagens, som veckodagarnas gästfaktor säger (`balance.ts` `WEEK.guestFactor`).
   - Det hör ihop med 288a, där rivalerna delar gästerna. Ett förslag är att det blir en del av den ordern.
2. **DJ:n: den sena rundan** som ovan, priset 1 500 kr. Den lönar sig bara när rummet är fullt efter 21, vilket är det beslutet säger. Den prövas om när steg 1 är gjort; målet är att den lönar sig de flesta fredagar och lördagar och går back en måndag.
3. **Springaren: snabbare bord i stället för en extra hand.**
   - Med springaren tas beställningen och dukas bordet av fortare (förslag: väntan på beställningen och tiden från maten till notan −25 %).
   - Färre gäster går missnöjda, och fler hinner få bord en kväll med stor bokning.
   - Den är inte prövad än, eftersom den ändrar serviceflödet. Den prövas med samma test efter steg 1, med målet att den lönar sig när bokningen är minst 45 gäster och inte en lugn kväll.

Priserna föreslås oförändrade. Ett lägre pris räcker inte: springaren tjänar i dag nästan ingenting före sitt pris.
