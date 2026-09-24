# ORDER — En hel dag

**Repo** `Viognier70/nexus-studio` · **Gren** en per etapp, från `main`
**Klass** AUTONOM, i fem etapper
**Datum** 2026-09-20

> Numren tas ur `ORDER_REGISTRY.md`, ett per etapp. Etapperna körs i ordning och
> mergas var för sig. **Inget bygge påbörjas innan Vision Owner svarat på
> besluten i §0 för den etappen.**

---

## 0. Beslut som krävs av Vision Owner

Ordern är skriven så att etapp A kan börja direkt. B, C och D blockeras på
beslut. E blockeras på innehåll.

| Etapp | Blockerat på | Vad som behövs |
| --- | --- | --- |
| **A** Omgångsslingan | inget | kan börja |
| **B** Ekonomin | **beslut 1–4** | se nedan |
| **C** Handlingar | **beslut 5** | se nedan |
| **D** Klasserna | **beslut 6** | se nedan |
| **E** Quizerna | **innehåll** | frågor till paviljongerna |

### Beslut 1 — Vad kostar ett steg upp?

Kunskapsprogressionen är brons, silver, guld, platina per paviljong. Varje nivå
bär en säkerhetsnivå: en garanterad minimiintäkt som också är
investeringsutrymme.

**Behövs:** storleksordningen. Är brons några tusen per runda eller några
tiotusen? Och hur mycket mer ger nästa nivå — dubbelt, femtio procent, linjärt?

Exakta tal mäts fram. Strukturen är ditt beslut.

### Beslut 2 — Vad krävs för att stiga en nivå?

Antal rätta svar? Andel av paviljongens frågor? Något annat?

**Behövs:** vilken sorts tröskel, inte vilket tal.

### Beslut 3 — Vad händer vid en dålig dag?

Säkerhetsnivån är ett golv. Kan kassan ändå sjunka under noll, och vad händer
då — lån, konkurs, tvingad nedgradering?

**Behövs:** finns det ett misslyckande i spelet, och hur ser det ut?

### Beslut 4 — Hur lång är en omgång?

En dag? En vecka? Sju dagar som kontrakten löper?

**Behövs:** vad som räknas som en omgång i R7:s mening.

### Beslut 5 — Vad gör action-knappen?

R5 är namngiven men aldrig specificerad. En knapp som griper in i servicen —
men i vad?

**Behövs:** en mening om vad spelaren gör med den.

### Beslut 6 — Vilken klass ska monteras först?

Vinbaren, gästgiveriet, foodtrucken och nattklubben har rum men ingen nyckel.
Foodtrucken och nattklubben kräver dessutom gästtillståndsmaskinen.

**Behövs:** vilken av vinbaren och gästgiveriet som kommer först.

---

## Etapp A — Omgångsslingan (R7)

**Kan börja utan beslut.**

En omgång som börjar, körs och avslutas med ett resultat spelaren ser.

**A.1** Dagen har ett slut. I dag rullar den vidare utan avräkning.
Kvällsavräkning som visar: intäkt, kostnad, resultat, förändring i rykte,
förändring i kunskapskapital.

**A.2** Resultatet bärs över till nästa dag. Kassa, rykte, personal, lager.

**A.3** En omgång går att avsluta och starta om. Det ska gå att spela flera
dagar i följd utan att ladda om sidan.

**A.4** Vad som redan finns används: `scenarios`, `TaskQueue`, `shareFactor`,
mise en place, kontraktens sju dagar. Ingen ny mekanik.

**DoD:** tre dagar i följd spelbara. Avräkningen visar tal som går att spåra
till vad som hände. Video, 30 sekunder, av en avräkning.

**Detta är den viktigaste etappen.** Utan en sluten slinga finns inget att mäta
svårighet mot och ingen anledning att spela en andra dag.

---

## Etapp B — Ekonomin (R3)

**Blockerad på beslut 1–4.**

**B.1** Kunskapsnivå per paviljong: brons till platina, härledd ur något mätbart
(beslut 2).

**B.2** Säkerhetsnivå som golv under intäkten, per nivå (beslut 1).

**B.3** Investeringsutrymme härlett ur summan av nivåerna.

**B.4** Marknadsandel kopplad till kunskapsnivå — `shareFactor` finns sedan
ORDER 167 och ska ta emot det.

**B.5** Misslyckandeläget (beslut 3).

**Talen sätts inte här.** De mäts efter att A ger en slinga att mäta i. Ordern
bygger strukturen med platshållare som är **flaggade som platshållare**, inte
som konstanter.

**DoD:** en spelare som stiger en nivå ser sin minimiintäkt och sitt
investeringsutrymme växa. Mätbart, i avräkningen.

---

## Etapp C — Handlingar (R5)

**Blockerad på beslut 5.**

Action-knappen. Vad den gör avgörs av beslutet; ordern bygger den.

**DoD:** knappen gör något som märks i servicen och i avräkningen.

---

## Etapp D — Klasserna

**Blockerad på beslut 6.**

**D.1** Vald klass får `BusinessClass`-nyckel, monteras via
`businessRoom`-kontraktet, samma mönster som ORDER 144 och 149.

**D.2** Klassens egen mekanik — det R4 menade med verksamhetsklass, inte bara
olika `capacity`.

**D.3** Verifiering i key=5-vyn med video.

**Foodtrucken och nattklubben ingår inte.** De kräver `orderingAtCounter` och
`awaitingCollection` i gästens tillståndsmaskin, vilket är eget arbete.

---

## Etapp E — Quizerna (R6)

**Blockerad på innehåll.**

Paviljongerna har sex frågor över fem områden. Fyra av dem är formatmallar från
ORDER 107.

**Brons kräver innehåll.** Tio frågor per paviljong före hundra, som §5 en gång
formulerade. Femtio totalt räcker för att pröva om progressionen håller.

**Det är Vision Owners arbete och kan inte beställas.** När frågorna finns är
etappen liten: ORDER 226 visade att 88 % av kunskapsfrågorna är ankarbara utan
ny kod.

---

## Vad ordern INTE gör

Ingen ny presentation. Ingen ny koreografi. Inga nya rum.

`serviceScore`-integrationen och ankarsystemets felsökning är egna spår och rörs
inte här.

Och **ingen etapp rapporteras som klar utan att Vision Owner sett den i
rörelse.** Femton gånger har en verifiering visat något annat än spelet.

---

## Om något inte går

Om etapp A visar att slingan inte går att sluta med det som finns — att något
saknas för att en dag ska kunna avslutas — är det det viktigaste fyndet i hela
ordern. Rapportera och stanna.

Resten av spelet vilar på att en omgång går att spela färdigt.
