# Förslag: de tre hållbarheterna som nivåer 0–10

*Förslag 2026-09-29 (Claude Code, på Vision Owners uppdrag).* **Godkänt av Vision Owner 2026-09-29, med villkor:** den ekonomiska marginalen räknar med morgonens inköp (kassans förändring över dagen), inte kvällens avräkning. Byggs i nästa order. Vision Owner, villkor för Designs leverans 2026-09-29: "Lägg till … de tre hållbarheterna som nivåer 0–10 med förra kvällens nivå. Föreslå hur hållbarheterna räknas, med talen i balance.ts, och rapportera innan du bestämmer."

Kvällens resultat (R1) visar i dag hållbarheterna som förändringen i poäng: social och ekologisk mot dygnets gryning, ekonomisk som kvällens marginal. Nedan är förslaget till nivåer.

## Vad spelet har i dag

- **Kapitalen** `capitals.values.social` och `.ecological`, 0–1. De flyttas av morgonens satsningar, av leveranserna och av gårdagens rester, men nästan inte av själva kvällen. Som nivå skulle de oftast stå still från kväll till kväll.
- **Kvällens egna tal:** gäster som gick nöjda (`happyDeparturesTotal`), gäster som gav upp (`giveUpsThisService`), personalens ork (`morale`, 0–1), kvällens intäkt och kostnad (kvällsavräkningen), och osålda portioner och kilo till sopbilen (sopbilen).

## Förslaget

Nivån räknas **ur kvällen**, så att den säger något om just den kvällen. Förra kvällens nivå sparas vid stängning och visas streckad bredvid. Alla tal står i `balance.ts` under en ny post `SUSTAINABILITY` (sektion Servicen > Kvällens resultat).

| Hållbarhet | Nivå 0–10 | Tal i `balance.ts` |
| --- | --- | --- |
| **Social** | 10 × (andel av kvällens gäster som gick nöjda × vikt + personalens ork vid stängning × vikt) | vikterna 0,7 och 0,3 |
| **Ekonomisk** | dagens marginal (kassans förändring över dagen, med morgonens inköp, mot kvällens intäkt) på en skala där en förlust på 25 % eller mer är 0 och en vinst på 35 % eller mer är 10 | gränserna −0,25 och 0,35 |
| **Ekologisk** | 10 × (1 − osålda portioner som gick till sopbilen / portioner som fanns i kväll), minus 1 om gårdagens rester gick till sopbilen | straffet 1 nivå |

Nivåerna avrundas till heltal, och nedgångar visas streckade.

## Alternativ

1. **Kapitalen som nivåer** (nivå = 10 × kapital). Enkelt och samma tal som satsningarna rör, men nivån står ofta still, eftersom kvällen nästan inte flyttar kapitalen.
2. **Blandning:** kvällens nivå enligt förslaget, och kapitalen följer nivåerna långsamt över veckan, så att satsningarna och kvällarna hör ihop. Det rör slumpmålet och kräver kalibrering.

**Rekommendation:** förslaget ovan nu, och blandningen som en egen fråga efter provspel.

## Frågor till Vision Owner

1. Ska nivåerna räknas ur kvällen (förslaget) eller ur kapitalen (alternativ 1)?
2. Ska ekonomisk hållbarhet vara marginalen, eller kvällens resultat mot en normal kvälls intäkt i klassen?
3. Är vikterna och gränserna rimliga att börja med?
