# Svar till Design — leveranserna 2026-09-30

**Datum** 2026-09-30 · **Status** klar för Vision Owner att skicka till Design
**Gäller** leveranserna *ringen* och *början i Grythyttan* (`documentation/leveranser/nexus-leverans-2026-09-30-*`). *Serviceläget* och *rätt, fel och pyramiden* är byggda i ORDER 290 (`documentation/architecture/ORDER_290_RAPPORT.md`).

Besluten är Vision Owners, 2026-09-30.

## Ringen (LEVERANSNOT §5)

1. **När ringen syns.** Under hela servicen, inte på morgonen. Så är den byggd.
2. **Hovmästarens färg.** Hovmästaren får en egen färg.
3. **Kontrollera färgerna.** Ingen roll får ha rött eller grönt, eftersom rött och grönt nu betyder fel och rätt svar. Vi ber Design kontrollera hela `ROLE_COLOUR` mot det, också hur färgerna ser ut i rummets kvällsljus. Bärnsten (bartendern) ligger närmast rött och bör prövas särskilt.
4. **Linjen till uppgiften.** Spelet har, utöver ringen, en streckad linje från ringen till platsen uppgiften gäller, eftersom ordern sa "ring och linje". Den står kvar tills vidare och tas bort om rummet blir plottrigt.
5. **Nästa order:** etiketten vid hovring (*roll · uppgift*), och pyramiden i lärdomen i stället för lyktorna.

Så används rollerna i vinbaren i dag (`frontend/src/strategic/scene/staffMarks.ts` `ROLE_OF`): två servitörer, bartendern, sommeliern (som också tar emot i vinbaren), kocken och diskaren. Vinbaren har ingen egen hovmästare.

## Början i Grythyttan (LEVERANSNOT §4)

**Fråga 1, formuläret.** Så ser registreringen ut i dag:
- ett av tre svar vid registreringsbordet i bussen, som inte sparas;
- språket i menyn;
- krogens namn efter det första bankmötet;
- den första verksamheten hos banken;
- tre sparplatser.

Spelet frågar i dag inte efter spelarens namn, och det frågar aldrig om samtycke. Ålder, skola och klass finns inte.

Vision Owner: manuset lägger till namnet och samtycket, och det är bra. Namnet gör spelet personligt, och samtycket behövs om framstegen senare ska användas i forskning.

**En justering i manuset.** Den första verksamheten väljs hos banken (food truck eller vinbar), *efter* att krogens namn har skrivits i liggaren. Namnet ska därför gälla företaget, oavsett vilken verksamhet banken ger. Texten vid liggaren får inte förutsätta vinbaren.

**Fråga 2–5** är besvarade och inarbetade i Designs andra utkast (speldesignen, Introduktionen): bara namnet utan pronomen; bussen tillbaka avslutar säsongen och kunskapen följer med; Lova säger en replik om vinbaren; Design skriver förslag till frågorna om köket och vinet, som Vision Owner granskar. Rätt svar vid långbordet ger de första krediterna.

Manuset skrivs om efter svaren och byggs i en egen order.
