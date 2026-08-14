# R3 — Kunskapskapitalet, bankmötet, kurvan

**Rapport under ORDER 092** · rapportgrind, ingen kod
**Källa** `documentation/foundation/vision/SPELSLINGAN_SCHEMAT.md` (Miro-tavla `uXjVIGbwLcE`, utskriven 2026-08-14) + Vision Owners precisering 2026-08-14 (inskriven i ORDER 092 §§ 2–3 som **beslutat**).
**Datum** 2026-08-14
**Roll** Grind före R1 (kunskapskapital + krediter) och R3 (bankmötet). Låser upp M7b (bankscenen) via R3:s mappning. Denna rapport avgör ingen siffra; den specificerar vad som är beslutat och vad som ska mätas.

---

## 0. Sammanfattning

**Vad som är beslutat i ORDER 092 och därför inte utreds här:**

1. Kunskapskapitalet har **tre axlar** — episteme, techne, phronesis — inte fem. Paviljongerna matar in i tre.
2. **Krediter är en vektor med tre komponenter**, inte ett tal. Detta är den beslutspunkt R1 måste ha före kodstart.
3. **Profilmatchning i ingången** — bankmötet läser profilens *form*, inte dess summa. Techne-tyngd → food truck. Phronesis närvarande → restaurang. Ingen kunskap → tillbaka till paviljongerna. **Ingen golvspärr som summa.**
4. **Ingen siffra visas i bankmötet** — diagnos, inte betyg. Regeln om inga stat-paneler gäller.
5. **Kurvan går att vända.** Svårighet stiger per varv som grundtillstånd; skicklighet lutar tillbaka. Ett bra varv kan gå plus även sent.
6. **Spelet kan ta slut.** Sista kväll med facit; inte som förlust.

**Vad rapporten utreder (§§ 3–8):**

- **§3 Profilavläsningen** — hur formen läses numeriskt utan att en siffra visas.
- **§4 Kreditekonomin** — vad ett prov, ett rätt svar och en drift kostar/ger, i vektorform.
- **§5 Svårighetskurvans lutning** — hur snabbt stiger den, hur mycket vänder skicklighet, mätt via INFRA-2.
- **§6 Uppstigningen** — food truck → restaurang; kan food truck vinna? (Den viktigaste kvalitetsfrågan i hela ordern.)
- **§7 Antal varv** — ~10–15 är gissning, ska mätas.
- **§8 Vad detta gör med M-listan** — M3, cash-vs-krediter, punchlistrader.

**Vad rapporten också svarar på:** §9 slutet (sista-kvälls-formatet), §10 ORDER 089:s omtolkning (vändbar kurva ersätter parallell medgångsmekanik inuti servicen).

**Nästa handling.** Vision Owner läser §§ 3–8, väljer eller flaggar där rapporten föreslår flera vägar (varje utred-avsnitt slutar med en **Beslutspunkt**). När §3 är avgjord kan R1 börja skrivas. R3-mappningen från §§ 3–4 är den mekanik R3 bygger; M7b:s scen bygger sen på R3.

---

## 1. Kunskapskapitalets form — beslutat

### 1.1 Tre axlar, inte fem

Schemat §2 namnger fem paviljonger (forskningsdatabas, Kalastorget, den gastronomiska scenen, Metodköket, femte miljön) och tre kunskapsdomäner (episteme, techne, phronesis). Fem synliga axlar blir ett kompetensträd; tre är läsbart.

**Paviljongerna matar in i axlarna, inte tvärtom.** Provet i forskningsdatabasen adderar episteme. Provet i Metodköket adderar techne. Kalastorget adderar phronesis. Den gastronomiska scenen och den femte matar in i mer än en axel; fördelningen specificeras när R2 (paviljongerna) skrivs — där betyder den något, här räcker det att räkna axlarna.

### 1.2 Vektor, inte tal

`krediter` bärs som `{episteme: number, techne: number, phronesis: number}`. Inte ett tal. Inte ett `capital` i den mening `capitals.values` bär i dag. **Detta är R1:s enda hårda beroende av R3.**

