# D8: situationerna i vinbaren (order 306b), omtag

**Leverans** 2026-10-08, omtag samma dag, med `gradeOrder()` prövad mot 306b · **Till** Claude Code · **Från** Claude Design · **Gäller** order 306b §1–4. Piloten är Karaffen (vb40).

Omtaget gör de tre rättelserna och de två besluten från granskningen. Stilen är densamma som i D6, och rummet är ritat uppifrån som i D7, med möbleringen från `wineBarHouse.ts`. Kontrollbilderna finns i 1440 × 900 och 1280 × 720, och det står ingen text i bilderna. All text är nycklar `{ sv, en }`, och beloppen är platshållare från balance.ts.

**306b:** SITUATIONER_306b.md (förtydligad 2026-10-08) finns nu i projektet. Bedömningen nedan följer den, och `gradeOrder()` är prövad mot den.

| Fil | Vad |
|---|---|
| `orderCards.ts` | Ordningskorten i steg 3: korten, bokstäverna a–f, `gradeOrder()` enligt 306b, klicken, låset och personalen som tar över när tiden går ut. |
| `orderIcons.ts` | De sex ikonerna. Oförändrade. |
| `gripLabels.ts` | Halvt grepp, myntet för kostnaden och *Kassan räcker inte*. |
| `decanterProps.ts` | Karaffen, ljuset, den tomma flaskan och korkfatet på loungebord B. |
| `d8Strings.ts` | 92 nycklar. Slås in i `STRINGS`. |
| `prototyp/D8 - Situationerna i vinbaren.html` | Prototypen. Ordningskorten och kostnaden går att klicka i. |
| `kontrollbilder/1440x900/`, `kontrollbilder/1280x720/` | 16 bilder per storlek. Ersätter de förra 17. |

## Vad som har ändrats

1. **Stegen:** situationen har tre steg, analys (episteme), upplevelse (phronesis) och handling (techne). Kortets steglista visar dem i den ordningen, och ordningskorten hör till steg 3 (techne).
2. **Bedömningen** följer 306b, vb40 steg 3 (avsnittet om bedömningen nedan). Bild 06 är nu halvt grepp mot upplevelsen.
3. **Situation:** kortets rubrik är *Situation · Karaffen*. Ordet *raket* finns inte längre i texterna.
4. **Tiden ute** med färre än fyra kort: personalen tar över (bild 09).
5. **Kassan räcker inte:** svaret visas men går inte att välja (bild 11).
6. **Myntet** är den enda formen för kostnaden. Textformen och inställningen `costStyle` är borttagna.
7. **Karaffera** används i stället för *dekantera*, som i 306b.

## Bedömningen av raden

Bokstäverna är: a visa flaskan, b tänd ljuset, c häll, d servera, e låt stå en timme (fälla) och f gör det vid baren (fälla). Reglerna prövas i den här ordningen:

| Utfall | När | Hur det ser ut |
|---|---|---|
| **Brist i tekniken** | e med, b saknas, c saknas, eller c före b | — |
| **Brist i omsorgen** | f med, a saknas, a efter c, eller d varken först eller sist | — |
| **Fel** | d först, både b och c saknas, eller brister av båda sorterna | Rött och skakar, och den rätta raden visas streckad i grönt. |
| **Halvt mot upplevelsen** | bara brister i tekniken | Papper med mässingskant, numren i mässing och *Halvt grepp: upplevelsen höll*. |
| **Halvt mot analysen** | bara brister i omsorgen | Papper med mässingskant och *Halvt grepp: analysen höll*. |
| **Helt grepp** | inga brister och d sist (a och b i valfri ordning) | Grönt och lyfter. |

Reglerna är desamma som i 306b (förtydligad 2026-10-08). `gradeOrder()` är prövad mot dem för alla 360 rader med fyra kort, och resultatet är inga skillnader.

Vid halvt grepp visas också den rätta raden, streckad i grönt. Varje utfall har en egen förklaring (`why.exp.*`, `why.ana.*`, `why.wrong.*`).

## Tiden ute: personalen tar över (order 314)

Om tiden går ut med färre än fyra kort i raden, ligger spelarens kort kvar. Sommeliern Elin fyller de tomma platserna med de handgrepp som saknas, i svarets ordning. Hennes platser har ett E i stället för numret och kant i rollringens färg, #b98ae0.

Det är den som arbetar den kvällen som tar över. I bilden är det Elin, och i 306b:s exempel Sara (beslut 2026-10-08). Etiketten är *Tiden ute: {name} tar över*, på papper med kanten i samma färg. Det blir varken rött eller grönt och inget grepp. I rummet karafferar Elin rätt. Vad det ger i krediter avgör order 314.

## Kostnaden och när kassan inte räcker

Myntet och beloppet står längst till höger i raden, och svar utan kostnad har ingen markering. När kassan inte räcker får svaret en streckad kant och raden *Kassan räcker inte* under texten. Myntet står kvar, så att spelaren ser vad som fattas. Texten har full kontrast, men svaret går inte att välja.

Exemplet är ett vanligt svar i steg 3 med kassan på 140 kr, eftersom Karaffen har ordningskort i sitt steg 3.

## Kontrollbilder (båda storlekarna)

| Bild | Vad den visar |
|---|---|
| 01–03 | Ordningskorten: tom rad, två lagda och fyra lagda med låset klart. |
| 04 | Låst. |
| 05 | Helt grepp, a→b→c→d. |
| 06 | Halvt grepp mot upplevelsen: a, b, e, d. |
| 07 | Halvt grepp mot analysen: a, b, c, f. |
| 08 | Fel: d först. |
| 09 | Tiden ute med två kort: Elin lägger c och d. |
| 10 | Kostnaden med mynt. |
| 11 | Kassan räcker inte: två svar går inte att välja. |
| 12–14 | Karaffen i rummet: flaskan visas, karafferingen över ljuset, och klarad med den tomma flaskan. |
| 15 | Klarad på 14 m. |
| 16 | Ikonerna. |

**Beslut 2026-10-08:** D8 är godkänd. Om c saknas och f är med blir det fel, som i tolkningen. b→a→c→d är helt grepp: ordningen mellan a och b spelar ingen roll, men a ska ligga före c. `gradeOrder()` och prototypen är rättade, och bilderna är oförändrade. Efter 306b (förtydligad) räknas b saknas som brist i tekniken och inte som fel. Om tekniken brister och a ligger efter c, eller d ligger i mitten, blir det fel. Det rättade 35 av 360 rader. Bilderna 05–09 ger samma utfall som förut.

## Öppet

1. **Talen:** `RAKET.answerS` och kostnaderna sätter Code i balance.ts.
