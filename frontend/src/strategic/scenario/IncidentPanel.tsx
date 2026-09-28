// ORDER 270 — händelserna i servicen (Vision Owner 2026-09-26).
//
// IncidentCard: kvällens händelse som en raket i tre steg (Vision Owner
// 2026-09-27): episteme (vad), techne (hur), phronesis (när och varför).
// Kortet visar berättelsen, stegen, det aktuella stegets fråga med 3–4
// svar och stegets nedräkning. Rummet fortsätter medan nedräkningen går.
// Ett alternativ som spelarens medaljer strukit visas överstruket och går
// inte att välja.
//
// ServiceMeters: de tre mätarna, kassa, gästernas nöjdhet och personalens
// ork. Speldesignens medvetna undantag från regeln om stat-paneler. De
// läser samma källor som simuleringen: `cash`, gästernas `satisfaction`
// i rummet och `morale` (sim/incidents.ts `serviceMeters`).

import { strings } from '../../content/strings.sv';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { INCIDENTS } from '../../sim/balance';
import { incidentById } from '../../sim/incidentBank';
import { formatIncidentText, serviceMeters } from '../../sim/incidents';
import { medalSteps } from '../../sim/knowledgeInService';
import { PAVILION_CONFIGS } from '../knowledge/pavilions';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

const CARD: React.CSSProperties = {
  position: 'absolute',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'min(560px, calc(100vw - 32px))',
  maxHeight: 'calc(100vh - 140px)',
  overflowY: 'auto',
  padding: '14px 18px 16px',
  background: 'rgba(30, 22, 16, 0.96)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.4,
  boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
  pointerEvents: 'auto',
  zIndex: 42,
  boxSizing: 'border-box'
};

const OPTION: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '10px 14px',
  minHeight: 44,
  marginTop: 8,
  background: '#3c2c1e',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 3,
  font: 'inherit',
  fontSize: 14,
  cursor: 'pointer'
};

const STRUCK: React.CSSProperties = {
  ...OPTION,
  cursor: 'default',
  opacity: 0.45,
  textDecoration: 'line-through'
};

const LABEL: React.CSSProperties = { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.72 };

