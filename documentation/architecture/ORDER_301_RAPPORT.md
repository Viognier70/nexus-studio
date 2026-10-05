# ORDER 301 — Kunskapsgrunden (rapport)

**Underlag:** Anders 2026-10-04 (`ORDRAR_300-302.md`) och `KUNSKAPSGRUND_TRIAD.md`.

**Ordningen** blev 300 → 303 → 301. Grenen `order-301` startades från `main` (`8a1be42`) och pausades för ORDER 303 (`544fe07`). Den ombaserades på `main` efter 303 (`b2afd00`).

Talen och bilderna pekar på `frontend/reports/order301/`.

## 1. Filen i foundation och beslutet i speldesignen

- **Filen:** `documentation/foundation/KUNSKAPSGRUND_TRIAD.md`, oförändrad från Anders fil. Den står i `documentation/INDEX.md`.
- **Speldesignen:** `NEXUS_SPELDESIGN_V1.md` > Kunskapen har beslutet "Beslut 2026-10-04 (Anders): kunskapsgrunden". Det säger:
  - filen står över tidigare beskrivningar;
  - formerna och tolkningen;
  - namnet;
  - källorna;
  - paviljongernas register;
  - att raketens tre steg beslutas efter förslaget i §5 nedan.
- **Utan ORDER-nummer och paragrafnummer:** testet `balance.test.ts` läser varje tal i speldesignen som ett speltal, så beslutet skrivs utan sådana nummer.

## 2. Namn och källor

**"Herdenstam" i spelets text** är omskrivet enligt filens §1. Varje sträng är en skärm: första gången står "Crichton-Fock (tidigare Herdenstam)" eller "(formerly Herdenstam)", därefter "Crichton-Fock". Det gäller:
- **Frågornas förklaringar och frågor** (`content/questions/drafts.text.sv.draft.json` och `.en.json`): 49 strängar.
- **Källraderna under frågorna** (`drafts.meta.json` `reference.title`): 18 rader. De visas på båda språken med samma text, så de har formen "Crichton-Fock (Herdenstam), 2011, Den arbetande gommen, KTH", utan ord på något språk.
- **En raket i vinbarens kriser** (`content/incidents/crises.*`): förklaringen om atmosfären.
- **Rättat för hand:** tre texter som behandlade Herdenstam och Crichton-Fock som två personer, till exempel "Herdenstam's double grip and Crichton-Fock's atmospheric influence". De beskriver nu en person.
- **Strängar med bara "Crichton-Fock"** fick den långa formen första gången i strängen.
- **Undantag, som filen anger:** de bibliografiska posterna i källförteckningen ("Herdenstam, A. P. F. (2004) …") och noten om att avhandlingarna publicerades under namnet Herdenstam.
- **Aristoteles:** ingen text påstår längre att formerna är Aristoteles definitioner. Introduktionen sa "efter Aristoteles" och säger nu "Kunskapsformerna enligt TRIAD-modellen". Sidan Kunskapsgrunden har filens formulering: formerna kommer från Aristoteles, urvalet och tolkningen är TRIAD-modellen.
- **Testet** `order301Kunskapsgrund.test.ts` söker igenom all kod och allt innehåll under `src/` efter "Herdenstam" utanför de tillåtna formerna, och efter "efter Aristoteles" och "after Aristotle".

## 3. Sidan Kunskapsgrunden och eftertexterna

**Sidan Kunskapsgrunden** (`knowledge/ui/KnowledgeFoundation.tsx`) har två spalter:
- vänster: upphovet, de tre formerna med register, slutledning och grundfråga, och det dubbla greppet i fem rader;
- höger: citaten ur Den arbetande gommen, flyttade från introduktionen, källorna med noten, och "Mer om modellen: gusto.science/foundation".

Den öppnas från knappen Kunskapsgrunden på Måltidsbibliotekets rad i Måltidens hus, och från "Läs mer" i introduktionen.

**Eftertexterna:** spelet hade inga. Menyn har nu "Eftertexter", med Nexus Studio, kunskapsgrunden och dess upphov, och samma källor.

**Kontrollen** (`scripts/order301-check.mjs`, spelarens flöde från Nytt spel, 1280 × 720 och 1500 × 950, `check.json`):
- introduktionen, sidan från "Läs mer", bibliotekets knapp och eftertexterna finns i båda storlekarna;
- ingen av dem rullar sidan;
- sidan Kunskapsgrunden ryms utan att panelen rullar (`panelOver` 0).

## 4. Tre sätt att kunna

Introduktionen i Måltidens hus har tre korta kort och raden om det dubbla greppet:
- Episteme – Att veta. *Vad finns i glaset?* (Övas i Måltidsbiblioteket)
- Phronesis – Att bedöma. *Vad väcker det, för just den här gästen?* (Övas i Kalastorget)
- Techne – Att göra. *Vad gör du nu?* (Övas i Metodköket och Stensöta)
- Raden: *Det dubbla greppet: att hålla analys och upplevelse samtidigt, och handla. (Anders Crichton-Fock, tidigare Herdenstam)*
- Länken "Läs mer" leder till Kunskapsgrunden. Citaten och källorna står där, inte i introduktionen.

**Avvikelse:** ordern skriver raden med "(Anders Crichton-Fock)". Filens §1 säger att namnet står som "Crichton-Fock (tidigare Herdenstam)" första gången på en skärm, och introduktionen är en egen skärm. Därför står "(Anders Crichton-Fock, tidigare Herdenstam)".

**Beslut 2026-10-05 (Anders):** namnformen "Anders Crichton-Fock (tidigare Herdenstam)" första gången är rätt, enligt avsnitt 1 i kunskapsgrunden. Raden står kvar som den är.

