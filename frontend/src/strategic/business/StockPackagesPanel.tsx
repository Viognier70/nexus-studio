// ORDER 275 — lagret är insatsen (Vision Owner 2026-09-28, provspel).
//
// Högerspalten i morgonens schema (S1) för klasser med paket: baspaketet
// och tillköpen med innehåll och pris, och vad som finns i lagret nu.
// Paketen ersätter menyn och inköpen per ingrediens; leverantörerna syns
// inte. Köpet drar kassan direkt (BUY_PACKAGE, stockPackages.ts).

import { strings } from '../../content/strings';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { findDish } from '../simulation/m4Catalogue';
import { packageCostSek, packagesFor, type StockPackage } from '../simulation/packages';
import { menuFromStock, computePlatesRemaining } from '../simulation/stockPackages';
import { stockForecast } from '../../sim/stockForecast';
import { NxLabel, u } from '../ui/system/components';
import '../ui/screens/screens.css';

const T = strings.stock;
const sek = (v: number) => strings.service.meters.sek(Math.round(v).toLocaleString('en-GB'));

function PackageRow({ pkg, bought, onBuy, disabled }: { pkg: StockPackage; bought: number; onBuy: () => void; disabled: boolean }) {
  const text = T.packages[pkg.id] ?? { name: pkg.id, description: '' };
  const cost = packageCostSek(pkg);
  return (
    <div className="nxs-menu-row" style={{ gridTemplateColumns: '1fr auto', alignItems: 'start', paddingTop: u(10) }} data-testid={`package-${pkg.id}`}>
      <div>
        <div style={{ fontWeight: 700 }}>{text.name}</div>
        <div className="nxs-row-sub">{text.description}</div>
        <div className="nxs-row-sub">
          {pkg.items.map((i) => T.item(i.portions, findDish(i.dishId)?.name ?? i.dishId)).join(' · ')}
        </div>
        {bought > 0 && <div className="nxs-row-sub" style={{ fontWeight: 700 }} data-testid={`package-bought-${pkg.id}`}>{T.boughtTimes(bought)}</div>}
      </div>
      <button
        type="button"
        className="nx-btn nx-btn-secondary"
        style={{ width: 'auto', minWidth: u(200) }}
        onClick={onBuy}
        disabled={disabled}
        data-testid={`buy-package-${pkg.id}`}
      >
        <span>{T.buy(sek(cost))}</span>
      </button>
    </div>
  );
}

export function StockPackagesPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const pkgs = packagesFor(sim.economy.businessClass);
  if (!pkgs) return null;
  const morning = sim.day.period === 'morning';
  const bought = (id: string) => (sim.packagesBoughtToday ?? []).filter((x) => x === id).length;
  const buy = (id: string) => dispatch({ type: 'BUY_PACKAGE', packageId: id });
  const menu = menuFromStock(sim);
  const plates = computePlatesRemaining(menu, sim.stock);
  // Kuverten räknas på maten; drycken följer med varje gäst.
  const forecast = stockForecast({ menu: menu.filter((m) => findDish(m.dishId)?.kind !== 'drink'), stock: sim.stock });
  const covers = forecast.kind === 'covers' ? forecast.covers : null;
  return (
    <div className="nx" data-testid="stock-packages">
      <div className="nxs-list-head"><NxLabel>{T.heading}</NxLabel></div>
      <p className="nxs-row-sub nxs-mt-8">{T.intro}</p>
      {sim.lastWaste && sim.lastWaste.dayNumber === sim.day.dayNumber - 1 && (
        <p className="nxs-row-sub" data-testid="stock-last-waste">{T.lastWaste(sek(sim.lastWaste.sek))}</p>
      )}

      <div className="nxs-list-head nxs-mt-8"><NxLabel>{T.base}</NxLabel></div>
      <PackageRow pkg={pkgs.base} bought={bought(pkgs.base.id)} onBuy={() => buy(pkgs.base.id)} disabled={!morning} />

      <div className="nxs-list-head nxs-mt-8"><NxLabel>{T.addOns}</NxLabel></div>
      {pkgs.addOns.map((p) => (
        <PackageRow key={p.id} pkg={p} bought={bought(p.id)} onBuy={() => buy(p.id)} disabled={!morning} />
      ))}

      <div className="nxs-list-head nxs-mt-8"><NxLabel>{T.inStock}</NxLabel></div>
      <div data-testid="stock-in-stock" data-covers={covers ?? 0}>
        {menu.length === 0 ? (
          <p className="nxs-row-sub nxs-mt-8">{T.empty}</p>
        ) : (
          <>
            {menu.map((m) => (
              <div key={m.dishId} className="nxs-menu-row" style={{ gridTemplateColumns: '1fr auto' }}>
                <span>{findDish(m.dishId)?.name ?? m.dishId}</span>
                <span className="nxs-row-sub">{T.portions(plates[m.dishId] ?? 0)}</span>
              </div>
            ))}
            {covers !== null && <p className="nxs-row-sub nxs-mt-8">{T.covers(covers)}</p>}
            <p className="nxs-row-sub">{T.drinksKeep}</p>
          </>
        )}
      </div>
    </div>
  );
}
