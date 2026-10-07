# D6, del 2: avsändarna, teckenförklaringen, kurskortet, Byn just nu och det låsta i början

**Leverans** 2026-10-07 · **Till** Claude Code · **Från** Claude Design · **Gäller** D6 punkt 2–6, ORDER 313 §2, §3, §6, §7 och §9, och BESLUT 2026-10-07 del 4 punkt 7 och 8

Del 1 (Åsa) är godkänd. På engelska heter hon *Curator Åsa*, och det är rättat i `asaStrings.ts` och `openingStrings`. Den här delen gör resten av D6. Formen är den varma (`nexusTheme.warm`). Ingen text är inritad i bilderna, och all text är nycklar `{ sv, en }`. Talen i prototypen är exempel.

| Fil | Var | Vad |
|---|---|---|
| `d6Ui.ts` | monteras | `SENDERS` med märkena, `ROLE_RING` med kocken #7fa8ff, `LEGEND`, `COURSE_CARD`, `VILLAGE_NOW` och `START_LOCKS`. |
| `d6Strings.ts` | slås in i `STRINGS` | 108 nycklar. |
| `prototyp/D6 - Avsandare och tydligheten.html` | läses | Sex skärmar, båda storlekarna, svenska och engelska. Fristående. |
| `kontrollbilder/1440x900/`, `kontrollbilder/1280x720/` | — | 9 bilder per storlek. |

## 1. Avsändarna (bild 01)

Alla meddelanden har en avsändare: ett märke, namnet och en rad om vad avsändaren är.

| Avsändare | Form | Märke |
|---|---|---|
| **Intendent Åsa** · Campus | pratbubblan med porträttet (del 1) | porträttet |
| **Banken** · Lån och satsningar | kort | mynt med nyckelhål, guld på valnöt |
| **Per** · Hovmästare | kort | P i hovmästarens ring (#f4e6cc) |
| **Byn** · Recensionerna | kort | hus, papper på valnöt |
| **Måltidens hus** · Prov och kurser | kort | uppslagen bok, bläck på papper |
| **Personalen**, till exempel *Sara, servitör* | bubbla i rummet över figuren | initialen i rollringens färg |

- **Kortet:** huvudet med märket och namnet på valnöt, och texten på papper under.
- **Personalens bubbla** står i rummet med en pil ned mot figuren. Raden är `sender.staff` (*{name}, {role}*), och rollerna är nycklar `role.*` i gemener.

## 2. Teckenförklaringen (bild 02 och 03)

**Statusläget (S):** förklaringen står nere till höger, ovanför lägesknapparna. Den har två delar.

- **Personalen:**
  - *Rollen:* sju ringar.
  - *Orken:* pigg, trött och slut.
  - *Trivseln:* trivs, lagom och trivs inte.
- **Gästerna:** stämningens fem plattor.

Symbolerna är desamma som i rummet (`staffRing.ts`, `staffStatus.ts` och `guestMood.ts`).

**Menyn:** under *Spelets regler*, fliken *Symbolerna*, står samma förklaring med en rad om varje grupp (`legend.*.why`). De andra flikarna visas bara som plats.

**Kockens färg:** kocken är **#7fa8ff** (BESLUT punkt 8).

- `staffStatus.ts` har fortfarande `ROLE_RING.cook: '#ffffff'`. Den ska rättas mot `d6Ui.ROLE_RING`, och `staffRing.ts` likaså.
- Bakgrundsbilderna är från D5, och kockens ring är målad om i bilderna.

## 3. Kurskortet (bild 04)

Fyra rader i ordning:

1. **Lär ut:** *Sommeliern lär sig sälja in en hel flaska.*
2. **Ger:** *Vid loungerna säger fler ja till en flaska i stället för glas.*
3. **Gäller:** *Från i morgon kväll.*
4. **Kräver:** medaljen med ✓ *uppfyllt* eller ✗ *saknas*, och *Kostar {cost} krediter · du har {have}* med samma märke.

✓ är bläck med guld och ✗ är streckad valnöt. Inget grönt och inget rött, eftersom det inte är ett svar.

**Tre lägen:**

- **Allt finns:** knappen *Gå kursen*.
- **Krediterna räcker inte:** avstängd knapp med *Du behöver {missing} krediter till*.
- **Medaljen saknas:** avstängd knapp med *Kräver {medal}*. Om både medaljen och krediterna saknas visas medaljen.

## 4. Byn just nu (bild 05–07)

Panelen står uppe till höger under servicen och ersätter bandet *Byn i kväll*.

- **Raderna:** varje krog och vagn med antalet gäster nu och en pil för den senaste kvarten (uppåt, nedåt eller vågrät).
- **Ordningen:** flest gäster först.
- **Din krog** står på papper.
- **Vagnarna** har en mindre lykta.
- **Raden överst:**
  - *Torgkrogen drar flest gäster i kväll. Du är tvåa.*
  - När spelaren leder: *Du drar flest gäster i kväll. Torgkrogen är tvåa.*
- **Fokusläget:** panelen fälls till listen *Du är tvåa · 14 gäster*.

## 5. Låst i början (bild 08 och 09)

**Första morgonen:**

- *Öva i Måltidens hus* och *Gör ett prov* är öppna.
- *Satsa*, *Butiken* och *Stå för ditt svar* är låsta: streckad kant, ett lås i stället för ikonen och raden *Öppnas när du klarat ditt första prov*.
- Texten på de låsta raderna är inte nedtonad, så den håller kontrasten.
- Åsa säger sin första replik.

**Efter första provet** öppnas de tre och får brickan *Öppet nu* den morgonen. Åsa säger: *”Nu har du visat vad du kan. Banken lyssnar, och du kan börja satsa.”*

## Öppet

1. **Placeringen:** teckenförklaringen och Byn just nu behöver rutor i `hudLayout.ts` och ska köras genom `checkOverlaps()` med raketkortet och ställningen.
2. **Kurserna:** kurskortets exempel är sommelierns kurs från provspelet. De andra kurserna har samma fyra rader.
