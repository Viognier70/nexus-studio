# ORDER 102 — R1 Kunskapskapital

**Repo** `Viognier70/nexus-studio` · **Gren** `order-049`
**Klass** AUTONOM — Vision Owner-beslut inkommet 2026-08-15 (chat); tre av fyra §6-frågor besvarade
**Datum** 2026-08-15
**Bygger på** `documentation/blueprints/R3_KUNSKAPSKAPITAL_REPORT_ORDER_092.md` §§ 1, 3.6.5, 3.7, 8.2, 12
**Ersätter** ORDER 095 (som aldrig kördes; utfärdades och referenser­ades men producerade inga commits)

---

## 1. Varför

Kunskapskapitalet är R1 i ryggraden per ORDER 091 §1.5. Utan det:

- **R2** (paviljongerna) har ingen struktur att ackumulera i
- **M7b** (bankmötets scen) har ingen profil att läsa
- **R4** (verksamhetsklassen) har ingen input att välja ur
- **R6** (post-service-quiz *mot uppvisade svaghet*) har ingen domänläsning att rikta mot

R3-rapporten §12 sätter R1 som steg 2 i byggordningen (efter §3-besluten). §3-besluten är fattade under ORDER 093 (konvidd 45°, magnitudgolv 0.10/0.40, fyra-sektor-läsare). R1 kan därför börja.

En tidigare ORDER 095 utfärdades för samma sak men producerade aldrig kod. Grenen `order-095` skapades men inga commits landade på den. Vad rapporter refererade som "R1 klar" (fyra filer, 18 tester, `resolveLoanOutcome` i `businessProfile.ts`) finns inte i något worktree — verifierat via `grep -rn "resolveLoanOutcome\|knowledgeCredits" frontend/src/` som returnerar 0 träffar på både main och order-049. **ORDER 102 bygger sakerna på riktigt.**

---

## 2. Vad som ska byggas

### 2.1 Ny sim-state-struktur

Nytt fält på `SimulationState`:

```ts
knowledgeCredits: {
  episteme: number;    // vetenskaplig kunskap (böcker, forskning, teori)
  techne: number;      // hantverk (drift, mise en place, hantering)
  phronesis: number;   // omdöme (gäst, situation, det som inte skrivs ner)
};
```

Vektor — inte skalär. R3 §1.2 (beslutat): summan är aldrig meningsfull, formen är. Två spelare med samma summa men olika fördelning tilldelas olika verksamhetsklass.

Initialvärde: alla tre = 0. Ingen initial-kunskap. Krediter tjänas.

Fältet får **inte** ha en getter som returnerar summa/genomsnitt. Ingen `totalCredits`, ingen `averageCompetence`. Formen ska läsas som helhet.

### 2.2 Ackumuleringspunkter — vad tjänar krediter

R1 introducerar strukturen och två ackumulerare från R3 §8.2:

- **R2 paviljongerna** (byggs efter R1) — varje paviljong tilldelar en dominant axel. Exakt tilldelnings-mekanik gated på R2-ordern.
- **R6 post-service-quizerna** (byggs efter R1) — riktade mot uppvisade svaghet. Rätt svar → kredit i tillhörande axel.

I R1 räcker att `state.knowledgeCredits` finns och att en action-typ finns för att skriva till den:

```ts
{ type: 'ACCUMULATE_KNOWLEDGE'; axis: 'episteme' | 'techne' | 'phronesis'; amount: number }
```

Reducern klämmer amount ≥ 0 (krediter dras aldrig ur R1; förlust hanteras i R7 via ny profil per varv).

### 2.3 Profilavläsning — `readProfile()`

Ren funktion som läser vektorn och returnerar en klass. R3 §3.6:s fyra-sektor-läsare, kalibrerad per ORDER 093 §5:

```ts
type KnowledgeClass =
  | 'restaurant'      // phronesis dominant
  | 'foodtruck'       // techne dominant
  | 'nearEpisteme'    // episteme dominant → loanTier 'none' per Vision Owner 2026-08-15
  | 'balanced'        // bredd — utanför alla axelkoner, över centrumgolv (intern nyckel;
                      // player-visible namn för fjärde klassen beslutas i R4)
  | 'noLoan';         // under magnitudgolv — inget lån

function readProfile(credits: KnowledgeCredits): KnowledgeClass
```

**Parametrar** (från ORDER 093 §5 rekommendationer):

| Parameter | Värde | Källa |
|---|---|---|
| `CONE_HALF_ANGLE_DEG` | 45 | ORDER 093 §5 punkt 1 |
| `SPECIALIST_MAGNITUDE_FLOOR` | 0.10 | ORDER 093 §3.6.5 |
| `CENTRE_MAGNITUDE_FLOOR` | 0.40 | ORDER 093 §3.6.5 |
| Precedens vid överlapp | `phronesis > techne > episteme > balanced > noLoan` | R3 §3.6 tabell |

**Algoritm:**

