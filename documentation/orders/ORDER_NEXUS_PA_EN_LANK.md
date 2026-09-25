# ORDER — Nexus på en länk

**Repo** `Viognier70/nexus-studio` · **Gren** `order-NNN` (från `main`)
**Klass** AUTONOM · Infrastruktur, ingen spelkod
**Datum** 2026-09-16
**Följer** ORDER 171 (produktionsbygget verifierat) och ORDER 172
(`wrangler.toml` + `DEPLOY.md` skrivna, kopplingen aldrig gjord)

> Numret tas ur `ORDER_REGISTRY.md`.

---

## 1. Varför

Spelet har byggts i sex veckor och ingen utanför den här maskinen har sett det.

Två konkreta skäl nu:

**En länk går att skicka.** För playtesting är det skillnaden mellan noll och
sex testare.

**Och ett entydigt läge att jämföra mot.** Sex gånger har dev-servern kört
gammal kod, gamla portar levt kvar, eller visat något annat än vad agenten mätte.
En deployad version är samma för alla.

Produktionsbygget är verifierat sedan ORDER 171: fyra sekunder, 1,3 MB gzippat,
relativa sökvägar. Det som saknas är kopplingen.

---

## 2. Vad som ska göras

**2.1 Verifiera att `wrangler.toml` och `DEPLOY.md` från ORDER 172 stämmer** mot
dagens projektstruktur. De skrevs 1 september och repot har ändrats sedan dess.

**2.2 Kör `npm run build` och rapportera utfallet** — går den igenom, hur stor
blir bundlen, hur lång tid tar den. Jämför mot ORDER 171:s tal.

**2.3 Kontrollera vad som följer med i produktionsbygget.** `#playtest=1` och
DevPanel är hur man väljer verksamhet och ska finnas kvar. Men gå igenom vad
mer som exponeras: `__nxCamera`, `__nxThreeCamera`, `__nxSimDispatch`,
`__nxSimState` och andra dev-hookar.

De är gatade på `import.meta.env.DEV` enligt ORDER 196 — **verifiera att de
faktiskt inte finns i produktionsbygget.** Grep i `dist/`.

**2.4 Dokumentera de exakta dashboard-inställningarna** i `DEPLOY.md`:
byggkommando, output directory, root directory, nodversion. Vision Owner gör
kopplingen själv i Cloudflares gränssnitt.

---

## 3. Sidan ska inte vara publik

Bakom Cloudflare Access. En halvfärdig prototyp ska inte indexeras, och
kunskapsinnehållet i paviljongerna är Vision Owners material.

Hur Access sätts upp dokumenteras i `DEPLOY.md` — det görs i dashboarden, inte
härifrån.

---

## 4. Vad ordern INTE gör

**Ingen automatisk deploy vid push.** Sextio ordrar om dagen skulle ge sextio
deployer, och en länk som ändras under en playtest är värdelös.

Manuell deploy, eller på tagg. Vilket avgörs av Vision Owner i dashboarden;
ordern dokumenterar bara vad som krävs.

**Ingen spelkod ändras.** Inga feature-flaggor, ingen ny build-konfiguration
utöver vad ORDER 172 skrev.

**Inga hemligheter i repot.** API-nycklar, tokens och Access-policy hör i
dashboarden.

---

## 5. Definition of Done

1. `wrangler.toml` och `DEPLOY.md` verifierade mot dagens struktur.
2. `npm run build` kört, utfall jämfört mot ORDER 171.
3. Dev-hookarna verifierat frånvarande i `dist/` — grep redovisad.
4. `DEPLOY.md` innehåller exakta dashboard-inställningar och Access-steg.
5. Registerpost i samma commit.
6. `git diff` visar ingen ändrad spelkod.

---

## 6. Om något inte går

Om produktionsbygget innehåller dev-hookar trots `import.meta.env.DEV` är det
ett fynd som ska rapporteras före allt annat. En publik build med
`__nxSimDispatch` exponerad låter vem som helst manipulera simuleringen.

Och om `wrangler.toml` visar sig peka på fel katalog efter alla
struktur ändringar sedan 1 september — rätta den, men säg det. ORDER 172:s
arbete gjordes mot ett annat repo än dagens.
