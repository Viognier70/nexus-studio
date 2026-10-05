# ORDER 305 — Kvitt eller dubbelt i raketen (rapport och förslag)

**Underlag:** Anders 2026-10-05: "Rapportera hur raketens regler fungerar i dag: kan spelaren stanna efter ett rätt steg och behålla det hon har, eller måste hon gå hela vägen? Designs nästa tillägg till D5 bygger på 'kvitt eller dubbelt' … Om reglerna inte stöder det, föreslå hur det ska fungera och kör harness, så att trappan håller."

Gren `order-305` från `main`, ombaserad efter 303b (`05cd88b`). Harnessen kördes med 303b:s tal.

**Status:** byggt bakom en brytare som är avstängd (`balance.ts` `DOUBLE_OR_NOTHING.enabled = false`). Spelet är oförändrat tills beslut.

## 1. Raketens regler i dag

**Spelaren kan inte stanna.** Efter ett rätt steg öppnas nästa steg direkt (`sim/incidents.ts` `resolveIncident`, "Klarat steg: nästa steg öppnas i samma sammanhang"). De enda åtgärderna är att svara (`ANSWER_INCIDENT`) eller låta tiden gå ut, som räknas som fel med −1 kredit (`INCIDENTS.timeoutCreditPenalty`).

**Det som ett rätt steg ger behåller spelaren ändå.** Det bokförs direkt, steg för steg, och ett senare fel tar inte tillbaka det:
- en kredit för bästa svar (`INCIDENTS.bestAnswerCredit`), på stegets kunskapsform;
- bordets merbeställning, ett glas till eller en andel av notan, direkt i kvällskassan (`ANSWER_EFFECTS`);
- ryktet +0,3 (`CONSEQUENCES.right.stepReputation`), gäster som kommer in, mer dricks och stämningens lyft;
- i en egen raket (Stå för ditt svar) krediterna efter säkerheten, gånger stegets multiplikator 1, 1,5 och 2 (`BACK`).

**Ett fel kostar stegets följd, inte det som redan vunnits.** Personalen tar resten med sitt utfall, gånger stegen som återstod: 1 vid fel på första steget, 2/3 på det andra och 1/3 på det tredje (`INCIDENTS.staffShareByFailedStep`). Ju längre spelaren kommer, desto mindre kostar ett fel.

**Bara en klarad raket ger** raketens eget utfall (`incident.success`), avec (`CONSEQUENCES.right.avecShare`), ryktet +1 och gäster till.

**Slutsats:** reglerna stöder inte kvitt eller dubbelt. Det finns inget val att stanna, och inget står på spel när spelaren går vidare: varje steg är redan bokfört, och felet blir billigare ju längre spelaren kommit. Att alltid gå vidare är alltid bäst.

## 2. Förslaget

1. **Potten.** Varje rätt steg lägger sina krediter för bästa svar i raketens pott (`ActiveIncident.pot`) i stället för att bokföra dem.
2. **Valet.** Efter ett rätt steg som inte är det sista väljer spelaren:
   - **Stanna och ta potten** (`INCIDENT_STOP`): krediterna bokförs, och händelsen slutar där utan felets följd.
   - **Kvitt eller dubbelt: nästa steg** (`INCIDENT_GO`): stegets klocka börjar.
   - Valet har 8 sekunder (`choiceSeconds`). När tiden går ut stannar spelaren, det säkra valet.
3. **Dubbelt.** Ett rätt steg efter att spelaren gått vidare ger potten gånger 2 plus stegets egen kredit (`growth`). Hela vägen ger alltså (1 × 2 + 1) × 2 + 1 = 7 krediter, mot 3 i dag.
4. **Kvitt.** Ett fel efter att spelaren gått vidare tar hela potten. Stegets följd gäller som i dag.
5. **Det som inte står på spel.** Ryktet, gästerna som kommer in, dricksen, stämningen och bordets merbeställning följer varje svar som förut. De är rummets reaktion och går inte att ta tillbaka. Raketens utfall och avec kommer bara när raketen klaras, som i dag.

**Spelaren ser** potten och de två valen på raketkortet. Den formen är tillfällig, med två knappar och strängarna `rocket.card.kvitt.*` på svenska och engelska, tills Designs D5 kommer.

**Loggen:** en raket där spelaren stannade får kvaliteten `stopped`. `IncidentRecord.pot` säger om potten togs eller förlorades.

## 3. Harness: två varianter

Spelarna i trappan svarar som förut. Valet styrs av `KVITT_STOP_AFTER` (`weekHarness.ts`): 0 går alltid vidare, 1 stannar efter första steget och 2 efter det andra. Trappan har 20 säsonger, stjärnan 40 och 303 B vecka 1–3.

