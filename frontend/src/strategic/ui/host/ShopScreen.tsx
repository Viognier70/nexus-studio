// ORDER 296 — butiken mellan kvällarna (Designs leverans hovmästaren och
// butiken §6, skärm 6 och 7). Vägen mot stjärnan går från I dag till
// stjärnan, med en gren per paviljong som växlar upp och ned; Teatern är sista
// grenen och leder upp till stjärnan. Medaljen är grinden, krediterna betalar.
// Stenens lägen: köpt, öppen, krediterna räcker inte och låst. En ring i
// rollens färg betyder en kurs för personalen. Papperet till höger visar den
// valda stenen; facket under det är det som följer med till nästa kväll.
// Reglerna i sim/shop.ts; talen i balance.ts SHOP.

import { useMemo, useState } from 'react';
import {
  ArrowRight, BookOpenText, BookUser, Cake, Check, ChefHat, GraduationCap, Grape, HeartHandshake, Lock, Newspaper,
  Recycle, Refrigerator, Sparkles, Star, Timer, UtensilsCrossed, WheatOff, Wine, type LucideIcon
} from 'lucide-react';
import { t as tt, type StringKey } from '../../../content/nexusStrings';
import { useLanguage, type Lang } from '../../../content/language';
import { SHOP } from '../../../sim/balance';
import { starsPossible } from '../../../sim/ladderStep';
import { strings } from '../../../content/strings';
import { ABILITY_LIST, SHOP_PAVILION, creditsOf, shopOf, slotCount, starReached, stoneState, type ShopPavilion } from '../../../sim/shop';
import { useSimDispatch, useSimState } from '../../simulation/SimulationProvider';
import { ROLE_COLOUR } from '../../scene/staffRing';
import { MedalDisc } from '../screens/MedalDisc';
import { SHOP as DESIGN } from './hostShop';
import type { MedalLevelId } from '../../types';
import { investLocked } from '../../../sim/introduction';
import { ClassStrip, GoodsShop, ShopTabBar, type ShopTab } from './ShopTabs';
import './host.css';

const ICON: Record<string, LucideIcon> = {
  wine: Wine, refrigerator: Refrigerator, grape: Grape, timer: Timer, recycle: Recycle, 'chef-hat': ChefHat,
  'book-open-text': BookOpenText, 'wheat-off': WheatOff, newspaper: Newspaper, 'book-user': BookUser, cake: Cake,
  'heart-handshake': HeartHandshake, 'utensils-crossed': UtensilsCrossed, sparkles: Sparkles
};
const COURSE_COLOUR = { sommelier: ROLE_COLOUR.sommelier, chef: ROLE_COLOUR.cook, floor: ROLE_COLOUR.waiter } as const;
const MEDAL_KEY: Record<string, string> = { brons: 'medal.bronze', silver: 'medal.silver', guld: 'medal.gold', platina: 'medal.platinum' };
const PAV_KEY: Record<ShopPavilion, string> = { stensota: 'pav.stensota', method: 'pav.method', library: 'pav.library', party: 'pav.party', theatre: 'pav.theatre' };
const s = (lang: Lang, key: string, vars?: Record<string, string | number>) => tt(lang, key as StringKey, vars);

