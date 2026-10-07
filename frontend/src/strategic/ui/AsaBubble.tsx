// ORDER 317 — Designs D6 (nexus-leverans-2026-10-07-d6-asa, LEVERANSNOT §3,
// kontrollbild 06): Åsas pratbubbla nere till vänster. Porträttet (renderat ur
// modellen) i en rund ram på pappersgrund med guldring, namnet i Young Serif och
// guld med Campus som etikett, repliken på papper med en pil mot porträttet och
// knappen Vidare. Ersätter de enkla korten från ORDER 313 (nx-speech).

import { t as tt } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import asaPortrait from './screens/img/asa-portratt-256.png';
import './asaBubble.css';

export function AsaPortrait({ className }: { className?: string }) {
  return <div className={`nx-asa-portrait ${className ?? ''}`} style={{ backgroundImage: `url(${asaPortrait})` }} aria-hidden data-testid="portrait-asa" />;
}

export function AsaBubble({ line, onNext, testId, step, nextTestId }: { line: string; onNext: () => void; testId?: string; step?: string; nextTestId?: string }) {
  const lang = useLanguage();
  return (
    <div className="nx nx-asa-bubble" role="status" data-testid={testId ?? 'mentor'} data-step={step}>
      <AsaPortrait />
      <div className="nx-asa-col">
        <div className="nx-asa-who">
          <span className="nx-asa-name" data-testid="sender" data-sender="asa">{tt(lang, 'asa.name')}</span>
          <span className="nx-asa-from">{tt(lang, 'asa.from')}</span>
        </div>
        <div className="nx-asa-paper">
          <p className="nx-asa-line" data-testid="asa-line">{line}</p>
          <button type="button" className="nx-asa-next" data-testid={nextTestId} onClick={onNext}>{tt(lang, 'asa.next')}</button>
        </div>
      </div>
    </div>
  );
}