export function IncidentCard() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const reduceMotion = usePrefersReducedMotion();
  const active = sim.incidents?.active;
  if (!active) return null;
  const incident = incidentById(sim.economy.businessClass, active.id);
  if (!incident) return null;
  const s = strings.service.incident;
  const f = (t: string) => formatIncidentText(t, active.context);
  const left = Math.ceil(active.secondsLeft);
  const share = active.secondsTotal > 0 ? active.secondsLeft / active.secondsTotal : 0;
  const stepIndex = active.step ?? 0;
  const step = incident.steps[stepIndex];
  if (!step) return null;
  const extra = medalSteps(sim.medals, step.pavilion) > 0 && active.secondsTotal > INCIDENTS.stepSeconds[step.axis];
  const pavilionName = PAVILION_CONFIGS[step.pavilion].displayName;
  return (
    <div style={CARD} data-testid="incident-card" data-incident-id={incident.id} data-step={stepIndex} data-step-axis={step.axis} role="dialog" aria-live="assertive" aria-label={f(incident.text.title)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={LABEL}>
          {s.clock(active.context.clock)} · {s.phase[incident.arc]} · {pavilionName}{active.chained ? ` · ${s.chained}` : ''}
        </div>
        <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }} data-testid="incident-countdown">
          {s.countdown(String(left))}
        </div>
      </div>
      <div
        aria-hidden
        style={{ height: 4, background: 'rgba(168,146,106,0.25)', borderRadius: 2, margin: '6px 0 10px' }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(0, Math.min(1, share)) * 100}%`,
            background: share > 0.3 ? '#d8b56a' : '#d0694e',
            borderRadius: 2,
            transition: reduceMotion ? 'none' : 'width 0.2s linear'
          }}
        />
      </div>
      <div style={{ fontWeight: 600, fontSize: 16 }}>{f(incident.text.title)}</div>
      <div style={{ marginTop: 4 }}>{f(incident.text.body)}</div>
      {active.situation && incident.text.situations?.[active.situation] && (
        <div style={{ marginTop: 4, fontStyle: 'italic', opacity: 0.9 }} data-testid="incident-situation" data-situation={active.situation}>
          {f(incident.text.situations[active.situation])}
        </div>
      )}
      <ol style={{ display: 'flex', gap: 6, listStyle: 'none', padding: 0, margin: '10px 0 0' }} aria-label={s.stepOf(String(stepIndex + 1), String(incident.steps.length))} data-testid="incident-steps">
        {incident.steps.map((st, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <li
              key={st.axis}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: 11,
                letterSpacing: 0.6,
                textAlign: 'center',
                borderRadius: 3,
                border: `1px solid ${current ? '#d8b56a' : 'rgba(168,146,106,0.45)'}`,
                background: done ? 'rgba(156,192,122,0.22)' : current ? 'rgba(216,181,106,0.18)' : 'transparent',
                opacity: done || current ? 1 : 0.55
              }}
              aria-current={current ? 'step' : undefined}
              data-testid={`incident-step-${st.axis}`}
              data-state={done ? 'cleared' : current ? 'current' : 'ahead'}
            >
              {s.stepName[st.axis]} · {s.stepAsks[st.axis]}{done ? ` · ${s.stepCleared}` : ''}
            </li>
          );
        })}
      </ol>
      <div style={{ marginTop: 10, fontWeight: 600 }} data-testid="incident-question">{f(step.text.question)}</div>
      {step.options.map((o) => {
        const struck = active.struck.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            style={struck ? STRUCK : OPTION}
            disabled={struck}
            data-testid={`incident-option-${o.id}`}
            data-option-id={o.id}
            data-struck={struck}
            title={struck ? s.struck : undefined}
            onClick={() => dispatch({ type: 'ANSWER_INCIDENT', optionId: o.id })}
          >
            {f(step.text.options[o.id].label)}
          </button>
        );
      })}
      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        {extra ? `${s.medalTime(pavilionName)}. ` : ''}{s.staffDecides}
      </div>
    </div>
  );
}

const METERS: React.CSSProperties = {
  padding: '10px 12px',
  background: 'rgba(30, 22, 16, 0.86)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 4,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  width: 220,
  boxSizing: 'border-box',
  pointerEvents: 'none'
};

function Bar({ value, testId }: { value: number | null; testId: string }) {
  const v = value === null ? 0 : Math.max(0, Math.min(1, value));
  const colour = v >= 0.6 ? '#9cc07a' : v >= 0.35 ? '#d8b56a' : '#d0694e';
  return (
    <div aria-hidden style={{ height: 6, background: 'rgba(168,146,106,0.25)', borderRadius: 3, marginTop: 2 }} data-testid={testId} data-value={value === null ? '' : v.toFixed(2)}>
      <div style={{ height: '100%', width: `${v * 100}%`, background: colour, borderRadius: 3 }} />
    </div>
  );
}

function Delta({ value, format }: { value: number; format: (v: number) => string }) {
  if (Math.abs(value) < 1e-6) return null;
  return (
    <span style={{ marginLeft: 6, color: value > 0 ? '#9cc07a' : '#d0694e', fontWeight: 600 }}>
      {value > 0 ? '+' : '−'}{format(Math.abs(value))}
    </span>
  );
}

const sek = (v: number) => strings.service.meters.sek(Math.round(v).toLocaleString('sv-SE'));
const pct = (v: number) => `${Math.round(v * 100)}`;

export function ServiceMeters() {
  const sim = useSimState();
  if (!sim.incidents?.enabled || sim.day.period !== 'dinner') return null;
  const m = serviceMeters(sim);
  const t = strings.service.meters;
  const last = sim.incidents.lastOutcome;
  const fresh = last && sim.simTime - last.at <= INCIDENTS.outcomeBubbleSimSeconds ? last.deltas : null;
  return (
    <div style={METERS} data-testid="service-meters" aria-label={t.heading}>
      <div style={LABEL}>{t.heading}</div>
      <div style={{ marginTop: 6 }} data-testid="meter-cash" data-value={Math.round(m.cashSek)}>
        {t.cash}: <strong>{sek(m.cashSek)}</strong>
        {fresh && <Delta value={fresh.cashSek} format={sek} />}
      </div>
      <div style={{ marginTop: 6 }}>
        {t.satisfaction}{m.satisfaction === null ? `: ${t.noGuests}` : ''}
        {fresh && <Delta value={fresh.satisfaction} format={pct} />}
        <Bar value={m.satisfaction} testId="meter-satisfaction" />
      </div>
      <div style={{ marginTop: 6 }}>
        {t.stamina}
        {fresh && <Delta value={fresh.stamina} format={pct} />}
        <Bar value={m.stamina} testId="meter-stamina" />
      </div>
    </div>
  );
}
