# ORDER 118 — Registerrevision

**Repo** `Viognier70/nexus-studio` · **Gren** `order-113` (avvikelse — order §Gren specificerade "från `main`"; se `REGISTER_AUDIT_2026-08.md` §7.1)
**Klass** AUTONOM · Ingen produktionskod
**Datum** 2026-08-28 (utfärdad) / 2026-08-29 (utförd)
**Rapport:** `documentation/architecture/REGISTER_AUDIT_2026-08.md`

> **Numret sätts av ordern själv.** Läst `ORDER_REGISTRY.md` 2026-08-29: nästa
> lediga nummer var 118 (sekvens 100–117 populerad; 112 var registerhål men är
> nu attesterad rad efter Vision Owner-godkännande i samma commit-omgång).

---

## 1. Varför

Registret är projektets minne av vad som är byggt. Fyra gånger den här månaden
har det gått isär från repot:

- **095** stod som *not found in repo* medan arbetet fanns.
- **104** stod som *not yet started* medan ORDER 107 vilade på den — och visade
  sig faktiskt vara obyggd, vilket bara upptäcktes för att agenten vägrade
  skriva raden.
- **106** saknades helt, utan gap-rad.
- **088** fick två motstridiga fördelningssiffror i två dokument.

Och två styrande handlingar saknas som filer: SD-001:s instrument (känt sedan
ORDER 035) och dockskåpets SD-003 rev. 2 (upptäckt 2026-08-28). Båda är
beslutade, båda refererade i ordrar som byggts mot dem.

**Ordern reparerar inte historien. Den redovisar den.**

---

## 2. Vad som ska göras

Varje rad i `documentation/architecture/ORDER_REGISTRY.md` prövas mot repot.

För varje rad, avgör och redovisa:

| Kontroll | Fråga |
| --- | --- |
| Commit | Finns commiten som raden hävdar? Ange sha. |
| Filer | Finns filerna ordern säger sig ha skapat eller ändrat? |
| Status | Stämmer statusen med vad som faktiskt ligger i `main`? |
| Nummer | Är numret unikt, och finns det hål i sekvensen? |
| Datum | Stämmer datumet mot commitens datum? |

**Verifiera mot `main`, inte mot grenar.** En order som bara finns på en
oavslutad gren är inte utförd.

---

## 3. Instrumenten

Separat genomgång av `documentation/foundation/`.

Lista varje styrande handling som **refereras** i en order eller ett direktiv,
och ange om instrumentet finns som fil. Kända fall: SD-001 och SD-003 rev. 2.
Sök efter fler.

Redovisa också åt andra hållet: finns filer i `foundation/` som ingen order
refererar?

---

## 4. Vad som får skrivas

**Ordern rättar ingenting på egen hand.** Den producerar en avvikelselista.

Ett undantag: rader som saknas helt får läggas till som `Gap — ej utredd` med
numret synligt. Ett hål i sekvensen ska synas, och den principen är redan
etablerad genom 106:s Void-rad.

Alla andra avvikelser föreslås, inte verkställs. En status som ändras från
*Executed* till något annat är ett beslut, inte en städning.

---

## 5. Rapporten

Skrivs till `documentation/architecture/REGISTER_AUDIT_2026-08.md`.

Struktur: en tabell över samtliga rader med utfall per kontroll i §2, följt av
avvikelselistan sorterad efter allvar. Allvarligast är rader som påstår att
något är byggt när det inte är det — det är den sorten som riskerar att arbete
görs om.

**Rapporten får inte dölja ett dåligt resultat.** Är halva registret fel ska det
stå rakt ut.

---

## 6. Definition of Done

1. Samtliga registerrader prövade enligt §2, ingen överhoppad.
2. Instrumentgenomgången enligt §3, i båda riktningar.
3. Avvikelselista sorterad efter allvar.
4. Saknade rader tillagda som `Gap — ej utredd`; inga andra ändringar i
   registret.
5. Rapporten checkad in.
6. Registerrad för denna order, i samma commit.
7. `git log --oneline -3` visad i rapporten.
8. **Ingen produktionskod rörd.** Ingen status ändrad utan att den föreslagits
   först.

---

## 7. Avgränsningar

Inga rättelser av statusrader. Inga borttagna rader. Inga nya instrument
skrivna — att SD-001 saknas är ett fynd att redovisa, inte ett hål att fylla.

Ingen kod, inga tester, inga trösklar.
