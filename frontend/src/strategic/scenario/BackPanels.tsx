// ORDER 280 — Back your knowledge, Designs B1 (leveransen kassan och
// kvällen): till vänster under spelarens egen raket.
//
// Raketen: tre steg (episteme ×1, techne ×1,5, phronesis ×2) med målet
// överst. Raketen står i det steg som pågår och lyfter ett steg för varje
// rätt svar (700 ms, studs). Klarade steg fylls med bläck och det
// pågående har accentkant. Vid fel tippar raketen 24°, sjunker 44 px och
// blir grå, och steget blir streckat.
//
// Hur säker du var: kvällens träffsäkerhet per säkerhet med en stapel, och
// en mening (incidents.ts calibrationNote). Den som satsar högt och har fel
// ser att hon trodde sig kunna mer än hon kunde.

import { strings } from '../../content/strings';
import { BACK, INCIDENTS } from '../../sim/balance';
import { calibrationNote } from '../../sim/incidents';
import { useSimState } from '../simulation/SimulationProvider';
import { useLanguage } from '../../content/language';
import { NxLabel, u } from '../ui/system/components';
import '../ui/service/service.css';

export function BackPanels() {
  const sim = useSimState();
  const lang = useLanguage();
  const inc = sim.incidents;
  const active = inc?.active;
  if (!active?.backed || sim.day.period !== 'dinner') return null;
  const t = strings.back;
  const step = active.step ?? 0;
  const last = inc?.lastBack ?? null;
  const failed = last && !last.correct && last.endsRocket;
  const axes = INCIDENTS.stepAxes;
  const cal = inc?.calibration ?? [[0, 0], [0, 0], [0, 0]];
  const note = calibrationNote(inc?.calibration);
  const [, , know] = cal;
  return (
    <>
      <section className="nx nx-panel nx-back-track" data-testid="back-track" aria-label={t.track}>
        <header className="nx-back-track-head"><NxLabel>{t.track}</NxLabel><span className="nx-small nx-muted">{t.trackSub}</span></header>
        <div className="nx-back-track-body">
          <div className="nx-back-rocket" data-step={step} data-failed={!!failed} style={{ bottom: `calc(${step * 120} * var(--nx-u) + 20 * var(--nx-u))` }} aria-hidden>
            <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2" /><path d="M12 15l-3-3a22 22 0 0 1 8-9 3 3 0 0 1 3 3 22 22 0 0 1-9 8z" /><circle cx="15" cy="9" r="1.5" />
            </svg>
          </div>
          <div className="nx-label nx-muted" style={{ fontSize: u(14) }}>{t.trackGoal}</div>
          {[...axes].reverse().map((axis) => {
            const i = axes.indexOf(axis);
            const state = i < step ? 'cleared' : i === step ? 'current' : 'ahead';
            return (
              <div key={axis} className="nx-back-track-step" data-state={state} data-testid={`back-track-${axis}`}>
                <div>
                  <div className="nx-rocket-step-name">{strings.service.incident.stepName[axis]}</div>
                  <div className="nx-small">{strings.rocket.card.stepAsks[axis]}</div>
                </div>
                <div className="nx-back-mult">×{BACK.stepMultiplier[i].toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')}</div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="nx nx-panel nx-back-calib" data-testid="back-calibration" aria-label={t.calibTitle}>
        <header className="nx-back-track-head"><NxLabel>{t.calibTitle}</NxLabel><span className="nx-small nx-muted">{t.calibTonight}</span></header>
        {cal.map(([r, n], i) => (
          <div key={i} className="nx-back-calib-row" data-testid={`calib-${i}`} data-right={r} data-total={n}>
            <strong>{t.confidence[i]}</strong>
            <span style={{ height: u(12), background: 'rgba(244,230,204,.12)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
              <span style={{ position: 'absolute', inset: 0, width: `${n > 0 ? (r / n) * 100 : 0}%`, background: 'var(--w-gold)', borderRadius: 999 }} />
            </span>
            <span className="nx-small">{t.calibRow(r, n)}</span>
          </div>
        ))}
        <p className="nx-small" data-testid="calib-note" data-note={note} style={{ padding: `${u(10)} ${u(22)}`, color: note === 'overconfident' ? 'var(--nx-accent-700)' : undefined, fontWeight: 700 }}>
          {t.calibNote[note](know[0], know[1])}
        </p>
      </section>
    </>
  );
}