1. Om `‖credits‖ < SPECIALIST_MAGNITUDE_FLOOR` → `noLoan`.
2. För varje axel: beräkna `cos(θ_axis) = dot(credits, axis) / ‖credits‖`, vilket är samma sak som axel-värdet delat med magnituden.
3. Axeln matchar konen om `cos(θ_axis) ≥ cos(CONE_HALF_ANGLE_DEG)` (dvs vinkeln är inom halva konvidden).
4. Precedens vid överlapp: phronesis wins over techne wins over episteme. Första match returnerar (`restaurant` / `foodtruck` / `nearEpisteme`).
5. Om ingen axel matchar OCH `‖credits‖ ≥ CENTRE_MAGNITUDE_FLOOR` → `balanced`.
6. Om ingen axel matchar OCH under centrumgolv men över specialistgolv → `noLoan`.

Ingen fuzzy edges, inga viktade blends. Renaste möjliga geometri på sfären.

### 2.4 Loan-mappning — `resolveLoanOutcome()`

Ren funktion i ny fil `frontend/src/strategic/simulation/businessProfile.ts`:

```ts
export interface LoanOutcome {
  class: KnowledgeClass;
  loanTier: 'none' | 'foodtruck' | 'restaurant-small' | 'restaurant-full';
  message: string;  // diagnostisk röst — bankdirektörens formulering
}

export function resolveLoanOutcome(credits: KnowledgeCredits): LoanOutcome
```

Mappning (per R3 §3.6 tabell + §8.4, med Vision Owner-beslut 2026-08-15):

| Klass | Loan tier | Diagnostisk röst (test-fixtur — R4/M7b finslipar för UI) |
|---|---|---|
| `restaurant` (phronesis dominant) | `restaurant-full` | "Du har omdömet för matsalen. Vi ger dig fulla medel." |
| `foodtruck` (techne dominant) | `foodtruck` | "Du har händerna. Börja mindre, växla upp." |
| `nearEpisteme` (episteme dominant) | `none` (Vision Owner 2026-08-15) | "Du vet men har inte gjort. Vi kan inte finansiera." (26 % av kuben vid 45°/45°/45° per ORDER 093 §3.6.2 — avsiktligt utan lån) |
| `balanced` (bredd) | `restaurant-small` (placeholder tills R4) | "Ett brett kunnande. Vi ger dig en start." (fjärde klassens namn/mekanik beslutas i R4 §3.7 punkt 2) |
| `noLoan` (under golv) | `none` | "Vi ser inget bärande kunnande. Kom tillbaka när du kan mer." |

**Ingen siffra visas i bankmötet** per R3 §1.4 / EDD §7. `message` bär läsningen som text; UI visar inte kreditvektorn.

**Textkälla:** meddelandena är test-fixturer inline i `businessProfile.ts`, **inte** genom `strings.sv.ts` (Vision Owner 2026-08-15). M7b bär den slutliga författningen i sin egen ordertext när scenen byggs; R1:s meddelanden är för test-verifiering och dev-panel-läsbarhet, inte för spelar-UI.

### 2.5 Fyra gränsfall — utfall dokumenterade

Från R3 §3.6.3 och §3.7 (fyra profiler som ORDER 093 konsvep körde):

| Gränsfall | (e, t, p) | Klass vid 45° | Loan tier |
|---|---|---|---|
| Jämnstark låg | (0.10, 0.10, 0.10) | `noLoan` (magnitud ≈ 0.173: över specialistgolv, under centrumgolv 0.40 → korrekt: `noLoan`) | none |
| Jämnstark hög | (0.70, 0.70, 0.70) | `balanced` (magnitud ≈ 1.212: över alla golv, utanför alla koner) | restaurant-small (placeholder) |
| Enbart episteme | (0.90, 0.05, 0.05) | `nearEpisteme` | none (Vision Owner 2026-08-15) |
| Techne+episteme | (0.70, 0.70, 0.10) | `balanced` (utanför alla koner vid 45°; tippunkt 45.3° per ORDER 093 §3.6.3 så precis över) | restaurant-small (placeholder) |

Testerna i §4 nedan täcker alla fyra.

---

## 3. Vad som **inte** ska byggas i R1

- **Paviljongernas kod (R2).** Bara `ACCUMULATE_KNOWLEDGE`-actionen och reducer-hanteringen. Var actionen fyras beslutas i R2.
- **Bankmötets scen (M7b).** `resolveLoanOutcome()` är ren funktion; scenen som visar den är M7b.
- **Fjärde klassens player-visible namn.** `balanced` är algoritmisk intern nyckel — namnet ("vinbar" / "bistro" / "konsult") beslutas i R4 §3.7 punkt 2. R1 använder `'balanced'` i typerna.
- **`nearEpisteme`s verksamhet.** Klassen finns i mappningen; loanTier är `'none'` per Vision Owner 2026-08-15 (avsiktligt utan lån — cirka 26 % av kuben vid ORDER 093:s konvidder). Om R4 beslutar annat uppdateras `resolveLoanOutcome` då.
- **Diagnostisk röst — text.** Placeholder-strängar i `resolveLoanOutcome` är för test/exempel. Slutlig författning görs i M7b-ordern.
- **UI-panel för att visa `knowledgeCredits`.** Regeln "ingen siffra visas" (§1.4) står. Ingen HUD, ingen debug-panel utom en dev-only readout i `DevPanel.tsx` (samma pattern som `queue=N seated=S/C` från ORDER 097).

