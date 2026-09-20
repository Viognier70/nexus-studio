# Deploy — Nexus Studio på en länk

Cloudflare Pages, bakom Cloudflare Access, manuell deploy.

Ordern som skrev det här: **ORDER 223 — Nexus på en länk** (2026-09-20). Föregångare: ORDER 171 (produktionsbygget verifierat) och ORDER 172 (aldrig committad till main — se `ORDER_REGISTRY.md`).

---

## 1. Vad som är verifierat

Produktionsbygget kördes 2026-09-20 mot huvudgrenen:

| Mätvärde | Talet | Källa |
|---|---|---|
| `npm run build` totaltid | 5,3 s | `time npm run build` (2,10 s vite + tsc-tid) |
| Vite build-tid | 2,10 s | vite-utskrift `built in 2.10s` |
| Moduler transformerade | 815 | vite-utskrift |
| `dist/index.html` | 0,54 KB (0,35 KB gzip) | vite-utskrift |
| `dist/assets/index-*.css` | 13,98 KB (3,34 KB gzip) | vite-utskrift |
| `dist/assets/index-*.js` | 2 303,91 KB (656,41 KB gzip) | vite-utskrift |
| `dist/assets/characters/` | 41 MB (`.glb` humanoider) | `du -sh` |
| Totalt `dist/` | 43 MB | `du -sh` |

Jämförelse mot ORDER 171:s referens (4 s / 1,3 MB gzippat): bundlen har vuxit
till 656 KB gzip (ökning från nav-modulen i ORDER 221 + escort/perf-arbetet i
220/222); bygget är snabbare (5,3 s totalt, 2,10 s vite) tack vare nyare Node
och varmt tsc-cache.

**Sökvägar i `dist/index.html`:** root-relativa (`/assets/…`), inte
subpath-relativa. Rätt form för Cloudflare Pages på egen domän eller
`*.pages.dev`. Fungerar inte under subpath (`/nexus/`) utan `vite.config.ts`
`base`-ändring — ordern kräver inte det.

**Dev-hookar verifierat frånvarande i produktionsbygget** (grep i
`dist/assets/index-*.js`, alla noll träffar):

```
__nxBusinessRoomRef              0
__nxCamera                       0
__nxGuestPositions               0
__nxHarness                      0
__nxLayoutBounds                 0
__nxNavPerf                      0
__nxPlayerBusinessPlinthMeasure  0
__nxRigDebug                     0
__nxSeatSource                   0
__nxSeatSourceLength             0
__nxSetBusinessName              0
__nxSimDispatch                  0
__nxSimState                     0
__nxStaffPoses                   0
__nxStaffPositions               0
__nxThreeCamera                  0
```

`import.meta.env.DEV`-gaten (ORDER 196) fungerar — de sexton dev-hookarna som
finns i källan tree-shakas ut av vite i produktion.

**Playtest-läget överlever bygget:** strängen `playtest` förekommer 4 gånger i
`dist/assets/index-*.js`, `playtest=1` 1 gång. `#playtest=1`-hashen och
DevPanel-vägen för verksamhetsval finns kvar i produktionen — deploy-sidan är
alltså inte "playtest-låst", spelaren når verksamhetsvalet via hashen som
förut.

---

## 2. Dashboard-inställningar

Vision Owner utför följande i Cloudflare-dashboarden. Ingen automatik i repot
sätter något av detta.

### 2.1 Skapa Pages-projekt

`Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git`.

- Repository: `Viognier70/nexus-studio`
- Production branch: `main`
- Project name: valfritt (t.ex. `nexus-studio`) — bestämmer `*.pages.dev`-URL:en

### 2.2 Build-inställningar

| Fält | Värde |
|---|---|
| **Framework preset** | None (Vite finns i listan men vi sätter fälten manuellt) |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `frontend` |
| **Environment variables** | `NODE_VERSION` = `20` |

Root directory är `frontend/` för att repot är monorepo-liknande — `package.json`,
`vite.config.ts` och källkoden ligger under `frontend/`, `wrangler.toml` finns
med i samma katalog för framtida CLI-deploy.

