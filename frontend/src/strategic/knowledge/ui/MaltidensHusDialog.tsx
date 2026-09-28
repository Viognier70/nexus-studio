// ORDER 264 (Nexus v1 etapp 2) — Måltidens hus: välj paviljong, öva
// eller gör prov, svara, se resultatet.
// ORDER 271 — formen efter Designs skärmar i paket 1:
//   MD1 medaljerna — huset: fem paviljonger × fyra steg, Teatern låst,
//       med övning och prov per paviljong;
//   O1  öva/prov   — frågeställaren till vänster, frågan till höger
//       (QuestionCard);
//   MD2 ny medalj  — ögonblicket när ett prov ger en medalj: rött fält,
//       medaljen faller in, två ringar, raderna, hållbild vid 1,2 s.
//       Spelet går inte vidare av sig självt. Utan rörelse vid
//       reduced motion;
//   O2  resultatet — en ruta per fråga i stället för en poängsiffra,
//       medaljen.
// Samma dispatch som förut (VISIT_PAVILION, ANSWER_VISIT,
// NEXT_VISIT_QUESTION, CLOSE_VISIT).
//
// Speldesign > Kunskapen. Paviljongerna som platser på kartan byggs i
// etapp 11; tills dess nås de härifrån, från morgonens schema. Dialogen
// är öppen så länge ett besök pågår, också efter en omladdning mitt i
// ett besök (besöket ligger i simuleringens tillstånd).

import { useEffect, useState } from 'react';
import { strings } from '../../../content/strings';
import { EXAM, MEDAL_LEVELS } from '../../../sim/balance';
import { useSimDispatch, useSimState } from '../../simulation/SimulationProvider';
import type { MedalLevelId, PavilionKey, PavilionVisitState } from '../../types';
import {
  canVisit,
  isPavilionUnlocked,
  medalRank,
  nextExamLevel,
  scheduleSlotsLeft,
  THEATRE
} from '../pavilionVisit';
import { bankQuestionById } from '../questionBank';
import { QuestionCard } from './QuestionCard';
import { numberWord } from '../../simulation/eveningAccount';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { NxButton } from '../../ui/system/components';
import { NxIcon, PAVILION_ICON } from '../../ui/screens/icons';
import { MedalDisc } from '../../ui/screens/MedalDisc';
import { Portrait } from '../../ui/screens/Portrait';
import '../../ui/screens/screens.css';

const ORDER: readonly PavilionKey[] = ['maltidbiblioteket', 'metodkoket', 'stensota', 'kalastorget', THEATRE];
const k = strings.knowledge;
const h = strings.screens.house;

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// En nyckel per besök, så att ögonblicket (MD2) visas en gång per medalj.
function visitKey(v: PavilionVisitState): string {
  return `${v.pavilion}:${v.level}:${v.questionIds.join(',')}`;
}