---

## 4. Definition of Done

1. `SimulationState.knowledgeCredits: {episteme, techne, phronesis}` — nytt fält, initialiserat till alla noll i `makeInitialState`.
2. Ny action `ACCUMULATE_KNOWLEDGE` — hanterad i reducern, klämmer amount ≥ 0.
3. `frontend/src/strategic/simulation/businessProfile.ts` — ny fil med `KnowledgeClass`, `LoanOutcome`, `readProfile`, `resolveLoanOutcome` (rena funktioner).
4. **Tester (18 st minimum):**
   - `readProfile`: en per klass × en per gränsfall (5 klasser + 4 gränsfall = 9)
   - `resolveLoanOutcome`: en per klass som verifierar `loanTier` (5)
   - Reducern: `ACCUMULATE_KNOWLEDGE` skriver rätt axel (3)
   - Reducern: negativa amount klämmas till 0 (1)
5. `state.knowledgeCredits` är läsbart via `DevPanel.tsx` dev-only suffix (samma mönster som `queue=N seated=S/C`) — inte i produktionsbyggd UI.
6. Typecheck grön; hela sviten grön (566 nuvarande + 18 nya = 584 minimum).
7. Ingen ändring till `service.ts`, `arrivals.ts`, `reducer.ts`:s tick-loop utöver `ACCUMULATE_KNOWLEDGE`-hanteringen. Ingen ändring till scen-lagret.
8. Registerpost för ORDER 102 i samma commit som koden (per CLAUDE.md §Commit-verifiering §4).
9. `ORDER_095`-raden uppdateras till "Void — never built; work carried by ORDER 102" i samma commit.

---

## 5. Avgränsningar

- Ingen produktionskod utanför sim + `businessProfile.ts` + dev-panel-raden.
- Inga trösklar rörs (0.95 hurried, 0.7 strained, ansiktsfördelningens post-checkback 50.8 % hurried — alla väntar på R4 per ORDER 098 §6.6).
- Ingen ändring till PR #13 eller de commits som redan mergats.
- Inga externa dependencies — ren TypeScript-matematik.

---

## 6. Frågor — status 2026-08-15

Tre av fyra besvarade av Vision Owner (chat 2026-08-15). En kvarstår öppen.

1. ✅ **`balanced`-klassens `loanTier` (tidigare "centre")** — Intern nyckel är `'balanced'`, `loanTier` sätts till `'restaurant-small'` som placeholder. Player-visible namn för fjärde klassen väntar på R4 §3.7 punkt 2. Placeholder är OK för R1; R4 uppdaterar mappningen när namn/mekanik landar.
2. ✅ **`nearEpisteme`s `loanTier`** — `'none'`. Ingen lån. Motivering: cirka 26 % av kuben vid ORDER 093:s konvidder — avsiktligt lämnad utan lån. Om R4 §3.7 punkt 3 senare bestämmer egen klass eller sammanslagning uppdateras `resolveLoanOutcome` då.
3. ✅ **Diagnostisk röst — placeholder-format** — Exempeltexterna i §2.4-tabellen accepterade som test-fixturer, **inline i `businessProfile.ts`, ej i `strings.sv.ts`**. M7b bär den slutliga författningen i sin egen ordertext när scenen byggs.
4. ⏳ **`ACCUMULATE_KNOWLEDGE` — tak per axel** — **Fortsatt öppen.** R1 implementerar utan tak (endast negativ-klämning). Frågan hör ihop med R3:s kreditekonomi (§4) och svårighetskurva (§5) — hur mycket kredit kan en spelare rimligt ackumulera per varv, och hur påverkar det bankmötets läsning över tid? Utreds separat under R3-mätningen; ingen tak-mekanik i R1 för att inte prejudicera beslutet.

Execution kör mot besluten 1–3; öppen fråga 4 följer med som notering i R3-uppgift.

---

## 7. Efter R1

R3 §12 byggordning: R2 paviljongerna → R3 mätgrind → R3 §§5–7 beslut → M7b scen → R4/R5/R6 parallellt → R7 → M8 utvidgad.

R1 låser upp R2. R2 fyller paviljongernas kod med prov som skriver via `ACCUMULATE_KNOWLEDGE`. VS001 mergas som ingång till R2 per ORDER 091 §5.

R4 kan börja så snart R1 landat — den läser bara `readProfile()` och beslutar om `centre`- och `nearEpisteme`-klassernas verksamhet. Parallellt med R2.

---

**End of ORDER 102 draft.**
