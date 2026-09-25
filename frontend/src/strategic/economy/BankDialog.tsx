// ORDER 265 (Nexus v1 etapp 3) — banken: diagnos i ord och byte av
// verksamhet.
//
// Speldesign > Lånet: "Bankens besked formuleras som en diagnos i ord,
// aldrig som siffror: vad spelaren visat att hon kan och vad som saknas
// för nästa klass." > Uppgradering: byte vid veckoavräkningen (söndagen),
// eller vilken morgon som helst utan verksamhet.

import { strings } from '../../content/strings.sv';
import { BUSINESS_CLASSES, MEDAL_LEVELS, type BusinessClassId, type MedalRequirement } from '../../sim/balance';
import { ALL_PAVILIONS, canChangeClassToday, classOptions, classSpec, meetsRequirement, requirementsFor, type ClassOption } from '../../sim/economy';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import type { PavilionKey, SimulationState } from '../types';

const e = strings.economy;

function countWord(n: number): string {
  return e.counts[n] ?? String(n);
}

function joinWords(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${e.and} ${items[items.length - 1]}`;
}

function requirementInWords(req: MedalRequirement): string {
  const level = strings.knowledge.medals[req.level];
  const where = req.count === 1 && req.including.length === 1
    ? strings.knowledge.pavilions[req.including[0] as PavilionKey]
    : `${countWord(req.count)} ${req.count === 1 ? e.pavilionOne : e.pavilionMany}`;
  const including = req.including.length > 0 && !(req.count === 1 && req.including.length === 1)
    ? e.reqIncluding(joinWords(req.including.map((p) => strings.knowledge.pavilions[p as PavilionKey])))
    : '';
  return `${e.reqLevelIn(level, where)}${including}`;
}

export function shownInWords(medals: SimulationState['medals']): string {
  const held = ALL_PAVILIONS.filter((p) => medals[p]);
  if (held.length === 0) return e.shownNothing;
  const byLevel = [...held].sort((a, b) => MEDAL_LEVELS.indexOf(medals[b]!) - MEDAL_LEVELS.indexOf(medals[a]!));
  return e.shown(joinWords(byLevel.map((p) => e.topics[p])));
}

export function missingInWords(id: BusinessClassId, medals: SimulationState['medals'], requirements: readonly MedalRequirement[] = classSpec(id).requirements): string | null {
  const unmet = requirements.filter((r) => !meetsRequirement(r, medals));
  if (unmet.length === 0) return null;
  return e.missing(e.classesDefinite[id], joinWords(unmet.map(requirementInWords)));
}

function optionLine(o: ClassOption, sim: SimulationState): string {
  switch (o.status) {
    case 'current': return e.current;
    case 'requirements': return missingInWords(o.id, sim.medals, requirementsFor(sim, o.id)) ?? '';
    case 'cash': return e.cashShort(e.classesDefinite[o.id]);
    case 'upgradeOnly': return e.upgradeOnly;
    case 'available': return '';
  }
}

const BACKDROP: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 150
};
const PANEL: React.CSSProperties = {
  width: 'min(560px, 100%)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '16px 18px',
  background: 'rgba(30, 22, 16, 0.97)', color: '#f5f0e0', border: '1px solid #a8926a', borderRadius: 5,
  fontFamily: 'system-ui, sans-serif', fontSize: 14, lineHeight: 1.45, boxShadow: '0 8px 28px rgba(0,0,0,0.5)'
};
const ROW: React.CSSProperties = { border: '1px solid rgba(168,146,106,0.45)', borderRadius: 3, padding: '10px 12px', marginTop: 10 };
const BUTTON: React.CSSProperties = {
  padding: '8px 14px', minHeight: 40, background: '#3c2c1e', color: '#f5f0e0', border: '1px solid #a8926a',
  borderRadius: 3, font: 'inherit', fontSize: 13, cursor: 'pointer', marginTop: 8
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BankDialog({ open, onClose }: Props) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  if (!open) return null;
  const current = sim.economy.businessClass;
  const canChange = canChangeClassToday(sim);
  const options = classOptions(sim);
  const anyMedal = ALL_PAVILIONS.some((p) => sim.medals[p]);
  return (
    <div style={BACKDROP} role="dialog" aria-modal="true" aria-label={e.bankHeading}>
      <div style={PANEL} data-testid="bank-dialog">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{e.bankHeading}</strong>
          <button type="button" style={{ ...BUTTON, marginTop: 0 }} data-testid="close-bank" onClick={onClose}>
            {strings.knowledge.close}
          </button>
        </div>
        <p style={{ margin: '8px 0 0' }} data-testid="bank-diagnosis">
          {current ? e.bankCurrent(e.classesDefinite[current]) : e.bankNone}{' '}
          {shownInWords(sim.medals)}{' '}
          {!anyMedal && !current ? e.bankNoLoan : ''}
        </p>
        {!canChange && <p style={{ opacity: 0.75 }}>{e.onlySunday}</p>}
        {BUSINESS_CLASSES.list.map((c) => {
          const o = options.find((x) => x.id === c.id)!;
          return (
            <div key={c.id} style={ROW} data-testid={`class-${c.id}`}>
              <strong>{e.classes[c.id]}</strong>
              {o.status !== 'available' && <div style={{ opacity: 0.8 }}>{optionLine(o, sim)}</div>}
              {o.status === 'available' && canChange && (
                <div>
                  <button
                    type="button"
                    style={BUTTON}
                    data-testid={`choose-${c.id}`}
                    onClick={() => {
                      dispatch({ type: 'CHOOSE_CLASS', to: c.id });
                      onClose();
                    }}
                  >
                    {sim.introduction
                      ? strings.introduction.chooseFirst(strings.introduction.classesIndefinite[c.id])
                      : e.choose(e.classes[c.id])}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Söndagens avräkning i ord (tidningen kommer i etapp 5).
export function settlementInWords(sim: SimulationState): string[] {
  const s = sim.economy.lastSettlement;
  if (!s) return [];
  const lines: string[] = [];
  if (s.floorSek <= 0) lines.push(e.settlement.noFloor);
  else if (s.topUpSek > 0) lines.push(e.settlement.topUp);
  else lines.push(e.settlement.aboveFloor);
  if (s.amortisationSek > 0) lines.push(e.settlement.amortised);
  if (s.downgradedFrom) {
    lines.push(
      s.downgradedTo
        ? e.settlement.downgraded(e.classesDefinite[s.downgradedFrom], e.classesDefinite[s.downgradedTo])
        : e.settlement.downgradedToNothing(e.classesDefinite[s.downgradedFrom])
    );
  }
  return lines;
}
