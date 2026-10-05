// shopTabs.ts — D5 (2026-10-04): butikens nya flikar, leverantörerna och utrustningen. ORDER 304 §1, §3, §4.
// Butiken från 2026-10-02 (hostShop.ts) får tre flikar: Förmågor (som förut), Leverantörer och Utrustning.
// Principen: frågorna följer varukorgen. Det spelaren tar in avgör vilka frågor gästerna ställer och vilken klass
// krogen räknas till. Krediterna öppnar (en gång), kassan betalar (utrustningen) eller veckans inköp (leverantören).
// Lägena är samma stenar som i butiken: owned, open, short, locked (hostShop.ts SHOP.stone). Inga speltal:
// pris och krediter är platshållare ({credits}, {price}) som Code fyller ur balance.ts (SUPPLIER, EQUIPMENT_PRICE).

export type ShopTab = 'abilities' | 'suppliers' | 'equipment';
export const SHOP_TABS: ShopTab[] = ['abilities', 'suppliers', 'equipment'];

export interface ShopItem {
  id: string; tab: ShopTab; icon: string;   // Lucide
  /** Vad som öppnar den: en medalj i en paviljong och krediter. Medaljen förbrukas inte, krediterna gör det. */
  unlock: { pavilion: string; medal: 'episteme' | 'techne' | 'phronesis'; credits: string };
  /** Utrustningen köps sedan för kassan. Leverantören kostar per vecka i inköpen. */
  pay?: { from: 'till' | 'purchases'; price: string };
  /** Varorna (leverantör) eller händelserna (utrustning) som den för med sig. */
  brings: string[];
  /** Frågebankens ämnen som kvällens raketer hämtas ur när den finns på krogen. */
  topics: string[];
  classPull: 'simple' | 'bistro' | 'soigne';
}

export const SUPPLIERS: ShopItem[] = [
  { id: 'fisherman', tab: 'suppliers', icon: 'fish', unlock: { pavilion: 'kitchen', medal: 'episteme', credits: '{credits}' }, pay: { from: 'purchases', price: '{price}' }, brings: ['pikeperch', 'whitefish', 'crayfish'], topics: ['fish'], classPull: 'bistro' },
  { id: 'wineMerchant', tab: 'suppliers', icon: 'wine', unlock: { pavilion: 'wine', medal: 'episteme', credits: '{credits}' }, pay: { from: 'purchases', price: '{price}' }, brings: ['priorat', 'chablis', 'barolo'], topics: ['wine'], classPull: 'bistro' },
  { id: 'cheeseAffineur', tab: 'suppliers', icon: 'circle-dot', unlock: { pavilion: 'kitchen', medal: 'techne', credits: '{credits}' }, pay: { from: 'purchases', price: '{price}' }, brings: ['brie', 'munster', 'comte'], topics: ['cheese'], classPull: 'soigne' },
  { id: 'charcutier', tab: 'suppliers', icon: 'beef', unlock: { pavilion: 'kitchen', medal: 'techne', credits: '{credits}' }, pay: { from: 'purchases', price: '{price}' }, brings: ['ham', 'saucisson', 'rillettes'], topics: ['charcuterie'], classPull: 'bistro' }
];

export const EQUIPMENT_ITEMS: ShopItem[] = [
  { id: 'wineFridge', tab: 'equipment', icon: 'refrigerator', unlock: { pavilion: 'wine', medal: 'techne', credits: '{credits}' }, pay: { from: 'till', price: '{price}' }, brings: ['wine.servingTemp'], topics: ['wine'], classPull: 'bistro' },
  { id: 'flambeCart', tab: 'equipment', icon: 'flame', unlock: { pavilion: 'service', medal: 'techne', credits: '{credits}' }, pay: { from: 'till', price: '{price}' }, brings: ['tableside.flambe'], topics: ['spirits', 'kitchen'], classPull: 'soigne' },
  { id: 'cheeseCart', tab: 'equipment', icon: 'shopping-cart', unlock: { pavilion: 'kitchen', medal: 'phronesis', credits: '{credits}' }, pay: { from: 'till', price: '{price}' }, brings: ['cheese.trolley'], topics: ['cheese', 'wine'], classPull: 'soigne' },
  { id: 'avecCart', tab: 'equipment', icon: 'glass-water', unlock: { pavilion: 'wine', medal: 'techne', credits: '{credits}' }, pay: { from: 'till', price: '{price}' }, brings: ['avec.trolley', 'table.staysForAvec'], topics: ['spirits'], classPull: 'bistro' },
  { id: 'humidor', tab: 'equipment', icon: 'archive', unlock: { pavilion: 'service', medal: 'phronesis', credits: '{credits}' }, pay: { from: 'till', price: '{price}' }, brings: ['cigar.offer'], topics: ['cigar'], classPull: 'soigne' }
];

/** Klassen räknas ur varukorgen (ORDER 304 §1) och visas överst i alla tre flikar: tre steg, det nuvarande ifyllt
 *  i guld, och raden *Det du tar in avgör klassen*. Hur många saker som drar mot varje klass sätter Code. */
export const VENUE_CLASS = { steps: ['simple', 'bistro', 'soigne'], filled: '#e8b93a', empty: 'rgba(244,230,204,.35)', note: 'shop.class.note' };

/** Flikraden: segmenterad, i panelens överkant, samma pill som SV/EN. Den valda i guld med bläck. */
export const TAB_STYLE = { heightCqh: 5.2, minPx: 40, on: { bg: '#e8b93a', fg: '#2a1c13' }, off: { bg: 'transparent', fg: '#f4e6cc' }, track: 'rgba(245,234,213,.08)' };
