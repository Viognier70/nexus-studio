# Design-fråga 2026-09-10 — ölkrogens fyra stationer, fyra roller: vilken hör till vilken?

**Adresserad till:** Design
**Från:** Claude Code (ORDER 205, VO-direktiv 2026-09-10 kl. 16:00)
**Berör:** `frontend/src/strategic/scene/brewpubRoom.ts:690-715` (staffStations för ölkrogen)

---

## Bakgrund

Design har (via VO 2026-09-10 kl. 15:30 och 16:00) klargjort två saker:

1. Fältet heter `staffStations` på råobjektet, `stations` på
   businessRoom-kontraktet. Ölkrogen har fyra.
2. **Fyra stationer = fyra roller.** En roll per station.

InteriorStaff läser den flata `stations`-listan direkt (ORDER 204).
Ordningen i `brewpubRoom.staffStations` är:

| Index | id       | local        | facing  | Not (från rumsfilen) |
|------:|----------|--------------|---------|----------------------|
| 0     | `barkeep`| (-3.0, -1.3) | +π/2    | Bakom disken, mitt för tapptornet |
| 1     | `brewer` | (-5.5, -3.3) | +π      | I L-hörnet mellan tankraden och bryggverket |
| 2     | `cook`   | (-5.9,  2.4) | -π/2    | Vid spisen. Tre stationer inom två steg |
| 3     | `runner` | (-3.05, 3.2) | -π/2    | Vid passluckan. Bär ut till bord |

Sim-team har fyra roller: `värd`, `servitör`, `kock`, `lärling`.

## Frågan

**Vilken sim-roll hör till vilken station-id?**

Namnen ger en delvis tolkning men inte entydig:

- `cook` — matlagning, uppenbart `kock`. **Sannolik.**
- `brewer` — bryggarens plats, också en form av kock-arbete. Också `kock`?
  Eller är bryggning en fjärde specialrolls-form (som inte finns i
  sim än)?
- `barkeep` — bartender/discipulär. `servitör` (som en pubservitör
  ofta är bartender) eller `lärling` (praktikanten bakom baren)?
- `runner` — springer med brickor mellan pass och bord. `lärling`
  (typiskt springpojkejobb) eller `servitör`?
- `värd` — greetar vid dörren. **Ingen av de fyra station-namnen
  matchar**. Om värd ska ha en station (per "fyra = fyra"), vilken?

Alternativ jag ser:

**Alt A:** värd = barkeep (pub-ägaren står bakom bardisken och
greetar), servitör = runner, kock = brewer, lärling = cook.

**Alt B:** värd = ??? (ingen av de fyra passar; kanske syntetiserad
`__entrance` som pre-ORDER 204?), servitör = barkeep, kock = brewer,
lärling = runner. `cook`-stationen står tom.

**Alt C:** värd = ???, servitör = barkeep, kock = cook, lärling =
runner. `brewer` står tom (används endast om ölkrogens sim får en
femte bryggarroll).

**Alt D:** annat — Design har en tanke jag inte ser.

## Konsekvenser

Utan Design-svar kör InteriorStaff **provisorisk positionell
mappning** i team-medlemsordning:

```
för varje member ∈ sim.team.members:
  om member.role === 'värd': home = entrance   // VO 2026-09-10 tidigare direktiv
  annars:                    home = stations[nonVärdIndex++]
```

För ett typiskt ölkrogen-team `[värd, servitör, kock]`:
- värd → entrance (VO-arv)
- servitör → stations[0] = barkeep
- kock → stations[1] = brewer

Det är EN GISSNING och står i konflikt med Designs "fyra = fyra"
(värd är inte på någon station; brewer får kock i stället för cook).

DEV-warning i konsolen så länge mappningen är provisorisk:
`[ORDER 205] station-role-mapping ännu ej bekräftat av Design; positionell fallback används.`

## Vad vi behöver från Design

Ett av tre svar:

**1. En explicit tabell** — vilken av `värd/servitör/kock/lärling` som
   hör till vilken av `barkeep/brewer/cook/runner`.

**2. En om-ordning av `staffStations`-arrayen** i brewpubRoom.ts så
   att deklarationsordningen matchar team-medlemsordning. Då är den
   positionella mappningen självförklarande.

**3. Om värd inte har en station i ölkrogen** (t.ex. "ölkrogens värd
   är virtuell — pub-ägaren står bakom baren, ingen dedikerad
   greet-plats"), specifikt: säg om värd ska mappas till en av
   {barkeep, brewer, cook, runner} eller om entrance-branchen kvarstår.

## Referens

VO 2026-09-10 kl. 16:00: "Fråga vilken station som hör till vilken
roll om det inte framgår av namnen. Gissa inte — det är artonde
gången kontraktet haft svaret."

Efter ROOM_DESIGN_QUESTION_2026-09-10.md (fråga om långborden) är
detta den andra öppna Design-frågan.
