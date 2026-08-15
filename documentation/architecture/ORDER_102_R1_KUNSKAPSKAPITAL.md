# ORDER 102 — R1 Kunskapskapital

**Repo** `Viognier70/nexus-studio` · **Gren** öppen (branch skapas när ordern godkänns)
**Klass** UTKAST — kräver Vision Owner-godkännande innan execution
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
  | 'nearEpisteme'    // episteme dominant (klass för R4 att besluta om)
  | 'centre'          // bredd — utanför alla axelkoner, över centrumgolv
  | 'noLoan';         // under specialistgolv — inget lån

function readProfile(credits: KnowledgeCredits): KnowledgeClass
```

**Parametrar** (från ORDER 093 §5 rekommendationer):

| Parameter | Värde | Källa |
|---|---|---|
| `CONE_HALF_ANGLE_DEG` | 45 | ORDER 093 §5 punkt 1 |
| `SPECIALIST_MAGNITUDE_FLOOR` | 0.10 | ORDER 093 §3.6.5 |
| `CENTRE_MAGNITUDE_FLOOR` | 0.40 | ORDER 093 §3.6.5 |
| Precedens vid överlapp | `phronesis > techne > episteme > centre > noLoan` | R3 §3.6 tabell |

**Algoritm:**

1. Om `‖credits‖ < SPECIALIST_MAGNITUDE_FLOOR` → `noLoan`.
2. För varje axel: beräkna vinkel `θ_axis = arccos(dot(credits, axis) / ‖credits‖)`.
3. Samla axlar där `θ_axis ≤ CONE_HALF_ANGLE_DEG`.
4. Om flera axlar matchar: precedens (phronesis > techne > episteme).
5. Om ingen axel matchar OCH `‖credits‖ ≥ CENTRE_MAGNITUDE_FLOOR` → `centre`.
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

Mappning (per R3 §3.6 tabell + §8.4):

| Klass | Loan tier | Diagnostisk röst (exempel — R4 finslipar) |
|---|---|---|
| `restaurant` (phronesis dominant) | `restaurant-full` | "Du har omdömet för matsalen. Vi ger dig fulla medel." |
| `foodtruck` (techne dominant) | `foodtruck` | "Du har händerna. Börja mindre, växla upp." |
| `nearEpisteme` (episteme dominant) | *öppen — beslutas i R4* | R4 §3.7 punkt 3 (egen klass / restaurang / inget lån) |
| `centre` (bredd) | `restaurant-small` | *fjärde klassen — namn/mekanik beslutas i R4 §3.7 punkt 2* |
| `noLoan` (under golv) | `none` | "Vi ser inget bärande kunnande. Kom tillbaka när du kan mer." |

**Ingen siffra visas i bankmötet** per R3 §1.4 / EDD §7. `message` bär läsningen som text; UI visar inte kreditvektorn.

### 2.5 Fyra gränsfall — utfall dokumenterade

Från R3 §3.6.3 och §3.7 (fyra profiler som ORDER 093 konsvep körde):

| Gränsfall | (e, t, p) | Klass vid 45° | Loan tier |
|---|---|---|---|
| Jämnstark låg | (0.10, 0.10, 0.10) | `centre` (över specialistgolv, under centrumgolv → korrekt: `noLoan`) | none |
| Jämnstark hög | (0.70, 0.70, 0.70) | `centre` (över alla golv, utanför alla koner) | fjärde klassen |
| Enbart episteme | (0.90, 0.05, 0.05) | `nearEpisteme` | R4-beslut |
| Techne+episteme | (0.70, 0.70, 0.10) | `centre` (utanför alla koner vid 45°; tippunkt 45.3° per ORDER 093 §3.6.3 så precis över) | fjärde klassen |

Testerna i §4 nedan täcker alla fyra.

---

## 3. Vad som **inte** ska byggas i R1

- **Paviljongernas kod (R2).** Bara `ACCUMULATE_KNOWLEDGE`-actionen och reducer-hanteringen. Var actionen fyras beslutas i R2.
- **Bankmötets scen (M7b).** `resolveLoanOutcome()` är ren funktion; scenen som visar den är M7b.
- **Fjärde klassens namn.** `centre` är algoritmisk klassificering — namnet ("vinbar" / "bistro" / "konsult") beslutas i R4 §3.7 punkt 2.
- **`nearEpisteme`s verksamhet.** Klassen finns i mappningen; vad den ger (egen klass / restaurang / inget lån) beslutas i R4 §3.7 punkt 3.
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

## 6. Öppna frågor Vision Owner måste svara på innan execution

1. **`centre`-klassens `loanTier`.** Utkastet föreslår `restaurant-small` för "fjärde klassen" men R4 §3.7 punkt 2 gör detta beroende av vad klassen faktiskt är. Ska R1 tilldela `restaurant-small` som placeholder, eller ska `resolveLoanOutcome` returnera `class: 'centre', loanTier: 'pending-r4'` tills R4 landar?
2. **`nearEpisteme`s `loanTier`.** Samma fråga. R4 §3.7 punkt 3 är tre kandidater (egen klass / sammanslagen med restaurang / inget lån). Ska R1 lämna `loanTier: 'pending-r4'`?
3. **Diagnostisk röst — placeholder-format.** Testerna behöver *något* att jämföra mot. Är exemplen i §2.4-tabellen acceptabla som testfixturer tills M7b finslipar dem?
4. **`ACCUMULATE_KNOWLEDGE` — tak per axel?** Utkastet klämmer negativt men inte överkant. R2 paviljongerna kan i teorin ackumulera oändligt. Ska varje axel ha ett tak (t.ex. 1.0)? Om ja, normaliserar `readProfile` mot taket eller mot faktisk magnitud?

Godkännande av dessa fyra + `Ja, kör` från Vision Owner utlöser execution.

---

## 7. Efter R1

R3 §12 byggordning: R2 paviljongerna → R3 mätgrind → R3 §§5–7 beslut → M7b scen → R4/R5/R6 parallellt → R7 → M8 utvidgad.

R1 låser upp R2. R2 fyller paviljongernas kod med prov som skriver via `ACCUMULATE_KNOWLEDGE`. VS001 mergas som ingång till R2 per ORDER 091 §5.

R4 kan börja så snart R1 landat — den läser bara `readProfile()` och beslutar om `centre`- och `nearEpisteme`-klassernas verksamhet. Parallellt med R2.

---

**End of ORDER 102 draft.**
