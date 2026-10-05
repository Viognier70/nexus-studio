// ORDER 307 (ORDER 304 §6, Anders 2026-10-05) — butikens flikar
// Leverantörer och Utrustning, i Designs form (D5 shopTabs.ts, LEVERANSNOT
// §8): flikraden, krogens klass överst i tre steg, stenarna i samma lägen som
// förmågorna (din, öppen, krediterna räcker inte, låst) och kortet till höger
// med vad saken tar in eller öppnar, frågorna, klassen den drar mot, vad som
// öppnar den och vad den kostar. Varorna och villkoren är besluten i ORDER
// 304 §9 (balance.ts GOODS_SUPPLIERS och EQUIPMENT), inte prototypens exempel.
// En leverantör öppnas med krediter och levererar från morgon; utrustningen
// öppnas med krediter och köps sedan för kassan. Reglerna i sim/goods.ts.

import { useState } from 'react';
import { Archive, ArrowRight, Beef, CircleDot, Fish, Flame, GlassWater, Lock, Refrigerator, ShoppingCart, Truck, Wine, type LucideIcon } from 'lucide-react';
import { strings } from '../../../content/strings';
import { getLanguage, numberLocale } from '../../../content/language';
import { t as tt, type StringKey } from '../../../content/nexusStrings';
import { useSimDispatch, useSimState } from '../../simulation/SimulationProvider';
import { findDish } from '../../simulation/m4Catalogue';
import {
  EQUIPMENT_IDS, GOODS_SUPPLIER_IDS, TIERS, conceptOf, equipmentOpened, equipmentSpec, equipmentStone, supplierDishes, supplierPrice,
  supplierSpec, supplierStone, tierOf, type EquipmentId, type GoodsStone, type GoodsSupplierId, type Tier
} from '../../../sim/goods';
import { creditsOf } from '../../../sim/shop';
import type { SimulationState } from '../../types';
import './host.css';

export type ShopTab = 'abilities' | 'suppliers' | 'equipment';

const MEDAL_KEY: Record<string, string> = { brons: 'medal.bronze', silver: 'medal.silver', guld: 'medal.gold', platina: 'medal.platinum' };
const medalWord = (m: string) => tt(getLanguage(), (MEDAL_KEY[m] ?? m) as StringKey).toLowerCase();
const kr = (n: number) => n.toLocaleString(numberLocale());

const SUPPLIER_ICON: Record<GoodsSupplierId, LucideIcon> = { grossisten: Truck, fiskaren: Fish, vinhandlaren: Wine, ostaffinoren: CircleDot, charkuteristen: Beef };
const EQUIPMENT_ICON: Record<EquipmentId, LucideIcon> = { vinkyl: Refrigerator, flamberingsvagn: Flame, ostvagn: ShoppingCart, avecvagn: GlassWater, humidor: Archive };
// Frågebankens ämnen som kvällens raketer hämtas ur när saken finns på krogen
// (frågorna kommer med ORDER 306).
const SUPPLIER_TOPICS: Record<GoodsSupplierId, string[]> = { grossisten: [], fiskaren: ['fish'], vinhandlaren: ['wine'], ostaffinoren: ['cheese'], charkuteristen: ['charcuterie'] };
const EQUIPMENT_TOPICS: Record<EquipmentId, string[]> = { vinkyl: ['wine'], flamberingsvagn: ['spirits', 'kitchen'], ostvagn: ['cheese', 'wine'], avecvagn: ['spirits'], humidor: ['cigar'] };

// Klassen ikväll, eller den varukorgen ger om ingen kväll är bokad än.
export function venueClass(sim: SimulationState): Tier {
  const b = sim.day.booking;
  return (b && b.dayNumber === sim.day.dayNumber && b.concept) || conceptOf(sim);
}

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

// Krogens klass i tre steg, det nuvarande i guld (Designs VENUE_CLASS).
export function ClassStrip() {
  const sim = useSimState();
  const t = strings.shopTabs;
  const now = venueClass(sim);
  return (
    <div className="nx-shop-class" data-testid="shop-class" data-class={now}>
      <span className="nx-label">{t.classTitle}</span>
      <span className="nx-shop-class-steps">
        {TIERS.map((tier) => (
          <span key={tier} className="nx-shop-class-step" data-filled={TIERS.indexOf(tier) <= TIERS.indexOf(now)} data-current={tier === now}>{t.tier[tier]}</span>
        ))}
      </span>
      <span className="nx-small">{t.classNote}</span>
    </div>
  );
}

interface Item {
  id: string;
  icon: LucideIcon;
  name: string;
  note: string;
  brings: string;
  topics: string[];
  pulls: Tier;
  medal: string | null;
  pavilion: string | null;
  credits: number;
  stone: GoodsStone;
  // Utrustningen: krediterna har öppnat den och kassan kan köpa den.
  opened?: boolean;
  priceSek?: number;
}

function supplierItems(sim: SimulationState, credits: number): Item[] {
  const t = strings.shopTabs;
  return GOODS_SUPPLIER_IDS.map((id) => {
    const spec = id === 'grossisten' ? null : supplierSpec(id);
    const dishes = supplierDishes(id);
    const pulls = dishes.some((d) => tierOf(d) === 'soigne') ? 'soigne' : dishes.every((d) => tierOf(d) === 'enkel') ? 'enkel' : 'bistro';
    return {
      id, icon: SUPPLIER_ICON[id], name: t.supplier[id]?.name ?? id, note: t.supplier[id]?.note ?? '',
      brings: dishes.map((d) => findDish(d)?.name ?? d).join(', '), topics: SUPPLIER_TOPICS[id], pulls: pulls as Tier,
      medal: spec?.medal ?? null, pavilion: spec ? strings.knowledge.pavilions[spec.pavilion] ?? spec.pavilion : null,
      credits: supplierPrice(id), stone: supplierStone(sim, id, credits)
    };
  });
}

