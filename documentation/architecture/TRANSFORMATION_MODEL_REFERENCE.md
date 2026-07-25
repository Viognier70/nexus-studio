# Transformation Model Reference

**Source of truth:** `TRANSFORM_LIBRARY` in `scripts/place-engine.mjs` + `reports/semantic/places.json[i].transformation`.
**Constraint:** every transformation preserves the SPATIAL layer per `DESIGN_PRINCIPLE_REALITY_VS_GAMEPLAY.md`.

Every Place tracks the possible futures it can become. Gameplay picks from this menu; the shell never moves.

## Per-Place transformation record

```jsonc
{
  "historic_state":            "preserved" | null,
  "present_state":             "…",   // current business / role
  "possible_transformations":  [ "bakery", "café", "…" ],
  "constraints": [
    "preserve handcrafted shell",       // handcrafted shells never mutate
    "preserve footprint",
    "preserve roof family"
  ],
  "triggers": [
    "gameplay ownership change",
    "quest reward",
    "seasonal event",
    "player business decision"
  ]
}
```

## Transformation library by family (15 entries)

| Family | Menu |
|--------|------|
| Villa | bakery / café / boutique hotel / artist studio / cooking school / community kitchen / micro brewery / design studio / writer residence |
| Apartment | student housing / guest residence / coworking / creative studio |
| Retail | grocery / artisan shop / antikvariat / wine bar / cheese cellar / pop-up gallery |
| Restaurant | restaurant / gastropub / wine bar / cooking demonstration / private dining / pop-up kitchen |
| Commercial | fuel station / farmer market pavilion / food truck park / design showroom |
| Historic | hospitality landmark / historic guesthouse / museum wing / ceremonial venue |
| Religious | worship / concerts / community events / exhibitions |
| School | primary school / evening classes / summer academy / community centre |
| University | gastronomy programme / hospitality programme / research kitchen / food laboratory / sensory lab / lecture hall / student pub |
| Industrial | warehouse / food incubator / micro brewery / craft workshop / maker space / research facility / exhibition hall |
| Warehouse | storage / food incubator / brewery / exhibition space / winter garden |
| Garage | workshop / restoration studio / artist workshop |
| Outbuilding | storage / guest room / artist studio / garden pavilion |
| Municipal | office / reception / community services / exhibition space |
| Farm | farming / agroforestry / community garden / field school |

## Total transformation surface

59 distinct transformation targets across 90 Places. Full graph in `reports/semantic/place-graph.json` — the `transformation` node type + `can-become` edge kind.

## Historic-state preservation

Places whose linked landmark is tier `landmark` (handcrafted-shell historic) carry `historic_state: "preserved"`. These Places CAN still transform functionally but their SHELL is locked. Example: Grythyttans Kyrka can host concerts, community events, exhibitions — but not be demolished, moved, or resized.

## State machine (future)

Currently every Place's `present_state` is derived from the landmark record. When gameplay lands, each Place gets a live `state` field updated by:

- ownership change events
- quest completion
- seasonal calendar
- player business decision

The `constraints` array tells the state machine what MUST hold true across every transition. Constraint violations = rejected transition.

## Extending the library

1. Add family → menu entry in `TRANSFORM_LIBRARY` in `place-engine.mjs`.
2. Regenerate: `node scripts/place-engine.mjs && node scripts/place-graph.mjs`.
3. Every Place of that family picks up the new transformation option.
