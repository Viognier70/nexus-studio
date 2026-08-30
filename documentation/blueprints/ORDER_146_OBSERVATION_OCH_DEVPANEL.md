# ORDER 146 — Observation med rätt signal + DevPanel-panelfrågan

**Utfärdad** 2026-08-30
**Klass** AUTONOM · Utredning, ingen kod ändrad
**Gren** `order-146` (från `main`)
**Följer** ORDER 145; svarar på ORDER 124 med kompletterande observation

---

## 0. Rakt svar

**Del 1 — observationen reproduceras:** samma scenario som ORDER 124 rapporterade, mätt med rätt signal, visar **`seatedIds=16, stateSeated=0, waitingIds=4`** vid t=550s. Alla 16 platser är faktiskt fyllda; `state='seated'`-räknaren är noll för att gästerna hunnit gå vidare till `ordering`/`dining`.

**Del 2 — DevPanel-panelfrågan:** DevPanel visar **redan** `seatedIds.length` (sedan ORDER 097, 2026-08-15). Live-verifiering vid t=525s: sträng lyder `waiting=5 queue=2 scene=8 seated=16/16`. Panelen är teknisk-korrekt.

**Konsekvens:** Vision Owner-observationen "`seated=0/16` i DEV-panelen" kan **inte reproduceras** från nuvarande kod. Antingen (a) läste observationen fel signal (t.ex. konsol-log eller test-utskrift som räknar `guests.filter(g.state==='seated')`), (b) `state.seatedIds` var verkligen osynk med `guests` under observationstillfället (ORDER 124 §6:s "Fynd 1"), eller (c) DevPanel visade fel format förr och har rättats sedan. Alla tre lämnas som spår i §5.

**Läsbarhetsförbättring är befogad ändå:** DevPanels etikett `seated` (som teknisk räknar upptagen-räkning) är lätt att sammanblanda med `state='seated'` (som är transient). Rapporten föreslår två alternativa formuleringar i §6, ingen genomförd.

---

## 1. Del 1 — observation med rätt signal

### 1.1 Metod

Data läses ur `frontend/reports/order145/tick-log.json` — samma 20-min lunchservice, 6000 ticks à 5 Hz. För varje tick fanns redan:
- `seatedIds` (verklig upptagen-räkning från `state.seatedIds.length`)
- `waitingIds` (verklig kö från `state.waitingIds.length`)
- `stateCount` per gäst-tillstånd (transient räkning)
- `staff` med `taskType`

### 1.2 Reproduktion av ORDER 124-observationen

**Vid t=550,8s** (period=lunch):

| Signal | Värde |
|---|---:|
| `seatedIds.length` (verkligen sittande) | **16** |
| `waitingIds.length` (verkligen i kö) | **4** |
| `stateCount.seated` (transient) | **0** |
| `stateCount.ordering` | 1 |
| `stateCount.dining` | 13 |

**Detta reproducerar ORDER 124:s citat exakt** — om man läser fel signal:
- Rätt läsning: `waiting=4, seated=16/16` (fullt hus, 4 i kö)
- Fel läsning: `waiting=4, seated=0/16` — läser den transient `state='seated'`

Två observationer med `waitingIds > 0` i ORDER 145-datan där `stateSeated = 0`:
- t=530,8s: waitingIds=3, seatedIds=16, stateSeated=0
- t=535,8s: waitingIds=3, seatedIds=16, stateSeated=0
- t=540,8s: waitingIds=3, seatedIds=16, stateSeated=0
- t=550,8s: waitingIds=4, seatedIds=16, stateSeated=0

Alla dessa hade `seatedIds=16` men skulle se ut som `seated=0/16` om observationen läste `state='seated'`-räknaren.

### 1.3 Slutsats del 1

**ORDER 124-observationen `seated=0/16 waiting=4` är EXAKT vad sim producerar vid full servering** — bara läst genom fel signal. Verkligt: alla 16 platser var upptagna av gäster i `ordering`/`dining`. Personalen `On break` var ett annat separat fynd (arrivals-under-prep enligt ORDER 124 §1), inte kopplat till seat-räknaren.

---

## 2. Del 2 — DevPanel-panelfrågan

### 2.1 Vad DevPanel faktiskt läser

`frontend/src/strategic/ui/DevPanel.tsx:131-140`:

```ts
const isFoodtruck = sim.businessClass === 'foodtrucken';
const queueLive = isFoodtruck
  ? sim.guests.filter((g) =>
      g.state === 'waiting' || g.state === 'arriving' ||
      g.state === 'ordering' || g.state === 'paying'
    ).length
  : sim.waitingIds.length;
const seatedLive = isFoodtruck
  ? sim.guests.filter((g) => g.state === 'eating').length
  : sim.seatedIds.length;
```

För **kvarterskrogen** (`isFoodtruck=false`): `seatedLive = sim.seatedIds.length`.

Format-strängen (rad 178): `` `seatStr = ' queue=${queueLive} scene=${sceneLive} seated=${seatedLive}/${capacity}'` ``.

### 2.2 Live-verifiering

`frontend/scripts/order146-devpanel-verify.mjs` startade Vite, öppnade en tick där sim producerar samma scenario som ORDER 145 fångade, och läste faktisk DOM-text. Vid t=526s:

- `seatedIds`: **16**
- `waitingIds`: 2
- `stateSeated`: 1
- `stateOrdering`: 4
- `stateDining`: 11
- **DevPanel-sträng: `... waiting=5 queue=2 scene=8 seated=16/16`**

Panelen visar 16/16 — inte 0/16. Så nuvarande kod visar aldrig `seated=0/16` när alla platser är faktiskt fyllda.

