// ORDER 307 (ORDER 304 §6, Anders 2026-10-05) — butikens flikar
// Leverantörer och Utrustning. En leverantör öppnas med en medalj och
// betalas med krediter; utrustningen öppnas med en medalj och köps för
// kassan. Reglerna i sim/goods.ts, talen i balance.ts GOODS_SUPPLIERS och
// EQUIPMENT. Spelets egen form tills Designs flikar i D5 kopplas in.

import { ArrowRight, Check, Lock } from 'lucide-react';
import { strings } from '../../../content/strings';
import { getLanguage, numberLocale } from '../../../content/language';
import { t as tt, type StringKey } from '../../../content/nexusStrings';
import { useSimDispatch, useSimState } from '../../simulation/SimulationProvider';
import { findDish } from '../../simulation/m4Catalogue';
import {
  EQUIPMENT_IDS, GOODS_SUPPLIER_IDS, equipmentOwned, equipmentSpec, equipmentUnlocked, supplierDishes, supplierOwned,
  supplierPrice, supplierSpec, supplierUnlocked
} from '../../../sim/goods';
import { creditsOf } from '../../../sim/shop';
import './host.css';

export type ShopTab = 'abilities' | 'suppliers' | 'equipment';

const MEDAL_KEY: Record<string, string> = { brons: 'medal.bronze', silver: 'medal.silver', guld: 'medal.gold', platina: 'medal.platinum' };
const medalWord = (m: string) => tt(getLanguage(), (MEDAL_KEY[m] ?? m) as StringKey).toLowerCase();

export function ShopTabBar({ tab, onTab }: { tab: ShopTab; onTab: (t: ShopTab) => void }) {
  const t = strings.shopTabs;
  const items: { id: ShopTab; label: string }[] = [
    { id: 'abilities', label: t.abilities },
    { id: 'suppliers', label: t.suppliers },
    { id: 'equipment', label: t.equipmentTab }
  ];
  return (
    <div className="nx-shop-tabs" role="tablist" data-testid="shop-tabs">
      {items.map((i) => (
        <button key={i.id} type="button" role="tab" aria-selected={tab === i.id} className="nx-shop-tab" data-active={tab === i.id}
          data-testid={`shop-tab-${i.id}`} onClick={() => onTab(i.id)}>{i.label}</button>
      ))}
    </div>
  );
}

export function SuppliersPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const t = strings.shopTabs;
  const credits = creditsOf(sim);
  return (
    <section className="nx-shop-list" data-testid="shop-suppliers" aria-label={t.suppliers}>
      <p className="nx-small nx-shop-list-intro">{t.suppliersIntro}</p>
      <div className="nx-shop-cards">
        {GOODS_SUPPLIER_IDS.map((id) => {
          const owned = supplierOwned(sim, id);
          const unlocked = supplierUnlocked(sim, id);
          const price = supplierPrice(id);
          const name = t.supplier[id]?.name ?? id;
          const goods = supplierDishes(id).map((d) => findDish(d)?.name ?? d).join(', ');
          const spec = id === 'grossisten' ? null : supplierSpec(id);
          const need = spec ? t.needs(medalWord(spec.medal), strings.knowledge.pavilions[spec.pavilion] ?? spec.pavilion) : t.open;
          const canBuy = !owned && unlocked && credits >= price;
          return (
            <div key={id} className="nx-paper nx-shop-item" data-testid={`shop-supplier-${id}`} data-owned={owned} data-unlocked={unlocked}>
              <strong>{name}</strong>
              <span className="nx-small">{t.supplier[id]?.note}</span>
              <span className="nx-small nx-muted">{t.goods(goods)}</span>
              <span className="nx-small">{need}</span>
              {owned ? (
                <span className="nx-shop-item-owned"><Check size={16} aria-hidden /> {t.owned}</span>
              ) : (
                <button type="button" className="nx-shop-action" data-kind={canBuy ? 'primary' : unlocked ? 'muted' : 'locked'} disabled={!canBuy}
                  data-testid={`shop-supplier-buy-${id}`} onClick={() => dispatch({ type: 'BUY_SUPPLIER', id })}>
                  <span>{t.buyCredits(price)}</span>{unlocked ? <ArrowRight size={18} aria-hidden /> : <Lock size={18} aria-hidden />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function EquipmentPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const t = strings.shopTabs;
  return (
    <section className="nx-shop-list" data-testid="shop-equipment" aria-label={t.equipmentTab}>
      <p className="nx-small nx-shop-list-intro">{t.equipmentIntro}</p>
      <div className="nx-shop-cards">
        {EQUIPMENT_IDS.map((id) => {
          const spec = equipmentSpec(id);
          const owned = equipmentOwned(sim, id);
          const unlocked = equipmentUnlocked(sim, id);
          const canBuy = !owned && unlocked && sim.cash >= spec.priceSek;
          return (
            <div key={id} className="nx-paper nx-shop-item" data-testid={`shop-equipment-${id}`} data-owned={owned} data-unlocked={unlocked}>
              <strong>{t.equipment[id]?.name ?? id}</strong>
              <span className="nx-small">{t.equipment[id]?.note}</span>
              <span className="nx-small nx-muted">{t.lifts(t.tier[spec.tier])}</span>
              <span className="nx-small">{t.needs(medalWord(spec.medal), strings.knowledge.pavilions[spec.pavilion] ?? spec.pavilion)}</span>
              {owned ? (
                <span className="nx-shop-item-owned"><Check size={16} aria-hidden /> {t.owned}</span>
              ) : (
                <button type="button" className="nx-shop-action" data-kind={canBuy ? 'primary' : unlocked ? 'muted' : 'locked'} disabled={!canBuy}
                  data-testid={`shop-equipment-buy-${id}`} onClick={() => dispatch({ type: 'BUY_EQUIPMENT', id })}>
                  <span>{t.buyCash(spec.priceSek.toLocaleString(numberLocale()))}</span>{unlocked ? <ArrowRight size={18} aria-hidden /> : <Lock size={18} aria-hidden />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
