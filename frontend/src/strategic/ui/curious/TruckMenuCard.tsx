// ORDER 319c — Designs D9 (truckProps.ts menuBoard: "Menyn visas i HUD:en när man pekar på skylten").
// ORDER 320 — Designs D10 (truckMenu.ts): skylten rad för rad, åtta rader: grillad korv, halv special,
// tunnbrödsrulle, korv med mos, vegokorv, mild senap (utan pris), läsk och kaffe. De nya raderna (vegokorven,
// den milda senapen och kaffet) är märkta Nytt. Priserna ur balance.ts TRUCK_MENU. Skylten i bilden har bara
// krita; texten står här.

import { useLanguage } from '../../../content/language';
import { t as tt, type StringKey } from '../../../content/nexusStrings';
import { TRUCK_MENU } from '../../../sim/balance';
import './curious.css';

type PriceKey = 'grilled' | 'halfSpecial' | 'wrap' | 'mash' | 'veg' | 'soda' | 'coffee';

/** Designs D10 TRUCK_MENU, i ordning. */
export const TRUCK_MENU_ROWS: { id: string; key: StringKey; price: PriceKey | null; isNew?: boolean }[] = [
  { id: 'grilled', key: 'menu.grilled', price: 'grilled' },
  { id: 'halfSpecial', key: 'menu.halfSpecial', price: 'halfSpecial' },
  { id: 'wrap', key: 'menu.wrap', price: 'wrap' },
  { id: 'mash', key: 'menu.mash', price: 'mash' },
  { id: 'veg', key: 'menu.veg', price: 'veg', isNew: true },
  { id: 'mildMustard', key: 'menu.mildMustard', price: null, isNew: true },
  { id: 'soda', key: 'menu.soda', price: 'soda' },
  { id: 'coffee', key: 'menu.coffee', price: 'coffee', isNew: true }
];

export function TruckMenuCard() {
  const lang = useLanguage();
  return (
    <div className="nx-truck-menu" data-testid="truck-menu-card">
      <div className="nx-truck-menu-kicker">{tt(lang, 'menu.kicker')}</div>
      <div className="nx-truck-menu-title">{tt(lang, 'menu.title')}</div>
      <ul>
        {TRUCK_MENU_ROWS.map((r) => (
          <li key={r.id} data-row={r.id}>
            {r.price ? tt(lang, r.key, { price: tt(lang, 'menu.price', { n: TRUCK_MENU[r.price] }) }) : tt(lang, r.key)}
            {r.isNew && <span className="nx-truck-menu-new">{tt(lang, 'menu.new')}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
