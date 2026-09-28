// ORDER 077 §4 (M4) — in-room plates-remaining reading.
// ORDER 278 — lagret syns under servicen (Vision Owner 2026-09-28, andra
// provspelet): "Lagret syns under servicen: portioner och flaskor per
// artikel. Det som tar slut ger missnöjda gäster."
//
// I designsystemets form (paket 1, 00-SYS), till vänster under mise en
// place och ovanför mätarna. En rad per artikel på kvällens meny och
// dryckeslista: rätterna i portioner, vinet på glas i glas, flaskorna i
// flaskor. Det som tagit slut står som SLUT/OUT och tonas ned, i samma
// stund som strömmen säger det. Talen läses ur state.day.platesRemaining,
// samma källa som gästernas beställning.

import { useSimState } from '../simulation/SimulationProvider';
import { findDish } from '../simulation/m4Catalogue';
import { strings } from '../../content/strings';
import { NxLabel, u } from '../ui/system/components';
import '../ui/system/system.css';

export function PlatesRemainingPanel() {
  const sim = useSimState();
  const inService = sim.day.period === 'lunch' || sim.day.period === 'dinner';
  if (!inService) return null;
  if (sim.menu.length === 0) return null;
  const t = strings.serviceStock;
  const dishes = sim.menu.filter((m) => findDish(m.dishId)?.kind !== 'drink');
  const drinks = sim.menu.filter((m) => findDish(m.dishId)?.kind === 'drink');
  const row = (dishId: string) => {
    const dish = findDish(dishId);
    if (!dish) return null;
    const n = sim.day.platesRemaining[dishId] ?? 0;
    const out = n === 0;
    const amount = out ? t.out
      : dish.drink === 'wine-bottle' ? t.bottles(n)
        : dish.kind === 'drink' ? t.glasses(n) : t.portions(n);
    return (
      <div key={dishId} data-testid={`service-stock-${dishId}`} data-left={n}
        style={{ display: 'flex', justifyContent: 'space-between', gap: u(8), opacity: out ? 0.45 : 1, fontSize: u(17), lineHeight: 1.35 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dish.name}</span>
        <strong style={{ fontVariantNumeric: 'tabular-nums', color: out ? 'var(--nx-accent-700)' : 'var(--nx-ink)', whiteSpace: 'nowrap' }}>{amount}</strong>
      </div>
    );
  };
  return (
    <div
      className="nx nx-panel"
      role="region"
      aria-label={t.aria}
      data-testid="service-stock"
      style={{
        position: 'absolute',
        top: u(476),
        left: u(72),
        width: u(560),
        maxHeight: u(310),
        overflowY: 'auto',
        padding: `${u(12)} ${u(20)}`,
        zIndex: 33,
        pointerEvents: 'auto'
      }}
    >
      <NxLabel>{t.heading}</NxLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: u(20), marginTop: u(6) }}>
        <div>{dishes.map((m) => row(m.dishId))}</div>
        <div>{drinks.map((m) => row(m.dishId))}</div>
      </div>
    </div>
  );
}