Rapport: `frontend/reports/order146/devpanel-observations.json`.

### 2.3 Panelfrågan besvarad

**"Ska DevPanel visa `seatedIds.length` i stället, eller båda?"**

Den visar redan `seatedIds.length` sedan ORDER 097 (2026-08-15). Frågan pekar mot en förändring som redan är gjord.

**Men läsbarhetsproblemet finns:** etiketten `seated` är lätt att missförstå. En läsare kan tro att panelen visar `state='seated'`-räknaren (samma ord i koden, samma ord i UI) — och att `seated=16/16` betyder "16 gäster har precis blivit satta, alla platser fulla just nu". Men den fysiska betydelsen är "16 platser upptagna, alla av gäster som sitter någon underform".

Om observationen förr faktiskt visade `0/16` (Fynd 1), då kan panelen ha varit korrekt i sitt eget kontrakt men visat något som misstolkades. Om observationen missläst en annan signal och citerat "DevPanel", då är det inte panelens fel utan citatets.

### 2.4 Vad Vision Owner sannolikt vill åt

Verktyget som ska stödja observation, inte förvirra. Två alternativa formuleringar för DevPanel-strängen som skulle **isolera missförståndet**:

**Alternativ A — byt etikett:**
```
queue=2 scene=8 atTable=16/16
```
"seated" → "atTable" tar bort kopplingen till gäst-tillståndet `seated`. Fångas som en fysisk räkning.

**Alternativ B — visa både räkningen och breakdown:**
```
queue=2 scene=8 seated=16/16 (S:0 O:4 D:11 P:1)
```
Panelen visar både summan och sub-tillstånden. Läsaren ser genast att `state='seated'=0` betyder "gäster har hunnit gå vidare", inte "inga sitter".

**Alternativ C — behåll som är, tydliggör i orderregistret:** dokumentera på `deriveFaces.ts`/`DevPanel.tsx`-nivå att "seated" i panel = seatedIds (upptagen), inte state='seated' (transient). Ingen UI-ändring, bara dokumentation.

---

## 3. Konsekvens för ORDER 124

**ORDER 124-observationens rot är sannolikt fel-signalläsning, inte en verklig `seated=0`-bugg.** Om samma scenario återobserveras med DevPanels aktuella `seated=`-räknare (som läser `seatedIds`), kommer den visa `16/16`. `On break`-läsningen för personalen är fortfarande giltig — den beror på `arrivals gate:as på period, staff gate:as på phase` — men de två fenomenen är oberoende.

Rekommendation: ORDER 124-orderfilens §1-observationsformulering ("seated=0/16") behöver noten "reproducerad av ORDER 146 som förklaring av `state='seated'`-signal snarare än verkligt fel. Verklig sittande = 16 samtidigt". `On break`-fyndet står kvar som separat spår.

---

## 4. Vad ORDER 146 INTE gör

- Ingen ändring av DevPanel.tsx (utredningsfråga, inte implementering)
- Ingen ändring av seat-räknarens etikett — Vision Owner beslutar mellan Alternativ A/B/C
- Ingen ändring av ORDER 124-orderfilen — men rekommendation till registerpost
- Ingen produktionskod rörd (`git diff main..HEAD -- frontend/src/` = tomt)

---

## 5. Öppna spår att pröva om observationen återkommer

1. **Fynd 1 seatedIds osynk med guests.** ORDER 124 §6 nämner det utan förklaring. Om det finns ett kodpath där `state.seatedIds` faktiskt förlorar element medan `state.guests[i].state === 'seated'` — då skulle DevPanel visa `seated=0/16` med guests som sitter. Ingen sådan bug reproducerad i denna utredning. Sök: skriv-sites för `state.seatedIds` i `simulation/service.ts` och `reducer.ts` med tester att invariantet `seatedIds.length === guests.filter(g => atTable(g)).length` alltid håller.
2. **DevPanel-historik pre-ORDER 097.** Om observationen använde en äldre bygg (kanske från en gammal branch), kan DevPanel ha visat annan signal då. Kontroll via `git blame frontend/src/strategic/ui/DevPanel.tsx:138`.
3. **Konsol-loggen från `[interior] queue=%d seated=%d`.** Samma signal som panelen (rad 195), så samma resultat. Men om observationen läste en annan diagnostik (t.ex. test-output från Vitest-suit), kunde signalen skilja.

---

## 6. Rekommenderad följdorder (ingen genomförd här)

Om Vision Owner vill åtgärda läsbarhetsproblemet:

- **Alternativ A eller B ovan** — ren UI-ändring i DevPanel.tsx, ~5 rader, ingen mekanik rörd. Kan monteras i en 20-radig ORDER.
- **Alternativ C** — dokumentation utan kod, ännu enklare.

Rekommendation från utredningen: **Alternativ B**. Behåll `seated=` som huvudetikett (bakåtkompatibel), lägg till `(S:0 O:4 D:11 P:1)`-breakdown. Så syns både summan (att räkna mot 16-cap) och underfördelningen (att förstå när "seated"-transientet är 0 med huset fullt).

---

## 7. Filer

- `documentation/architecture/ORDER_146_OBSERVATION_OCH_DEVPANEL.md` — orderfil
- `documentation/blueprints/ORDER_146_OBSERVATION_OCH_DEVPANEL.md` — denna rapport
- `frontend/scripts/order146-devpanel-verify.mjs` — live-verifierare
- `frontend/reports/order146/devpanel-observations.json` — faktisk DOM-text
- Registerrad 146 + not på rad 124 (observation reproducerad som signalfråga)
