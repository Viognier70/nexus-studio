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

import { Check, X } from 'lucide-react';
import { t as tt } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import { PyramidStrip } from '../ui/service/KnowledgePyramid';
import { consequenceLine } from '../ui/service/consequenceLine';
import { CONSEQUENCE } from '../scene/guestMood';
import { panelOpen, useServiceDrawer } from '../ui/service/serviceDrawer';
import { useEffect, useRef, useState } from 'react';
import { strings } from '../../content/strings';
import { ANSWER_EFFECTS, BACK, INCIDENTS, type Confidence } from '../../sim/balance';
import { incidentById, type Incident, type IncidentStep } from '../../sim/incidentBank';
import {
  calibrationNote,
  canBack,
  formatIncidentText,
  secondsFor,
  serviceMeters,
  type IncidentOutcomeView,
  type IncidentRecord
} from '../../sim/incidents';
import { medalSteps } from '../../sim/knowledgeInService';
import type { RoomReaction, SimulationState } from '../types';
import { formatSek } from '../ui/CashCounter';
import { numberWord } from '../simulation/eveningAccount';
import { NxSteps } from '../ui/system/components';
import { COUNTDOWN_ACCENT_SECONDS, METER_EMPHASIS_MS, deltaSteps, meterSteps, rocketCounter } from '../ui/service/serviceView';
import '../ui/service/service.css';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { shake, slam } from '../ui/juice/juice';
import { fallFrom, flyTo, targetElement } from '../ui/juice/fx';
import type { StringKey } from '../../content/nexusStrings';

