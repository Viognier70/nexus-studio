# ORDER 120 — Rykte-trend på stängda pillen (§5.2 uppföljning)

**Repo** `Viognier70/nexus-studio` · **Gren** `order-120` (från `main`)
**Klass** AUTONOM
**Datum** 2026-08-29
**Bygger på** ORDER 117 §5.2 (rykte-trend på Reading-raden i öppnad panel)

---

## 1. Läget

ORDER 117 §5.2 gav Rykte-raden i den öppnade PlayerPanel en trend-glyf
(▲/·/▼) intill band-etiketten. `reputationTrend(state)` finns i
`simulation/valueQuota.ts`; `TREND_GLYPHS` och `TREND_COLOURS` finns i
`PlayerPanel.tsx`. Allt är i main.

Kvar är att spelaren måste **klicka öppen panelen** för att se riktningen.
Cash-pillen (den alltid synliga stängda knappen) visar bara Cash-siffran
och den lilla ▴/▾-öppna/stäng-pilen. Rykte-trenden är gömd bakom ett klick.

Denna order drar trend-glyfen till själva pillen så riktningen syns utan
klick, och sätter DoD som skiljer den från §5.2:s befintliga arbete.

---

## 2. Vad som byggs

**2.1 `PlayerPanel.tsx`** — Cash-pillens rendering utökas med ett villkorligt
block:

- `const trend = reputationTrend(sim)` lokalt i komponenten.
- Om `trend !== 'flat'`: render en `<span>` intill Cash-siffran med
  `TREND_GLYPHS[trend]`, färgen `TREND_COLOURS[trend]`, `fontSize: 12`,
  `marginLeft: 2`.
- Attribut `data-reputation-trend={trend}` för test-grep.
- `aria-label` + `title` för skärmläsare respektive tooltip.
- `flat`-läget döljs medvetet — pillen ska vara tyst när rykte inte rör sig
  (samma princip som §5.2:s trösklar).

**2.2 Ingenting annat.** Panelens öppnade läge, Reading-radens
`trend`-rendering, `reputationTrend`-funktionen, trösklarna 1.10/0.90 —
allt orört.

---

## 3. Avgränsningar

- `reputationTrend`-funktionen rörs inte.
- `TREND_GLYPHS`/`TREND_COLOURS` rörs inte.
- Öppnade panelens Rykte-Reading-rad rörs inte — samma glyf på två
  ställen är avsikten, inte defekt.
- Cash-siffran, öppna-pilen (▴/▾), formatering, layout — allt annat orört.
- Ingen ny fil utanför `frontend/src/strategic/business/__tests__/` och
  `frontend/scripts/`. Ingen ny import i produktionskoden. Inga nya
  trösklar. Ingen ny SimAction. Inga URL-parametrar.

---

## 4. Definition of Done

Grep- och bild-verifierbar.

1. **Pillen visar trend (grep).** Grep i `PlayerPanel.tsx` visar
   `data-reputation-trend` inne i den stängda pillens `<button>`-block
   (dvs. före `{open && (...)}`-panelblocket). Unit-test i
   `PlayerPanel.test.tsx` renderar panelen i stängt läge och asserterar
   att pillen har `[data-reputation-trend]`-attribut när sim är i
   icke-flat läge, och **inte** när trend är flat.
2. **§5.2:s Reading-rad orörd.** Grep visar att `<Reading label="Rykte"`
   fortfarande har `trend={reputationTrend(sim)}`-propen exakt som i
   main. `git diff main..HEAD -- PlayerPanel.tsx` visar noll rader
   borttagna före rad 260 (Reading-raden ligger inuti öppnat-block); endast
   tillägg i pillens `<button>`-block. Regressionstest asserterar att
   `[data-reputation-trend]`-attributet fortfarande finns i den öppnade
   panelens Rykte-Reading-rad.
3. **`reputationTrend` orörd.** `git diff main..HEAD -- valueQuota.ts` = tomt.
4. **`TREND_GLYPHS`/`TREND_COLOURS` orörda.** Grep visar samma definitioner
   som i main.
5. **Skärmläsare + tooltip.** `aria-label` sätts på pill-glyfen; test
   asserterar att `aria-label`-strängen finns när trend är up eller down.
6. **Struktur i DOM.** Test asserterar att pill-glyfen är **direkt barn**
   till `<button>`, inte nästad inuti Cash-value-spannen; att den kommer
   efter Cash-value-spannen och före ▾-toggleln i DOM-ordning.
7. **Visuell verifikation via playwright** (§4-tillägg per Vision Owner
   2026-08-29). `frontend/scripts/order120-pill-trend-visibility.mjs`
   startar vite dev, laddar appen, tvingar `effectiveValueQuota = 1.5`
   via `window.__nxSimState`-mutation + dispatch av en `SET_CASH`-no-op
   (som spread:ar state och triggrar re-render), och verifierar att
   `[data-reputation-trend="up"]`-noden:
   - har `getBoundingClientRect().width ≥ 6` CSS-px (glyfen faktiskt
     ritad, inte kollapsad till noll bredd)
   - har `getBoundingClientRect().height ≥ 10` CSS-px (samma för höjd)
   - ligger **inom** pill-knappens bounding box (inte klippt bort eller
     positionerad utanför)
   - har en `x`-position som är **större än** Cash-value-spannens `x + width`
     (dvs. glyfen ritas efter Cash-siffran, inte gömd bakom den)
   - har `getComputedStyle().visibility !== 'hidden'` och
     `getComputedStyle().opacity` > 0.5
   Samma test körs sedan om med `effectiveValueQuota = 0.5` för att
   verifiera 'down'-varianten. Skärmdump sparas till
   `frontend/reports/order120/pill-trend-up.png` och `pill-trend-down.png`
   som artefakter.
8. Typecheck grön.
9. Hela sviten grön (nuvarande 944 tester + de nya).
10. Båda CI-jobben gröna på grenens PR.
11. Registerpost i samma commit.

Attribut på en nod som renderas med noll bredd eller bakom Cash-siffran
passerar §4.1:s grep men löser inte problemet ordern adresserar. §4.7
är den kontroll som säger att glyfen faktiskt läses av en spelare.

---

## 5. Om något inte går

Om Cash-siffran och trend-glyfen krockar visuellt på minsta breddpanel:
det är ett fynd — inte något att lösa genom att flytta trenden tillbaka
till öppnade panelen ensam. Rapportera och stanna.

Om `reputationTrend` börjar returnera `'flat'` för scener där §5.2:s
öppnade panel visste bättre: det är också ett fynd om asymmetri i vad
de två pillsen visar. Rapportera.

Om playwright-scriptet inte kan tvinga state utan reload
(dvs. mutation + SET_CASH-no-op fungerar inte som förväntat): fallback
är att spawn:a ett dedikerat test-vite-projekt eller lägga till en
dev-only setter — båda är scope-creep och kräver Vision Owner-godkännande
innan ordern går vidare.

---

## 6. Bakåt

`data-reputation-trend` finns nu på två platser i DOM när trenden är
non-flat: pillen (yttre `<button>`) och Reading-raden (i öppnad panel).
Test-grep som förväntar exakt en träff behöver uppdateras. Existerande
`order117.rykteTrend.test.tsx` eller motsvarande som räknar attribut
måste läsas och ev. uppdateras till `atLeastOne`.

---

## 7. Efter merge

Nästa presentation-related order är utfasning av `FoodtruckScene.tsx`/
`rig.ts`/`Figure.tsx` mot 3D-food-truck per SD-004 §6.1-beslut (ORDER 119).
Den är oberoende av denna order.
