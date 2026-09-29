# ORDER 283 — Innehåll ur Sommelier Championship och Gastronoma (rapport)

**Ordern** (Vision Owner 2026-09-29):
- Ur `SommelierChampionship.jsx` (Vision Owners tidigare spel, koden tas inte in): frågorna (QUESTIONS) och kriskorten (CRISIS_CARDS) med förklaringar och forskningsreferenser, översatta till engelska och inlagda som utkast i frågebanken och raketbanken, med referensen i fältet reference och status "utkast", i rätt paviljong och axel. DOMAIN_INTRO som en introduktion till de tre kunskapsformerna, på engelska, första gången spelaren kommer till Måltidens hus. Utkast för Vision Owners granskning.
- Förslag i speldesignen, inte kod: rivaliserande restauranger med namn, plats, synlig ställning, som kan slås ut, och en rankning i söndagstidningen; en styrka och en svaghet per lokal; kriser som drabbar dig, zonen eller hela byn.
- Ur Gastronoma (koden tas inte in): beredskapen före utfallet med tre nivåer som förslag i speldesignen; en redovisning av de fasta kostnaderna i dag; flera spelare med spelkod och Supabase-realtid som idé för version 2.

## 1. Vad som gjordes

**Frågorna** (`frontend/src/strategic/content/questions/drafts.meta.json`, `drafts.text.en.json`, `drafts.text.sv.draft.json`):
- 37 frågor, alla i originalet. Scenariot står före frågan.
- Domänen ger paviljong och axel: vetenskap → Måltidsbiblioteket (episteme), hantverk → Stensöta (techne, sommellerie), estetisk gestaltning → Kalastorget (phronesis). Svårighet 1, 2 och 3 blir brons, silver och guld.
- Referensen är den forskning frågan eller förklaringen bygger på, som den står i originalet, till exempel "Crichton-Fock & Spence (2024), Journal of Wine Research". Länken är `null`: inga länkar hittas på (speldesignen, Frågebanken). 35 av 37 frågor har en referens; de två utan (Demeter, vinlistans klimatavtryck) anger ingen forskning i originalet.
- Alternativen är roterade, så att rätt svar inte alltid står på plats b som i originalet.
- Engelska: Claude Codes översättning. Svenska: originalet.

**Kriskorten** (`frontend/src/content/incidents/crises.meta.json`, `crises.text.en.json`, `crises.text.sv.draft.json`):
- Nio raketer. En raket har tre steg, men ett kriskort har en fråga. Kortets fråga, alternativ och förklaring står därför i ett steg (`originalStep`, oftast phronesis, techne för personalbristen), och de två andra stegen är skrivna av Claude Code i samma sammanhang, på engelska och svenska. **De nya stegen behöver Vision Owners granskning särskilt.**
- `reach` anger vem krisen drabbar i originalet (du, zonen, byn), som underlag för förslaget om kriser.

**Utkasten används inte i spelet.** Frågorna ligger utanför `BANK_META` (`questionBank.ts` `DRAFT_META`) och kriserna utanför klassernas bank (`incidentBank.ts` `CRISIS_DRAFTS`). Båda valideras med samma regler som banken. Proven, övningen och servicen är oförändrade. En fråga eller raket blir spelbar när den flyttas till bankfilen utan status.

**Referenser utan länk:** `Reference.url` får vara `null`. Titeln visas då utan länk (`ReferenceLine.tsx`).

**Introduktionen i Måltidens hus** (`MaltidensHusDialog.tsx`, `strings.houseIntro`, åtgärden `SEE_HOUSE_INTRO`, `houseIntroSeen`):
- Första gången spelaren öppnar huset visas "Three ways of knowing": episteme, techne och phronesis, var och en med sin fråga, en sammanfattning, tre punkter i praktiken, ett citat ur Herdenstam (2011) och paviljongen där den övas. Nederst källorna och ordet utkast.
- Texten är omskriven för spelaren ur DOMAIN_INTRO, kortare än originalet. Engelska och svenska sida vid sida i strängtabellen.

**Speldesignen**, nya avsnitt *Förslag att pröva efter provspel* (rivalerna, styrka och svaghet, kriser med räckvidd, beredskapen före utfallet, fasta kostnader) och *Idéer för version 2* (flera spelare i klassrummet). Inget av det är beslutat eller byggt.

## 2. Fasta kostnader i dag

`frontend/reports/order283/fixed-costs.json` @ `order-283` (mätningen `order283FixedCosts.test.ts`), vecka 2, vinbaren, brons i tre, den rimliga spelaren, 20 frön, summor ur kassaboken (`mean`):

| Kategori | Kr i veckan | Fast eller rörlig |
| --- | --- | --- |
| `wage` (löner) | −21 600 | Fast per servicedag: dras efter kvällen, inte söndag, inte en dag då kvällen är stängd |
| `amortisation` (lånet) | −10 523 | Fast, vid veckoavräkningen |
| `interest` (räntan) | −525 | Fast |
| `stock` (inköpslistan) | −12 530 | Rörlig: spelarens val |
| `ingredient` (kostnaden per minut under servicen) | −1 520 | Rörlig med servicens längd |
| `waste` (sopbilen) | −1 197 | Rörlig |
| `revenue` (intäkt, med dricks) | +47 026 | |
| `scenario` (raketernas kassa) | +2 529 | |

Vinbarens normala veckointäkt är `normalWeeklyRevenueSek` 42 090 kr.

- **Ingen hyra.** Lokalen ingår i startlånet.
- **Lönerna** är den största fasta kostnaden, men de dras per dag och bara på servicedagar.
- **Lånet** är den enda kostnaden som dras en gång i veckan.
- En dålig vecka märks mindre än den borde: startlånet ger en stor kassa, och golvet fyller på när intäkten är låg. Förslaget (veckohyra per klass, lönerna som en veckorad i avräkningen) står i speldesignen.

## 3. Tal och verifiering

**Tester:** `frontend/src/strategic/knowledge/__tests__/order283SommelierDrafts.test.ts` (8 tester) prövar
- att frågorna är 37, giltiga på båda språken och har status utkast;
- paviljong och axel efter domänen, referenserna utan påhittade länkar, och att rätt svar inte oftast står på samma plats;
- att utkasten inte används i spelet;
- att kriserna är nio giltiga raketer med originalets steg och räckvidden angivna, utanför vinbarens bank;
- introduktionens tre former, och att den visas en gång.

`order271Screens.test.tsx` prövar nu introduktionen före MD1. Hela sviten är grön (2 163 tester, varav 4 överhoppade som förut).

**Spelarens flöde** (`frontend/reports/order283/dod.json` och `dod-05-introduktionen-kunskapsformerna.png` @ `order-283`): produktionsbygget från normal start till kvällens första service (`STOP_AFTER=clock`). Introduktionen visades vid första besöket i Måltidens hus med de tre formerna (`houseIntro.forms`), och vägen fortsatte som förut genom proven, banken och vinbaren till servicen, utan fel i sidan (`errors` tom). Hela veckan kördes inte, eftersom ordern inte rör servicen.

## 4. Öppet

- Vision Owner granskar frågorna, översättningen och särskilt kriskortens nya steg, och beslutar vilka som blir spelbara.
- Länkarna till referenserna saknas tills Vision Owner levererar dem.
- Förslagen i speldesignen beslutas efter provspel.
- Insatsens ändring och kassan-leveransen (ORDER 280) väntar på Vision Owners svar.