## 5. Förslag: raketen följer greppet (för beslut, inget byggt)

### Raketen i dag

Varje raket har tre steg i ordningen episteme (vad, 20 s), techne (hur, 20 s) och phronesis (när och varför, 30 s) (`balance.ts` `INCIDENTS.stepSeconds`, `incidentBank.ts`).
- Varje steg är en fråga med tre eller fyra svar. Svaren har kvaliteten bäst, ok eller fel.
- Ett fel avslutar raketen.
- I en egen raket väljer spelaren säkerheten per steg: gissar, tror det eller vet det. Stegets multiplikator är ×1, ×1,5 eller ×2.
- Pyramiden har episteme i botten, techne i mitten och phronesis i toppen.
- Vinbaren har 39 raketer (`vinbar.meta.json`).

### Förslaget

**1. Ordningen blir analys → upplevelse → handling.**
- Steg 1 är episteme, en analytisk ledtråd.
- Steg 2 är phronesis, en analogisk ledtråd ur situationen.
- Steg 3 är techne, handlingen.
- Pyramiden byter de två övre våningarna: analys i botten, upplevelse i mitten och handling i toppen.
- Tiderna följer steget: 20 s, 30 s och 20 s. Omdömet har som i dag mest tid.

**2. Steg 1 och 2 är ledtrådar som spelaren läser.** Varje steg är fortfarande en fråga, så att krediterna per kunskapsform, bankerna och säkerheten fungerar som i dag.
- **Steg 1**, exempel: "Vad säger glaset?" Rätt svar: "hög syra, citrus, ingen ek".
- **Steg 2**, exempel: "Vad söker gästen?" Rätt svar ur gästens egna ord: "något som känns som en sommarkväll vid sjön".
- När steget är besvarat står ledtråden kvar på kortet ("Analys: …", "Upplevelse: …"). Spelaren har båda framför sig när handlingen väljs.

**3. Steg 3 är handlingen, och svaren märks med vilket register de håller för.** I datan: `options[].grip: 'full' | 'analysis' | 'experience' | 'none'`, i stället för kvaliteten på just det steget.
- `full`: handlingen håller för båda ledtrådarna, det dubbla greppet.
- `analysis` eller `experience`: ett halvt grepp.
- `none`: fel.

**4. Ett halvt grepp ger en mindre effekt och en återkoppling som visar vad som saknades.**
- Raketen räknas som klarad, men stegets kredit och kvällens följd (ORDER 303: dricksen, avec, ryktet och stämningens lyft) gånger `CONSEQUENCES.halfGrip`, till exempel 0,5 i `balance.ts`.
- Återkopplingen säger vilket register som saknades: "Halvt grepp: valet höll för analysen, men inte för gästens upplevelse." Eller omvänt.
- I pyramiden tänds toppen till hälften.

**5. Säkerhetsvalet** är kvar per steg och är där omdömet syns, som filen säger. Kvällens träffsäkerhet (ORDER 299) står i bandet som i dag.

**6. Mognaden och portfolion** (filens §3.3): varje raket sparar sitt grepp (helt, halvt mot analys, halvt mot upplevelse, fel).
- Portfolion visar andelen helt grepp per vecka och hur den ändras över säsongen.
- Den andelen är det dubbla greppet som evidens.
- Mognadsnivåerna, från novis till expert, kan läsas ur andelen och ur säkerheten under tidspress.

### Vad det kräver

**Innehållet**, i vinbarens 39 raketer:
- steg 2 och 3 byter plats;
- steg 2 skrivs om till en analogisk ledtråd ur situationen, till exempel gästens ord eller stämningen vid bordet;
- steg 3 får sina svar märkta med grepp, och två förklaringar för halvt grepp (vad som saknades).

Jag skriver ett utkast i samma format som de 37 frågorna, för granskning innan det byggs in. Food truckens och krisernas raketer kommer efter.

**Koden:**
- `incidentBank.ts`: greppet i steg 3;
- `incidents.ts`: halvt grepp som klarad raket med andel;
- `IncidentPanel.tsx`: ledtrådarna på kortet och återkopplingen;
- `KnowledgePyramid`: ordningen och halv topp;
- portfolion: andelen per vecka.

**Balansen:** ORDER 303:s mål prövas om i harness. Ett halvt grepp ger mindre än ett helt, så spelartyperna behöver ett tredje utfall: halvt grepp.

### Att besluta

1. **Ordningen och pyramiden:** analys → upplevelse → handling, med handling i toppen. Eller ska pyramiden behålla phronesis i toppen och bara ordningen ändras?
2. **Ledtrådarna:** ska steg 1 och 2 vara frågor som besvaras (förslaget, behåller krediterna per form)? Eller ledtrådar som bara visas, så att raketen blir en enda handling (kortare, men utan krediter för episteme och phronesis)?
3. **Fel på steg 1 eller 2:** avslutar det raketen som i dag? Eller går spelaren vidare till handlingen utan den ledtråden, så att bara ett halvt grepp är möjligt?
4. **Det halva greppets andel** av effekten (förslag 0,5).
5. **Innehållet:** utkastet till de 39 raketerna först (förslag), eller ett urval på tio för att pröva formen.

## 6. Tester och bygge

- **Nytt test:** `sim/__tests__/order301Kunskapsgrund.test.ts`, med 4 tester:
  - inget "Herdenstam" ensamt;
  - ingen tillskrivning till Aristoteles;
  - de tre korten och raden;
  - citaten och källorna, och samma källor i eftertexterna.
- **Ändrade tester:**
  - `order283SommelierDrafts.test.ts`: korten i ordningen att veta, att bedöma, att göra;
  - `order273NoSwedishPlayerText.test.ts`: avhandlingarnas svenska titlar är egennamn i de engelska källorna.
