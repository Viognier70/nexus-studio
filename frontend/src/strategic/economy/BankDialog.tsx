// ORDER 265 (Nexus v1 etapp 3) — banken: diagnos i ord och byte av
// verksamhet.
//
// Speldesign > Lånet: "Bankens besked formuleras som en diagnos i ord,
// aldrig som siffror: vad spelaren visat att hon kan och vad som saknas
// för nästa klass." > Uppgradering: byte vid veckoavräkningen (söndagen),
// eller vilken morgon som helst utan verksamhet.
//
// ORDER 271 — formen efter Designs skärmar B0a, B0b (första mötet med
// banken, introduktionen) och B1 (samtal med banken), paket 1. Reglerna
// är oförändrade (sim/economy.ts classOptions, requirementsFor): i
// introduktionen gäller klassens startkrav (F33, brons i Stensöta räcker
// för den första vinbaren), annars klasstabellens krav.

import { strings } from '../../content/strings';
import { BUSINESS_CLASSES, MEDAL_LEVELS, type BusinessClassId, type MedalRequirement } from '../../sim/balance';
import { ALL_PAVILIONS, canChangeClassToday, classOptions, classSpec, meetsRequirement, requirementsFor, type ClassOption } from '../../sim/economy';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import type { PavilionKey, SimulationState } from '../types';
import { calendarFor } from '../../sim/calendar';
import { NxButton } from '../ui/system/components';
import { CLASS_ICON, NxIcon, PAVILION_ICON } from '../ui/screens/icons';
import { MedalDisc } from '../ui/screens/MedalDisc';
import '../ui/screens/screens.css';
import { numberLocale } from '../../content/language';

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
    case 'bankWait': return e.bankWait;
    case 'notBuilt': return e.notBuilt;
    case 'notFirst': return e.notFirst;
    case 'available': return '';
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const sb = strings.screens.bank;

// Paviljongerna i den ordning banken går igenom dem.
const SEEN_ORDER: readonly PavilionKey[] = ['maltidbiblioteket', 'stensota', 'metodkoket', 'kalastorget', 'gastronomiskateatern'];

function Say({ who, children, you }: { who: string; children: React.ReactNode; you?: boolean }) {
  return (
    <div className="nxs-say" data-you={you ? 'true' : undefined}>
      <div className="nx-label">{who}</div>
      <p className="nx-body">{children}</p>
    </div>
  );
}

// "Det banken ser": medaljerna paviljong för paviljong.
function MedalsSeen({ held: medals, onlyHeld }: { held: SimulationState["medals"]; onlyHeld?: boolean }) {
  const k = strings.knowledge;
  const rows = SEEN_ORDER.filter((p) => !onlyHeld || medals[p]);
  return (
    <div className="nxs-mt-24" data-testid="bank-seen">
      <div className="nx-label" style={{ paddingBottom: 'calc(12 * var(--nx-u))', borderBottom: '1px solid var(--nx-rule)' }}>{sb.seen}</div>
      {rows.length === 0 && <p className="nx-body nx-muted nxs-mt-16">{e.shownNothing}</p>}
      {rows.map((p) => {
        const level = medals[p];
        return (
          <div key={p} className="nxs-medal-row" data-testid={`bank-seen-${p}`}>
            <NxIcon name={PAVILION_ICON[p]} size={30} />
            <span className="nxs-row-title">{k.pavilions[p]}</span>
            <span className="nxs-level">{level ? k.medals[level] : sb.none}</span>
            <MedalDisc level={level} size={36} />
          </div>
        );
      })}
    </div>
  );
}

function ClassTitle({ id }: { id: BusinessClassId }) {
  return (
    <div className="nxs-card-title">
      <NxIcon name={CLASS_ICON[id]} size={40} />
      <span>{e.classes[id]}</span>
    </div>
  );
}

function classBlurb(id: BusinessClassId): string {
  const seats = classSpec(id).seats;
  return `${seats === null ? sb.queue : sb.seats(seats)} ${sb.traits[id]}`;
}

function Header({ label, heading }: { label: string; heading: string }) {
  return (
    <header className="nxs-head">
      <div>
        <div className="nx-label nx-accent-text">{label}</div>
        <h1 className="nx-heading">{heading}</h1>
      </div>
      <NxIcon name="bank" size={56} />
    </header>
  );
}

