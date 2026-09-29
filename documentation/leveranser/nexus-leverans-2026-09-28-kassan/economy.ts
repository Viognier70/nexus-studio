// economy — morgonens inköp, lagret under servicen, händelseströmmen,
// sopbilen och spelarens raket. Provspel 2026-09-28, skärmarna M1–K1 i
// "Skarmarna - kassan och kvallen.dc.html".
//
// Ren logik utan DOM. Alla belopp i hela kronor, all tid i spelminuter
// sedan 18.00 (0–300). Slump via injicerad `rng` så att tester kan låsa den.

export type Rng = () => number;
export type ItemKind = 'dish' | 'wine';

export interface MenuItem {
  id: string;
  nameKey: string;        // nexusStrings-nyckel, t.ex. 'item.roding'
  shortKey: string;       // kort namn i strömmen, t.ex. 'item.roding.short'
  kind: ItemKind;
  cost: number;           // inköp per portion eller per flaska
  price: number;          // pris per portion eller per glas
  qty: number;            // portioner eller flaskor
  step: number;           // parti per klick: 5 portioner, 2 flaskor
  main?: boolean;         // räknas mot bokade gäster i täckningen
}

// ── Konstanter ──────────────────────────────────────────────────
export const GLASSES_PER_BOTTLE = 5;
export const BOTTLE_DISCOUNT = 0.9;      // hel flaska = 5 glas × 0,9
export const SERVICE_MINUTES = 300;      // 18.00–23.00
export const LAST_ORDERS_MINUTES = 30;   // sista rutan i klockan
export const RUSH = { from: 90, to: 180 }; // 19.30–21.00
export const LOW_SHARE = 0.2;            // Snart slut under 20 %
export const LOW_MIN_PORTIONS = 3;       // … eller högst tre portioner
export const LOW_GLASSES = GLASSES_PER_BOTTLE; // bar: en flaska kvar
export const TAB_MIN_AGE = 40;           // en nota betalas tidigast efter 40 min

export const WASTE = {
  kgPerPortion: 0.22,
  plateKgPerServed: 0.06,
  plateKgMin: 3,
  kgPerBottle: 0.55,
  cardboardKg: 11,
  feePerKg: 2.9,
  pickupFee: 420,
} as const;

export const MENU_SAMPLE: MenuItem[] = [
  { id: 'skagen', nameKey: 'item.skagen', shortKey: 'item.skagen.short', kind: 'dish', cost: 42, price: 185, qty: 20, step: 5 },
  { id: 'roding', nameKey: 'item.roding', shortKey: 'item.roding.short', kind: 'dish', cost: 96, price: 325, qty: 25, step: 5, main: true },
  { id: 'oxfile', nameKey: 'item.oxfile', shortKey: 'item.oxfile.short', kind: 'dish', cost: 138, price: 395, qty: 20, step: 5, main: true },
  { id: 'chevre', nameKey: 'item.chevre', shortKey: 'item.chevre.short', kind: 'dish', cost: 34, price: 145, qty: 15, step: 5 },
  { id: 'brulee', nameKey: 'item.brulee', shortKey: 'item.brulee.short', kind: 'dish', cost: 22, price: 125, qty: 25, step: 5 },
  { id: 'cremant', nameKey: 'item.cremant', shortKey: 'item.cremant.short', kind: 'wine', cost: 145, price: 125, qty: 6, step: 2 },
  { id: 'chablis', nameKey: 'item.chablis', shortKey: 'item.chablis.short', kind: 'wine', cost: 210, price: 150, qty: 8, step: 2 },
  { id: 'barolo', nameKey: 'item.barolo', shortKey: 'item.barolo.short', kind: 'wine', cost: 390, price: 245, qty: 4, step: 2 },
  { id: 'cider', nameKey: 'item.cider', shortKey: 'item.cider.short', kind: 'wine', cost: 48, price: 85, qty: 6, step: 2 },
];

// ── M1 Morgonen ─────────────────────────────────────────────────
export type BuyResult =
  | { ok: true; qty: number; cashDelta: number }      // cashDelta < 0 vid köp
  | { ok: false; reason: 'noCash' | 'empty' };