function equipmentItems(sim: SimulationState, credits: number): Item[] {
  const t = strings.shopTabs;
  return EQUIPMENT_IDS.map((id) => {
    const spec = equipmentSpec(id);
    return {
      id, icon: EQUIPMENT_ICON[id], name: t.equipment[id]?.name ?? id, note: t.equipment[id]?.note ?? '',
      brings: t.equipment[id]?.note ?? '', topics: EQUIPMENT_TOPICS[id], pulls: spec.tier,
      medal: spec.medal, pavilion: strings.knowledge.pavilions[spec.pavilion] ?? spec.pavilion,
      credits: spec.credits, stone: equipmentStone(sim, id, credits), opened: equipmentOpened(sim, id), priceSek: spec.priceSek
    };
  });
}

export function GoodsShop({ kind, onDone }: { kind: 'suppliers' | 'equipment'; onDone: () => void }) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const t = strings.shopTabs;
  const credits = creditsOf(sim);
  const items = kind === 'suppliers' ? supplierItems(sim, credits) : equipmentItems(sim, credits);
  const [selected, setSelected] = useState<string>(() => (items.find((i) => i.stone === 'open') ?? items[0]).id);
  const sel = items.find((i) => i.id === selected) ?? items[0];
  const Icon = sel.icon;

  const action = (() => {
    if (sel.stone === 'owned') return { label: kind === 'suppliers' ? t.ownedSupplier : t.ownedEquipment, on: null, kind: 'quiet' as const };
    if (sel.stone === 'locked') return { label: t.locked, on: null, kind: 'locked' as const };
    if (kind === 'equipment' && sel.opened) {
      return sel.stone === 'open'
        ? { label: t.buyCash(kr(sel.priceSek ?? 0)), on: () => dispatch({ type: 'BUY_EQUIPMENT', id: sel.id }), kind: 'primary' as const }
        : { label: t.shortCash, on: null, kind: 'muted' as const };
    }
    if (sel.stone === 'short') return { label: t.shortCredits, on: null, kind: 'muted' as const };
    return {
      label: t.buyCredits(sel.credits),
      on: () => dispatch({ type: kind === 'suppliers' ? 'BUY_SUPPLIER' : 'OPEN_EQUIPMENT', id: sel.id }),
      kind: 'primary' as const
    };
  })();

  return (
    <div className="nx-shop-grid" data-testid={`shop-${kind}`}>
      <section className="nx-shop-goods" aria-label={kind === 'suppliers' ? t.suppliers : t.equipmentTab}>
        <p className="nx-small nx-shop-list-intro">{kind === 'suppliers' ? t.suppliersIntro : t.equipmentIntro}</p>
        <div className="nx-shop-goods-stones">
          {items.map((i) => {
            const I = i.icon;
            return (
              <button key={i.id} type="button" className="nx-shop-stone" data-state={i.stone} data-selected={i.id === sel.id}
                data-testid={`shop-${kind === 'suppliers' ? 'supplier' : 'equipment'}-${i.id}`} onClick={() => setSelected(i.id)}>
                <span className="nx-shop-stone-disc"><I size={18} aria-hidden /></span>
                <span className="nx-shop-stone-text">
                  <strong>{i.name}</strong>
                  <span>{t.stone[i.stone]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <aside className="nx-shop-side">
        <div className="nx-paper nx-shop-card" data-testid="shop-goods-card" data-item={sel.id} data-state={sel.stone}>
          <div className="nx-label"><Icon size={14} aria-hidden /> {kind === 'suppliers' ? t.suppliers : t.equipmentTab}</div>
          <h2 className="nx-heading" style={{ margin: 0 }}>{sel.name}</h2>
          <p style={{ margin: 0 }}>{sel.note}</p>
          {kind === 'suppliers' && sel.brings && <p className="nx-small" style={{ margin: 0 }}><strong>{t.bringsLabel}</strong> {sel.brings}</p>}
          {sel.topics.length > 0 && (
            <p className="nx-small" style={{ margin: 0 }}><strong>{t.questionsLabel}</strong> {sel.topics.map((x) => t.topic[x] ?? x).join(', ')}. {t.questionsLater}</p>
          )}
          <p className="nx-small" style={{ margin: 0 }}><strong>{t.pullsLabel}</strong> {t.tier[sel.pulls]}</p>
          <div className="nx-shop-card-need">
            <span className="nx-shop-card-need-disc" data-level={sel.medal ?? 'none'} />
            <span>
              <strong>{sel.medal && sel.pavilion ? t.unlockMedal(medalWord(sel.medal), sel.pavilion, sel.credits) : t.open}</strong>
              {kind === 'equipment' && sel.priceSek !== undefined && <span>{t.payTill(kr(sel.priceSek))}</span>}
              {kind === 'suppliers' && sel.medal && <span>{t.payPurchases}</span>}
            </span>
          </div>
          <button type="button" className="nx-shop-action" data-kind={action.kind} disabled={!action.on} onClick={action.on ?? undefined} data-testid="shop-goods-action">
            <span>{action.label}</span>
            {action.kind === 'locked' ? <Lock size={18} aria-hidden /> : <ArrowRight size={18} aria-hidden />}
          </button>
        </div>
        <button type="button" className="nx-shop-done" data-testid="shop-done" onClick={onDone}>
          <span>{t.done}</span><ArrowRight size={20} aria-hidden />
        </button>
      </aside>
    </div>
  );
}
