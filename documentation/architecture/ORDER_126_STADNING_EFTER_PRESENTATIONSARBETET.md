# ORDER 126 — Städning efter presentationsarbetet

**Repo** `Viognier70/nexus-studio` · **Gren** `order-126` (från `main`)
**Klass** AUTONOM · Docs och filhantering, ingen produktionskod
**Datum** 2026-08-29

> Nummer 126 verifierat mot `ORDER_REGISTRY.md` 2026-08-29: main HEAD har
> 100–124 populerade; rad 125 (Ölkrogen) ligger på `order-125`-grenen och
> mergas separat. Nästa lediga i main-relativ ordning är 126.

---

## 1. Varför

Sessionen 2026-08-29 landade sju ordrar och ett direktiv. Den lämnade också
efter sig fyra otrackade filer i repotroten, två motstridiga utkast och en
typ-shim som ingen registerrad täcker.

Ingen av dem gör skada i dag. Men det var precis så SD-004 kom att ligga fel i
två dagar, och så `three-augmentations.d.ts` blev osynlig — små rester som
växer till oreda om ingen tar dem medan sammanhanget är färskt.

---

## 2. Registerhålet

`frontend/src/strategic/scene/three-augmentations.d.ts` skapades under ORDER
121:s rättelse `6b9a3ac`. Den finns i `main` men nämns inte i registerrad 121.

**Lägg till en mening i rad 121:** vad shimen är, varför den behövdes
(`@types/three` exponerar inte `isMesh`/`geometry` som `Object3D`-fält), och att
den gäller projektbrett — inte bara riggen.

Detta är samma defektmönster som ORDER 118 kartlade: kod i `main` som ingen rad
täcker. Skillnaden är att den här upptäcktes samma dag.

---

## 3. Filerna i roten

Fyra otrackade filer. Åtgärd per fil:

| Fil | Åtgärd |
| --- | --- |
| `ORDER_121_KROPPAR_I_SCENEN .md` (mellanslag före ändelsen) | **Ta bort.** Dubblett från filleveransen; ORDER 121 ligger i `documentation/architecture/` |
| `BRIEF_DESIGN_OLKROGEN.md` | **Ta bort.** Ett meddelande till Claude Design, inte en styrande handling. Leveransen den ledde till finns som `handoff/brewpubRoom.ts` |
| `ORDER_RAKNAREN_OCH_KONSOLEN.md` | **Lämna.** Väntar på ORDER 124:s utredning; kan bli mindre eller utgå |
| `UTKAST_SEX_VERKSAMHETSKLASSER.md` | **Placera** — se §4 |

Verifiera med `git log --all -- <fil>` att de som tas bort aldrig varit i
historiken. Har någon av dem varit det ska den inte raderas utan redovisas.

---

## 4. De två utkasten

`documentation/foundation/vision/UTKAST_VERKSAMHETSKLASSER.md` ligger i repot och
bygger på premissen *fem restauranger i olika storlek*. Den premissen är
motbevisad — Vision Owner 2026-08-29 beskrev sex verksamheter som skiljer sig i
kök, personaltäthet och gästbeteende, inte i storlek.

`UTKAST_SEX_VERKSAMHETSKLASSER.md` i roten ersätter den.

**Ersätt, radera inte.** Det äldre utkastet flyttas eller märks som ersatt med
datum, på samma sätt som `SUPERSEDING_DIRECTIVE_003.md` v1.0 lämnades orörd när
SD-004 kom. Ett utkast som visade sig vila på fel premiss är värt att kunna läsa
— det är så man ser varför strukturen blev som den blev.

Det nya placeras i samma katalog.

---

## 5. Vad ordern INTE gör

**Inga beslut fattas.** Utkastet är ett utkast; att placera det i repot gör det
inte till en styrande handling.

De 21 nummerhålen från ORDER 118 rörs inte. Registersorteringen efter rad 045
(fynd B1) rörs inte. Båda är egna ordrar.

Ingen produktionskod. Inga tester. Inga trösklar.

`handoff/`-katalogen rörs inte — den är spårbar källa, analogt med
`documentation/prototypes/`.

---

## 6. Definition of Done

1. Registerrad 121 utökad med typ-shimen enligt §2.
2. De två filerna i §3 borttagna, efter verifiering att de aldrig varit i
   historiken.
3. `ORDER_RAKNAREN_OCH_KONSOLEN.md` orörd i roten.
4. Sexklassutkastet placerat; det äldre märkt som ersatt med datum, inte raderat.
5. `git status --short` visar bara `ORDER_RAKNAREN_OCH_KONSOLEN.md` som otrackad
   i roten efteråt.
6. Grep: ingen produktionskod ändrad — `git diff main..HEAD -- frontend/` tomt.
7. Registerpost för denna order i samma commit.

---

## 7. Om något inte går

Om någon av filerna i §3 visar sig ha varit i historiken, eller innehålla något
som inte finns någon annanstans, är det ett fynd. Redovisa och lämna filen.

Bättre en fil för mycket i roten än en förlorad handling.