Konsekvens: alla anrop mot "kredit-nivån" måste läsa en axel (eller summera själv, om just den kallande vill det). Ingen implicit skalär.

### 1.3 Ingen golvspärr som summa

Bankmötet läser profilens *form*. En spelare som har ackumulerat mycket episteme och lite techne får inte lån även om summan är hög. En spelare med lite phronesis och lite techne får food trucken även om summan är låg. **Formen avgör verksamheten; summan säger inget.**

Detta är den viktigaste teoretiska omställningen ordern gör: gate-mekaniken är inte kvantitativ ("nog krediter för att låsa upp restaurang"), utan kvalitativ ("din profil visar phronesis"). Utred-avsnittet §3 handlar om hur den kvaliteten läses numeriskt utan att en siffra visas.

### 1.4 Ingen siffra visas

Bankmötet säger inte *"techne 0,72, phronesis 0,31"*. Det säger *"du är redo för en food truck — restaurangen vill se mer omdöme"*. Diagnostisk röst, inte betygsröst. Regeln från EXECUTIVE_DESIGN_DIRECTIVE_001 §7 om inga stat-paneler gäller oförändrat.

**Konsekvens för R3:s UI.** Bankscenen (M7b) består av tre element: (a) bankdirektörens sammanfattning i kunskap-är-ett-verktyg-registret ("du kan värdera råvarukvalitet men inte omvärdera en gäst"); (b) det verksamhetsval spelaren tilldelas (food truck / restaurang / ingen); (c) en enda mening som säger vad som skulle behövas för nästa steg. Ingen tabell, ingen graf, inget diagram.

---

## 2. Kurvan — beslutat

### 2.1 Grundtillstånd: stigande svårighet

Frågorna blir svårare per varv. Chansen till nya krediter sjunker. Servicen hårdnar — antingen genom att `attractiveness` (M4a) höjs, `walkoutRate` (M4a) höjs, `strain`-tröskeln (M1 reputation-loop) sänks, eller en kombination. **Exakt vilken mekanik som bär hårdheten specificeras i §5.**

### 2.2 Vänd-bar av skicklighet

**Ett bra varv kan gå plus även sent.** Det är den bärande designprinciperna för hela ekonomin — de nio milstolpar som redan finns (viktad service, attraktivitet, substitut, walkout, orsaksmedveten mekanik) finns för att spelarens beslut ska betyda något. Om kurvan är obeveklig blir de besluten kosmetiska.

Detta är också det spelmässiga svaret på ORDER 089:s fynd — se §10.

### 2.3 Spelet kan ta slut

Inte som "Game Over" eller förlust. Som en sista kväll med facit: hur många varv nådde du, vilken verksamhet stannade du i, vad du kunde när det tog slut, vilka satsningar som lyfte respektive sjönk profilen. **Sista-kvälls-formatet** specificeras i §9.

Slutet gör paviljongerna i början till vad de är: investeringen som avgör hur långt du når. Ett spel där paviljongerna aldrig betalar tillbaka är ett spel där ingången inte betyder något.

---

## 3. Utred — Profilavläsningen (§4.1 i ORDER 092)

### 3.1 Frågan

Hur läses profilens *form* numeriskt? Vad betyder "techne-tyngd" och "phronesis närvarande" som villkor koden kan svara på?

### 3.2 Tre vägar

**Väg A — trösklar per axel.** `techne > T1 && phronesis < T2 → food truck`. `phronesis > T3 → restaurang`. Enkelt, förutsägbart, men kollapsar snabbt till ett kvantitativt gate — spelaren räknar mot en tröskel även om ingen siffra visas.

**Väg B — kvoter mellan axlar.** `techne / (episteme + phronesis) > R1 → food truck`. Läser form, inte magnitud. En spelare med lite av allt men techne-dominans får food trucken; en spelare med mycket av allt men balanserat får restaurangen. **Problem:** kollapsar vid noll-profil (division), och kvoter är lika räknbara som trösklar när spelaren väl förstått systemet.