/** Ett klick på + (dir 1) eller − (dir −1). − ger tillbaka inköpspriset. */
export function buyBatch(item: MenuItem, dir: 1 | -1, cash: number): BuyResult {
  const cost = item.step * item.cost;
  if (dir < 0 && item.qty < item.step) return { ok: false, reason: 'empty' };
  if (dir > 0 && cash < cost) return { ok: false, reason: 'noCash' };
  return { ok: true, qty: item.qty + dir * item.step, cashDelta: -dir * cost };
}

export function coverage(menu: MenuItem[], booked: number) {
  const mains = menu.filter(m => m.main).reduce((a, m) => a + m.qty, 0);
  const glasses = menu.filter(m => m.kind === 'wine').reduce((a, m) => a + m.qty * GLASSES_PER_BOTTLE, 0);
  const potential = menu.reduce((a, m) => a + m.qty * m.price * (m.kind === 'wine' ? GLASSES_PER_BOTTLE : 1), 0);
  return { mains, mainsShare: Math.min(1, mains / booked), short: mains < booked, glasses, glassesPerGuest: glasses / booked, potential };
}

// ── L1 Lagret ───────────────────────────────────────────────────
/** Lager i minsta enhet: portioner för kök, glas för bar. */
export type Stock = Record<string, number>;
export type StockStatus = 'ok' | 'low' | 'out';

export function stockFromMenu(menu: MenuItem[]): Stock {
  const s: Stock = {};
  for (const m of menu) s[m.id] = m.kind === 'dish' ? m.qty : m.qty * GLASSES_PER_BOTTLE;
  return s;
}

export function stockStatus(item: MenuItem, left: number, start: number): StockStatus {
  if (left <= 0) return 'out';
  const thr = item.kind === 'dish' ? Math.max(LOW_MIN_PORTIONS, Math.ceil(start * LOW_SHARE)) : LOW_GLASSES;
  return left <= thr ? 'low' : 'ok';
}

/** Baren visas som hela flaskor + glas i den öppna. */
export function bottlesAndGlasses(glasses: number) {
  return { bottles: Math.floor(glasses / GLASSES_PER_BOTTLE), open: glasses % GLASSES_PER_BOTTLE };
}

// ── H1 Händelseströmmen ─────────────────────────────────────────
export type ServiceEvent =
  | { kind: 'order'; min: number; table: number; lines: { id: string; n: number; unit: 'portion' | 'glass' | 'bottle' }[]; amount: number }
  | { kind: 'miss'; min: number; table: number; id: string }
  | { kind: 'stock'; min: number; id: string; status: 'low' | 'out'; left: number }
  | { kind: 'pay'; min: number; table: number; amount: number }
  | { kind: 'tip'; min: number; table: number; amount: number }  // till personalen, aldrig kassan
  | { kind: 'open'; min: number }
  | { kind: 'close'; min: number };

export interface ServiceState {
  min: number;
  stock: Stock;
  stock0: Stock;
  tabs: Record<number, { amount: number; since: number }>;
  warned: Record<string, StockStatus>;
  tables: number;         // 14 i provet; hämtas ur lokalens bordsplan
}

export function startService(menu: MenuItem[], tables = 14): ServiceState {
  const stock = stockFromMenu(menu);
  return { min: 0, stock, stock0: { ...stock }, tabs: {}, warned: {}, tables };
}

const pick = <T,>(a: T[], rng: Rng) => a[Math.floor(rng() * a.length)];

/**
 * En spelminut. Returnerar nytt tillstånd och händelserna i den ordning de
 * hände. Kassan ändras bara av 'pay'. Dricksen ('tip') går till personalen.
 * Tempo: 1× = 600 ms, 2× = 300 ms, 4× = 150 ms per spelminut.
 */
