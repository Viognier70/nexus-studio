# ORDER 146 — Observation med rätt signal + DevPanel-panelfrågan

**Repo** `Viognier70/nexus-studio` · **Gren** `order-146` (från `main`)
**Klass** AUTONOM · **Observation + utredning, ingen kod ändrad**
**Datum** 2026-08-30
**Följer** ORDER 145; svarar också på ORDER 124

---

## 1. Två delar

**1a. Observation.** Kör om ORDER 124-observationen med rätt signal.
Logga per tick både `guests.filter(g.state === 'seated').length` (den
transienta) och `state.seatedIds.length` (den verkliga). Bekräfta om
"seated=0/16 waiting=4" är sim-verkligt eller signal-artefakt.

**1b. Panelfråga (utredning).** DEV-panelens seated-räknare visade
samma missvisande tal för spelaren som lurade utredningen i två dygn.
Utred om DevPanel ska visa `seatedIds.length` i stället, eller båda —
eller om den redan gör rätt och läsbarhetsproblemet ligger någon
annanstans. Ingen ändring genomförs i denna order.

---

## 2. Vad som mäts

Observation: ORDER 145:s tick-log redan har båda signalerna för samma
scenariot (20-min lunchservice, 6000 ticks). Data läses ur den.

Panel: playwright startar Vite, kör sim till en tick med waiting > 0,
läser faktiska DOM-texten från DevPanel via TreeWalker. Ingen antagen
signal — läses vad spelaren ser.

---

## 3. Inget rättas

Ordern mäter och rapporterar. Om läsbarhetsförbättring bedöms
värdefull föreslås alternativ; genomförandet blir egen order.

---

## 4. Definition of Done

1. Reproduktion av "seated=0/16 waiting=X" fastställd som signal-
   artefakt eller verkligt fel — med tick-nummer.
2. DevPanel-strängen läst live i samma scenariot — visad text redovisad.
3. Panelfrågan besvarad med rekommendation (behåll, byt etikett, eller
   visa breakdown).
4. Not på rad 124 om observationens rot.
5. `git diff main..HEAD -- frontend/src/` = tomt.
6. Typecheck grön, sviten grön.

---

## 5. Om något inte går

Om DevPanel-strängen live visar `seated=0/16` när `seatedIds.length`
är 16 — då finns en verklig bug (Fynd 1 osynk). Rapportera och stanna;
fixet är inte i denna order.
