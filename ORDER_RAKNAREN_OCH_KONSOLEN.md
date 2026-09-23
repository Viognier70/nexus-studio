# ORDER — Räknaren och konsolen

**Repo** `Viognier70/nexus-studio` · **Gren** `order-NNN` (från `main`)
**Klass** AUTONOM · Utredning först, fix efter
**Datum** 2026-08-29

> Numret tas ur `ORDER_REGISTRY.md`. Två fynd i samma order eftersom båda kräver
> runtime-observation och ingen av dem har en känd fix.

---

## DEL A — `seatedIds` mot `guests`

### A1. Läget

DEV-raden visade `seated=16/16` medan fyra figurer syntes i rummet, alla
stående. Nästa observation visade femton sittande figurer korrekt placerade.

Räknaren läser `sim.seatedIds.length` (`DevPanel.tsx` rad 140). Figurerna
renderas ur `sim.guests`. De två kan divergera.

Utredningen i ORDER 121:s efterspel pekade ut två kandidater:

- `sim.seatedIds` bär poster som inte längre finns i `sim.guests` (stale).
- `seatIndex` är ogiltigt och alla faller tillbaka på `seats[0]`, så figurer
  staplas på samma stol.

Riggens poseval är inte misstänkt: `poseSeated` väljs korrekt för
`state === 'seated'`.

### A2. Vad som ska fastställas

Kör simuleringen och logga, per tick under ett helt pass:
`seatedIds.length`, antalet gäster i `SEATED_STATES`, och antalet distinkta
`seatIndex`.

**Divergerar de tre talen någon gång?** I så fall när, och åt vilket håll.

Om de aldrig divergerar var observationen en scenövergång och inget mer — då
avslutas Del A som *ej reproducerbar*, med loggen som bevis. Det är ett giltigt
utfall.

### A3. Om divergensen finns

Åtgärda den, men bara den. `seatedIds` är sim-lagrets räknare; om den är
källan till fel ska den rättas där, inte kompenseras i presentationslagret.

`seats[0]`-fallbacken ska däremot **flagga**, inte tyst svälja ett ogiltigt
index. En gäst utan giltig stol är ett fynd, inte något att placera någonstans.

---

## DEL B — Konsolfelen

### B1. Läget

Felantalet steg från 8 till 25 till 56 till 70 under en körning. Samtliga
observerade rader var `client:736` `ERR_CONNECTION_REFUSED` — Vites
HMR-socket i återanslutningsloop, inte spelet.

**Men det är inte fastställt att alla 70 är det.** Stackspår genom
`InstrumentsPanel → PanelColumn → StrategicShell` observerades tidigt i samma
session, och en shorthand-CSS-varning om `border` fanns bland dem.

Ett växande felantal döljer riktiga fel. Det är skälet till ordern.

### B2. Vad som ska göras

En felinventering med runtime-capture: starta dev-servern, kör ett fullt pass i
playwright, samla `console.on('error')` och `page.on('pageerror')`, och
kategorisera per stack-signatur.

Rapportera **de faktiska meddelandena**, inte antalet. Antal utan innehåll är
vad som gjorde att felen kunde växa obemärkt.

### B3. Kandidater att pröva, inte att anta

Från källanalysen, som hypoteser:

- `useEffect` med `[sim.capitals.values, sim.cash]` — reducern spreadar state
  varje tick, så referensen är ny även utan värdeändring.
- `useEffect` med `[flashes]` som anropar `setFlashes` inuti.
- `BAR_FILL_STYLE(reading.fraction)` med `NaN` eller `undefined` ger ogiltig CSS.

Ingen av dem är bekräftad. Ordern ska mäta, inte gissa.

### B4. Vad som får åtgärdas

Ingenting i den här ordern, om det inte är trivialt och entydigt. Del B
levererar en kategoriserad lista; fixarna blir egna ordrar per kategori.

Undantag: fel som visar sig vara ren HMR-brus dokumenteras som sådana och kräver
ingen åtgärd alls.

---

## Definition of Done

1. **Del A:** loggen från §A2 i rapporten, med de tre talen per tick.
2. Del A avslutad antingen med en fix eller med *ej reproducerbar* och beviset.
3. `seats[0]`-fallbacken flaggar i stället för att svälja, oavsett utfall.
4. **Del B:** kategoriserad fellista med faktiska meddelanden och stack-signaturer.
5. Andelen HMR-brus av totalen angiven.
6. Inga fixar utanför §B4:s undantag.
7. Typecheck grön, hela sviten grön, båda CI-jobben gröna.
8. Registerpost i samma commit.

---

## Avgränsningar

Figurriggen rörs inte i någon del. Ansiktsbanden, trösklarna och
ankomstmultiplikatorerna rörs inte.

Fynd 5 (personal på rast med väntande gäster) hör till egen order.

---

## Om något inte går

Om Del B visar att felen växer på ett sätt som gör dev-servern opålitlig för
observation, är det i sig det viktigaste fyndet. Rapportera det före allt annat.
