# ORDER 304 — Konceptet och varukorgen: förslag till datamodell och balans

**Underlag:** Anders 2026-10-04 (`ORDRAR_303-304_D5.md`, ORDER 304). Principen är att frågorna följer varukorgen. Det spelaren köper in avgör vilken kunskap gästerna kräver. Ju högre klass, desto högre pris, mer krävande gäster och hårdare följder av fel svar.

**Status: förslag för beslut. Inget är byggt.** Utkastet till frågebanken, 10 varor och 5 saker i utrustningen med 90 frågor, står i `ORDER_304_UTKAST/` (`UTKAST_FRAGOR.md` för granskning, och JSON i spelets format).

---

## 1. Vad finns i dag

- **Verksamhetsklassen** (vinbar, food truck, ölkrog …) väljs hos banken och styr rummet, personalen och raketbanken (`incidentBank.ts`, en bank per klass).
- **Morgonens inköp** är paket och rader: rätter och drycker med pris och portioner (`stockPackages.ts`, `MorningBuyScreen`).
- **Gästtyperna** är student, medel och hög, plus den sociala gästen, miljardären och bussens turister (`GUEST_TYPES`). De har plånbok, sittid och nöjdhet.
- **Byns konkurrenter** har var sin notanivå: pizzerian 120 kr, Torgkrogen 210, Sjöboden 250 och hotellets matsal 430 (`VILLAGE.rivals`).
- **Raketerna** dras ur klassens bank, med en vikt för det som står på kvällens meny (`fitsMenu`).
- **Butikens träd per paviljong** finns (`SHOP.abilities`, ORDER 296).
- **ORDER 303:s följder:** felets grad, ryktet, stämningen som flyttar notan, och placeringen på nöjda gäster.

## 2. Förslaget i korthet

1. **En ny dimension, konceptet.** Enkel, Bistro eller Soigné räknas fram ur varukorgen. Den ersätter inte verksamhetsklassen: en vinbar kan vara enkel eller soigné.
2. **Varje vara och sak i utrustningen** är en post med nivå, pris, leverantör och sex frågor, två per kunskapsform.
3. **Kvällens raketer** dras främst ur frågorna för det som står på menyn, vinlistan och i rummet.
4. **Gästtyperna** blir fem, med betalningsvilja och förlåtelse per typ. Konceptet avgör vilka som kommer.
5. **Ryktet räknas per koncept.** En soigné krog som svarar fel tappar sina betalningsstarka gäster men kan fyllas av studenter som inte betalar för de dyra råvarorna.
6. **Leverantörer och utrustning** öppnas med krediter i butikens träd. Utrustningen köps för kassan, står i rummet och öppnar nya händelser.

## 3. Datamodellen

```ts
// content/goods.ts (ny) — varorna och utrustningen.
type Tier = 'enkel' | 'bistro' | 'soigne';
type GoodKind = 'fisk' | 'kott' | 'ost' | 'chark' | 'vin' | 'sprit' | 'tobak' | 'gronsak';
interface Good {
  id: string;                 // 'gos', 'priorat', 'brie-de-meaux' …
  kind: GoodKind;
  tier: Tier;                 // varans nivå i varukorgen
  supplier: SupplierId;       // 'fiskaren' | 'vinhandlaren' | 'ostaffinoren' | 'charkuteristen' | 'grossisten'
  priceSek: number;           // inköpspris per portion eller flaska
  sellSek: number;            // på menyn eller listan
  dishIds?: string[];         // rätter och drycker som använder varan (kopplingen till dagens meny)
  questionIds: string[];      // sex frågor: två episteme, två techne, två phronesis
}
interface Equipment {
  id: 'vinkyl' | 'flamberingsvagn' | 'ostvagn' | 'avecvagn' | 'humidor';
  tier: Tier;
  priceSek: number;           // köps för kassan
  unlock: { pavilion: PavilionKey; medal: MedalLevelId; credits: number };
  opensIncidents: string[];   // t.ex. flambering vid bordet, ostvagnen vid borden
  questionIds: string[];
}
interface Supplier {
  id: SupplierId;
  unlock: { pavilion: PavilionKey; medal: MedalLevelId; credits: number } | null; // grossisten är öppen från start
  goods: string[];
}

// Speltillståndet (types.ts):
//   owned.suppliers: SupplierId[]; owned.equipment: Equipment['id'][];
//   day.basket: { goodId: string; qty: number }[]   — morgonens inköp per vara
//   reputationByTier: Record<Tier, number>          — ryktet per koncept (ersätter ett enda tal)
```

**Frågorna** har samma format som de 37 frågorna (`drafts.meta.json` och `drafts.text.*`), med tre fält till: `commodity`, `commodityKind` och `supplier`. Se utkastet.

**Konceptet** räknas varje morgon ur varukorgen: `basketTier(day.basket, owned.equipment)`.
- Det är medelvärdet av varornas nivå, vägt med inköpsvärdet (enkel 0, bistro 1, soigné 2).
- Utrustningen i rummet lyfter mot sin nivå med en vikt.
- Gränserna står i `balance.ts`, till exempel under 0,6 enkel, 0,6–1,4 bistro och från 1,4 soigné.
- Klassen syns på morgonen ("I kväll: Bistro") och på skylten i byn (stil och pris, ORDER 300 §7).

## 4. Gästerna, betalningsviljan och förlåtelsen

