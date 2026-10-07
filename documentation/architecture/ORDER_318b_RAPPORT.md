# ORDER 318b — Anders beslut om hållbarheten (F66)

**Beställt:** Anders 2026-10-07, beslut om 318: "Hållbarheten (F66): färsk fisk 1 kväll, kyckling 2, fläsk 3, råa rotfrukter 7, soppa och tillagade rotfrukter 2–3, gräddessert 2, sorbet 14, kantareller 2. Kör harness igen och rapportera om något mål flyttar sig."
**Gren:** `order-318b` från `main` (`5ffde81d`).

## Ändringen

- Rätterna har en egen hållbarhet som går före huvudråvarans (`balance.ts WASTE.dishShelfEvenings`, läst i `stockPackages.ts dishShelfEvenings`): gösen 1 kväll, kycklingen 2, fläsket 3, soppan 3, de rostade rotfrukterna med linser 2, gräddesserten 2, sorbeten 14 och kantarellerna 2.
- Råa rotfrukter håller 7 kvällar (`WASTE.shelfEvenings['root-veg']`, förut 4).
- Soppa och tillagade rotfrukter fick 2–3 kvällar. Valt inom ramen: soppan 3, de rostade rotfrukterna med linser 2.
- Övriga råvaror och den öppnade flaskan är fortfarande valda, inte beslutade (F66 i `NEXUS_V1_OPPNA_FRAGOR.md`).
- Beslutet står i speldesignen (`NEXUS_SPELDESIGN_V1.md`, Lagret).

## Harnessen: flyttar något mål?

Samma 17 körningar, 40 frön var (`frontend/scripts/order318b-harness.sh`, `frontend/reports/order318b/efter40/`), jämförda med ORDER 318 i `frontend/reports/order318b/jamforelse.json` (`scripts/order318b-jamforelse.mjs`).

**Inget mål flyttar sig av beslutet.** Skillnaderna är inom frönas spridning:

- Stjärnan vid 0,85: 18 av 40 före och efter (målet omkring hälften).
- Stjärnan vid 0,75: 1 av 40 före och efter (målet 10–25 %, nås inte; kalibreras i 315c).
- Stjärnan vid 0,6: 0 (som målet).
- Mentorn, den kloka och den rimliga stänger aldrig.
- Den som alltid svarar fel stänger alltid.

**Ett mål som redan låg utanför före 318:** den som har hälften rätt ska stänga i 30–50 % av säsongerna (speldesignen, beslut 2026-10-02). Den stängde i 29 av 40 i ORDER 315a, 31 av 40 i 318 och 33 av 40 här (`trappa-halva`). Det är inte hållbarhetens följd, men det ligger utanför målet och bör tas i 315c tillsammans med stjärnan.

## Verifiering

- `src/sim/__tests__/order318Lagret.test.ts`: rätternas hållbarhet enligt beslutet.
- Hela sviten: 189 filer gröna.