`NODE_VERSION=20` sätts som **Environment variable** (både för Production och
Preview) — inte som Node-version-fältet i dashboarden. Cloudflare läser den
variabeln vid build. Node 18 fungerar också men 20 är LTS när ordern skrivs och
matchar vad utvecklarmaskinen kör (24 lokalt, 20 räcker för vite 5).

### 2.3 Deploy-läge

**Automatiska deploys av**. Ordern §4 säger uttryckligen ingen automatik: sextio
ordrar om dagen skulle ge sextio deployer och en länk som ändras under en
playtest är värdelös.

- `Settings → Builds & deployments → Production deployments → Auto-deploy on push` → **Off**
- `Preview deployments` → **Off** (eller lämnas på om Vision Owner vill det;
  påverkar bara branch-URL:er som ändå inte delas ut)

Deploy görs manuellt när Vision Owner vill:

1. `Deployments → Create deployment → Retry with latest commit`, eller
2. `Deployments → Create deployment → Branch: main`, eller
3. CLI: `cd frontend && npx wrangler pages deploy dist` (kräver `CLOUDFLARE_API_TOKEN` lokalt, inte i repot)

Alternativt: koppla på deploy vid Git-tagg om Vision Owner vill (dashboarden har
`Settings → Builds & deployments → Configure Production deployments → Trigger`).
Ordern dokumenterar bara att automatik-vid-push är av; tagg-baserad deploy är
ett fullt godtagbart val.

---

## 3. Cloudflare Access

Sidan ska inte vara publik (ORDER 223 §3). En halvfärdig prototyp indexeras
inte, och paviljongernas kunskapsinnehåll är Vision Owners material.

### 3.1 Skapa Access-applikation

`Zero Trust dashboard → Access → Applications → Add an application →
Self-hosted`.

| Fält | Värde |
|---|---|
| **Application name** | `Nexus Studio` |
| **Session duration** | 24 hours (räcker för en playtest-session) |
| **Application domain** | `<project-name>.pages.dev` (eller custom domain) |
| **Identity providers** | One-time PIN via email (räcker för sex playtestare) |

### 3.2 Access-policy

`Add a policy → Allow` med kriterium `Emails` och listan över inbjudna
playtestare. Alternativt `Emails ending in @<domän>` om en organisation testar.

En separat `Deny` catch-all krävs inte — Access är default-deny.

### 3.3 Verifiera Access

Öppna `<project-name>.pages.dev` i inkognito-fönster. En Cloudflare-inloggningssida
med PIN-flödet ska visas. Utan giltig e-post ska sidan inte gå att nå.

---

## 4. Efter deploy

**Länken att skicka** är `https://<project-name>.pages.dev` (eller custom
domain). Playtestare klickar → skriver in e-post → tar emot PIN → når spelet.

**Verksamhetsval:** hashen `#playtest=1` aktiverar DevPanel-vägen så
playtestaren kan välja `olkrogen`, `kvarterskrogen`, `vinbaren` etc. Standard
utan hash: den namn-input + kamera-flygning-flöde ORDER 175 verifierade.

**Om något inte fungerar:** Cloudflare Pages visar build-logg per deploy under
`Deployments → <deploy> → View build log`. `npm run build` som fungerar lokalt
ska fungera i deploy — samma tsc och vite. Vanligast fel är fel `Root directory`
(måste vara `frontend`) eller `Build output directory` (måste vara `dist`, inte
`frontend/dist` — Cloudflare tolkar den relativt Root directory).

---

## 5. Vad som INTE ingår i den här ordern

- **Ingen automatisk deploy vid push.** §2.3 ovan.
- **Ingen spelkod ändras.** Verifieras av `git diff` i order-commit.
- **Inga hemligheter i repot.** `CLOUDFLARE_API_TOKEN`, Access-policy och
  identity-provider-inställningar hör i dashboarden, inte i `wrangler.toml`.
- **Ingen custom domain.** `*.pages.dev`-URL:en räcker för playtest; custom
  domain är egen ordning när Vision Owner vill det.
- **Ingen preview-flöde för PR:er.** Kan slås på i dashboarden om Vision Owner
  vill; påverkar inte den här ordern.
