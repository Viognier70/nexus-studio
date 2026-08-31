# ORDER 165 — Arrivals + konkurrens (kartläggning + VO-beslut alternativ A)

**Repo** `Viognier70/nexus-studio` · **Gren** `order-166-konkurrenterna` (mergad i samma PR som ORDER 164 + 166 per retroaktiv formalisering)
**Klass** AUTONOM · Docs + Vision Owner-beslut
**Datum** 2026-08-31
**Följer** Vision Owner-instruktion 2026-08-31 ("kartlägg vad som krävs för konkurrens om gäster")

---

## 1. Vad ordern är

Innan konkurrensmekanik byggs krävs kartläggning av vad `arrivals.ts`
faktiskt gör idag, vad som finns för representation av andra
verksamheter, vilka faktorer som skulle kunna bli jämförande, och om
marknadsandel är ett begrepp någonstans.

Kartläggningen genomförd i samtal 2026-08-31. Denna fil formaliserar
resultatet + VO-beslutet som följde, så ORDER 166:s referens
("ORDER 165 §4, alternativ A") pekar på ett dokumenterat val.

---

## 2. Kartläggningen (2026-08-31)

**§2.1 Hur spawnar arrivals.ts idag?** Direkt till spelarens kö.
`reducer.ts:1875` anropar `maybeSpawnGuest(state, rng)`; funktionen
gör (a) `ACTIVE_GUEST_CAP=24`, (b) foodtruck-kögate,
(c) `rng.chance(arrivalProbability(state))`, (d) om spawn →
`makeGuest` in i `state.guests[]`. Inget mellansteg, ingen
marknadsallokering.

**§2.2 Finns representation av annan verksamhet?** Nej. Grep i
`frontend/src/` efter `otherBusiness`, `competitorBusiness`,
`npcBusiness`, `externalBusiness` = noll träffar. Enda konkurrens-
referens: `FOODTRUCK_COMPETITION_MULTIPLIER = 0.85` i `arrivals.ts:16`
— en konstant, ingen motpart. `DESIGN_BACKLOG.md` B-002:
"competitors are currently buildings with no business behind them".

**§2.3 Vad påverkar ankomstvolymen idag?** `arrivalProbability`-kedjan
multiplicerar: `ARRIVAL_BASE_PER_MINUTE × periodMult × SERVICE_MULT ×
PRICE_MULT × economicMult × reputationMult × weatherMult ×
worldFactorMult × rhythmMult × competitionMult × valueMult`. Fyra av
dessa kan naturligt bli jämförande (rykte, service-koncept, pris,
value-quota), möjligen även normaliserad ekonomi. Väder / period /
world-factors är globala per dag — skalar hela marknaden, inte
fördelningen.

**§2.4 Marknadsandel som begrepp?** Finns inte i kod. `grep marknadsandel|
marketShare|market_share` i `src/` = 0 träffar. I docs: nämnt som
"väntar" i `UTKAST_SEX_VERKSAMHETSKLASSER.md` och ORDER 139-registerraden.
Närmaste befintliga formulering: `DESIGN_BACKLOG.md` B-014
("The foodtruck tier and rivalry") — Vision Owner-idé 2026-08-10,
status öppen.

---

## 3. Fyra saker som saknas för konkurrens

Ur kartläggningen framgår att fyra saker behöver finnas som **inte
finns idag** för att konkurrens ska fungera:

1. **En andra `SimulationState` per rivaliserande verksamhet** — eller
   minst en förenklad shadow-state med `reputation`, `policies.service`,
   `policies.pricing`, `cash`, `valueQuota`.
2. **Ett spawn-lager ovanför `maybeSpawnGuest`** som (a) genererar
   en gäst per tick, (b) beräknar preferens-vikter per verksamhet ur
   samma faktor-kedja `arrivals.ts` redan använder, (c) fördelar via
   viktad slump. Spelaren får bara de gäster som föll på hens verksamhet.
3. **Geometrisk placering av rivalerna** — vilken byggnad varje NPC-
   verksamhet bor i. ORDER 164:s kandidatlistor svarar på HAR byn plats.
4. **En läsning för spelaren att SE konkurrensen utan siffror** —
   B-014: "revenue, plates sold, guest count, and the queue outside".

---

## 4. Två alternativ, VO-beslut

**Alternativ A — spelaren har egen bas, shareFactor på toppen.**
`BASE_ARRIVAL_RATE` förblir spelarens bas som skalas som idag.
En ny multiplikator `shareFactor` läggs bredvid de befintliga i
`arrivalProbability`, beräknad ur spelarens rykte mot NPC-fältets
rykte. Konkurrensen syns i faktorn — inte i att spelaren tävlar
mot en global ankomstpool.

**Alternativ B — global byefterfrågan fördelas.**
En ny `TOWN_ARRIVAL_RATE` genererar en gäst per tick oavsett
verksamhet. En preferens-modell (rykte × klass × pris × koncept ×
väder ...) väljer vem gästen går till. Spelaren får bara sin andel.

**Vision Owner-beslut 2026-08-31: alternativ A.** Motivering:
alternativ A är den minsta stegvisa förändringen som gör konkurrens
mätbar. Om A visar sig bära bygger alternativ B ovanpå. Om A inte bär
är det svaret att gå direkt till B — men A måste prövas först.

---

## 5. Vad denna order INTE gör

Ingen kod. Ingen mekanik. Bara kartläggningen + beslutet, formaliserade
så ORDER 166:s referens till "ORDER 165 §4, alternativ A" har ett
dokumenterat underlag.

---

## 6. Konsumenter

- **ORDER 166** — implementerar alternativ A.
- Framtida order som eventuellt går till alternativ B — kan referera
  denna för §4-analysen.
