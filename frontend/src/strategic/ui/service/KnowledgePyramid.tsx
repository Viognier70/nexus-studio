// ORDER 290 — kunskapspyramiden (Vision Owner 2026-09-30; Designs leverans
// rätt, fel och pyramiden §3, WARM_RIGHT_WRONG.pyramid och .floor): tre
// våningar, episteme (vad) i botten, techne (hur) i mitten och phronesis (när
// och varför) i toppen, med våningarnas namn till höger.
// - Pågår: kant i ljuslåga som pulserar långsamt.
// - Fylls (rätt svar): grönt stiger nedifrån, våningen blinkar och lyfter.
// - Spricker (fel svar): våningen skakar, en röd spricka ritas och kanten blir
//   röd och streckad; våningarna ovanför släcks till 38 %.
// - Hel pyramid: guld nedifrån och upp, strålar och ett lugnt sken.
// Stegets multiplikator i Back your knowledge (balance.ts BACK.stepMultiplier)
// står vid våningens namn.

import { strings } from '../../../content/strings';
import { t as tt } from '../../../content/nexusStrings';
import { useLanguage } from '../../../content/language';
import { BACK } from '../../../sim/balance';
import { WARM_RIGHT_WRONG } from '../../../ui/theme/nexusTheme.warm.rattfel';

export type LevelState = 'empty' | 'current' | 'filled' | 'cracked';

const AXES = ['episteme', 'techne', 'phronesis'] as const;
const P = WARM_RIGHT_WRONG.pyramid;
const half = (y: number) => (P.baseHalf * (y - P.apex[1])) / (P.baseY - P.apex[1]);
function band(axis: (typeof AXES)[number]): string {
  const [y0, y1] = P.bands[axis];
  const cx = P.apex[0];
  return `${cx - half(y0)},${y0} ${cx + half(y0)},${y0} ${cx + half(y1)},${y1} ${cx - half(y1)},${y1}`;
}

export function KnowledgePyramid({ levels, full, small = false, testId, showMult = false }: { levels: LevelState[]; full: boolean; small?: boolean; testId?: string; showMult?: boolean }) {
  const lang = useLanguage();
  const cracked = levels.indexOf('cracked');
  const asks = strings.service.incident.stepAsks as Record<string, string>;
  const mult = (i: number) => `×${(BACK.stepMultiplier[i] ?? 1).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')}`;
  const stateOf = (i: number): string => (full ? 'gold' : cracked >= 0 && i > cracked ? 'above' : levels[i] ?? 'empty');
  return (
    <div className="nx-pyramid" data-small={small} data-full={full} data-testid={testId} role="img"
      aria-label={strings.pyramid.aria(levels.filter((l) => l === 'filled').length, levels.length)}>
      <svg viewBox={`0 0 ${P.viewBox[0]} ${P.viewBox[1]}`} className="nx-pyr-svg" aria-hidden>
        <defs>
          {AXES.map((a) => <clipPath key={a} id={`nx-pyr-${a}${testId ?? ''}`}><polygon points={band(a)} /></clipPath>)}
        </defs>
        {full && !small && Array.from({ length: WARM_RIGHT_WRONG.motion.pyramidFull.rays.count }, (_, k) => {
          const ang = (-90 + (k - 5) * 16) * (Math.PI / 180);
          return <line key={k} className="nx-pyr-ray" style={{ animationDelay: `${k * 30}ms` }} x1={P.apex[0]} y1={P.apex[1]} x2={P.apex[0] + Math.cos(ang) * 60} y2={P.apex[1] + Math.sin(ang) * 60} />;
        })}
        {AXES.map((a, i) => {
          const [y0, y1] = P.bands[a];
          const st = stateOf(i);
          return (
            <g key={a} className="nx-pyr-floor" data-state={st} data-testid={testId ? `${testId}-${a}` : undefined} style={{ animationDelay: full ? `${i * WARM_RIGHT_WRONG.motion.pyramidFull.goldSweep.stagger}ms` : undefined }}>
              <polygon points={band(a)} className="nx-pyr-bg" />
              <g clipPath={`url(#nx-pyr-${a}${testId ?? ''})`}>
                <rect className="nx-pyr-fill" x={0} y={y0} width={P.viewBox[0]} height={y1 - y0} style={{ transformOrigin: `0 ${y1}px` }} />
              </g>
              {st === 'cracked' && <polyline className="nx-pyr-crack" points={`${P.apex[0] - 6},${y0} ${P.apex[0] + 8},${(y0 + y1) / 2 - 8} ${P.apex[0] - 4},${(y0 + y1) / 2 + 6} ${P.apex[0] + 6},${y1}`} />}
              <polygon points={band(a)} className="nx-pyr-edge" />
            </g>
          );
        })}
      </svg>
      {!small && (
        <ul className="nx-pyr-legend">
          {[2, 1, 0].map((i) => (
            <li key={i} data-state={stateOf(i)}>
              <span className="nx-pyr-dot" />
              <strong>{strings.service.incident.stepName[AXES[i]]}</strong>
              <span className="nx-small">{asks[AXES[i]] ? asks[AXES[i]].charAt(0).toUpperCase() + asks[AXES[i]].slice(1) : ''}</span>
              {showMult && <span className="nx-pyr-mult">{mult(i)}</span>}
            </li>
          ))}
        </ul>
      )}
      {full && !small && <span className="nx-pyr-cheer" aria-hidden>{tt(lang, 'pyramid.full')}</span>}
    </div>
  );
}

// ORDER 299 (Vision Owner 2026-10-03, "Raketen och rummet"): "Pyramidpanelen
// krymps till en smal list med multiplikatorerna och säkerheten på en rad."
// Pyramiden i liten form, våningarna som tre chips med sin multiplikator, och
// säkerheten i Back your knowledge. Våningarnas tillstånd som i den stora.
export function PyramidStrip({ levels, full, testId, showMult, confidence }: { levels: LevelState[]; full: boolean; testId?: string; showMult: boolean; confidence: string | null }) {
  const lang = useLanguage();
  const cracked = levels.indexOf('cracked');
  const stateOf = (i: number): string => (full ? 'gold' : cracked >= 0 && i > cracked ? 'above' : levels[i] ?? 'empty');
  const mult = (i: number) => `×${(BACK.stepMultiplier[i] ?? 1).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')}`;
  return (
    <div className="nx-pyr-strip" data-testid={testId} data-full={full}>
      <KnowledgePyramid levels={levels} full={full} small testId={testId ? `${testId}-mini` : undefined} />
      <ol className="nx-pyr-chips">
        {AXES.map((a, i) => (
          <li key={a} className="nx-pyr-chip" data-state={stateOf(i)} data-testid={testId ? `${testId}-${a}` : undefined}>
            <span className="nx-pyr-dot" />
            <span>{strings.service.incident.stepName[a]}</span>
            {showMult && <strong className="nx-pyr-mult">{mult(i)}</strong>}
          </li>
        ))}
      </ol>
      {confidence && <span className="nx-pyr-sure" data-testid="pyramid-strip-confidence">{confidence}</span>}
    </div>
  );
}