**Väg C — profilform via vinkel.** Kunskapsvektorn `(e, t, p)` normaliseras till enhetssfär; profilens position på sfären avgör klass. `arccos(t / ||(e,t,p)||)` är vinkeln mellan profilen och techne-axeln — små vinklar = techne-tyngd. **Fördel:** magnitud och form är helt frikopplade (en spelare kan öva sig genom en klass via magnitud utan att byta klass genom form). **Problem:** vinklar är matematiskt renare men designern måste specificera *vilka sektorer på sfären* som ger vilken verksamhet, och tomma zoner mellan sektorer måste hanteras (vilken klass får profilen som ligger mitt emellan?).

### 3.3 Gränsfallen

Fyra gränsfall som varje väg måste hantera:

1. **Jämnstark på låg nivå** (`e=t=p=0.10`) — inget lån (för lite av allt), eller food truck (form är jämn men magnitud liten)?
2. **Jämnstark på hög nivå** (`e=t=p=0.80`) — restaurang (form läses som phronesis-närvarande eftersom p är hög i absolut mening), eller val (spelaren tilldelas inte, utan väljer)?
3. **Enbart episteme** (`e=0.90, t=p=0.05`) — inget lån (varken techne eller phronesis närvarande), trots hög magnitud i en axel?
4. **Techne + episteme** utan phronesis (`e=0.70, t=0.70, p=0.10`) — food truck (techne-tyngd + episteme förstärker driften) eller inget lån (phronesis krävs eventuellt även för food truck)?

### 3.4 Rekommendation för mätning

Innan väg väljs: bygg ett INFRA-2-verktyg som genererar syntetiska profiler över (e, t, p)-kuben (t.ex. 21³ = 9261 profiler mellan 0 och 1 i steg om 0.05), applicerar varje väg och plottar utfallsfördelningen. Vision Owner ser förhållandet mellan **andel food truck**, **andel restaurang**, **andel inget lån** och kan välja väg mot ett designintryck ("food truck ska vara den vanligaste ingången" eller "restaurangen är standard, food truck är för specialistprofiler").

### 3.5 Beslutspunkt

Vision Owner: väg A / B / C, och de fyra gränsfallens svar. Rekommendation från denna rapport är **Väg C** — vinkel över sfären — därför att den håller magnitud och form frikopplade, vilket är den enda vägen som teoretiskt tillåter en spelare att "öva upp sig genom" en klass utan att byta klass. Men mätningen ovan bör köras först.

---

## 4. Utred — Kreditekonomin (§4.2 i ORDER 092)

### 4.1 Frågan

Vad kostar ett prov (i cash eller krediter?), vad ger ett rätt svar (i vilken axel, hur mycket?), vad kostar ett varvs drift (till skillnad från vad servicen kostar i dag)? En vändbar kurva kräver att intäkter och kostnader kan mätas mot varandra — "gå plus" är inte definierat annars.

### 4.2 Två valutor, ett gränssnitt

Kunskap är krediter (vektor, tre axlar). Ekonomi är `cash` (skalär, SEK). **De byter aldrig plats.** Kunskap köper inte råvaror; cash köper inte kunskap. Deras enda gränssnitt är bankmötet, där kunskapens *form* avgör vilken storlek på lån (i cash) spelaren får.

Detta löser en risk som annars skulle uppstå: om krediter kunde köpas för cash skulle vinstrika spelare kunna genväg-uppgradera profilen och gate-mekaniken blir meningslös.

### 4.3 Kostnader och intäkter per rund — förslag på schema

| Händelse | Effekt |
| --- | --- |
| Klara ett prov i paviljong X | +Δ på X:s primära axel (episteme/techne/phronesis) |
| Missa ett prov | 0 (inget straff mer än förlorad tid — se §4.4) |
| Rätt svar i post-service-quiz på domän X | behåll krediten som utfall pekade på |
| Fel svar i post-service-quiz på domän X | förlora krediten i X |
| Action-knappen (R5) — lyckat rädda | +Δ i cash + möjligen +Δ i den axel handlingen krävde |
| Action-knappen — misslyckat | −Δ i cash (verksamhetens kostnad) |
| Drift ett varv | fasta kostnader från M3-ledgern (löner, ränta, aktiviteter) |

