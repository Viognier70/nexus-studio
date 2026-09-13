# Utkast C — uppgiftskö (task queue) per personal

**Öppnad** 2026-09-13 (VO-direktiv)
**Status** UTKAST för kritik, INTE en order.
**Grund** VO 2026-09-13: "B, men skriv upp C som utkast först — jag vill
se vad en uppgiftskö skulle betyda för workload, hurried-bandet och
bakgrundsarbetet från ORDER 137 innan vi bygger halvvägs. Om B blir ett
mellansteg som ändå ska rivas för C är det billigare att ta C direkt."

Se `documentation/architecture/PERSONALENS_TROVARDIGHET_MAPPING_2026-09-13.md`
(kartläggningen, §4-listan A/B/C).

---

## 0. Sammanfattning i tre rader

Nuvarande modell: `staff.taskType: TaskType | null`. En uppgift åt
gången, plockad greedy per tick ur PRIORITY-listan, bindning via
`targetGuestId`. Denna utkast föreslår `staff.taskQueue: TaskAssignment[]`
+ en scheduler som fyller kön per gäst-flöde. Konsekvensen är att
`workload` byter mening (från "hur hårt jag arbetar just nu" till "hur
mycket ligger på mig"), `hurried`-bandet får en ny läsare (kö-djup snarare
än rate), och ORDER 137:s bg-work-modell behöver revideras för att kö-
tid-fönster ersätter "inga direkta tasks tillgängliga".

---

## 1. Datamodell

### 1.1 Nuvarande

```ts
interface StaffMember {
  taskType: TaskType | null;
  taskProgress: number;   // ticks in
  taskDuration: number;   // ticks total
  targetGuestId: string | null;
}
```

Uppgift = ett trippel `(typ, gäst, klocka)`. Klar när `progress >= duration`.

### 1.2 Förslag C

```ts
interface TaskAssignment {
  id: string;                      // stabil, för korsreferens i loggen
  type: TaskType;
  targetGuestId: string | null;    // null för bg-tasks
  expectedStartAt: number | null;  // simTime då tasken kan börja
  urgency: 'immediate' | 'soon' | 'background';
  dependsOn: string[];             // task-id:n som ska vara klara först
  scheduledAt: number;             // simTime tasken lades i kö
}

interface StaffMember {
  // ARV: dessa fyra behålls för bakåtkompat under övergången
  taskType: TaskType | null;
  taskProgress: number;
  taskDuration: number;
  targetGuestId: string | null;

  // NYTT: kön
  taskQueue: TaskAssignment[];
}
```

Aktiv task = `taskQueue[0]` (om `taskProgress > 0`) ELLER
`taskType` (arv-fältet, för de tester som fortfarande läser det direkt).

**Kön är per-personal**, inte global. Två servitörer har varsin kö.
Global synk via schedulern (§2).

---

## 2. Scheduler

### 2.1 Skiljelinje mot nuvarande PRIORITY-loop

Idag: varje tick, för varje staff utan `taskType`, iterera PRIORITY och
plocka första `findTaskTarget`-hit. Reaktiv, greedy, ingen framförhållning.

Förslag: en ny `scheduleTasks(state)`-funktion, körs FÖRE `tickStaff`,
bygger flöden per aktiv gäst och lägger `TaskAssignment` i lämplig staff:s
kö.

```ts
function scheduleTasks(state: SimulationState) {
  for (const guest of state.guests) {
    const flow = flowForGuestState(guest);   // se §2.2
    for (const step of flow) {
      if (isAlreadyQueuedOrDone(state, guest.id, step.type)) continue;
      const staff = pickStaffForRole(state, step.role);
      if (!staff) continue;
      staff.taskQueue.push({
        id: `${guest.id}:${step.type}`,
        type: step.type,
        targetGuestId: guest.id,
        expectedStartAt: state.simTime + step.delay,
        urgency: step.urgency,
        dependsOn: step.dependsOn ?? [],
        scheduledAt: state.simTime
      });
    }
  }
}
```

### 2.2 Flöde per gäst-state

Ett *flöde* är sekvensen av tasks en gäst normalt behöver. Definieras
DEKLARATIVT, inte spridd över tickGuests + completeStaffTask som idag:

```ts
const GUEST_FLOW: Record<BusinessClass, FlowStep[]> = {
  ölkrogen: [
    { state: 'arriving', role: 'värd',     type: 'greet',        delay: 0, urgency: 'immediate' },
    { state: 'waiting',  role: 'värd',     type: 'seat',         delay: 0, urgency: 'immediate', dependsOn: ['greet'] },
    { state: 'seated',   role: 'servitör', type: 'welcomeDrink', delay: 2, urgency: 'soon' },
    { state: 'seated',   role: 'servitör', type: 'order',        delay: 6, urgency: 'soon' },
    { state: 'ordering', role: 'kock',     type: 'prepare',      delay: 0, urgency: 'soon' },  // NY
    { state: 'ordering', role: 'servitör', type: 'serve',        delay: 0, urgency: 'immediate', dependsOn: ['prepare'] },
    { state: 'dining',   role: 'servitör', type: 'checkback',    delay: 15, urgency: 'background' },
    { state: 'paying',   role: 'servitör', type: 'clear',        delay: 0, urgency: 'soon' }
  ],
  // ...andra klasser
};
```

Notera: `prepare` finns inte som TaskType idag. Om C införs behöver
kockens arbete kopplas till en synlig task (annars kock = staty).

### 2.3 Roll-baserad tilldelning (`pickStaffForRole`)

Ersätter dagens "any staff tar any task":

```ts
function pickStaffForRole(state, role): StaffMember | null {
  const cands = state.staff.filter(s => s.role === role);
  if (cands.length === 0) return null;
  // Kortaste kön vinner (load balancing).
  return cands.reduce((a, b) => a.taskQueue.length <= b.taskQueue.length ? a : b);
}
```

En värd som är ensam värd får alla `greet`. Två servitörer delar `order`
efter kön-djup. Kock får `prepare` (om rollen finns i klassen).

---

## 3. Konsekvenser för `workload`

### 3.1 Nuvarande definition

- Idle: −0.03/s
- Direkt task: +0.05/s
- Bg-task: approach 0.4 vid 0.5/s
- Skala 0-1
- Läses av deriveFaces (SF6, SF7) för hurried/strained

Workload = "hur hårt jag arbetar just NU". Rate-baserad. En staff som har
mycket att göra men ligger vilande mellan tasks (för att ingen fyras just
den ticken) hamnar över tid på låg workload.

### 3.2 Efter kö-modell

Workload får två distinkta läsare:

- **Rate-workload** (samma som idag) — driver hurried/strained när staff
  faktiskt kör.
- **Kö-workload** (nytt) — driver ett nytt fält `queueLoad` som mäter
  hur mycket stapel som väntar.

Enklaste formen:

```ts
staff.queueLoad = Math.min(1, staff.taskQueue.length / 8);
```

där 8 är "kö full" (kalibreras). Alternativt viktad efter urgency:
`immediate` väger 2×, `soon` 1×, `background` 0.5×.

**Två läsare** eftersom de svarar på olika fråga:

- rate = "svettas de nu?"
- kö = "har de för mycket på gång?"

Ett scenario visar skillnaden: servitör som JUST slutförde 5 tasks i rad
har rate-workload ≈ 1.0 men queueLoad = 0. En som INTE hunnit börja på
sina 5 väntande tasks har rate ≈ 0.3 (första task nyss startad) men
queueLoad ≈ 0.6.

### 3.3 Rate-workload behöver justering ändå

Om schedulern läggs så att bg-tasks fyller de gap som direkt-tasks
lämnar (§4.2), försvinner vilo-ticks. Rate-workload kommer hamna över
0.4 hela passet (bg-target). ORDER 137:s "på break under prep"-fönster
försvinner — vilket är önskvärt (fynd 2 i VO-inspelning 2026-09-11 16:45).
Men det påverkar också ORDER 131/134-mätningarna:

- ORDER 131 loadSweep antar viss workload-variation. Med kö blir signalen
  jämnare.
- ORDER 134 bimodality-testerna förväntar att workload-histogrammet är
  tvåtoppat. En kö kan platta ut fördelningen.

Mätning krävs. Före kö-order: köra befintlig loadSweep och bimodality mot
kö-implementationen i en test-branch och jämföra histogrammen.

---

## 4. Konsekvenser för hurried-bandet

### 4.1 Nuvarande läsning

`workload >= 0.95` (ORDER 088 §2.1 kalibrering). Läses från
`deriveFaces.ts:116`. Anchoreringen "just above the median under load"
antar rate-workload; en staff blir hurried när direkt-tasks tornas
utan bg-mellanrum.

### 4.2 Efter kö

Två alternativa läsningar:

**Alt 1 — hurried = rate hög OCH kö djup:**
```ts
if (staff.workload >= 0.85 && staff.queueLoad >= 0.5) return 'hurried';
```
Signalen betyder "jag springer OCH har mer stapel". Trovärdigare bild av
"jag är den som håller på att komma efter".

**Alt 2 — hurried = kö > kapacitet:**
```ts
if (staff.queueLoad >= 0.75) return 'hurried';
```
Signalen betyder "det ligger mer på mig än jag klarar". Enklare, men
förlorar rate-signalen (staff med djup kö men just slutförd sekvens ser
hurried även när den vilar).

**Alt 3 — hurried = det gamla + kö-add:**
```ts
if (staff.workload >= 0.95) return 'hurried';
if (staff.queueLoad >= 0.75 && staff.workload >= 0.7) return 'hurried';
```
Håller ORDER 088 §2.1-kalibreringen intakt för rate-vägen och lägger en
kö-väg parallellt.

Mätning för att välja: kör ORDER 131 loadSweep + observera hurried-
frekvens per alt. Målet i ORDER 088 var "meaningfully above the room"
(≈ 15-25 % av service-ticks). Alt som håller den siffran vinner.

### 4.3 Strained (rhythm=red && workload >= 0.7)

Kön kan påverka `serviceRhythm`. Idag beräknas rhythm ur genomsnittlig
workload. Om workload blir jämnare (§3.3) hamnar rhythm oftare i amber
än röd. `strained` fyras mindre. Kan behöva flytta tröskeln eller lägga
kö-djup som ny rhythm-ingång.

---

## 5. Konsekvenser för ORDER 137 bg-work

### 5.1 Nuvarande mekanik

- `BACKGROUND_TASKS_BY_BUSINESS[class]`: lista över bg-typer per klass
- `pickBackgroundTaskFor(state, staff)`: deterministisk rotation med
  `simTime / 20` som fönster
- Bg-task tas när `!staff.taskType && !anyDirectTaskAvailable(state)`
- Preemption: bg-task avbryts när direkt-task blir tillgänglig
- ORDER 137 §2.2: "en väntande gäst får aldrig blockeras av att
  personalen städar"

### 5.2 Efter kö

Bg-tasks passar INTE naturligt in i den nya kön: de har ingen gäst-
koppling, ingen sekvens, ingen `dependsOn`. Två alternativ:

**Alt A — bg-tasks utanför kön.**
```ts
function tickStaff(state) {
  for (const staff of state.staff) {
    if (staff.taskQueue.length > 0) {
      // Kör kön (direkta tasks, per gäst-flöde)
      workOnFrontOfQueue(staff);
    } else {
      // Fall tillbaka på bg-rotation som förut
      const bg = pickBackgroundTaskFor(state, staff);
      if (bg) beginBackgroundTask(state, staff, bg);
    }
  }
}
```
Bg-work behåller sin form, aktiveras när gäst-kön är tom. Preemption
sker automatiskt (schedulern lägger direkt-task i kön → nästa tick
avbryter bg-task).

**Alt B — bg-tasks i kön med låg urgency.**
```ts
// Schedulern lägger periodiskt in bg-task-assignments
if (staff.taskQueue.length === 0 && shouldSchedule('background')) {
  staff.taskQueue.push({
    id: `bg:${staff.id}:${simTime}`,
    type: pickBackgroundTaskFor(state, staff),
    targetGuestId: null,
    urgency: 'background',
    // ...
  });
}
```
Uniformare modell. Kön blir hela source-of-truth. Men preemption blir
subtilare (kräver att direkt-tasks köas FRAMFÖR bg-tasks, eller att
rate-modellen upprätthålls).

### 5.3 ORDER 137 §2.3 (per-klass bg-lista) blir nyans

Idag: ölkrogen hade tom lista → kock/servitör fick inget att göra under
prep → "On break" (VO 2026-09-11 fynd 2, fixad i ORDER 210). Med kö-
modellen:

- **Om värd/servitör/kock har ett `prepare-service`-flöde per klass**
  (t.ex. ölkrogen: värd sätter fram menyer, kock kollar tapp-tryck,
  servitör putsar glas) — DÅ försvinner ORDER 137 §2.3 helt: prep-tasks
  hamnar i kön, inga bg-tasks behövs som fyllnad.
- **Annars** — bg-lista överlever som fallback när kön är tom.

Rekommendation: åtminstone i C-utkastet, skriv `PREP_FLOW: FlowStep[]`
per klass (parallellt med gäst-flödet i §2.2). Då blir bg-tasks
frivilliga: rummen som HAR meningsfulla prep-tasks använder dem, rummen
som inte har det (foodtruck) faller tillbaka på tom kö.

