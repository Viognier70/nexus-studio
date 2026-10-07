// ORDER 316 — fikat efter stängning (Anders 2026-10-07, BESLUT del 1).
//
// Kortet: personen som frågar (namn och roll), frågan och 3–4 svar, och
// "Gå hem". Efter svaret visas nivån mjukt ovanför förklaringen ("Väl
// grundat", "Delvis grundat", "Svagt grundat"), utan rött, och följderna:
// trivseln och lojaliteten, ekonomin och krediterna. Har spelaren mött
// dilemmat förut står det förra svaret och om svaret har förändrats.
//
// Lagtexten (lagarna och `legalNote`) visas bara när dilemmat är granskat
// (`legalReviewed`, content/fika/dilemmas.ts). Formen är designsystemets
// enkla delar tills Design ritar kortet.

import { strings } from '../../content/strings';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import { dilemmaById, type DilemmaOptionId } from '../../content/fika/dilemmas';
import { fikaTonight } from '../../sim/fika';
import type { SimulationState } from '../types';
import { NxButton, NxLabel, NxScreen } from '../ui/system/components';
import { useSimDispatch } from '../simulation/SimulationProvider';
import '../ui/service/service.css';
import './fika.css';

// ORDER 315b del 2 — märkena ur Designs dilemmaGrades.ts GRADE_STYLE.
const GRADE_MARK: Record<string, string> = { well: '✓', partly: '½', weakly: '○' };

export function FikaScreen({ sim, onContinue }: { sim: SimulationState; onContinue: () => void }) {
  const dispatch = useSimDispatch();
  const lang = useLanguage();
  const f = strings.fika;
  const tonight = fikaTonight(sim);
  const dilemma = tonight ? dilemmaById(tonight.dilemmaId) : undefined;
  const text = dilemma ? f.dilemmas[dilemma.id] : undefined;
  if (!tonight || !dilemma || !text) return null;
  const name = f.people[dilemma.asker];
  const role = f.roles[dilemma.asker];
  const answered = tonight.answer !== null;
  const outcome = tonight.outcome;
  const showLegal = !!dilemma.legal && dilemma.legal.legalReviewed;
  const kr = (n: number) => Math.round(n).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB');
  return (
    <NxScreen testId="evening-bar" label={f.label}>
      <div className="nx-evening nx-fika" data-testid="screen-fika" data-dilemma={dilemma.id} data-answer={tonight.answer ?? ''}>
        <header className="nx-evening-head">
          <div>
            <NxLabel>{f.label}</NxLabel>
            <h1 className="nx-display nx-fika-asker" data-testid="fika-asker">{f.asks(name, role)}</h1>
          </div>
        </header>
        <div className="nx-paper nx-lesson-paper nx-fika-paper">
          <p className="nx-fika-question" data-testid="fika-question">{f.quote(text.question)}</p>
          {!answered && (
            <>
              <NxLabel muted>{f.choose}</NxLabel>
              <div className="nx-fika-options" role="group" aria-label={f.choose}>
                {dilemma.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="nx-fika-option"
                    data-testid={`fika-option-${o.id}`}
                    onClick={() => dispatch({ type: 'FIKA_ANSWER', optionId: o.id as DilemmaOptionId })}
                  >
                    <span className="nx-fika-letter" aria-hidden>{o.id}</span>
                    <span>{text.options[o.id]}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {answered && tonight.answer === 'home' && (
            <p className="nx-fika-home" data-testid="fika-went-home">{f.wentHome}</p>
          )}
          {answered && tonight.answer !== 'home' && outcome && (
            <div data-testid="fika-outcome" data-grade={outcome.grade ?? ''}>
              {/* ORDER 315b del 2 — Designs tillägg till D7 (dilemmaGrades.ts): det valda svaret fylls med
                  bedömningens färg och märke, de andra visar sin bedömning under texten, ett väl grundat svar
                  som inte valdes får papper och streckad grön kant. Aldrig rött. */}
              <div className="nx-fika-graded" role="list">
                {dilemma.options.map((o) => (
                  <div key={o.id} role="listitem" className="nx-fika-graded-row" data-testid={`fika-graded-${o.id}`} data-grade={o.grade} data-chosen={o.id === tonight.answer}>
                    <span className="nx-fika-letter" aria-hidden>{o.id === tonight.answer ? GRADE_MARK[o.grade] : o.id}</span>
                    <span>
                      {text.options[o.id as DilemmaOptionId]}
                      {o.id !== tonight.answer && <span className="nx-fika-graded-label">{f.grade[o.grade]}</span>}
                    </span>
                  </div>
                ))}
              </div>
              <div className="nx-fika-verdict" data-testid="fika-verdict">
                {outcome.grade && <div className="nx-fika-grade" data-testid="fika-grade" data-grade={outcome.grade}>{f.grade[outcome.grade]}</div>}
                <span className="nx-small nx-fika-scale">{tt(lang, 'fika.scale' as StringKey)}</span>
              </div>
              <p className="nx-lesson-principle nx-fika-explanation" data-testid="fika-explanation">{text.explanation}</p>
              {showLegal && text.legalNote && (
                <p className="nx-small nx-fika-legal" data-testid="fika-legal">{text.legalNote} ({dilemma.legal!.laws.map((l) => f.laws[l] ?? l).join(', ')})</p>
              )}
              <ul className="nx-fika-effects" data-testid="fika-effects">
                {outcome.wellbeingPoints !== 0 && <li>{outcome.wellbeingPoints > 0 ? f.wellbeingUp : f.wellbeingDown}</li>}
                {outcome.askerLoyaltyPoints !== 0 && <li>{outcome.askerLoyaltyPoints > 0 ? f.loyaltyUp(name) : f.loyaltyDown(name)}</li>}
                {outcome.quitRisk && <li>{f.quitRisk(name)}</li>}
                {outcome.costSek > 0 && <li>{f.costSek(kr(outcome.costSek))}</li>}
                {outcome.inspectionRisk && <li>{f.inspectionRisk}</li>}
                {outcome.suggestAbility && <li>{f.suggestAbility(tt(lang, `ab.${outcome.suggestAbility}.name` as StringKey))}</li>}
                {outcome.credits > 0 && <li>{f.credits(outcome.credits)}</li>}
              </ul>
              {tonight.previous && (
                <p className="nx-small nx-fika-before" data-testid="fika-before">
                  {tonight.previous.grade ? f.before(String(tonight.previous.day), f.grade[tonight.previous.grade]) : null}{' '}
                  {tonight.previous.optionId !== tonight.answer ? f.changed : f.same}
                </p>
              )}
            </div>
          )}
        </div>
        <footer className="nx-evening-foot">
          {!answered ? (
            <button type="button" className="nx-btn nx-btn-quiet" data-testid="fika-go-home" onClick={() => dispatch({ type: 'FIKA_GO_HOME' })}>{f.goHome}</button>
          ) : <span />}
          <div>
            {answered && <NxButton testId="fika-continue" onClick={onContinue} autoFocus>{f.next}</NxButton>}
          </div>
        </footer>
      </div>
    </NxScreen>
  );
}
