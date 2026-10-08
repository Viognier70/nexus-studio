// ORDER 319c — Designs D9 (truckProps.ts menuBoard: "Menyn visas i HUD:en när man pekar på skylten",
// menu.* i luckanStrings.ts, priserna {price} ur balance.ts TRUCK_MENU). Skylten har bara krita utan text;
// kortet visar menyn medan pekaren är över skylten (TruckLife.tsx). Med vegokorven och senapen, skånsk och
// mild (Anders 2026-10-08, n04 och n18).

import { useLanguage } from '../../../content/language';
import { t as tt, type StringKey } from '../../../content/nexusStrings';
import { TRUCK_MENU } from '../../../sim/balance';
import './curious.css';

const ROWS: [StringKey, keyof typeof TRUCK_MENU][] = [
  ['menu.grilled', 'grilled'], ['menu.veggie', 'veggie'], ['menu.halfSpecial', 'halfSpecial'],
  ['menu.wrap', 'wrap'], ['menu.mash', 'mash'], ['menu.drinks', 'drinks']
];

export function TruckMenuCard() {
  const lang = useLanguage();
  const price = (k: keyof typeof TRUCK_MENU) => tt(lang, 'menu.price', { n: TRUCK_MENU[k] as number });
  return (
    <div className="nx-truck-menu" data-testid="truck-menu-card">
      <div className="nx-truck-menu-title">{tt(lang, 'menu.title')}</div>
      <ul>
        {ROWS.map(([key, p]) => <li key={key}>{tt(lang, key, { price: price(p) })}</li>)}
      </ul>
      <div className="nx-truck-menu-note">{tt(lang, 'menu.condiments')}</div>
    </div>
  );
}