export function ShopScreen({ onDone }: { onDone: () => void }) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const lang = useLanguage();
  // ORDER 307 — flikarna Förmågor, Leverantörer och Utrustning (Designs D5).
  const [tab, setTab] = useState<ShopTab>('abilities');
  const shop = shopOf(sim);
  const credits = creditsOf(sim);
  const slots = slotCount(sim);
  const [selected, setSelected] = useState<string>(() => ABILITY_LIST.find((a) => stoneState(sim, a.id) === 'open')?.id ?? ABILITY_LIST[0].id);
  const sel = ABILITY_LIST.find((a) => a.id === selected)!;
  const selState = stoneState(sim, sel.id);
  const selSpec = SHOP.abilities[sel.id];
  const inSlot = shop.slot.includes(sel.id);
  const locked = investLocked(sim);
  // Vägen är guld fram till den sista grinden som är öppen.
  const lastOpen = useMemo(() => {
    let last = -1;
    DESIGN.road.forEach((b, i) => { if (sim.medals[SHOP_PAVILION[b.pavilion as ShopPavilion]]) last = i; });
    return last;
  }, [sim.medals]);
  const goldTo = lastOpen >= 0 ? DESIGN.road[lastOpen].x : 0.06;

  // ORDER 317 — medaljen i löptext ("brons i Stensöta"), som D6 course.req.*.inline.
  const medalInline = `${s(lang, MEDAL_KEY[selSpec.requires]).toLowerCase()} ${lang === 'sv' ? 'i' : 'in'} ${s(lang, PAV_KEY[sel.pavilion])}`;
  const medalMet = selState !== 'locked';
  const creditsMet = credits >= selSpec.price;
  const action = (() => {
    // ORDER 313 §2 — låst tills första provet är klarat.
    if (locked) return { label: s(lang, 'shop.lockedStart'), on: null, kind: 'locked' as const };
    if (selState === 'owned') {
      if (inSlot) return { label: s(lang, 'shop.fromSlot'), on: () => dispatch({ type: 'SHOP_SLOT', id: sel.id, on: false }), kind: 'quiet' as const };
      if (shop.slot.length >= slots) return { label: s(lang, 'shop.slot.full'), on: null, kind: 'muted' as const };
      return { label: s(lang, 'shop.toSlot'), on: () => dispatch({ type: 'SHOP_SLOT', id: sel.id, on: true }), kind: 'primary' as const };
    }
    // ORDER 317 — Designs D6 kurskortet: medaljen före krediterna (den går inte att köpa sig förbi).
    if (selState === 'locked') return { label: s(lang, 'course.needsMedal', { medal: medalInline }), on: null, kind: 'locked' as const };
    // ORDER 313 §6 — knappen säger hur många krediter som fattas.
    if (selState === 'short') {
      const missing = Math.max(1, selSpec.price - credits);
      return { label: missing === 1 ? s(lang, 'shop.shortByOne') : s(lang, 'course.short', { missing }), on: null, kind: 'muted' as const };
    }
    return { label: sel.course ? s(lang, 'course.buy') : s(lang, 'shop.buy', { price: s(lang, 'shop.price', { n: selSpec.price }) }), on: () => dispatch({ type: 'SHOP_BUY', id: sel.id }), kind: 'primary' as const };
  })();

  return (
    <div className="nx nx-screen nx-shop-screen" role="dialog" aria-modal="true" aria-label={s(lang, 'shop.title')} data-testid="screen-shop" data-credits={credits}>
      <header className="nx-shop-head">
        <div>
          <div className="nx-label">{s(lang, 'shop.kicker')}</div>
          <h1 className="nx-heading" style={{ margin: 0 }}>{s(lang, 'shop.title')}</h1>
          <ShopTabBar tab={tab} onTab={setTab} />
        </div>
        <div className="nx-shop-head-right">
          <span className="nx-label">{s(lang, 'shop.medals')}</span>
          <span className="nx-shop-medals">
            {DESIGN.road.map((b) => {
              const lvl = sim.medals[SHOP_PAVILION[b.pavilion as ShopPavilion]] as MedalLevelId | undefined;
              return <span key={b.pavilion} className="nx-shop-medal" data-empty={!lvl}>{lvl ? <MedalDisc level={lvl} size={22} /> : null}</span>;
            })}
          </span>
          <span className="nx-shop-credits" data-testid="shop-credits"><GraduationCap size={18} aria-hidden /> {s(lang, 'shop.credits', { n: credits })}</span>
        </div>
      </header>
      <ClassStrip />
      {locked && <p className="nx-small nx-shop-locked" data-testid="shop-locked"><Lock size={14} aria-hidden /> {s(lang, 'shop.lockedStart')}</p>}
      {tab !== 'abilities' ? <GoodsShop kind={tab} onDone={onDone} /> : <div className="nx-shop-grid">
        <section className="nx-shop-road" aria-label={s(lang, 'shop.road')}>
          <div className="nx-label nx-shop-road-title">{s(lang, 'shop.road')}</div>
          <div className="nx-shop-map">
            <span className="nx-shop-spine" />
            <span className="nx-shop-spine-gold" style={{ width: `${goldTo * 100}%` }} />
            <span className="nx-shop-today" style={{ left: '2%' }}><span className="nx-shop-today-dot" /><span>{s(lang, 'shop.today')}</span></span>
            {DESIGN.road.map((b) => {
              const pav = b.pavilion as ShopPavilion;
              const lvl = sim.medals[SHOP_PAVILION[pav]] as MedalLevelId | undefined;
              const stones = ABILITY_LIST.filter((a) => a.pavilion === pav);
              const star = 'endsInStar' in b && b.endsInStar;
              return (
                <div key={pav} className="nx-shop-branch" data-dir={b.dir} style={{ left: `${b.x * 100}%` }} data-testid={`shop-branch-${pav}`}>
                  <span className="nx-shop-branch-line" data-open={!!lvl} />
                  <div className="nx-shop-gate" data-open={!!lvl}>
                    <span className="nx-shop-gate-disc">{lvl ? <MedalDisc level={lvl} size={20} /> : null}</span>
                    <span className="nx-shop-gate-text">
                      <strong>{s(lang, PAV_KEY[pav])}</strong>
                      <span>{lvl ? s(lang, 'shop.have', { medal: s(lang, MEDAL_KEY[lvl]) }) : s(lang, 'shop.noMedal')}</span>
                    </span>
                  </div>
                  {stones.map((a) => {
                    const st = stoneState(sim, a.id);
                    const Icon = ICON[a.icon] ?? Sparkles;
                    const slotted = shop.slot.includes(a.id);
                    const spec = SHOP.abilities[a.id];
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className="nx-shop-stone"
                        data-state={st}
                        data-selected={a.id === selected}
                        data-testid={`shop-stone-${a.id}`}
                        onClick={() => setSelected(a.id)}
                      >
                        <span className="nx-shop-stone-disc" style={a.course ? { boxShadow: `0 0 0 3px ${COURSE_COLOUR[a.course]}` } : undefined}>
                          <Icon size={18} aria-hidden />
                          {slotted && <span className="nx-shop-stone-badge"><Check size={10} aria-hidden /></span>}
                        </span>
                        <span className="nx-shop-stone-text">
                          <strong>{s(lang, `ab.${a.id}.name`)}</strong>
                          <span>
                            {st === 'owned'
                              ? `${s(lang, 'shop.owned')}${slotted ? ` · ${s(lang, 'shop.inSlot')}` : ''}`
                              : st === 'locked'
                                ? s(lang, 'shop.needsShort', { medal: s(lang, MEDAL_KEY[spec.requires]) })
                                : s(lang, 'shop.price', { n: spec.price })}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {star && (
                    <div className="nx-shop-star" data-reached={starReached(sim)}><Star size={26} aria-hidden /><span>{s(lang, 'shop.star')}</span>
                      {/* ORDER 315a — stjärnan delas bara ut från bistron. */}
                      {!starsPossible(sim) && <span className="nx-small" data-testid="shop-star-bistro">{strings.ladder.starInBistro}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        <aside className="nx-shop-side">
          <div className="nx-paper nx-shop-card" data-testid="shop-card" data-ability={sel.id} data-state={selState}>
            <div className="nx-label">{s(lang, PAV_KEY[sel.pavilion])}</div>
            <h2 className="nx-heading" style={{ margin: 0 }}>{s(lang, `ab.${sel.id}.name`)}</h2>
            {/* ORDER 313 §6 — fyra rader i ordning: vad, ger, när, kräver och kostar. */}
            <ol className="nx-shop-card-rows" data-testid="shop-card-rows">
              <li data-row="teaches"><span className="nx-label">{s(lang, 'course.row.teaches')}</span><span>{s(lang, `ab.${sel.id}.teaches`)}</span></li>
              <li data-row="gives"><span className="nx-label">{s(lang, 'course.row.gives')}</span><span>{s(lang, `ab.${sel.id}.fx`)}</span></li>
              <li data-row="when"><span className="nx-label">{s(lang, 'course.row.when')}</span><span>{s(lang, 'shop.when')}</span></li>
              <li data-row="needs">
                <span className="nx-label">{s(lang, 'course.row.needs')}</span>
                {/* ORDER 317 — D6: ✓ bläck med guld, ✗ streckad valnöt; inget grönt och inget rött. */}
                <span data-testid="shop-card-need" data-met={medalMet}>
                  <span className="nx-course-mark" data-met={medalMet} aria-hidden>{medalMet ? '✓' : '✗'}</span> {medalInline.charAt(0).toUpperCase() + medalInline.slice(1)} · {s(lang, medalMet ? 'course.req.met' : 'course.req.missing')}
                </span>
                <span data-testid="shop-card-cost" data-met={creditsMet}>
                  <span className="nx-course-mark" data-met={creditsMet} aria-hidden>{creditsMet ? '✓' : '✗'}</span> {s(lang, 'course.cost', { cost: selSpec.price, have: credits })}
                </span>
              </li>
            </ol>
            {sel.course && <p className="nx-small" style={{ margin: 0 }}>{s(lang, 'shop.course')} · {s(lang, `shop.role.${sel.course}`)}</p>}
            <button type="button" className="nx-shop-action" data-kind={action.kind} disabled={!action.on} onClick={action.on ?? undefined} data-testid="shop-action">
              <span>{action.label}</span>
              {action.kind === 'locked' ? <Lock size={18} aria-hidden /> : <ArrowRight size={18} aria-hidden />}
            </button>
          </div>
          <div className="nx-shop-slot" data-testid="shop-slot" data-used={shop.slot.length} data-slots={slots}>
            <div className="nx-shop-slot-head">
              <span className="nx-label">{s(lang, 'shop.slot.title')}</span>
              <strong>{s(lang, 'shop.slot.count', { used: shop.slot.length, n: slots })}</strong>
            </div>
            <div className="nx-shop-slot-cells">
              {Array.from({ length: slots }, (_, i) => {
                const id = shop.slot[i];
                const a = ABILITY_LIST.find((x) => x.id === id);
                const Icon = a ? ICON[a.icon] ?? Sparkles : null;
                return (
                  <button key={i} type="button" className="nx-shop-slot-cell" data-filled={!!a} onClick={() => a && setSelected(a.id)}>
                    {a && Icon ? <><Icon size={16} aria-hidden /><span>{s(lang, `ab.${a.id}.name`)}</span></> : <span>{s(lang, 'shop.slot.empty')}</span>}
                  </button>
                );
              })}
              {!starReached(sim) && (
                <span className="nx-shop-slot-cell" data-star="true"><Star size={16} aria-hidden /><span>{s(lang, 'shop.slot.star')}</span></span>
              )}
            </div>
            <p className="nx-small" style={{ margin: 0 }}>{s(lang, 'shop.slot.note')}</p>
          </div>
          <button type="button" className="nx-shop-done" data-testid="shop-done" onClick={onDone}>
            <span>{s(lang, 'shop.done')}</span><ArrowRight size={20} aria-hidden />
          </button>
        </aside>
      </div>}
    </div>
  );
}

