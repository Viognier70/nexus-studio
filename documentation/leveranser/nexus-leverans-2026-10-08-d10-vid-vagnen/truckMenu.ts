// truckMenu.ts — vagnens skylt. Raderna i ordning. Priserna från balance.ts (PRICES.truck.*), texten i HUD:en.
// Skylten i bilden har bara kritlinjer, och de nya raderna har ett tecken var.
export const TRUCK_MENU = [
  { id: 'grilled',     key: 'menu.grilled',     price: 'PRICES.truck.grilled' },
  { id: 'halfSpecial', key: 'menu.halfSpecial', price: 'PRICES.truck.halfSpecial' },
  { id: 'wrap',        key: 'menu.wrap',        price: 'PRICES.truck.wrap' },
  { id: 'mash',        key: 'menu.mash',        price: 'PRICES.truck.mash' },
  { id: 'veg',         key: 'menu.veg',         price: 'PRICES.truck.veg', isNew: true, glyph: 'leaf' },
  { id: 'mildMustard', key: 'menu.mildMustard', price: null, isNew: true, glyph: 'drop' },
  { id: 'soda',        key: 'menu.soda',        price: 'PRICES.truck.soda' },
  { id: 'coffee',      key: 'menu.coffee',      price: 'PRICES.truck.coffee', isNew: true, glyph: 'cup' }
] as const; // menu.drinks (Läsk och kaffe) utgår och blir soda + coffee
export const RIVAL_PRICES = { halfSpecial: '{RIVAL.halfSpecial}' }; // prototypen visar 25 kr enligt order 320
