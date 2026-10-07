// ORDER 313 §9 — panelen "Byn just nu" under bandet Byn i kväll. Reglerna i
// sim/villageNow.ts; gästerna ur sim/villageLive.ts, samma som bandet. Formen
// kommer från Design (D6).
//
// ORDER 318 (provspelet kl. 22.13: panelerna skymde rummet, och "6:e i byn",
// "Du drar flest gäster" och "Lugn kväll" stod samtidigt) — panelen är
// ihopfälld från början: bandet visar en rad med placeringen och pilen för
// den senaste kvarten. Klick på raden eller B fäller ut alla krogar med två
// kolumner, Gäster och Nöjda, i placeringens ordning, och sammanfattningen.

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { strings } from '../../../content/strings';
import { clockMinutes } from '../../../sim/clock';
import { VILLAGE } from '../../../sim/balance';
import { villageLive, type VenueLive } from '../../../sim/villageLive';
import { villageNow, villageNowSummary, type NowRow } from '../../../sim/villageNow';
import type { SimulationState } from '../../types';
import './host.css';

/** Tangenten som fäller ut och ihop panelen (fri i StrategicApp, LevelBar och ServiceTabs). */
export const VILLAGE_NOW_KEY = 'b';

// Utfällt eller ihopfällt, utan speltillstånd (som fokusläget, focusState.ts).
let open = false;
const subs = new Set<() => void>();
export const villageNowOpen = () => open;
export function setVillageNowOpen(next: boolean): void {
  if (next === open) return;
  open = next;
  subs.forEach((f) => f());
}
export const toggleVillageNow = () => setVillageNowOpen(!open);
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useVillageNowOpen = () => useSyncExternalStore(subscribe, villageNowOpen, villageNowOpen);

/** B fäller ut och ihop (inte i ett inmatningsfält). */
export function useVillageNowKey(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key.toLowerCase() === VILLAGE_NOW_KEY) toggleVillageNow();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Byns rader nu, med placeringen och pilen (historiken per spelminut under kvällen). */
export function useVillageNow(sim: SimulationState): { live: VenueLive[]; now: NowRow[] } {
  const live = villageLive(sim);
  const minute = Math.floor(clockMinutes(sim));
  const hist = useRef<{ day: number; byMinute: Map<number, VenueLive[]> }>({ day: -1, byMinute: new Map() });
  if (hist.current.day !== sim.day.dayNumber) hist.current = { day: sim.day.dayNumber, byMinute: new Map() };
  if (!hist.current.byMinute.has(minute)) hist.current.byMinute.set(minute, live);
  return { live, now: villageNow(live, (ago) => hist.current.byMinute.get(minute - ago) ?? null) };
}

export function TrendArrow({ trend }: { trend: NowRow['trend'] }) {
  const v = strings.villageNow;
  if (trend === null) return null;
  const Icon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : ArrowRight;
  return (
    <span className="nx-village-now-trend" data-trend={trend} aria-label={trend === 'up' ? v.up : trend === 'down' ? v.down : undefined}>
      <Icon size={14} aria-hidden />
    </span>
  );
}

export function villageNowLine(now: NowRow[]): string {
  const v = strings.villageNow;
  const name = (id: string) => strings.village.venues[id] ?? id;
  const sum = villageNowSummary(now);
  switch (sum.kind) {
    case 'none': return v.quiet;
    case 'noContent': return sum.mostGuests ? v.noContentMostGuests : v.noContent;
    case 'lead': return v.youLead(sum.second ? name(sum.second) : null);
    case 'mostGuests': return v.mostGuests(name(sum.leader));
    case 'behind': return `${v.leads(name(sum.leader))} ${v.youAre(sum.place)}`;
  }
}

export function VillageNowPanel({ now }: { now: NowRow[] }) {
  const v = strings.villageNow;
  const name = (id: string) => strings.village.venues[id] ?? id;
  // ORDER 315 — konkurrentens nivå (balance.ts VILLAGE.rivals level).
  const level = (id: string) => { const l = VILLAGE.rivals.find((x) => x.id === id)?.level; return l ? strings.shopTabs.tier[l] : null; };
  return (
    <section className="nx-village-now" id="village-now" aria-label={v.title} data-testid="village-now">
      <table className="nx-village-now-table">
        <thead>
          <tr><th scope="col">{v.venue}</th><th scope="col">{v.colGuests}</th><th scope="col">{v.colContent}</th><th aria-hidden /></tr>
        </thead>
        <tbody>
          {now.map((r) => (
            <tr key={r.id} data-player={r.player} data-testid={`village-now-${r.id}`} data-guests={r.guests} data-content={r.content} data-place={r.place} data-trend={r.trend ?? ''}>
              <th scope="row" className="nx-village-now-name">{r.place}. {r.player ? `${name(r.id)} · ${v.you}` : level(r.id) ? `${name(r.id)} · ${level(r.id)}` : name(r.id)}</th>
              <td>{r.guests}</td>
              <td>{r.content}</td>
              <td><TrendArrow trend={r.trend} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="nx-small nx-village-now-line" data-testid="village-now-line">{villageNowLine(now)}</p>
    </section>
  );
}
