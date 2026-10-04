// ORDER 290 — serviceläget (Designs leverans serviceläget 2026-09-30 §3):
// panelerna ligger hopfällda som tre runda flikar nere till vänster med 82 %
// opacitet: Lagret (package), Kvällen (scroll-text) och Rummet (users). En
// prick i ljuslåga betyder att något nytt har hänt där; den släcks när
// panelen öppnas. Öppna med fliken eller tangenterna 1–3; stäng med krysset,
// Esc, samma flik igen, ett klick i rummet, eller av sig själv när en raket
// börjar. Bara en panel är öppen åt gången.
//
// Tangenterna 1–3 fångas under servicen innan kamerans förval (1–4) får dem.

import { useEffect, useRef } from 'react';
import { Package, ScrollText, Users, X } from 'lucide-react';
import { t as tt } from '../../../content/nexusStrings';
import { useLanguage } from '../../../content/language';
import { useSimState } from '../../simulation/SimulationProvider';
import { PlatesRemainingPanel } from '../../business/PlatesRemainingPanel';
import { PrepPanel } from '../../business/PrepPanel';
import { ServiceMeters } from '../../scenario/IncidentPanel';
import { EventsPanel } from './EventsPanel';
import { openServicePanel, SERVICE_PANELS, toggleServicePanel, useServiceDrawer, type ServicePanel } from './serviceDrawer';

const ICON = { stock: Package, stream: ScrollText, room: Users } as const;
const LABEL_KEY = { stock: 'serviceMode.tab.stock', stream: 'serviceMode.tab.stream', room: 'serviceMode.tab.room' } as const;

export function ServiceTabs() {
  const sim = useSimState();
  const lang = useLanguage();
  const drawer = useServiceDrawer();
  const inService = sim.day.period === 'lunch' || sim.day.period === 'dinner';
  const rocket = !!sim.incidents?.active;

  // Det som är nytt sedan panelen senast öppnades.
  const stockSig = Object.entries(sim.day.stockWarned ?? {}).map(([k, v]) => `${k}:${v}`).sort().join(',');
  const streamSig = String(sim.eventStream.filter((e) => e.at >= sim.day.periodStartAt).length);
  const roomSig = sim.incidents?.lastOutcome ? `${sim.incidents.lastOutcome.incidentId}:${sim.incidents.lastOutcome.at}` : '';
  const sigs: Record<ServicePanel, string> = { stock: stockSig, stream: streamSig, room: roomSig };
  const seen = useRef<Record<ServicePanel, string>>({ stock: stockSig, stream: streamSig, room: roomSig });
  if (drawer.panel) seen.current[drawer.panel] = sigs[drawer.panel];

  // En raket fäller ihop allt.
  useEffect(() => { if (rocket) openServicePanel(null); }, [rocket]);
  useEffect(() => { if (!inService) openServicePanel(null); }, [inService]);

  useEffect(() => {
    if (!inService) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (sim.incidents?.active) return;
      const i = ['1', '2', '3'].indexOf(e.key);
      if (i >= 0) { toggleServicePanel(SERVICE_PANELS[i]); e.stopPropagation(); e.preventDefault(); }
      else if (e.key === 'Escape' && drawer.panel) { openServicePanel(null); e.stopPropagation(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [inService, drawer.panel, sim.incidents?.active]);

  // Ett klick i rummet stänger panelen.
  useEffect(() => {
    if (!drawer.panel) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && el.tagName === 'CANVAS') openServicePanel(null);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [drawer.panel]);

  if (!inService) return null;
  const open = drawer.panel;
  return (
    <>
      {open && !rocket && (
        <div className="nx nx-tab-dock" data-testid={`service-panel-${open}`}>
          <div className="nx-tab-dock-head">
            <span className="nx-heading" style={{ margin: 0 }}>{tt(lang, LABEL_KEY[open])}</span>
            <button type="button" className="nx-tab-close" data-testid="service-panel-close" aria-label={tt(lang, 'serviceMode.close')} onClick={() => openServicePanel(null)}><X size={18} aria-hidden /></button>
          </div>
          <div className="nx-tab-dock-body">
            {open === 'stock' && <><PrepPanel /><PlatesRemainingPanel /></>}
            {open === 'stream' && <EventsPanel mode="feed" />}
            {open === 'room' && <ServiceMeters />}
          </div>
        </div>
      )}
      <div className="nx nx-tabs" role="tablist" data-testid="service-tabs">
        {SERVICE_PANELS.map((p) => {
          const Icon = ICON[p];
          const active = open === p;
          const fresh = !active && sigs[p] !== seen.current[p];
          return (
            <button key={p} type="button" role="tab" aria-selected={active} className="nx-tab" data-active={active} data-testid={`service-tab-${p}`}
              aria-label={tt(lang, LABEL_KEY[p])} title={tt(lang, LABEL_KEY[p])} onClick={() => toggleServicePanel(p)}>
              <Icon size={20} aria-hidden />
              {/* ORDER 300 §6 — etiketten syns när panelen är öppen och när muspekaren ligger över ikonen. */}
              <span className="nx-tab-label" data-active={active}>{tt(lang, LABEL_KEY[p])}</span>
              {fresh && <span className="nx-tab-dot" data-testid={`service-tab-dot-${p}`} aria-hidden />}
            </button>
          );
        })}
        <span className="nx-small nx-tabs-keys">{tt(lang, 'serviceMode.keys')}</span>
      </div>
    </>
  );
}
