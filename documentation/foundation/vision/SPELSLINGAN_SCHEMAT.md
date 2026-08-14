# Spelslingan — schemat

**Källa** Miro-tavlan `schema`, board `uXjVIGbwLcE`, utskriven 2026-08-14.
**Status** Gällande. Bekräftad av Vision Owner 2026-08-14 med precisering i §3.
**Roll** Detta är spelets helhet. Milstolpar och ordrar lyder under den.

Tavlan är extern och kan ändras. Detta dokument är repots kopia; vid konflikt
gäller tavlan, och dokumentet ska då uppdateras.

---

## 1. Slingan

```
Ankomst till Grythyttan
        ↓
Sevillapaviljongen — introduktion, kunskapsprov i fem miljöer
        ↓
Banklån — bygger på hur väl spelaren klarat och visat sina kunskaper
        ↓
Investering i lokal
        ↓
Investerar i koncept, utensilier
        ↓
Sätter meny, vinlistor, koncept
        ↓
Övrigt?  →  klar med satsningar
        ↓
SERVICE — händelseförloppet löper på, med action-knapp
        ↓
Utfall — summeras i social, ekonomisk och ekologisk hållbarhet
        ↓
Frågor och quizer inom de områden som uppvisade svaghet under servicen
        ↓
        ↻ nya satsningar med ackumulerat kapital
```

---

## 2. Rutorna

**Paviljongerna.** Fem miljöer och områden. Kunskap kan både sökas och testas.
Krediter tillägnas genom kunskapsprov (quizer).

- forskningsdatabas och länkar — teoretisk kunskap, **episteme**
- 2. Kalastorget — **phronesis** inom alla områden, i gestaltande
  måltidssituationer
- den gastronomiska scenen
- 4. Metodköket — **techne** inom kock- och måltidskreatörkunskap
- femte miljön

**Banklånet.** Utfaller ur kunskapsresultatet. Se §3 för trösklarna.

**Servicen.** Det slumpmässiga och viktade händelseförloppet, viktat av
spelarens investeringar — ekologiska grönsaker, personalfest, utbildning och
liknande. Händelseförloppet löper på av sig självt.

**Action-knappen.** Spelaren trycker **själv** för att försöka rädda en
situation eller få in krediter medan servicen pågår — exempelvis missnöjda
gäster efter lång väntetid. Utfallet blir bra eller dåligt beroende på hur
situationen hanteras och hur frågorna besvaras. Möjlighet att tjäna eller
förlora krediter.

> Detta skiljer sig från dagens scenariesystem, som avbryter spelaren med ett
> val. Här tar spelaren initiativet.

**Utfallet.** Summeras i social, ekonomisk och ekologisk hållbarhet på olika
parametrar.

**Quizerna efter servicen.** Riktade mot de områden som uppvisade svaghet.
Rätt svar behåller krediten inom respektive hållbarhetsområde; fel svar
förlorar den.

**Nästa varv.** Två vägar in:
1. Nya satsningar med de medel spelaren tillgodogjort sig i skedet innan —
   ackumulerat kunskapskapital, pengar, utfall under service. Samma saldo förs
   in i nästa omgång.
2. Nya krediter genom quizer — här satsar man i förväg, med risk att förlora
   om man inte läst på.

---

## 3. Kunskapskapitalet avgör verksamheten

Precisering från Vision Owner 2026-08-14. Det initiala kunskapskapitalet ger
förutsättningarna för lånet, och lånet avgör vad spelaren får driva:

| Kunskap vid bankmötet | Utfall |
| --- | --- |
| Ingen | **Inget lån.** Tillbaka till paviljongerna och öva. |
| Lite | **Food truck.** Konkurrerar med befintliga restauranger, vilket simuleras. |
| Substantiell | **Restaurang.** Mer pengar, större verksamhet. |

**Paviljongerna måste därför vara återbesökbara.** "Gå och öva" gör dem till en
övningsslinga, inte en introduktion man passerar en gång.

**Food trucken är en egen verksamhetsklass, inte en mindre restaurang.** Egen
form och egen händelsekaraktär: en ensam lucka, kö på gatan, väder och
gatuläge som faktorer, snabb omsättning. Ingen matsal, inga bord, ingen
sittande gäst.

---

## 4. Vad detta betyder för repot

Slingans mitt — satsningar och service — är byggd i nio milstolpar. Ramen
omkring den är i allt väsentligt obyggd:

| Ruta | I repot |
| --- | --- |
| Ankomst | byggt · VS001 feature-complete men ej mergad |
| Paviljongerna | saknas |
| Banklånet | M7b, blockerad av answer-to-loan-mappningen |
| Verksamhetsval | saknas · repot antar restaurang |
| Satsningar | byggt · M2 aktiviteter, M4 meny och lager |
| Service | byggt djupast av allt · M4a, M5, M6 |
| Action-knappen | delvis · scenarierna är materialet, utlösaren saknas |
| Utfallet | byggt · M3 kvällsbokföring, tre kapital |
| Quizerna | saknas · M7a ligger inuti servicen i stället för efter |
| Omgångsslingan | saknas · repot är dagbaserat, schemat omgångsbaserat |

Krediter som valuta finns inte. Repot har `cash` och tre kapital, men ingen
kunskapsvaluta som tjänas och förloras på prov och bärs mellan omgångar.

**M7b är gångjärnet.** Blockeringen är inte teknisk — answer-to-loan-mappningen
är speldesignen, och allt nedströms har byggts medan den stått parkerad.

---

## 5. Två iakttagelser som får sin förklaring

**ORDER 089 mätte att medgången saknas** — 60 % tryckansikten på personalen,
rytmen röd 75 % av serviceticken, `smiling` och `proud` noll tick. Belöningen i
schemat är krediter och kunskapskapital. Den maskinen är inte byggd, alltså
finns ingenting att belöna med. Att bygga positiv återkoppling inuti servicen
vore att lappa symptomet.

**M7a:s kockfrågor läser som forskningsprosa mitt i ett pass** (M8 punchlist
rad 25). I schemat ligger frågorna efter servicen, riktade mot det som gick
fel, med krediter som insats. Frågan är sannolikt inte felskriven — den står på
fel ställe.