const EVENT_ROLE_KEY: Record<string, StringKey> = {
  'vb32-fodelsedagen': 'event.bday.role', 'vb33-vasen': 'event.vase.role', 'vb34-vinglar': 'event.drunk.role',
  'vb35-tillsynen-a': 'event.inspection.role', 'vb35-tillsynen-b': 'event.inspection.role', 'vb35-tillsynen-c': 'event.inspection.role', 'vb35-tillsynen-d': 'event.inspection.role',
  'vb36-passet': 'event.kitchen.role'
};

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
    // ORDER 299 — kortet står kvar under konsekvensögonblicket (Designs D1 §6: 3,8 s).
    const t = window.setTimeout(() => setHeld(null), Math.max(INCIDENTS.revealSeconds, CONSEQUENCE.durationS) * 1000);
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
  const lang = useLanguage();
  const held = useHeldOutcome(sim);
  const frozen = useRef<{ key: string; left: number; total: number } | null>(null);
  const active = sim.incidents?.active ?? null;
  const cls = sim.economy.businessClass;
  // ORDER 280 — Back your knowledge (Designs B1): i en egen raket väljer
  // spelaren svar och säkerhet, och står sedan för svaret.
  const backed = !!active?.backed;
  // ORDER 284 — svaret låses i simuleringen, och stegets klocka stannar.
  const pick = backed ? active?.picked ?? null : null;
  const setPick = (optionId: string) => dispatch({ type: 'PICK_BACK_ANSWER', optionId });
  // Provspel av 285: "Think so" är förvald i varje steg (BACK.defaultConfidence),
  // eller Guessing när krediterna inte räcker.
  const defaultConf = (): Confidence => (canBack(sim, BACK.defaultConfidence) ? BACK.defaultConfidence : 0);
  const [conf, setConf] = useState<Confidence | null>(defaultConf);
  const cardRef = useRef<HTMLElement>(null);
  // ORDER 299 — kortet är smalare: när bandet med svaret kommer rullas kortet
  // ned till det, så att förklaringen och raden om reaktionen syns.
  const bandRef = useRef<HTMLDivElement>(null);
  const bandKind = sim.incidents?.lastOutcome?.at ?? sim.day.roomReactions?.at(-1)?.at ?? null;
  useEffect(() => {
    const el = bandRef.current;
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [bandKind]);
  const stepKey = active ? `${active.id}:${active.step}` : null;
  useEffect(() => { setConf(defaultConf()); }, [stepKey]);
  const lastBack = sim.incidents?.lastBack ?? null;
  const backKey = lastBack ? `${lastBack.at}:${lastBack.step}` : null;
  const seenBack = useRef<string | null>(backKey);
  useEffect(() => {
    if (!lastBack || backKey === seenBack.current) return;
    seenBack.current = backKey;
    const card = cardRef.current;
    if (lastBack.correct) {
      // Rätt: rutorna smäller in, krediterna flyger till HUD:en och
      // panelen skakar 14 px.
      card?.querySelectorAll('[data-back-box]').forEach((el) => slam(el, true));
      if (lastBack.delta > 0) flyTo('credits', card, `+${lastBack.delta}`, lastBack.delta, { bg: 'var(--nx-ink)', mode: 'to' });
      shake(card, 14);
    } else {
      // Fel: panelen skakar 16 px och insatsen faller ur krediterna.
      shake(card, 16);
      if (lastBack.delta < 0) fallFrom('credits', `−${-lastBack.delta}`, { bg: 'var(--nx-accent)' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backKey]);

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

  // ORDER 299 — ett nytt steg börjar överst i kortet (berättelsen, listen och
  // frågan), också om förra stegets band rullade ned kortet.
  const askKey = mode === 'ask' && active ? `${active.id}:${active.step}:${active.openedAt}` : null;
  useEffect(() => {
    if (askKey && cardRef.current) cardRef.current.scrollTop = 0;
  }, [askKey]);

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
      // ORDER 286a — inga svar medan figurens klipp spelas i rummet.
      if ((active?.introLeft ?? 0) > 0) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const o = step.options[i];
      if (!o || (active?.struck ?? []).includes(o.id)) return;
      if (backed) setPick(o.id);
      else dispatch({ type: 'ANSWER_INCIDENT', optionId: o.id });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [mode, step, active?.struck, dispatch, backed]);

  if (!view || !step) return null;
  // ORDER 286a — raketen börjar i rummet: kortet öppnas när figurens klipp
  // har spelats (introLeft).
  if (view.mode === 'ask' && active && (active.introLeft ?? 0) > 0) return null;
  const { incident } = view;
  const s = strings.service.incident;
  const t = strings.rocket.card;
  const f = (x: string) => formatIncidentText(x, view!.context);
  const rocketKey = `${incident.id}:${view.shown}`;

  // Nedräkningen: stegets egen tid. Efter ett svar står den still i grått
  // på det värde den hade.
  let left: number;
  let total: number;
  if (view.mode === 'ask' && active && backed && active.picked) {
    // Det låsta svarets andra tidsgräns.
    left = Math.max(0, Math.ceil(active.lockLeft ?? BACK.lockSeconds));
    total = BACK.lockSeconds;
  } else if (view.mode === 'ask' && active) {
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

  const { n } = rocketCounter(sim);
  const where = incident.needsTable ? t.table(String(view.context.table)) : t.room;
  // ORDER 293 — händelserna som teater: manusets roll och plats (Designs
  // event.<händelse>.role, t.ex. "Hovmästaren · lounge A").
  const eventRole = EVENT_ROLE_KEY[incident.id] ? tt(lang, EVENT_ROLE_KEY[incident.id]) : null;
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

  // ORDER 292 — följden i kassan: svarets händelse vid bordet (rummets reaktion
  // just nu), med beloppet som flyger till kvällskassan eller försvinner.
  const lastReaction = sim.day.roomReactions?.at(-1);
  const reaction = band && lastReaction && sim.simTime - lastReaction.at <= ANSWER_EFFECTS.reactionSimSeconds && lastReaction.amountSek ? lastReaction : null;
  const freshReaction = band && lastReaction && sim.simTime - lastReaction.at <= CONSEQUENCE.camera.backTo ? lastReaction : null;
  const linkLine = freshReaction ? consequenceLine(lang, freshReaction, view.chosen ? f(step.text.options[view.chosen].label) : null) : null;

  // ORDER 280 — Back your knowledge: bandet säger vad svaret gav i krediter.
  const backResult = lastBack && (view.mode === 'right' ? lastBack.step === view.shown : view.mode === 'done' || view.mode === 'wrong') ? lastBack : null;
  if (band && backResult && (backed || held?.outcome.back)) {
    const sentence = backResult.correct ? strings.back.bandRight[backResult.confidence] : strings.back.bandWrong[backResult.confidence];
    const credits = backResult.delta === 0 ? '±0' : `${backResult.delta > 0 ? '+' : '−'}${Math.abs(backResult.delta)}`;
    band = { ...band, label: `${band.label} · ${credits} ${strings.back.credits.toLowerCase()}`, text: `${sentence} ${band.text}` };
    // ORDER 299 — "Hur säker du var" stod i en panel till vänster; meningen
    // om kvällens träffsäkerhet står nu i bandet när satsningen är avgjord.
    if (view.mode === 'done' || view.mode === 'wrong') {
      const know = sim.incidents?.calibration?.[2] ?? [0, 0];
      band = { ...band, text: `${band.text} ${strings.back.calibNote[calibrationNote(sim.incidents?.calibration)](know[0], know[1])}` };
    }
  }

  return (
    <section
      ref={cardRef}
      className="nx nx-rocket"
      data-testid="incident-card"
      data-backed={backed}
      data-incident-id={incident.id}
      data-step={view.mode === 'done' || view.mode === 'wrong' ? 'closed' : view.shown}
      data-step-axis={step.axis}
      data-mode={view.mode}
      aria-label={f(incident.text.title)}
    >
      <div className="nx-rocket-head">
        <div className="nx-label" data-testid={backed ? 'incident-back-kicker' : undefined}>{backed ? strings.back.kicker(view.context.staff, where) : eventRole ?? `${view.context.staff} · ${where}`}</div>
        <div className="nx-rocket-count" data-testid="rocket-count">{active?.backed ? t.backOf(sim.incidents?.betsTonight ?? 1, BACK.maxPerEvening) : active?.chained ? t.followUp : t.rocketN(String(Math.max(1, n)))}</div>
      </div>
      {/* ORDER 284 — introduktionen står där raketen startas (EventsPanel):
          på kortet tryckte den ned svaren under skärmen (tredje provspelet). */}
      {/* ORDER 284 — i Back your knowledge med ett låst svar (klockan står)
          visar kortet bara frågan, svaret, säkerheten och Stå för svaret, så
          att allt ryms (tredje provspelet). */}
      {/* ORDER 292 — insatsen före svaret: bordets nota och gästerna. */}
      {view.mode === 'ask' && active?.stake && (
        <p className="nx-rocket-stake" data-testid="incident-stake" data-value={active.stake.billSek} data-guests={active.stake.guests} aria-label={strings.rocketStakeAria}>
          {strings.rocketStake(incident.needsTable ? view.context.table : null, formatSek(active.stake.billSek), numberWord(active.stake.guests), active.stake.guests, (active.stake.types.social ?? 0) > 0)}
        </p>
      )}
      {!(backed && pick !== null) && <p className="nx-rocket-story">{f(incident.text.body)}</p>}
      {!(backed && pick !== null) && view.situation && incident.text.situations?.[view.situation] && (
        <p className="nx-rocket-situation" data-testid="incident-situation" data-situation={view.situation}>
          {f(incident.text.situations[view.situation])}
        </p>
      )}

      {/* ORDER 284 — i Back your knowledge visar raketen till vänster stegen
          (BackPanels); rutorna här tas bort så att svaren ryms. */}
      {/* ORDER 290 — Designs rätt, fel och pyramiden §3: lyktorna blir
          kunskapspyramiden, under rubriken, med våningarnas namn till höger. */}
      {/* ORDER 299 — pyramiden som en smal list med multiplikatorerna och
          säkerheten på en rad; panelerna till vänster (BackPanels) är borta,
          så att rummet syns under raketen. */}
      <PyramidStrip
        testId="incident-pyramid"
        full={view.mode === 'done'}
        showMult={backed}
        confidence={backed && conf !== null ? strings.back.confidence[conf] : null}
        levels={incident.steps.map((_, i) => { const b = boxFor(i); return b === 'cleared' ? 'filled' : b === 'current' ? 'current' : b === 'failed' ? 'cracked' : 'empty'; })}
      />
      <ol hidden style={{ display: 'none' }} className="nx-rocket-steps" data-testid="incident-steps" aria-label={s.stepOf(String(view.shown + 1), String(incident.steps.length))}>
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
          if (backed && pick !== null && o.id !== pick && view!.mode === 'ask') return null;
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
              disabled={view!.mode !== 'ask' || struck || (pick !== null && pick !== o.id)}
              title={struck ? s.struck : undefined}
              aria-keyshortcuts={String(i + 1)}
              data-picked={backed && pick === o.id}
              onClick={() => (backed ? setPick(o.id) : dispatch({ type: 'ANSWER_INCIDENT', optionId: o.id }))}
            >
              <span className="nx-rocket-key" aria-hidden>{look === 'chosen' ? <Check size={16} /> : look === 'wrong' ? <X size={16} /> : i + 1}</span>
              <span className="nx-rocket-option-text">
                <span>{f(step.text.options[o.id].label)}</span>
                {/* ORDER 290 — Designs domar: Rätt, Ditt svar, Det här hade hållit. */}
                {(look === 'chosen' || look === 'correct' || look === 'wrong') && (
                  <span className="nx-rocket-tag">{look === 'chosen' ? tt(lang, 'verdict.right') : look === 'correct' ? tt(lang, 'verdict.held') : t.yourTag}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {backed && view.mode === 'ask' && pick === null && (
        <p className="nx-small nx-muted" data-testid="back-picked-hint" data-picked="false">{strings.back.pickFirst}</p>
      )}
      {backed && view.mode === 'ask' && pick !== null && (
        <div className="nx-back" data-testid="back-confidence">
          <div className="nx-label">{strings.back.howSure} <span className="nx-muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }} data-testid="back-picked-hint" data-picked="true">{strings.back.pickedHint(Math.max(0, Math.ceil(active?.lockLeft ?? BACK.lockSeconds)))}</span></div>
          {!canBack(sim, 1) && <div className="nx-small" data-testid="back-earn-card">{strings.back.earnShort}</div>}
          <div className="nx-back-levels">
            {BACK.confidence.map((c, i) => {
              const level = i as Confidence;
              const win = Math.round(c.win * (BACK.stepMultiplier[view!.shown] ?? 1));
              const ok = canBack(sim, level);
              return (
                <button key={i} type="button" className="nx-back-level" data-testid={`back-level-${i}`} data-chosen={conf === level} data-allowed={ok}
                  aria-pressed={conf === level}
                  onClick={() => { if (!ok) { shake(targetElement('credits'), 10); return; } setConf(level); }}>
                  <span className="nx-back-level-name">{strings.back.confidence[i]}</span>
                  <span className="nx-back-level-odds">{strings.back.odds(win, c.loss)}</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="nx-btn nx-btn-primary nx-back-lock" data-testid="back-lock" data-ready={pick !== null && conf !== null}
            onClick={() => {
              if (pick === null || conf === null) { shake(cardRef.current, 10); return; }
              dispatch({ type: 'ANSWER_INCIDENT', optionId: pick, confidence: conf });
            }}>
            {/* Provspel av 285: en grå knapp säger varför. */}
            <span>{conf === null ? strings.back.chooseHow : strings.back.lock}</span>
          </button>
        </div>
      )}

      {band ? (
        <div ref={bandRef} className="nx-rocket-band" data-kind={band.kind} data-testid="incident-band" aria-live="polite">
          {/* ORDER 290 — domen är Rätt eller Inte den här gången, aldrig Fel;
              förklaringen är lika vänlig i båda fallen. */}
          <span className="nx-verdict" data-kind={band.kind}>{band.kind === 'right' ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}{band.kind === 'right' ? tt(lang, 'verdict.right') : tt(lang, 'verdict.wrong')}</span>
          {/* ORDER 299 — raden som binder ihop svaret med gästens reaktion. */}
          {linkLine && <p className="nx-rocket-link" data-testid="consequence-line">{linkLine}</p>}
          <p className="nx-rocket-band-text">{band.text}</p>
          {reaction && <BandAmount reaction={reaction} />}
          <div className="nx-rocket-band-foot">{view.mode === 'done' ? tt(lang, 'pyramid.full.sub') : band.label}</div>
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
  // ORDER 290 — serviceläget: mätarna visas när panelerna är öppnade.
  const drawer = useServiceDrawer();
  useEffect(() => {
    if (!last || key === seen.current) return;
    seen.current = key;
    setEmph(last);
    const t = window.setTimeout(() => setEmph(null), METER_EMPHASIS_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!sim.incidents?.enabled || sim.day.period !== 'dinner' || !panelOpen(drawer, 'room')) return null;
  // ORDER 280 — under en egen raket står raketen och träffsäkerheten här.
  if (sim.incidents.active?.backed) return null;
  const m = serviceMeters(sim);
  const steps = meterSteps(sim);
  const d = emph ? deltaSteps(sim, emph.deltas) : null;
  const t = strings.rocket.meters;
  // ORDER 290 — Designs serviceläget §3: kassans mätare utgår, eftersom
  // kvällskassan ersätter den. Rummet har gästernas och personalens mätare.
  const rows = [
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

// ORDER 292 (Vision Owner 2026-10-01: "rätt svar ger en synlig händelse (gästen
// beställer mer, beloppet flyger till kvällskassan och stapeln hoppar), och fel
// svar ger en tom stol, ett belopp som försvinner och en gäst som går").
function BandAmount({ reaction }: { reaction: RoomReaction }) {
  const ref = useRef<HTMLSpanElement>(null);
  const amount = reaction.amountSek ?? 0;
  const key = `${reaction.at}:${reaction.kind}:${amount}`;
  const flown = useRef<string | null>(null);
  useEffect(() => {
    if (amount <= 0 || flown.current === key) return;
    flown.current = key;
    flyTo('cash', ref.current, `+${formatSek(amount)}`, amount, { bg: 'var(--w-gold)', fg: 'var(--w-ink)' });
  }, [key, amount]);
  return (
    <span ref={ref} key={key} className="nx-band-amount" data-kind={amount > 0 ? 'in' : 'lost'} data-testid="incident-band-amount" data-value={amount}>
      <strong className="nx-num">{amount > 0 ? '+' : '−'}{formatSek(Math.abs(amount))}</strong>
      <span className="nx-small">{reaction.text}</span>
    </span>
  );
}
