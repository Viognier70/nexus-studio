# Foodtruckens situationer, i leveranser

ORDER 319a.3 (Anders 2026-10-07). Nya situationer till foodtrucken läggs in som filer, utan ny kod.
Banken (`src/sim/incidentBank.ts`) läser alla leveranser i den här katalogen och validerar dem
tillsammans när spelet startar.

## En leverans är tre filer med samma namn

| Fil | Innehåll |
|---|---|
| `<namn>.meta.json` | situationerna: id, fas, stegen med frågans nummer, axel, svarens kvalitet och följderna |
| `<namn>.text.sv.draft.json` | svensk text: rubrik, berättelse, frågor, svar, förklaringar och följderna i ord |
| `<namn>.text.en.json` | samma text på engelska |

`bas` är den första leveransen: Anders 21 frågor i sju situationer.

## Reglerna (valideringen stoppar annars spelet)

- **Formen:** `"form": "triad"`, med stegen i ordningen episteme → phronesis → techne (analys,
  upplevelse, handling).
- **Frågans nummer:** varje steg har `"question": <nummer>`. Ett nummer får bara finnas i en
  situation, över alla leveranser. Nya frågor fortsätter efter det högsta numret.
- **Id:** varje situation har ett eget id (`ftNN-namn`), och det får inte finnas i någon annan leverans.
- **⚖:** en fråga om regler, märkning eller temperaturer får `"legal": true` på steget. En situation
  med ⚖ består bara av ⚖-frågor och har `"legal": { "legalReviewed": false }`. Den är dold tills den
  är granskad och `legalReviewed` sätts till `true`. Ett ⚖-märke döljer aldrig frågor utan ⚖.
- **Förvarningen:** varje situation har `"cue"`, det som syns innan kortet öppnas:
  `"guestAtHatch"` (gästen först i kön går fram till luckan och pekar) eller `"delivery"`
  (leveransbilen kommer). Situationen med `guestAtHatch` kommer bara när någon står vid luckan.
- **Svaren:** 3–4 svar per steg, exakt ett `best` och minst ett `wrong`.
- **Texten:** varje situation i meta har text på båda språken, och ingen text saknar meta.

Följdernas tal ligger i samma storlek som i `bas` (utan bord gäller följden alla vid vagnen).
