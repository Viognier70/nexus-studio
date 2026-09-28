// ORDER 270 — händelserna i servicen (Vision Owner 2026-09-26).
// ORDER 271 — Designs paket 6 (servicen som raketer), skärmarna R1–R3 och
// mätarna (LEVERANSNOT §2–§4).
//
// IncidentCard: kvällens händelse som en raket i tre steg: episteme (vad),
// techne (hur), phronesis (när och varför). Kortet är 632 px brett i
// högerkanten. Överst står vem det gäller och var, berättelsen står kvar
// genom alla tre steg och bara frågan och svaren byts. Stegrutorna visar
// hur långt man kommit: klarat ifyllt med bläck, pågående med accent,
// kommande med kontur, fel streckat, ej nått grått. Nedräkningen är stegets
// egen tid som en siffra (96 px) och en stapel (12 px), i bläck och i
// accent de sista fem sekunderna, med ett tick per sekund. Inget blinkar.
// Svaren väljs med tangenterna 1–4 eller musen.
//
// Svaret i stunden (R2/R3): rätt → det valda fylls med bläck ✓, övriga
// tonas till 40 %, bandet "Rätt · vidare till …" medan motorn visar svaret
// (`active.revealed`, `revealLeft`) innan nästa steg öppnas på full tid.
// Fel eller tiden ute → det valda streckas och det rätta fylls, bandet
// "Fel · <Rollen> tar över" (`lastOutcome.reveal`, `lastOutcome.takeover`).
// Raketen är då slut i motorn; kortet står kvar INCIDENTS.revealSeconds i
// verklig tid och stängs sedan (timern hålls här i komponenten).
//
// ServiceMeters: kassa, gästerna och personalen, tio steg var utan tal
// (`NxSteps`). Direkt efter ett svar växer panelen från 18 till 28 px:
// vunna steg i accent, förlorade streckade, med en mening om vad det
// kostade. Efter 3,2 s blir den vanlig igen. Mätarna läser samma källor
// som simuleringen (sim/incidents.ts `serviceMeters`; stegen räknas i
// ui/service/serviceView.ts).

import { useEffect, useRef, useState } from 'react';
import { strings } from '../../content/strings';
import { INCIDENTS } from '../../sim/balance';
import { incidentById, type Incident, type IncidentStep } from '../../sim/incidentBank';
import {
  formatIncidentText,
  secondsFor,
  serviceMeters,
  type IncidentOutcomeView,
  type IncidentRecord
} from '../../sim/incidents';
import { medalSteps } from '../../sim/knowledgeInService';
import type { SimulationState } from '../types';
import { NxSteps } from '../ui/system/components';
import { COUNTDOWN_ACCENT_SECONDS, METER_EMPHASIS_MS, deltaSteps, meterSteps, rocketCounter } from '../ui/service/serviceView';
import '../ui/service/service.css';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const capitalise = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);

// Den i personalen som tar över i steget, i bestämd form ("värden").
// Samma tabell som motorns takeoverFor (balance.ts INCIDENTS.takeoverRole):
// kunskapen och hantverket följer spåret, omdömet hör till värden.
function takeoverWord(incident: Incident, step: IncidentStep, role?: string | null): string {
  const s = strings.service.incident;
  const key = step.axis === 'phronesis' ? 'phronesis' : incident.track;
  const r = role ?? INCIDENTS.takeoverRole[key] ?? 'servitör';
  return s.staffRoles[r] ?? s.staffFallback;
}

// Raketen är slut i motorn (fel, tiden ute eller hela raketen klarad):
// kortet står kvar i verklig tid och visar svaret i stunden.
interface Held { outcome: IncidentOutcomeView; record: IncidentRecord }

function outcomeKey(o: IncidentOutcomeView | null | undefined): string | null {
  return o ? `${o.incidentId}@${o.at}` : null;
}