export function serviceTick(menu: MenuItem[], s: ServiceState, rng: Rng): { state: ServiceState; events: ServiceEvent[] } {
  const min = s.min + 1;
  if (min >= SERVICE_MINUTES) return closeService(s);
  const stock = { ...s.stock }, tabs = { ...s.tabs }, warned = { ...s.warned };
  const ev: ServiceEvent[] = [];
  const dishes = menu.filter(m => m.kind === 'dish'), wines = menu.filter(m => m.kind === 'wine');
  const rush = min >= RUSH.from && min < RUSH.to;
  const p = min < SERVICE_MINUTES - 30 ? (min < 30 ? 0.08 : rush ? 0.3 : 0.14) : 0;

  if (rng() < p) {
    const table = 1 + Math.floor(rng() * s.tables);
    const lines: { id: string; n: number; unit: 'portion' | 'glass' | 'bottle' }[] = [];
    let amount = 0, miss: MenuItem | null = null;
    const n = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const m = pick(dishes, rng);
      if (stock[m.id] > 0) {
        stock[m.id]--; amount += m.price;
        const l = lines.find(x => x.id === m.id); if (l) l.n++; else lines.push({ id: m.id, n: 1, unit: 'portion' });
      } else miss = m;
    }
    if (rng() < 0.6) {
      const w = pick(wines, rng), bottle = rng() < 0.35, g = bottle ? GLASSES_PER_BOTTLE : 2;
      if (stock[w.id] >= g) {
        stock[w.id] -= g; amount += g * w.price * (bottle ? BOTTLE_DISCOUNT : 1);
        lines.push({ id: w.id, n: bottle ? 1 : 2, unit: bottle ? 'bottle' : 'glass' });
      } else if (stock[w.id] <= 0) miss = miss ?? w;
    }
    if (lines.length) {
      ev.push({ kind: 'order', min, table, lines, amount: Math.round(amount) });
      const o = tabs[table]; tabs[table] = { amount: (o?.amount ?? 0) + amount, since: o?.since ?? min };
    }
    if (miss) ev.push({ kind: 'miss', min, table, id: miss.id });
  }

  for (const m of menu) {
    const st = stockStatus(m, stock[m.id], s.stock0[m.id] || 1);
    if (st !== 'ok' && warned[m.id] !== st) { warned[m.id] = st; ev.push({ kind: 'stock', min, id: m.id, status: st, left: stock[m.id] }); }
  }

  const due = Object.keys(tabs).map(Number).filter(t => min - tabs[t].since >= TAB_MIN_AGE);
  if (due.length && rng() < (min >= 250 ? 0.5 : 0.22)) {
    const t = pick(due, rng), a = Math.round(tabs[t].amount); delete tabs[t];
    ev.push({ kind: 'pay', min, table: t, amount: a });
    if (rng() < 0.7) ev.push({ kind: 'tip', min, table: t, amount: Math.max(20, Math.round(a * (0.05 + rng() * 0.07) / 10) * 10) });
  }
  return { state: { ...s, min, stock, tabs, warned }, events: ev };
}

export function closeService(s: ServiceState): { state: ServiceState; events: ServiceEvent[] } {
  const ev: ServiceEvent[] = Object.keys(s.tabs).map(Number).map(t => ({ kind: 'pay' as const, min: SERVICE_MINUTES, table: t, amount: Math.round(s.tabs[t].amount) }));
  ev.push({ kind: 'close', min: SERVICE_MINUTES });
  return { state: { ...s, min: SERVICE_MINUTES, tabs: {} }, events: ev };
}

// ── K1 Klockan ──────────────────────────────────────────────────
export type ClockLabel = 'service' | 'rush' | 'lastOrders' | 'closed';

/** Tio halvtimmesrutor 18–23. fill 0–1 per ruta, sista rutan alltid accent. */
export function serviceClock(min: number) {
  const left = Math.max(0, SERVICE_MINUTES - min);
  const label: ClockLabel = left === 0 ? 'closed' : left <= LAST_ORDERS_MINUTES ? 'lastOrders' : (min >= RUSH.from && min < RUSH.to) ? 'rush' : 'service';
  return {
    hour: 18 + Math.floor(min / 60), minute: min % 60,
    leftH: Math.floor(left / 60), leftM: left % 60, left,
    label,
    cells: Array.from({ length: 10 }, (_, i) => ({ fill: Math.max(0, Math.min(1, (min - i * 30) / 30)), accent: i === 9 })),
  };
}

// ── S1 Sopbilen ─────────────────────────────────────────────────
export interface WasteRow { key: 'waste.unsold' | 'waste.plates' | 'waste.glass' | 'waste.cardboard'; kg: number; value: number; detail: Record<string, number> }

/**
 * Efter stängning. `value` är svinnet i inköpspris — betalt redan i morse,
 * dras INTE igen. Bara `fee` dras från kassan.
 */
