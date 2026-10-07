// ORDER 267 (Nexus v1 etapp 5) — mentorn i introduktionen.
// ORDER 271 — formen efter Designs skärmar M1 och M2 (paket 1).
//
// Speldesign > Introduktionen: "En mentor från Campus möter spelaren och
// följer henne genom första dagen: ett övningsbesök, ett prov och
// bankmötet. […] Mentorn försvinner sedan och dyker bara upp igen om
// spelaren nedgraderas."
//
// En replik per steg (sim/introduction.ts introductionStep), och ett
// avsked när verksamheten har fått sitt namn. När och vad är oförändrat;
// se ui/screens/mentor.ts för hur skärmen (M1) och raden i morgonens
// schema delar på repliken. M2: vid första servicen pekar mentorn på
// raketkortet och mätarna.

import { strings } from '../../content/strings';
import { calendarFor } from '../../sim/calendar';
import { SEASON } from '../../sim/balance';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';
import { NxButton } from './system/components';
import { MENTOR_STEPS, useMentor } from './screens/mentor';
import { AsaBubble, AsaPortrait } from './AsaBubble';
import './screens/screens.css';
import { SenderTag } from './SenderTag';

const t = strings.introduction;
const s = strings.screens;

// Första meningen blir rubrik, resten bröd (M1: "Välkommen till Grythyttan." över repliken).
export function splitLine(line: string): { head: string; body: string } {
  const m = line.match(/^(.+?[.!?])\s+(.*)$/s);
  return m ? { head: m[1], body: m[2] } : { head: line, body: '' };
}

export function MentorPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const mentor = useMentor();
  if (!mentor.showScreen || mentor.step === null || mentor.line === null) return null;

  // ORDER 313 §2 — Åsa när satsningarna öppnas (efter första provet).
  // ORDER 317 — i Designs pratbubbla (D6, AsaBubble).
  if (mentor.step === 'unlocked') {
    return <AsaBubble step="unlocked" line={mentor.line} nextTestId="mentor-close-unlocked" onNext={() => dispatch({ type: 'SAY_UNLOCKED' })} />;
  }

  if (mentor.step === 'service') {
    return (
      <>
        <span hidden data-testid="screen-M2" />
        <AsaBubble step="service" line={mentor.line} nextTestId="mentor-close-service" onNext={mentor.closeService} />
      </>
    );
  }

  const cal = calendarFor(sim.day.dayNumber);
  const { head, body } = splitLine(mentor.line);
  const farewell = mentor.step === 'farewell';
  return (
    <div className="nx nxs-mentor-screen" role="dialog" aria-label={t.mentor} data-testid="mentor" data-step={mentor.step}>
      <div className="nx-label nxs-on-dark" data-testid="screen-M1">
        {strings.calendar.weekdays[cal.weekday]} · {s.mentor.campus} · {strings.calendar.week(cal.week, SEASON.weeks)}
      </div>
      {/* ORDER 317 — Designs porträtt av Åsa (D6) i stället för monogrammet. */}
      <div className="nxs-mentor-portrait nx-asa-m1" data-testid="portrait-mentor"><AsaPortrait /></div>
      <div className="nxs-mentor-dialog">
        <div className="nxs-row-between">
          <SenderTag sender="asa" />
          <div className="nx-label nx-accent-text">{s.mentor.label}</div>
          <div className="nxs-dots" aria-label={s.mentor.stepOf(mentor.index ?? 1, MENTOR_STEPS.length)} role="img">
            {MENTOR_STEPS.map((st, i) => (
              <span key={st} data-on={i + 1 === mentor.index} />
            ))}
          </div>
        </div>
        <h2 className="nx-heading nxs-mt-24">{head}</h2>
        {body && <p className="nx-body nxs-mt-24 nxs-measure">{body}</p>}
        <div className="nxs-row nxs-mt-40">
          <div className="nxs-w-300">
            {farewell ? (
              <NxButton testId="mentor-close" onClick={mentor.closeFarewell} autoFocus>{t.farewellClose}</NxButton>
            ) : (
              <NxButton testId="mentor-next" onClick={mentor.next} autoFocus>{strings.knowledge.next}</NxButton>
            )}
          </div>
          {!farewell && (
            <NxButton kind="quiet" testId="mentor-skip" onClick={mentor.skip}>{s.mentor.skip}</NxButton>
          )}
        </div>
      </div>
    </div>
  );
}