| Typ | Kommer till | Betalar (notans faktor mot konceptets pris) | Förlåter (felets följd gånger) |
|---|---|---|---|
| Studenter | Enkel | 0,7 | 0,6 |
| Bybor (dagens medel) | Enkel, Bistro | 1,0 | 1,0 |
| Turister (bussen, bilarna) | Bistro, Soigné | 1,1 | 1,0 |
| Gourmeter | Soigné | 1,4 | 1,8 |
| Affärsfolk | Soigné | 1,3 | 1,4 |

- **Priset per gäst** sätts av konceptet: enkel omkring 180 kr, bistro omkring 320 kr och soigné omkring 520 kr. Konkurrenterna ligger på 120–430 kr i dag.
- **Gästblandningen** följer konceptet (`GUEST_TYPES.share` per koncept) och ryktet inom konceptet.
- **Ryktet inom konceptet:** varje svar flyttar ryktet för kvällens koncept, med ORDER 303:s tal gånger gästernas förlåtelse.
  - En soigné krog som svarar fel sjunker snabbt i sitt soigné-rykte, och gourmeterna och affärsfolket slutar komma.
  - Rummet kan fyllas med studenter och bybor, som betalar enkelt pris för soigné-råvaror. Krogen förlorar på det.
- **Ett byte av koncept** börjar på konceptets eget rykte, som ändras långsamt när det inte används (`balance.ts`).

## 5. Frågorna ur det som finns på krogen

- **Varje raket** dras med vikter: varor på kvällens meny och vinlista 3, utrustningen i rummet 2 och klassens allmänna bank 1.
- **Steget** dras ur varans sex frågor efter stegets kunskapsform (ORDER 301:s förslag om ordningen gäller om det beslutas).
- **Utrustningen öppnar egna händelser:** flambering vid bordet (flamberingsvagnen) och ostvagnen vid borden. De är raketer i samma format, med steg ur utrustningens frågor.
- **Varornas frågor i paviljongerna:** samma frågor finns i Måltidens hus. Övningen förbereder alltså för de varor spelaren köper in.

## 6. Leverantörer och utrustning

**Leverantörer:**

| Leverantör | Varor (urval) | Öppnas av |
|---|---|---|
| Grossisten | dagens baspaket | från start |
| Fiskaren vid sjön | gös, röding | Metodköket brons och 20 krediter |
| Vinhandlaren | Priorat, Chablis, Riesling, cigarrer | Stensöta silver och 40 krediter |
| Ostaffinören | Brie de Meaux, Munster, Västerbottensost | Kalastorget brons och 30 krediter |
| Charkuteristen | jamón ibérico | Metodköket silver och 40 krediter |

**Utrustning:**

| Utrustning | Pris i kassan | Öppnas av | Öppnar händelser |
|---|---|---|---|
| Finare vinkyl | 15 000 kr | Stensöta brons | Vinet i rätt temperatur |
| Flamberingsvagn | 12 000 kr | Metodköket silver | Flambering vid bordet |
| Ostvagn | 9 000 kr | Kalastorget silver | Ostvagnen vid borden |
| Avecvagn | 8 000 kr | Stensöta silver | Avec efter maten |
| Humidor | 14 000 kr | Stensöta guld | Cigarren och uteserveringen |

- Krediterna köper tillgången, och kassan köper saken (spec: "Utrustningen köps för kassan").
- Utrustningen står synligt i rummet. Det kräver Designs D5: vagnarna, vinkylen och humidorn, och klippen för flambering och ostvagnen.

## 7. Balansen och harness

**Målen** (spec §6), prövade med `order296Karnan` utökad med konceptet och varukorgen:
- Soigné med 0,85 rätt per steg tjänar mest av alla spelartyper.
- Soigné med 0,6 rätt går sämre än enkel med 0,6.
- Det som redan gäller ska fortsätta gälla:
  - ORDER 303:s mål ("alltid fel" förlust och aldrig 1:a efter vecka 1);
  - trappan (mentorn och den förnuftiga stänger aldrig, den slarviga alltid);
  - "halva" stänger i 30–50 % av säsongerna.

**Spelartyperna i harness** behöver en dimension till, konceptet (enkel, bistro, soigné), i varje kombination med svaren (0,6 och 0,85), "alltid fel" och mentorn.

**Talen som kalibreras** står i `balance.ts`:
- konceptets pris;
- gästernas betalningsvilja och förlåtelse;
- ryktet per koncept;
- leverantörernas och utrustningens priser.

## 8. Ordning för bygget (efter beslut)

1. **Datamodellen och varorna** (`goods.ts`), konceptet ur varukorgen, morgonens rad och skylten.
2. **Gästtyperna** (fem) och ryktet per koncept. Harness med konceptet, kalibrering mot §7.
3. **Frågorna ur varukorgen** i raketerna och paviljongerna. Utkastet in efter granskning.
4. **Leverantörerna och utrustningen** i butiken (Designs D5: flikarna), och utrustningen i rummet med de nya händelserna (D5: vagnarna och klippen).

## 9. Att besluta

1. **Konceptet som egen dimension**, ovanpå verksamhetsklassen (förslaget). Eller ska konceptet ersätta verksamhetsklassen?
2. **Gränserna** för enkel, bistro och soigné, och priset per gäst (180, 320 och 520 kr föreslås).
3. **Gästtyperna:** fem enligt tabellen, med gourmeter och affärsfolk som nya. Ska turisterna vara en egen typ också utanför bussen?
4. **Ryktet per koncept**, eller ett rykte för krogen och ett per koncept?
5. **Leverantörernas och utrustningens priser** och vad som öppnar dem (tabellerna ovan är förslag).
6. **Utkastet till frågorna:** granskas av Anders. Källorna (`reference`) är tomma tills de är valda.