export function BankDialog({ open, onClose }: Props) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  if (!open) return null;
  const current = sim.economy.businessClass;
  const canChange = canChangeClassToday(sim);
  const options = classOptions(sim);
  const anyMedal = ALL_PAVILIONS.some((p) => sim.medals[p]);
  const cal = calendarFor(sim.day.dayNumber);
  const weekday = strings.calendar.weekdays[cal.weekday];
  const choose = (id: BusinessClassId) => {
    dispatch({ type: 'CHOOSE_CLASS', to: id });
    onClose();
  };
  const diagnosis = (
    <div className="nxs-diag" data-testid="bank-diagnosis-box">
      <div className="nx-label">{sb.diagnosis}</div>
      <p data-testid="bank-diagnosis">
        {current ? e.bankCurrent(e.classesDefinite[current]) : e.bankNone}{' '}
        {shownInWords(sim.medals)}{' '}
        {!anyMedal && !current ? e.bankNoLoan : ''}
      </p>
    </div>
  );

  // B0a / B0b — första mötet med banken (introduktionen, F33): den största
  // klassen banken lånar ut till nu är erbjudandet; andra möjliga står
  // som alternativ.
  if (sim.introduction && current === null) {
    const available = BUSINESS_CLASSES.list
      .filter((c) => options.find((o) => o.id === c.id)?.status === 'available')
      .sort((a, b) => b.sizeRank - a.sizeRank || a.buildOrder - b.buildOrder)
      .map((c) => c.id);
    const offered = available[0] ?? null;
    const others = available.slice(1);
    const vinbarMissing = offered !== 'vinbar' ? missingInWords('vinbar', sim.medals, requirementsFor(sim, 'vinbar')) : null;
    const screenId = offered === 'vinbar' ? 'B0b' : 'B0a';
    const verdict = offered ? sb.firstVerdict[offered] : e.bankNoLoan;
    return (
      <div className="nx nx-screen nxs-over" role="dialog" aria-modal="true" aria-label={e.bankHeading} data-testid="bank-dialog">
        <div data-testid={`screen-${screenId}`}>
          <Header label={sb.firstLabel(weekday)} heading={sb.firstHeading} />
        </div>
        <div className="nxs-bank-grid">
          <div>
            {/* ORDER 289 — repliken efter vad spelaren faktiskt har gjort. */}
            <Say who={sb.speaker}>{(sim.examsTaken ?? 0) === 0 ? sb.firstOpeningNoExam : Object.keys(sim.medals).length > 0 ? sb.firstOpening : sb.firstOpeningNoMedal}</Say>
            <MedalsSeen held={sim.medals} onlyHeld />
            <div className="nxs-mt-16">
              <Say who={sb.speaker}>{verdict}</Say>
            </div>
          </div>
          <div>
            {diagnosis}
            {offered && (
              <div className="nxs-offer" data-testid={`class-${offered}`}>
                <div className="nxs-row-between">
                  <ClassTitle id={offered} />
                  <span className="nx-label nx-accent-text">{sb.startLoan}</span>
                </div>
                <p className="nx-body nxs-mt-16">{classBlurb(offered)}</p>
              </div>
            )}
            <p className="nx-small nx-muted nxs-mt-16" data-testid="bank-first-note">
              {offered === 'vinbar' ? sb.firstNoteVinbar : vinbarMissing ? `${vinbarMissing} ${sb.firstNoteLater}` : null}
            </p>
          </div>
        </div>
        <footer className="nxs-foot">
          <NxButton kind="quiet" testId="close-bank" onClick={onClose}>{strings.knowledge.close}</NxButton>
          <div className="nxs-foot-buttons">
            {others.map((id) => (
              <div key={id} className="nxs-btn-secondary-w" data-testid={`class-${id}`}>
                <NxButton kind="secondary" testId={`choose-${id}`} onClick={() => choose(id)} arrow={false}>
                  {strings.introduction.chooseFirst(strings.introduction.classesIndefinite[id])}
                </NxButton>
              </div>
            ))}
            {offered && canChange && (
              <div className="nxs-btn-primary-w">
                <NxButton testId={`choose-${offered}`} onClick={() => choose(offered)} autoFocus>
                  {strings.introduction.chooseFirst(strings.introduction.classesIndefinite[offered])}
                </NxButton>
              </div>
            )}
          </div>
        </footer>
      </div>
    );
  }

  // B1 — samtal med banken: diagnos i ord, det som går att byta till och
  // det som saknas.
  const others = BUSINESS_CLASSES.list.filter((c) => c.id !== current);
  const availableIds = others.filter((c) => options.find((o) => o.id === c.id)?.status === 'available').map((c) => c.id);
  const missing = others.filter((c) => options.find((o) => o.id === c.id)?.status !== 'available');
  const label = !cal.isServiceDay
    ? `${weekday} · ${e.settlement.heading} · ${e.bankHeading}`
    : `${weekday} · ${e.bankHeading}`;
  return (
    <div className="nx nx-screen nxs-over" role="dialog" aria-modal="true" aria-label={e.bankHeading} data-testid="bank-dialog">
      <div data-testid="screen-B1">
        <Header label={label} heading={sb.heading} />
      </div>
      <div className="nxs-bank-grid">
        <div>
          <Say who={sb.speaker}>
            {current ? e.bankCurrent(e.classesDefinite[current]) : e.bankNone} {shownInWords(sim.medals)}
          </Say>
          {!canChange && <Say who={sb.speaker}>{e.onlySunday}</Say>}
          <MedalsSeen held={sim.medals} />
        </div>
        <div>
          {diagnosis}
          {current && (
            <div className="nxs-card" data-kind="current" data-testid={`class-${current}`}>
              <div className="nx-label nx-muted">{e.current}</div>
              <ClassTitle id={current} />
            </div>
          )}
          {availableIds.map((id) => (
            <div key={id} className="nxs-card" data-testid={`class-${id}`}>
              <div className="nx-label nx-accent-text">{sb.canChange}</div>
              <ClassTitle id={id} />
              <p className="nx-small nxs-mt-8">{classBlurb(id)}</p>
              {canChange && (
                <div className="nxs-mt-16 nxs-btn-secondary-w">
                  <NxButton kind="secondary" testId={`choose-${id}`} onClick={() => choose(id)} arrow={false}>
                    {e.choose(e.classes[id])}
                  </NxButton>
                </div>
              )}
            </div>
          ))}
          {missing.map((c) => {
            const o = options.find((x) => x.id === c.id)!;
            return (
              <div key={c.id} className="nxs-card" data-kind="missing" data-testid={`class-${c.id}`}>
                <div className="nx-label nx-muted">{sb.missing}</div>
                <div className="nxs-card-title" style={{ fontSize: 'calc(32 * var(--nx-u))' }}>
                  <NxIcon name="lock" size={32} />
                  <span>{e.classes[c.id]}</span>
                </div>
                <p className="nx-small nxs-mt-8">{optionLine(o, sim)}</p>
              </div>
            );
          })}
        </div>
      </div>
      <footer className="nxs-foot">
        <span />
        <div className="nxs-foot-buttons">
          <div className="nxs-btn-primary-w">
            <NxButton testId="close-bank" onClick={onClose}>
              {current ? sb.stay(e.classesDefinite[current]) : strings.knowledge.close}
            </NxButton>
          </div>
        </div>
      </footer>
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
  // ORDER 280 — hyran och veckans löner står i avräkningen och i tidningen.
  const sek = (v: number) => strings.service.meters.sek(Math.round(v).toLocaleString(numberLocale()));
  if ((s.rentSek ?? 0) > 0) lines.push(e.settlement.rent(sek(s.rentSek!)));
  if ((s.wagesSek ?? 0) > 0) lines.push(e.settlement.wages(sek(s.wagesSek!)));
  if ((s.coursesSek ?? 0) > 0) lines.push(e.settlement.courses(sek(s.coursesSek!)));
  if (s.downgradedFrom) {
    lines.push(
      s.downgradedTo
        ? e.settlement.downgraded(e.classesDefinite[s.downgradedFrom], e.classesDefinite[s.downgradedTo])
        : e.settlement.downgradedToNothing(e.classesDefinite[s.downgradedFrom])
    );
  }
  return lines;
}