export function settleWaste(menu: MenuItem[], s: ServiceState) {
  const dishes = menu.filter(m => m.kind === 'dish'), wines = menu.filter(m => m.kind === 'wine');
  const unsold: Record<string, number> = {}; let unsoldKg = 0, unsoldValue = 0, served = 0, bottles = 0;
  for (const m of dishes) {
    const left = s.stock[m.id]; served += s.stock0[m.id] - left;
    if (left > 0) { unsold[m.id] = left; unsoldKg += left * WASTE.kgPerPortion; unsoldValue += left * m.cost; }
  }
  for (const m of wines) bottles += Math.ceil((s.stock0[m.id] - s.stock[m.id]) / GLASSES_PER_BOTTLE);
  const rows: WasteRow[] = [
    { key: 'waste.unsold', kg: unsoldKg, value: unsoldValue, detail: unsold },
    { key: 'waste.plates', kg: Math.max(WASTE.plateKgMin, served * WASTE.plateKgPerServed), value: 0, detail: { served } },
    { key: 'waste.glass', kg: bottles * WASTE.kgPerBottle, value: 0, detail: { bottles } },
    { key: 'waste.cardboard', kg: WASTE.cardboardKg, value: 0, detail: {} },
  ];
  const kg = rows.reduce((a, r) => a + r.kg, 0);
  const fee = Math.round(kg * WASTE.feePerKg + WASTE.pickupFee);

  // Rådet: rätten som kostade mest i svinn, avrundat nedåt till partistorlek.
  const worst = dishes.filter(m => unsold[m.id]).sort((a, b) => unsold[b.id] * b.cost - unsold[a.id] * a.cost)[0];
  const advice = worst && unsold[worst.id] >= LOW_MIN_PORTIONS
    ? { id: worst.id, fewer: Math.max(worst.step, Math.floor(unsold[worst.id] / worst.step) * worst.step), saves: 0 }
    : null;
  if (advice) advice.saves = advice.fewer * worst!.cost;
  return { rows, kg, fee, wasteValue: unsoldValue, advice };
}

// ── B1 Back your knowledge ──────────────────────────────────────
// Säkerhetsbaserad bedömning (confidence-based marking). Insatsen görs med
// kunskapskrediter från proven i Måltidens hus och raketerna i servicen.
// Utfallet avgörs BARA av om svaret är rätt. Ingen slump, ingen kraschpunkt.
// Krediter kan aldrig köpas och växlas aldrig mot kassan.

export type Confidence = 0 | 1 | 2;
export const CONFIDENCE = [
  { key: 'confidence.guess', win: 20, loss: 0 },     // Gissar / Guessing
  { key: 'confidence.think', win: 40, loss: 40 },    // Tror det / Think so
  { key: 'confidence.know', win: 60, loss: 120 },    // Vet det / Know it
] as const;
// Förhållandet 1:0, 2:−2, 3:−6 är den klassiska skalan för säkerhetsbaserad
// bedömning. Att välja högsta nivån lönar sig bara om man har rätt i mer än 80 %.

/** Stegen i en servicenraket. Steget multiplicerar bara rätt svar. */
export const STEP_MULT = [1, 1.5, 2] as const;   // episteme, techne, phronesis

export const canBack = (credits: number, c: Confidence) => credits >= CONFIDENCE[c].loss;

export interface BackResult { correct: boolean; delta: number; endsRocket: boolean }

/** Ett låst svar. delta läggs på krediterna. */
export function backAnswer(correct: boolean, c: Confidence, step: 0 | 1 | 2): BackResult {
  const conf = CONFIDENCE[c];
  return correct
    ? { correct, delta: Math.round(conf.win * STEP_MULT[step]), endsRocket: step === 2 }
    : { correct, delta: -conf.loss, endsRocket: true };
}

/** Träffsäkerhet per nivå: [rätt, totalt]. Visas i "Hur säker du var". */
export type Calibration = [[number, number], [number, number], [number, number]];
export function recordCalibration(cal: Calibration, c: Confidence, correct: boolean): Calibration {
  const n = cal.map(x => [...x]) as Calibration;
  n[c][1]++; if (correct) n[c][0]++;
  return n;
}
export type CalibrationNote = 'calib.overconfident' | 'calib.underconfident' | 'calib.default';
export function calibrationNote(cal: Calibration): CalibrationNote {
  const [g, , k] = cal;
  if (k[1] >= 2 && k[0] / k[1] < 0.75) return 'calib.overconfident';
  if (g[1] >= 2 && g[0] / g[1] >= 0.75) return 'calib.underconfident';
  return 'calib.default';
}