export function MaltidensHusDialog({ open, onClose }: Props) {
  const sim = useSimState();
  const dispatch = useSimDispatch();
  const still = usePrefersReducedMotion();
  const visit = sim.pavilionVisit;
  // Medaljen som just tagits (MD1: "Silver i dag"), tills huset stängs.
  const [fresh, setFresh] = useState<{ pavilion: PavilionKey; level: MedalLevelId } | null>(null);
  const [momentSeen, setMomentSeen] = useState<string | null>(null);
  const awarded = visit?.result?.medalAwarded ?? null;
  useEffect(() => {
    if (visit && awarded) setFresh({ pavilion: visit.pavilion, level: awarded });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awarded, visit?.pavilion]);
  useEffect(() => {
    if (!open && !visit) setFresh(null);
  }, [open, visit]);
  if (!open && !visit) return null;

  // MD2 — ny medalj.
  if (visit && visit.result && awarded && momentSeen !== visitKey(visit)) {
    const level = capital(k.medals[awarded]);
    return (
      <div className="nx nxs-moment" data-still={still ? 'true' : 'false'} role="dialog" aria-modal="true" aria-label={h.newMedal} data-testid="screen-MD2">
        <div className="nxs-moment-medal">
          <span className="nxs-moment-ring" />
          <span className="nxs-moment-ring" data-ring="inner" />
          <span className="nxs-moment-drop">
            <MedalDisc level={awarded} size={420} pavilion={visit.pavilion} label={h.medalCaption(level, k.pavilions[visit.pavilion])} />
          </span>
        </div>
        <div>
          <div className="nx-label nxs-line-1">{h.newMedal}</div>
          <h1 className="nxs-moment-title nxs-line-2">{h.medalTitle(level, k.pavilions[visit.pavilion])}</h1>
          <div className="nxs-hold nxs-mt-40 nxs-w-300">
            <button type="button" className="nx-btn nxs-btn-white" data-testid="medal-continue" onClick={() => setMomentSeen(visitKey(visit))} autoFocus>
              <span>{h.continue}</span>
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // O2 — resultatet.
  if (visit && visit.result) {
    const r = visit.result;
    const pavilionName = k.pavilions[visit.pavilion];
    const wrong = r.total - r.correct;
    const headline =
      visit.mode === 'practice'
        ? h.practiceDone
        : r.passed
          ? h.passed(capital(k.medals[visit.level]), pavilionName)
          : h.almost;
    const lines: string[] = [];
    if (visit.mode === 'practice') lines.push(h.practiceCredits);
    if (wrong > 0) lines.push(h.waited(wrong, capital(numberWord(wrong))));
    if (visit.mode === 'exam' && !r.passed) lines.push(h.need(numberWord(EXAM.correctToPass), numberWord(r.total)));
    const shown: MedalLevelId | undefined = r.passed ? visit.level : sim.medals[visit.pavilion];
    return (
      <div className="nx nx-screen nxs-over" role="dialog" aria-modal="true" aria-label={k.houseHeading} data-testid="maltidens-hus">
        <div data-testid="visit-result" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
          <header className="nxs-head" data-testid="screen-O2">
            <div>
              <div className="nx-label nx-accent-text">
                {pavilionName} · {visit.mode === 'practice' ? k.practice : k.exam(k.medals[visit.level])}
              </div>
              <h1 className="nx-heading">{visit.mode === 'practice' ? h.practiceHeading : h.examHeading}</h1>
            </div>
          </header>
          <div className="nxs-result-grid">
            <div>
              <div className="nxs-boxes" role="img" aria-label={h.boxesAria(r.correct, r.total)} data-testid="result-boxes" data-correct={r.correct}>
                {visit.answers.map((a, i) => <span key={i} data-on={a.correct} />)}
              </div>
              <h2 className="nx-display nxs-mt-40" data-testid="result-headline">{headline}</h2>
              <p className="nx-body nxs-mt-24">{lines.join(' ')}</p>
            </div>
            <div>
              <MedalDisc level={shown} size={280} pavilion={visit.pavilion} />
              <div className="nxs-row-title nxs-mt-24">
                {shown ? h.medalCaption(capital(k.medals[shown]), pavilionName) : k.noMedal}
              </div>
            </div>
          </div>
          <footer className="nxs-foot" style={{ marginTop: 'auto' }}>
            <span />
            <div className="nxs-foot-buttons">
              <div className="nxs-btn-secondary-w">
                <NxButton
                  kind="secondary"
                  testId="close-visit"
                  arrow={false}
                  onClick={() => {
                    dispatch({ type: 'CLOSE_VISIT' });
                    onClose();
                  }}
                >
                  {k.back}
                </NxButton>
              </div>
              <div className="nxs-btn-primary-w">
                <NxButton testId="visit-to-medals" onClick={() => dispatch({ type: 'CLOSE_VISIT' })} autoFocus>
                  {h.toMedals}
                </NxButton>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  // O1 — en fråga.
  if (visit) {
    const i = visit.showingExplanation ? visit.answers.length - 1 : visit.answers.length;
    const question = bankQuestionById(visit.questionIds[i]);
    const answer = visit.showingExplanation ? visit.answers[i] : null;
    const last = visit.answers.length >= visit.questionIds.length;
    const pavilionName = k.pavilions[visit.pavilion];
    const modeLabel = visit.mode === 'practice' ? k.practice : k.exam(k.medals[visit.level]);
    return (
      <div className="nx nxs-q" role="dialog" aria-modal="true" aria-label={k.houseHeading} data-testid="maltidens-hus">
        <div className="nxs-q-left">
          {question?.asker === 'sommelier' && <Portrait who="sommelier" />}
          <div className="nxs-q-name">
            <div className="nx-label">{pavilionName} · {modeLabel}</div>
            <div className="nx-mid nxs-mt-8">{question ? k.askers[question.asker] : ''}</div>
          </div>
        </div>
        <div className="nxs-q-right" data-testid="screen-O1">
          {question?.placeholder && <p className="nx-small nx-muted" style={{ marginBottom: 'calc(12 * var(--nx-u))' }}>{k.placeholderNote}</p>}
          {question && (
            <QuestionCard
              question={question}
              index={i}
              total={visit.questionIds.length}
              answered={answer}
              onAnswer={(chosenIndex) => dispatch({ type: 'ANSWER_VISIT', chosenIndex })}
              onNext={() => dispatch({ type: 'NEXT_VISIT_QUESTION' })}
              nextLabel={last ? k.seeResult : k.next}
              secondsPerQuestion={visit.mode === 'exam' ? EXAM.secondsPerQuestion : undefined}
              label={visit.mode === 'practice' ? h.practiceLabel : modeLabel}
            />
          )}
        </div>
      </div>
    );
  }

  // MD1 — medaljerna, och vägen till övning och prov.
  const slotsLeft = scheduleSlotsLeft(sim);
  return (
    <div className="nx nx-screen nxs-over" role="dialog" aria-modal="true" aria-label={k.houseHeading} data-testid="maltidens-hus">
      <div className="nxs-mtable-row" style={{ borderBottom: 'var(--nx-line) solid var(--nx-ink)', alignItems: 'end', minHeight: 0, paddingBottom: 'calc(24 * var(--nx-u))' }} data-testid="screen-MD1">
        <div>
          <div className="nx-label nx-accent-text">{k.houseHeading}</div>
          <h1 className="nx-heading">{h.medals}</h1>
        </div>
        {MEDAL_LEVELS.map((l) => (
          <div key={l} className="nx-label">{k.medals[l]}</div>
        ))}
      </div>
      {ORDER.map((p) => {
        const held = sim.medals[p];
        const next = nextExamLevel(held);
        const unlocked = isPavilionUnlocked(sim, p);
        const isFresh = fresh?.pavilion === p;
        if (!unlocked) {
          return (
            <div key={p} className="nxs-mtable-row" data-locked="true" data-testid={`pavilion-${p}`}>
              <div className="nxs-mtable-name">
                <NxIcon name="lock" size={40} />
                <div>
                  <div className="nx-mid">{k.pavilions[p]}</div>
                  <div className="nxs-row-sub" data-testid={`medal-${p}`}>{held ? k.medalLine(k.medals[held]) : k.noMedal}</div>
                </div>
              </div>
              <div className="nx-body" style={{ gridColumn: '2 / span 4', fontWeight: 700 }}>{k.theatreLocked}</div>
            </div>
          );
        }
        return (
          <div key={p} className="nxs-mtable-row" data-fresh={isFresh} data-testid={`pavilion-${p}`}>
            <div className="nxs-mtable-name">
              <NxIcon name={PAVILION_ICON[p]} size={40} />
              <div>
                <div className="nx-mid">{k.pavilions[p]}</div>
                {isFresh ? (
                  <div className="nxs-row-sub nx-accent-text" style={{ fontWeight: 700 }} data-testid={`medal-${p}`}>
                    {h.today(capital(k.medals[fresh!.level]))}
                  </div>
                ) : (
                  <div className="nxs-row-sub" data-testid={`medal-${p}`}>{held ? k.medalLine(k.medals[held]) : k.noMedal}</div>
                )}
                <div className="nxs-mtable-actions">
                  <NxButton
                    kind="quiet"
                    testId={`practice-${p}`}
                    disabled={!canVisit(sim, p, 'practice')}
                    onClick={() => dispatch({ type: 'VISIT_PAVILION', pavilion: p, mode: 'practice' })}
                  >
                    {k.practice}
                  </NxButton>
                  <NxButton
                    kind="quiet"
                    testId={`exam-${p}`}
                    disabled={!canVisit(sim, p, 'exam')}
                    onClick={() => dispatch({ type: 'VISIT_PAVILION', pavilion: p, mode: 'exam' })}
                  >
                    {next ? k.exam(k.medals[next]) : k.examDone}
                  </NxButton>
                </div>
              </div>
            </div>
            {MEDAL_LEVELS.map((l, i) => (
              <div key={l} className="nxs-mtable-cell">
                <MedalDisc
                  level={medalRank(held) >= i + 1 ? l : null}
                  size={104}
                  fresh={isFresh && fresh!.level === l}
                  label={medalRank(held) >= i + 1 ? `${k.pavilions[p]}: ${k.medals[l]}` : undefined}
                />
              </div>
            ))}
          </div>
        );
      })}
      <footer className="nxs-foot">
        <p className="nx-small nx-muted nxs-measure">
          {k.houseBody}
          {slotsLeft <= 0 && <strong className="nx-accent-text"> {k.noSlotsLeft}.</strong>}
        </p>
        <div className="nxs-btn-secondary-w">
          <NxButton kind="secondary" testId="close-house" onClick={onClose} arrow={false}>{k.close}</NxButton>
        </div>
      </footer>
    </div>
  );
}
