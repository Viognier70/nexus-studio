# ORDER — Vad som utlöser en fråga

**Repo** `Viognier70/nexus-studio` · **Gren** `order-NNN` (från `main`)
**Klass** AUTONOM · **Kartläggning, ingen kod**
**Datum** 2026-09-16

> Numret tas ur `ORDER_REGISTRY.md`.

---

## 1. Varför

Scenarier och kunskapsfrågor dyker upp under servicen. Vision Owner har sett dem
i varje provspel: fisken med bruten kylkedja, guaiacol vid crush, delegationen
som vill boka.

**Men de är inte kopplade till vad som händer i rummet.** Frågan om kylkedjan
kommer när tiden går, inte när en leverans tas emot. Kocken står vid bryggeriet
medan frågan handlar om fermentering, och sambandet är slumpmässigt.

Vision Owner har beslutat att ordervalet ska vara en scen — servitören vid
bordet, gästen i menyn, och först då dyker frågan upp. Designs `takeOrder`-steg
är ankarpunkten.

**Frågan nu är om allt ska fungera så.** Innan det kan avgöras måste vi veta vad
som finns.

---

## 2. Vad som ska kartläggas

**2.1 Innehållet.** Vilka scenarier finns, och vilka kunskapsfrågor? Antal per
sort, och var de ligger — `scenarios`, `questionTemplates`, `pavilions`, annat.

Gruppera efter vad de handlar om: råvara, personal, gäst, ekonomi, kunskap,
annat.

**2.2 Vad triggar dem i dag.** För varje sort: vad avgör att just den dyker upp,
just då? Slumptal, tidsintervall, ett tillståndsvillkor, en räknare?

Redovisa den faktiska koden, inte avsikten.

**2.3 Vad simuleringen vet när en fråga ställs.** Finns tillräcklig kontext för
att avgöra om en fråga *passar* i ögonblicket? Vet vi att en leverans just kom,
att en gäst just klagade, att kocken står vid en viss station?

Det här är den avgörande frågan. En koppling kan bara byggas mot tillstånd som
faktiskt finns.

**2.4 Ankarpunkter i koreografin.** `serviceScore.ts` har 38 steg. Vilka av dem
är naturliga ögonblick för ett val eller en fråga?

`takeOrder` är beslutad. Finns fler — `fileOrder`, `cook`, `setDown`,
`requestCheck`, `pay`?

**2.5 Vad som händer medan spelaren tänker.** Designs `serverFill` är ett
elastiskt block avsett för just det. Gäller motsvarande för andra ankare, eller
skulle rummet frysa?

---

## 3. Vad kartläggningen ska svara på

**Går det att ankra allt, eller bara vissa sorter?**

En kunskapsfråga om fermentering kan ankras vid kockens arbete. En fråga om
ekonomi kanske inte har någon naturlig plats i servicen alls — och då hör den
hemma i morgonen eller i kvällsavräkningen.

Redovisa per sort: **ankarbar i servicen / hör till annan fas / saknar kontext**.

Och för de som saknar kontext: **vad skulle behöva finnas** i simuleringen för
att de skulle kunna ankras?

---

## 4. Vad ordern INTE gör

Ingen kod. Ingen ny koppling. Inga scenarier flyttas eller ändras.

`takeOrder`-ankaret som Vision Owner beslutat byggs i sin egen order och rörs
inte här.

Inga nya frågor skrivs — innehållet är Vision Owners arbete.

---

## 5. Definition of Done

1. §2.1 till §2.5 besvarade, med faktisk kod som grund.
2. Tabell per sort enligt §3.
3. Lista över vad som saknas i simuleringen för de ankarlösa.
4. Rapport i `documentation/blueprints/`.
5. `git diff main..HEAD -- frontend/src/` tomt.
6. Registerpost i samma commit.

---

## 6. Om något inte går

Om det visar sig att de flesta frågor **inte** har någon naturlig plats i
servicen — säg det rakt. Då är svaret kanske att servicen bär några få
ögonblick och att resten hör till morgonen och kvällen, och det är ett bättre
svar än att tvinga in allt.

Och om kontexten som krävs inte finns någonstans i simuleringen är det den
verkliga upptäckten. Då är kontextberoende frågor ett simuleringsarbete, inte
ett presentationsarbete.