**Öppna storleksfrågor:** hur stort är ett +Δ per prov (0.05? 0.10? 0.20 av en axels 0.0–1.0)? Skalar det med provets svårighet? Hur många prov krävs för att fylla en axel från 0 till "phronesis närvarande"-nivå? Alla ska mätas i §5:s harness, inte skrivas hit.

### 4.4 Vad kostar ett prov

Två val:

**Val A — proven är gratis.** Paviljongerna är alltid öppna, spelaren kan öva obegränsat. **Problem:** gör tidsstrukturen platt — det finns ingen "insats" som riskerar något.

**Val B — proven kostar cash.** Spelaren betalar för att gå till paviljongen. Rätt svar ger kredit; fel svar förlorar cash. **Problem:** en fattig spelare (efter ett dåligt varv) kan inte öva sig upp — kurvan blir plåga.

**Val C — proven kostar en varv-slot.** Spelaren har ett begränsat antal aktiviteter per varv (samma modell som M2:s morgonaktiviteter). Att öva i paviljong tar en slot; slotten kunde annars gått till en satsning som viktar servicen. **Rekommendation** — passar schemats logik bäst (paviljongerna är återbesökbara men inte gratis), och återanvänder M2:s aktivitetsschema.

### 4.5 Beslutspunkt

Vision Owner: val A / B / C för provkostnad, samt Δ-storleksfamilj för §5:s mätning (t.ex. "en axel ska fyllas på 3–5 prov" som mål, siffran kommer sen).

---

## 5. Utred — Svårighetskurvans lutning (§4.3 i ORDER 092)

### 5.1 Frågan

Hur snabbt stiger svårigheten per varv, och hur mycket kan skicklighet kompensera? **Kravet är att en skicklig spelare ska kunna gå plus även sent** — lutningen ska komma ur INFRA-2, inte ur runda tal.

### 5.2 Vilka rattar hårdnar

Fyra mekaniker kan bära hårdheten. Vilka som gör det är ett designval; ingen räknas ihop av spelaren, alla mäts i harness.

1. **Attractiveness (M4a).** Höjs → högre efterfrågan → högre strain → hårdare pass. Bär hela hårdheten om vald ensam; kollapsar spelaren snabbt.
2. **Walkout-tröskel (M4a).** Sänks → gäster tappar tålamod snabbare → tightare tempo. Bär bra ihop med attractiveness.
3. **Reputation-taket (M1 rep-loop).** Sänks → varje misstag räknar mer. Bär långsammast av de fyra, syns över dagar snarare än tick.
4. **Quiz-svårighet (R6).** Frågor per varv blir svårare — färre rätta svar bevarar kredit → färre nya satsningar. Bär hela långsiktig-kurvan; syns bara mellan varv.

**Rekommendation:** en kombination där alla fyra rör sig en aning per varv, ingen ensam bär hela hårdheten. Kombinationsvikterna mäts, inte skrivs.

### 5.3 Vad "gå plus" betyder

En vändbar kurva förutsätter en definition av *plus*. Två läsningar:

**Läsning A — plus i cash.** Ett varv som slutar med mer cash än det började går plus. Enkelt att mäta; missar poängen med krediter (en spelare kan gå plus i cash men rasa i kredit-profilen).

**Läsning B — plus i sammanvägd position.** `nettoförflyttning = Δcash / M + Σ Δkredit_axel` där M är någon normalisering. Fångar båda dimensionerna; är räknbart för spelaren om M är läsbar.

**Läsning C — plus i "kunde jag mer efter varvet än före?"** Läses subjektivt av spelaren via kvällsberättelsen; inte en formel utan en text. Passar EXECUTIVE_DESIGN_DIRECTIVE_001 §7-regeln men gör "vändbar kurva" svår att mäta som DoD.

**Rekommendation:** kombinera B (för DoD-mätning i harness) och C (för spelarens läsning i kväll-texten).

### 5.4 Mätplan

Bygg ett INFRA-2-manus som spelar ett komplett spel (uppskattat 10–15 varv per §7) med tre policyprofiler:

- **Policy A — passiv.** Spelaren gör "normala" satsningar, svarar rimligt på quizer, trycker inte action-knappen.
- **Policy B — skicklig.** Spelaren väljer optimalt bland satsningar, svarar rätt på höga andelar av quizerna, trycker action-knappen aggressivt.
- **Policy C — slarvig.** Spelaren väljer dåligt, svarar fel ofta, ignorerar action-knappen.

Mät `sammanvägd position` (per §5.3 läsning B) per varv för varje policy. **Krav:** Policy B:s kurva ska ligga över 0 vid varv 8/10/12; Policy A ska tangera 0; Policy C ska ligga tydligt under. Om Policy B inte kan gå plus vid varv 12 → lutningen är för brant och en av rattarna i §5.2 måste dämpas.

### 5.5 Beslutspunkt

Vision Owner: (a) vilka av §5.2:s fyra rattar bär hårdheten; (b) läsning A / B / C för "gå plus"; (c) varvstal vid vilka Policy B fortfarande ska gå plus (rekommendation: varv 8, 10, 12 av ~10–15).

---

## 6. Utred — Uppstigningen (§4.4 i ORDER 092)

### 6.1 Frågan

Hur många krediter tjänade *i drift* krävs för att gå från food truck till restaurang? Kan man falla tillbaka? **Är restaurangen alltid bättre, eller kan en skicklig food truck slå en dåligt driven restaurang?**

Sistnämnda är den viktigaste kvalitetsfrågan i hela ordern. Om restaurangen alltid är bättre är food trucken ett förstadium. Om den kan vinna är det två spel.

### 6.2 Uppstigningen som mekanik

Två strukturer:

**Struktur A — kredit-tröskel.** Nå phronesis > TX i drift → vid nästa bankmöte tilldelas restaurang. Symmetrisk med ingångsmatchningen (§3). Enkel att förklara.

**Struktur B — samlat drift-kapital.** En separat räknare `driftskredit` ackumuleras över varv och konverteras till uppstigningsbeslut vid en fast punkt (t.ex. varv 5). Skiljer "drift-erfarenhet" från "kunskap"; mer troget schemats logik där paviljongerna och driften ger olika slags kredit.

**Struktur C — verksamheten upphandlas.** Spelaren *investerar* cash + krediter i uppgraderingen. Två-vägs-portal — verksamheten är inte given av profilen, den är köpt med det spelaren tjänat. Skiljer från §1.3:s form-läsning på ingång men är intern konsekvent (form avgör ingången, arbete avgör uppgraderingen).

### 6.3 Kan food truck vinna?

Två designer, ordentligt inkompatibla:

**Design 1 — restaurangen är taket.** Food truck-magnituden `MaxTotal_FT < MaxTotal_R`. Restaurangen har fler bord, större meny, längre kväll. En skicklig food truck kan nå högre än en dålig restaurang, men en skicklig food truck kan aldrig nå en skicklig restaurang. **Konsekvens:** food trucken är ett förstadium, en läroplats. Uppgradering är den enda långsiktiga vägen.

**Design 2 — food truck har eget tak.** Food truck-magnituden `MaxTotal_FT ≈ MaxTotal_R`. Vägen dit är annorlunda — mindre bord men fler kunder, snabbare omsättning, väderberoende. En skicklig food truck kan slå en skicklig restaurang. **Konsekvens:** food trucken är ett självständigt spel, uppgradering är ett val (den som gillar tempo stannar). Två slut, två profiler, två sätt att spela.

**Rekommendation:** **Design 2.** Argumentet: schemat §3 beskriver food trucken som "en egen verksamhetsklass, inte en mindre restaurang" — det är en designprincip, inte en balansfråga. Design 1 kollapsar den principen till en tier-lista. Kostnaden är mätarbete — två klasser måste balanseras mot varandra, inte bara mot spelaren.

### 6.4 Kan man falla tillbaka?

Två svar:

**Svar A — nej.** Uppstigning är enkelriktad. Renodlar en linjär progression för spelaren.

**Svar B — ja, vid konkurs (M7b:s bankruptcy return loop).** Spelaren som driver restaurangen i konkurs återvänder till bankmötet med sina krediter; profilen läses om; kan bli food truck den här gången. Passar schemats bankmötes-som-återbesök-punkt (§4 i schemat: paviljongerna är återbesökbara → bankmötet är därmed också återbesökbart). **Rekommendation.**