**Variant A:** potten har också bordets merbeställning i kronor, och den som stannar får personalens utfall för stegen som återstod (`frontend/reports/order305/A-*`).

**Variant B, förslaget:** potten har bara krediterna, och den som stannar får ingen mer följd (`frontend/reports/order305/B-*`).

| Spelaren | 303b utan kvitt | A, går alltid vidare | A, stannar efter steg 1 | **B, går alltid vidare** | B, stannar efter steg 1 | B, stannar efter steg 2 |
|---|---|---|---|---|---|---|
| Mentorn | 0 stängda, 79 567 kr | 0, 146 952 kr | **5**, −2 823 kr | **0, 79 738 kr** | 0, 31 216 kr | 0, 39 162 kr |
| Den kloka | 0, 82 335 kr | 0, 132 920 kr | 0, 10 004 kr | **0, 84 061 kr** | 0, 33 236 kr | 0, 48 827 kr |
| Den förnuftiga | 0, 57 970 kr | 0, 113 598 kr | **12**, −16 384 kr | **0, 57 947 kr** | 0, 13 581 kr | 0, 15 864 kr |
| Halva | 19 | 12 | 20 | 20 | 20 | 20 |
| Alltid fel | 20 | 20 | 20 | 20 | 20 | 20 |
| Den slarviga | 20 | 20 | 20 | **20** | 20 | 20 |
| Stjärnan 0,85 / 0,75 / 0,6 | 82 / 25 / 0 % | 70 / 30 / **2** % | 0 / 0 / 0 % | **75 / 22 / 0 %** | 0 / 0 / 0 % | 0 / 0 / 0 % |

303 B ("alltid fel" aldrig 1:a efter vecka 1) gäller i alla varianter, eftersom den spelaren aldrig klarar ett steg och aldrig får välja.

**Vad tabellen visar:**
- **Variant A håller inte.**
  - Kronorna i potten dubblas, så de bästa spelarna slutar på 113 000–147 000 kr, långt över 303b:s 70 000–90 000.
  - Den som stannar betalar personalens utfall och tappar raketens utfall och avec. Mentorn stänger då 5 av 20 säsonger och den förnuftiga 12 av 20.
  - Med 0,6 rätt per steg nåddes stjärnan en gång.
- **Variant B håller trappan med alla tre valen.**
  - Mentorn och den förnuftiga stänger aldrig, den slarviga alltid.
  - Den som går vidare får samma kassa som i 303b, och stjärnan ligger inom 298b:s mål.
  - Den som stannar är säker men tjänar mindre: 31 000–49 000 kr för de bästa. Den når aldrig stjärnan, eftersom stjärnan kräver klarade raketer.
  - Med 0,6 rätt per steg och stopp efter första steget stänger stjärnjägaren 31 av 40 säsonger, mot 38 när den går vidare. Att stanna lönar sig alltså för den som är osäker.

## 4. Att besluta

1. **Slå på kvitt eller dubbelt** med förslag B (`DOUBLE_OR_NOTHING.enabled`).
2. **Vad potten håller:** bara krediterna (förslaget). Eller också kronorna (variant A), vilket kräver att uppsidan sänks igen.
3. **Den som stannar:** ingen mer följd (förslaget), eller personalens utfall för stegen som återstod (variant A).
4. **Räknas en raket där spelaren stannade** i stjärnans andel klarade raketer? I förslaget gör den inte det, så stjärnan kräver att spelaren går hela vägen. Alternativet är att räkna den som en halv.
5. **Stå för ditt svar** (raketen spelaren startar själv) har redan en insats per steg, säkerheten gånger stegets multiplikator. I förslaget gäller båda samtidigt. Ska kvitt eller dubbelt ersätta säkerheten i den raketen, eller gälla bara de planerade raketerna?
6. **Valets tid och förval:** 8 sekunder och stanna när tiden går ut (förslaget).
7. **Texten** när spelaren stannar använder i dag personalens text i händelseströmmen. Design skriver den i D5.

## 5. Tester och bygge

- **Nytt test:** `sim/__tests__/order305Kvitt.test.ts`, 6 tester:
  - avstängt som förut;
  - valet efter ett rätt steg (svaret väntar);
  - stanna;
  - gå vidare och fel (potten förlorad);
  - hela vägen (7 krediter);
  - tiden ute (stanna).
- Typecheck och bygge gröna. Hela sviten: 2 357 gröna och 16 överhoppade (med 300b och 303b på main).