---

## 6. Vad B skulle ha varit — och varför det är mellansteg

VO-formuleringen "om B blir ett mellansteg som ändå ska rivas för C är
det billigare att ta C direkt" antyder att B är en delmängd av C.

Kartläggning §4:

- **A** — animation-fönster (dwellSec, aktiva pauser). Kosmetiskt.
  Rejected av VO: "animationer utan uppgifter blir mekaniskt".
- **B** — chain-tasks / handoff (från §4.b). Att en `order`-task
  automatiskt schemalägger `serve` efter en delay. Detta ÄR en delmängd
  av kön (§2.2 GUEST_FLOW): en chain är två sekventiella tasks i samma
  gäst-flöde.
- **C** — full task-kö + scheduler + roll-tilldelning.

**Om B implementeras utan kö-modell:**

- Vi lägger `nextTask?: TaskType` på TaskAssignment eller på ett
  ad-hoc handoff-fält
- completeStaffTask sätter staff.taskType = nextTask direkt
- Ingen scheduler
- Ingen roll-tilldelning: samma greedy PRIORITY-plockning
- Ingen queueLoad, ingen mätning
- När C sedan införs: hela handoff-mekaniken flyttas in i GUEST_FLOW,
  ad-hoc fält tas bort

Slutsats: **B är C:s första två rader utan schemat runt**. Kostar en
rivning. VO:s hypotes stämmer.

---

## 7. Öppna frågor att svara på FÖRE C-order skrivs

1. **Prepare-task för kocken:** ska införas som ny `TaskType`? Om ja:
   duration, target (guest / station / null), effekt på guest-flöde
   (`serve` beroende av `prepare`)?

2. **Kö-djup-cap:** obegränsat, eller cap på N? Vad händer när kön är
   full och schedulern försöker lägga in mer — droppa? Räcka över till
   annan staff?

3. **Kö-preemption:** kan en immediate-urgency task hoppa förbi soon i
   samma kö? Om ja: brytning eller bara omordning?

4. **Handoff-fönster:** om värd greetar gäst-3 och sedan ska seat:a, hur
   länge får värd hålla gästen "in progress" innan schedulern
   överlämnar till en annan värd? Timeout? Cancellation?

5. **Task-utebliven-gäst:** om schedulern lagt `order` i kön och gästen
   ger upp (waiting → leaving) under tiden, hur städas den ur kön?
   Idag: guest-pruning i tickGuests nullar targetGuestId. Med kö: hela
   TaskAssignment-listor kan behöva filtreras.

6. **Mätsvit-kompatibilitet:** ORDER 131 loadSweep, ORDER 134 bimodality,
   ORDER 088 workload-histogram — vilka behöver ny baseline?

7. **Sim-order:** dagens tickGuests → tickStaff blir tickGuests →
   scheduleTasks → tickStaff. Var placeras scheduleTasks i reducer.ts?

---

## 8. Uppskattad kod-storlek

- `TaskAssignment` + `staff.taskQueue` + serializer: ~50 rader
- `GUEST_FLOW` per klass + FlowStep-typ: ~150 rader (fem klasser)
- `scheduleTasks` + `pickStaffForRole`: ~80 rader
- Modifikationer i tickStaff / completeStaffTask: ~40 rader
- Deprecation av arv-fälten `taskType/Progress/Duration`: ~20 rader
- Test-svit-uppdatering: ~200 rader (rate-workload förändringar,
  hurried-kalibrering, ORDER 137 mid-mass-ändringar, PRIORITY-borttag)
- **Total: ~540 rader netto**, ~800 rader ändrade

Jämfört med B: ~150 rader netto (chain-fält + completeStaffTask-branch).
C är ~3.5× större. Men enligt §6 är B rivningsdyrare eftersom hela
mekaniken flyttas.

---

## 9. Vad utkastet ÄR och INTE ÄR

Detta är ett UTKAST för VO-kritik. Ingen kod-ändring. Ingen förbindelse
att implementera. Syftet är att göra §3-§5-konsekvenserna synliga så
beslut B-vs-C fattas med öppna ögon.

När VO svarar:

- **Ok, kör C** → egen order öppnas med detta utkast + §7-frågorna
  besvarade som scope-not.
- **Ok, kör B trots allt** → utkastet arkiveras, B blir en mindre order.
- **Ingen av dem, riv upp mappningen** → utkastet stängs, kartläggningen
  ligger kvar som referens.