### 6.5 Beslutspunkt

Vision Owner: (a) Struktur A/B/C för uppstigningsmekanik; (b) **Design 1 eller 2** — restaurangen som tak eller food truck som egen topp; (c) Svar A/B för fall-tillbaka.

---

## 7. Utred — Antal varv (§4.5 i ORDER 092)

### 7.1 Frågan

Ett normalt spel bör ligga runt tio till femton varv — färre och paviljongerna hinner inte betala tillbaka, fler och kurvan blir plåga. **Siffran är en gissning och ska mätas.**

### 7.2 Vad "ett normalt spel" betyder

Två läsningar:

- **Medianspelaren.** Det antal varv en Policy A-spelare (per §5.4) når i genomsnitt över N frö. Rekommenderas — det är den kvantitet spelaren faktiskt möter.
- **Skickliga spelaren.** Det antal varv en Policy B-spelare når. Kommer att vara högre; ger takgränsen.

Mät båda.

### 7.3 Vad avgör antalet

Fyra faktorer, alla i §5.2:s rattar:

1. Reputation-tak (M1) — når 0 → sista kväll.
2. Cash → bankruptcy (M3-ledger + M7b's return loop).
3. Alla tre kredit-axlar rasar under lån-golv (från bankmötet) → spelaren tappar verksamheten men kan öva sig upp igen (om paviljongerna kostar noll enligt §4.4 väg A).
4. **Frivilligt avslut** — spelaren väljer att avsluta. En variant på "en sista kväll med facit" är att spelaren *själv* säger stopp när profilen känns färdig. Passar schemat: slutet är inte defeat, det är kapitel-slut.

### 7.4 Mätplan

Samma harness som §5.4. Ytterligare policy — **Policy D — realistisk suboptimal** som gör 60% korrekta drag i stället för 100% eller 0%. Loopa 100 frön; rapportera medel, median och 10:e/90:e percentilen av varv-antal.

**Målfönster (för Vision Owners kalibrering, inte DoD):** medianen i intervallet 10–15. Om medianen är 5 är kurvan för brant; om 25 är den för slapp.

### 7.5 Beslutspunkt

Ingen beslutspunkt före mätning. **Efter mätning** väljer Vision Owner målmedianen (t.ex. "12 varv för Policy D") och §5:s rattar justeras tills mätningen träffar målet.

---

## 8. Utred — Vad detta gör med M-listan (§4.6 i ORDER 092)

### 8.1 M3 måste peka ut domän

M3 (kvällsbokföring) är utfallsrutan. Post-service-quizerna (R6) är riktade *mot uppvisade svaghet* — men "svaghet" är en domänläsning (episteme/techne/phronesis), inte en kapitalläsning (social/ekologisk/ekonomisk). **M3:s utfall måste kunna översätta service-events till domänläsning.** En walkout pekar mot phronesis (gästbedömning); en ingredient-run-out pekar mot techne (drift-kompetens); en scenario-miss pekar mot episteme (kunskapsfråga). Denna mappning specificeras när R6 skrivs; här räcker att flagga att M3 måste producera datat.

### 8.2 cash vs krediter — gränssnittet

Per §4.2: de byter aldrig plats. `cash` fortsätter vara skalär i SEK, tjänas i drift, spenderas på råvaror och löner. `krediter` är vektor med tre axlar, tjänas i paviljonger och post-service-quiz, spenderas *aldrig direkt* — de läses av bankmötet och av R6:s quiz-riktning.

Ny fältstruktur i sim-state: `state.knowledgeCredits: {episteme, techne, phronesis}`. R1:s DoD 1 är att den strukturen finns och att paviljongerna (R2) och post-service-quiz (R6) kan ackumulera i den.

### 8.3 Punchlist-rader som flyttar

- **Rad 22** (morgonpaneler wide-viewport) — landat under ORDER 090 §6. Oförändrat av R3.
- **Rad 23** (OPEN_SERVICE med tom stock) — oförändrat. Är M4-scope, inte R3-scope.
- **Rad 24** (reputation floor 0.00) — **berörs**. Efter R3 måste "floor" tolkas i den nya slut-mekaniken (§9). Om reputation når 0 kan det bli en trigger till M7b:s bankruptcy return loop i stället för en dead-end. Flyttas inte, men noten uppdateras när R3 landar.
- **Rad 25** (chef-frågor forskningsprosa) — **berörs**. R6 absorberar M7a:s placering; radens fix flyttar tillsammans med M7a.
- **Ny rad (26?)**: "profilavläsningens diagnostiska röst" — bankmötets text-utformning per §1.4. Landas när R3 skrivs.
- **Ny rad (27?)**: "kvällsberättelsen efter sista varvet" — se §9.

### 8.4 M7b:s scen blir konkret

R3-mappningen från §§ 3–4 avgör vad M7b:s scen läser. Med Väg C och Design 2 (rekommendationerna) består scenen av: bankdirektörens diagnos (form på vinkeln över sfären), verksamhetsklassen som tilldelas, en mening om vad som skulle behövas för nästa steg, och — vid retur efter konkurs — noten om att formen är omvärderad. Ingen graf, inga siffror.

---

## 9. Slutet — vad visas efter sista varvet

Om spelet kan ta slut måste kvällsberättelsen och utfallet — byggda för fortsättning — få en sista form.

**Förslag på struktur för sista-kvälls-panelen** (öppen för Vision Owner):

1. **Fakta-raden.** "Du drev X i N varv" — verksamhet + varvantal.
2. **Profilen vid slutet.** "Du kunde phronesis närvarande, techne stark, episteme grundläggande" — diagnostisk röst, tre axlar i ord, ingen siffra.
3. **Ett kapitel-slut.** En textbit i M6b:s ton som binder ihop varvet — inte betyg, inte reflektion — en observation av vad som hände. "Den sista kvällen slutade i en fullbelagd matsal; två gäster kom tillbaka från förra veckan."
4. **Vad som skulle ha behövts.** En mening om nästa steg — om spelaren hade nått ett varv till, vad skulle profilen ha lärt sig?
5. **Ingen omstart-knapp.** Spelet är slut. Nytt spel = ny spelare. Skydd mot att "spela om" och undergräva investeringen i första varvet.

**Öppen fråga för §9:** om paviljongerna kostar noll (§4.4 val A) är det svårt att motivera "ingen omstart" — spelaren kan bara öva vidare. Om paviljongerna kostar (val B eller C) blir sista kvällen tyngre men mer läsbar som *slut*. **Rekommendation:** val C (varv-slot) håller båda intryck — paviljongerna kostar tid, inte pengar, och slutet är tydligt.

---

## 10. ORDER 089:s medgång — omtolkning bekräftas

ORDER 089 mätte att servicen saknar positiv återkoppling: 60% pressure faces på personal, rytm röd 75% av service-ticken, `smiling` och `proud` noll ticken. Rapporten föreslog paths A/B/C för att bygga in belöning inuti servicen.

**En vändbar kurva besvarar den frågan utan att bygga ny mekanik inuti servicen.** Belöningen är:

1. **Krediten spelaren räddar med action-knappen (R5).** Under service — men inte som ett ansikte eller en färgändring, som en *händelse* som ger något som räknas.
2. **Kapitalet som förs in i nästa varv (R7).** Efter service — utfallet av att ha kört bra räknas i nästa varvs profil.
3. **Ett varv som gick plus när det inte borde.** Den bästa känslan spelet kan ge. Kräver bara att kurvan går att bekämpa — vilket är beslutat i §2.

**Konkret rekommendation:** ORDER 089:s §§ 2–5 (paths för rep recovery, empty-stock, guest's clock, chef-question cost) **bör inte byggas före R1 och R5**. Datat i §1 (medgångsinventeringen) står kvar och är värdefull; handlingsvalen väntar. §§ 6–8 (M8-punchlistkopplingar, andra playtest-frågan) är oberoende och kan drivas separat.

**M9 report §9:s två beslutsfält (proud reader-path, load-model calibration) står kvar oberoende av denna rapport.** De handlar om vad servicen läser *nu*, inte om vad slingan belönar totalt.

---

## 11. Avgränsningar

**Ingen kod.** Rapporten producerar inget kompilerbart. R1:s kod skrivs efter §3:s beslut.

**Inga trösklar sätts från beräkning.** Alla siffror i §§ 3–7 är antingen intervall att mäta i, målfönster, eller uttryckliga gissningar som ska mätas. Numeriska DoD kommer efter INFRA-2-körning, samma disciplin som load-banden i ORDER 088 §2.1.

**Berör inte:**
- Beslut C (initial mid-band-kvalitet från M1) — oförändrat.
- Puck-silhuetten (ORDER 053, ORDER 083) — oförändrat.
- Regeln om inga stat-paneler (EXECUTIVE_DESIGN_DIRECTIVE_001 §7) — förstärks av §1.4.
- SD-003 (dockskåpet) — fortfarande pausas mot R4 per ORDER 091 §1.6.

---

## 12. Byggordning framåt

R3 låser upp R1 (efter §3-beslut) → R2 (paviljongerna, med VS001 mergad) → M7b (bankmötesscenen på R3:s mappning). R4 (verksamhetsklass) och R5 (action-knappen) kan inledas parallellt med R2 så snart R1 har landat; R6 (quizerna) väntar på R3 för domän-mappningen; R7 (omgångsslingan) sist.

**Ordningen i sekvens** (per ORDER 091 §1.5 och denna rapports rekommendationer):

1. **R3 § 3 beslut** — Vision Owner väljer väg för profilavläsningen (och rekommenderat: gränsfallen).
2. **R1 kod** — `state.knowledgeCredits` som vektor, ackumuleringspunkter, mappning från §§ 3–4.
3. **R2 paviljongerna + VS001 merge** — fem miljöer, prov, väg in från bussankomsten.
4. **R3 mätgrind** — INFRA-2-körningar per §§ 5, 7 med syntetiska profiler och 100-fröet-policies.
5. **R3 § 5, § 6, § 7 beslut** — Vision Owner väljer rattar, uppstigning och målmedian mot §4:s harness-utfall.
6. **M7b scen** — bankdirektör, tilldelning, diagnos-mening.
7. **R4 verksamhetsklass, R5 action-knapp, R6 quizer** — bygger på R1–R3.
8. **R7 omgångsslingan** — ackumulering över varv, kapital förs in i nästa profil.
9. **M8 utvidgad** — hela varvet från paviljong till nästa satsning; sista-kvälls-format testas.

---

## 13. Öppna frågor rapporten inte svarar på

- **Bytesrelation mellan axlar.** Rapporten behandlar episteme, techne och phronesis som ortogonala. Är de det? Kan träning i techne ge ett bidrag till episteme (att göra får en att förstå bättre)? Om ja: mappningen från paviljong till axlar (§1.1) är fler-till-fler, inte fler-till-en. Öppen tills R2 skrivs.
- **Vad "hen" är i den enskilda spelaren.** Bankmötets text ("hen är redo för en food truck") förutsätter att spelaren har en identitet. Är det spelaren själv (andra person) eller en avatar (tredje person)? Nuvarande spelarpanel (`PlayerPanel.tsx`) använder ett namnfält från NameEntryOverlay men det är namnet på verksamheten, inte på personen. Öppen — rör inte R3 direkt men blir konkret i M7b.
- **Kan spelaren se sin egen profil mellan varv?** Regeln om inga stat-paneler säger nej; utan att se den är det svårt att strategizera vilken paviljong nästa satsning bör gälla. **Möjligt kompromiss:** en text-format profilberättelse mellan varv ("Du har öva mycket på metod men lite på gästmötet") — ingen graf, ingen siffra, en läsning. Öppen — rör R2:s UI.

---

**Rapportens slut.** Vision Owner: läs §§ 3, 6 (viktigaste beslut), sedan §§ 4, 5, 7. §§ 8–10 är följdverkan och behöver ingen beslutshandling i denna omgång; §§ 11–13 är avgränsningar och öppna trådar.
