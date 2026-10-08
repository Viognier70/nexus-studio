// ORDER 320 — Designs D10 (documentation/leveranser/nexus-leverans-2026-10-08-d10-vid-vagnen/vagnenStrings.ts):
// nycklarna som spelet visar, oförändrade: HUD-nålarna (kortläsaren, Swish-skylten, Grillvagnens skylt) och
// skyltens nya rader. Prototypens egna rubriker och förklaringar (ui.*, sc.*, sit.*, prop10.*, vg.why.*, cam) är inte med.

export const VAGNEN_STRINGS = {
  'pin.terminal.who': { sv: 'Kortläsaren', en: 'Card reader' },
  'pin.terminal.text': { sv: 'Ingen kontakt. Försök igen.', en: 'No connection. Try again.' },
  'pin.swish.who': { sv: 'Skylten vid luckan', en: 'Sign at the hatch' },
  'pin.swish.text': { sv: 'Swish', en: 'Swish' },
  'pin.rival.who': { sv: 'Grillvagnen', en: 'Grillvagnen' },
  'pin.rival.text': { sv: 'Halv special {price}', en: 'Half special {price}' },
  'menu.kicker': { sv: 'Skylten vid kön', en: 'The board by the queue' },
  'menu.new': { sv: 'Nytt', en: 'New' },
  'menu.veg': { sv: 'Vegokorv {price}', en: 'Veggie sausage {price}' },
  'menu.mildMustard': { sv: 'Mild senap', en: 'Mild mustard' },
  'menu.soda': { sv: 'Läsk {price}', en: 'Fizzy drink {price}' },
  'menu.coffee': { sv: 'Kaffe {price}', en: 'Coffee {price}' }
} as const;
