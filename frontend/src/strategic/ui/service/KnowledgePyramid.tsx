// ORDER 290 — kunskapspyramiden (Vision Owner 2026-09-30): "en pyramid i
// raketkortet med episteme i botten, techne i mitten och phronesis i toppen.
// Varje rätt svar fyller sin våning, och insatsen (×1, ×1,5, ×2) syns på
// våningen. En full pyramid firas. I kvällens resultat visas kvällens
// pyramider." Multiplikatorerna är Back your knowledge-stegens
// (balance.ts BACK.stepMultiplier).

import { strings } from '../../../content/strings';
import { useLanguage } from '../../../content/language';
import { BACK } from '../../../sim/balance';

export type LevelState = 'empty' | 'current' | 'filled' | 'cracked';

const AXES = ['episteme', 'techne', 'phronesis'] as const;

export function KnowledgePyramid({ levels, full, small = false, testId }: { levels: LevelState[]; full: boolean; small?: boolean; testId?: string }) {
  const lang = useLanguage();
  const mult = (i: number) => `×${(BACK.stepMultiplier[i] ?? 1).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')}`;
  // Toppen först i DOM:en (phronesis), botten sist (episteme).
  const order = [2, 1, 0];
  return (
    <div className="nx-pyramid" data-small={small} data-full={full} data-testid={testId} aria-label={strings.pyramid.aria(levels.filter((l) => l === 'filled').length, levels.length)} role="img">
      {order.map((i) => (
        <div key={i} className="nx-pyr-level" data-level={i} data-state={levels[i] ?? 'empty'} data-testid={testId ? `${testId}-${AXES[i]}` : undefined}>
          {!small && <span className="nx-pyr-name">{strings.service.incident.stepName[AXES[i]]}</span>}
          {!small && <span className="nx-pyr-mult">{mult(i)}</span>}
        </div>
      ))}
      {full && !small && <span className="nx-pyr-cheer" aria-hidden>{strings.pyramid.full}</span>}
    </div>
  );
}