function useHeldOutcome(sim: SimulationState): Held | null {
  const last = sim.incidents?.lastOutcome ?? null;
  const key = outcomeKey(last);
  // Ett utfall som redan fanns när kortet monterades (en laddad sparfil)
  // visas inte igen.
  const seen = useRef<string | null>(key);
  const [held, setHeld] = useState<Held | null>(null);
  useEffect(() => {
    if (!last || key === seen.current) return;
    seen.current = key;
    const log = sim.incidents?.log ?? [];
    const record = log[log.length - 1];
    if (!record || record.id !== last.incidentId) return;
    setHeld({ outcome: last, record });
    const t = window.setTimeout(() => setHeld(null), INCIDENTS.revealSeconds * 1000);
    return () => window.clearTimeout(t);
    // `key` bär utfallets identitet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return held;
}

type Mode = 'ask' | 'right' | 'done' | 'wrong';
type StepBox = 'cleared' | 'current' | 'next' | 'ahead' | 'failed' | 'unreached';
type OptionLook = 'open' | 'struck' | 'chosen' | 'dim' | 'correct' | 'wrong';

export function IncidentCard() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const held = useHeldOutcome(sim);
  const frozen = useRef<{ key: string; left: number; total: number } | null>(null);
  const active = sim.incidents?.active ?? null;
  const cls = sim.economy.businessClass;

  // Vad kortet visar just nu.
  let view: {
    incident: Incident;
    context: IncidentRecord['context'];
    situation: string | null;
    mode: Mode;
    shown: number;
    chosen: string | null;
    correct: string | null;
    struck: string[];
    role: string | null;
    outcomeText: string | null;
    // ORDER 276 — gäster som svaret släppte in.
    guestsIn: number;
  } | null = null;
  if (active && cls) {
    const incident = incidentById(cls, active.id);
    const revealing = !!active.revealed && (active.revealLeft ?? 0) > 0;
    if (incident) {
      view = {
        incident,
        context: active.context,
        situation: active.situation,
        mode: revealing ? 'right' : 'ask',
        shown: revealing ? active.revealed!.step : active.step ?? 0,
        chosen: revealing ? active.revealed!.optionId : null,
        correct: revealing ? active.revealed!.correctId : null,
        struck: revealing ? [] : active.struck,
        role: null,
        outcomeText: null,
        guestsIn: revealing ? active.revealed!.guestsIn ?? 0 : 0
      };
    }
  } else if (held && cls) {
    const incident = incidentById(cls, held.record.id);
    const r = held.outcome.reveal;
    if (incident) {
      const cleared = r ? r.cleared : held.record.step === null;
      view = {
        incident,
        context: held.record.context,
        situation: held.record.situation,
        mode: cleared ? 'done' : 'wrong',
        shown: r?.step ?? held.record.step ?? incident.steps.length - 1,
        chosen: r ? r.optionId : held.record.optionId,
        correct: r?.correctId ?? null,
        struck: [],
        role: held.outcome.takeover?.role ?? null,
        outcomeText: held.outcome.text,
        guestsIn: r?.guestsIn ?? 0
      };
    }
  }

  const mode = view?.mode ?? null;
  const step = view ? view.incident.steps[view.shown] : undefined;

  // Tangenterna 1–4 väljer medan steget frågar. Lyssnaren ligger i
  // capture-fasen så att siffran inte också flyttar kameran.
  useEffect(() => {
    if (mode !== 'ask' || !step) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const i = ['1', '2', '3', '4'].indexOf(e.key);
      if (i < 0) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const o = step.options[i];
      if (o && !(active?.struck ?? []).includes(o.id)) dispatch({ type: 'ANSWER_INCIDENT', optionId: o.id });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [mode, step, active?.struck, dispatch]);

  if (!view || !step) return null;
  const { incident } = view;
  const s = strings.service.incident;
  const t = strings.rocket.card;
  const f = (x: string) => formatIncidentText(x, view!.context);
  const rocketKey = `${incident.id}:${view.shown}`;

  // Nedräkningen: stegets egen tid. Efter ett svar står den still i grått
  // på det värde den hade.
  let left: number;
  let total: number;
  if (view.mode === 'ask' && active) {
    left = Math.max(0, Math.ceil(active.secondsLeft));
    total = active.secondsTotal;
    frozen.current = { key: rocketKey, left, total };
  } else if (frozen.current && frozen.current.key === rocketKey) {
    ({ left, total } = frozen.current);
  } else {
    left = 0;
    total = secondsFor(sim, step);
  }
  const isFrozen = view.mode !== 'ask';
  const lastFive = !isFrozen && left <= COUNTDOWN_ACCENT_SECONDS;
  const barShare = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;

  const { n, total: rockets } = rocketCounter(sim);
  const where = incident.needsTable ? t.table(String(view.context.table)) : t.room;
  const extra = view.mode === 'ask' && medalSteps(sim.medals, step.pavilion) > 0 && total > INCIDENTS.stepSeconds[step.axis];
  const pavilionName = strings.knowledge.pavilions[step.pavilion];

  const boxFor = (i: number): StepBox => {
    switch (view!.mode) {
      case 'ask': return i < view!.shown ? 'cleared' : i === view!.shown ? 'current' : 'ahead';
      case 'right': return i <= view!.shown ? 'cleared' : i === view!.shown + 1 ? 'next' : 'ahead';
      case 'done': return 'cleared';
      case 'wrong': return i < view!.shown ? 'cleared' : i === view!.shown ? 'failed' : 'unreached';
    }
  };
  const boxText = (st: IncidentStep, state: StepBox): string => {
    const ask = t.stepAsks[st.axis];
    const sec = String(secondsFor(sim, st));
    switch (state) {
      case 'cleared': return t.stepCleared(ask);
      case 'current': return t.stepCurrent(ask, String(Math.round(total)));
      case 'next': return t.stepNext(sec);
      case 'ahead': return t.stepAhead(ask, sec);
      case 'failed': return t.stepFailed(ask);
      case 'unreached': return t.stepUnreached;
    }
  };
  const lookFor = (id: string): OptionLook => {
    switch (view!.mode) {
      case 'ask': return view!.struck.includes(id) ? 'struck' : 'open';
      case 'right':
      case 'done': return id === view!.chosen ? 'chosen' : 'dim';
      case 'wrong': return id === view!.correct ? 'correct' : id === view!.chosen ? 'wrong' : 'dim';
    }
  };

  // Bandet: svaret i stunden.
  let band: { kind: 'right' | 'wrong'; label: string; text: string } | null = null;
  if (view.mode === 'right') {
    const next = incident.steps[view.shown + 1];
    const chosenText = view.chosen ? step.text.options[view.chosen] : null;
    const explanation = chosenText ? (view.situation && chosenText.explanationIn?.[view.situation]) || chosenText.explanation : '';
    band = { kind: 'right', label: t.right(next ? s.stepName[next.axis] : ''), text: `${view.guestsIn > 0 ? `${t.guestsIn(view.guestsIn)} ` : ''}${f(explanation)}` };
  } else if (view.mode === 'done') {
    band = { kind: 'right', label: t.rightDone, text: `${view.guestsIn > 0 ? `${t.guestsIn(view.guestsIn)} ` : ''}${view.outcomeText ?? ''}` };
  } else if (view.mode === 'wrong') {
    // Designs band (2026-09-28): "Wrong · the {role} takes over" /
    // "Out of time · the {role} takes over"; rollen med sin artikel.
    const role = takeoverWord(incident, step, view.role);
    band = { kind: 'wrong', label: view.chosen === null ? t.outOfTime(role) : t.wrong(role), text: view.outcomeText ?? '' };
  }

  return (
    <section
      className="nx nx-rocket"
      data-testid="incident-card"
      data-incident-id={incident.id}
      data-step={view.mode === 'done' || view.mode === 'wrong' ? 'closed' : view.shown}
      data-step-axis={step.axis}
      data-mode={view.mode}
      aria-label={f(incident.text.title)}
    >
      <div className="nx-rocket-head">
        <div className="nx-label">{view.context.staff} · {where}</div>
        <div className="nx-rocket-count">{t.rocketOf(String(Math.max(1, n)), String(Math.max(1, rockets, n)))}</div>
      </div>
      {sim.incidents?.active?.bet && (
        <p className="nx-label nx-accent-text" data-testid="incident-bet" data-stake={sim.incidents.active.bet.stake} style={{ marginTop: 'calc(8 * var(--nx-u))' }}>
          {strings.bet.own(sim.incidents.active.bet.stake)}
        </p>
      )}
      <p className="nx-rocket-story">{f(incident.text.body)}</p>
      {view.situation && incident.text.situations?.[view.situation] && (
        <p className="nx-rocket-situation" data-testid="incident-situation" data-situation={view.situation}>
          {f(incident.text.situations[view.situation])}
        </p>
      )}

      <ol className="nx-rocket-steps" data-testid="incident-steps" aria-label={s.stepOf(String(view.shown + 1), String(incident.steps.length))}>
        {incident.steps.map((st, i) => {
          const state = boxFor(i);
          return (
            <li
              key={st.axis}
              className="nx-rocket-step"
              data-testid={`incident-step-${st.axis}`}
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <div className="nx-rocket-step-name">{s.stepName[st.axis]}</div>
              <div className="nx-rocket-step-sub">{boxText(st, state)}</div>
            </li>
          );
        })}
      </ol>

      <div className="nx-rocket-ask">
        <h2 className="nx-rocket-question" data-testid="incident-question">{f(step.text.question)}</h2>
        <div
          className="nx-rocket-count-num"
          role="timer"
          aria-label={t.secondsLeft(String(left))}
          data-testid="incident-countdown"
          data-last={lastFive}
          data-frozen={isFrozen}
        >
          {left}
        </div>
      </div>
      <div className="nx-rocket-bar" aria-hidden data-last={lastFive} data-frozen={isFrozen}>
        <div style={{ width: `${barShare * 100}%` }} />
      </div>

      <div role="group" aria-label={f(step.text.question)}>
        {step.options.map((o, i) => {
          const look = lookFor(o.id);
          const struck = look === 'struck';
          return (
            <button
              key={o.id}
              type="button"
              className="nx-rocket-option"
              data-testid={`incident-option-${o.id}`}
              data-option-id={o.id}
              data-struck={view!.mode === 'ask' && struck}
              data-look={look}
              disabled={view!.mode !== 'ask' || struck}
              title={struck ? s.struck : undefined}
              aria-keyshortcuts={String(i + 1)}
              onClick={() => dispatch({ type: 'ANSWER_INCIDENT', optionId: o.id })}
            >
              <span className="nx-rocket-key" aria-hidden>{i + 1}</span>
              <span>{f(step.text.options[o.id].label)}</span>
              <span className="nx-rocket-tag">
                {look === 'chosen' ? '✓' : look === 'correct' ? t.correctTag : look === 'wrong' ? t.yourTag : ''}
              </span>
            </button>
          );
        })}
      </div>

      {band ? (
        <div className="nx-rocket-band" data-kind={band.kind} data-testid="incident-band" aria-live="polite">
          <div className="nx-label">{band.label}</div>
          <p className="nx-rocket-band-text">{band.text}</p>
        </div>
      ) : (
        <div className="nx-rocket-foot">
          <span>{extra ? `${s.medalTime(pavilionName)}. ` : ''}{t.footer}</span>
          <strong className="nx-rocket-keys">{t.keys}</strong>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------
// Mätarna
// ---------------------------------------------------------------------

export function ServiceMeters() {
  const sim = useSimState();
  const last = sim.incidents?.lastOutcome ?? null;
  const key = outcomeKey(last);
  const seen = useRef<string | null>(key);
  const [emph, setEmph] = useState<IncidentOutcomeView | null>(null);
  useEffect(() => {
    if (!last || key === seen.current) return;
    seen.current = key;
    setEmph(last);
    const t = window.setTimeout(() => setEmph(null), METER_EMPHASIS_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!sim.incidents?.enabled || sim.day.period !== 'dinner') return null;
  const m = serviceMeters(sim);
  const steps = meterSteps(sim);
  const d = emph ? deltaSteps(sim, emph.deltas) : null;
  const t = strings.rocket.meters;
  const rows = [
    { id: 'cash', label: t.cash, value: steps.cash, delta: d?.cash ?? 0, data: String(Math.round(m.cashSek)) },
    { id: 'satisfaction', label: t.guests, value: steps.satisfaction, delta: d?.satisfaction ?? 0, data: m.satisfaction === null ? '' : m.satisfaction.toFixed(2) },
    { id: 'stamina', label: t.staff, value: steps.stamina, delta: d?.stamina ?? 0, data: m.stamina.toFixed(2) }
  ];
  let sentence: string = t.note;
  if (d) {
    const parts = rows
      .filter((r) => r.delta !== 0)
      .map((r, i) => t.delta(i === 0 ? r.label : r.label.toLowerCase(), r.delta > 0 ? '+' : '−', String(Math.abs(r.delta))));
    const takeover = emph?.takeover ? ` ${capitalise(strings.rocket.card.takeover(strings.service.incident.staffRoles[emph.takeover.role] ?? strings.service.incident.staffFallback))}.` : '';
    sentence = parts.length > 0 ? `${t.sentence(parts.join(', '))}${takeover}` : `${t.nothing}${takeover}`;
  }
  return (
    <div className="nx nx-meters" data-testid="service-meters" data-emph={!!d} aria-label={t.note} role="group">
      {rows.map((r) => (
        <div key={r.id} className="nx-meter-row" data-testid={`meter-${r.id}`} data-value={r.data} data-steps={r.value}>
          <div className="nx-label">{r.label}</div>
          <NxSteps
            value={r.value}
            accent={r.delta > 0 ? Math.min(r.value, r.delta) : undefined}
            lost={r.delta < 0 ? -r.delta : undefined}
            label={r.label}
          />
        </div>
      ))}
      <div className="nx-meters-note" aria-live="polite">{sentence}</div>
    </div>
  );
}
