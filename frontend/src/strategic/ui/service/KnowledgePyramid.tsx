// ORDER 290 — kunskapspyramiden (Vision Owner 2026-09-30; Designs leverans
// rätt, fel och pyramiden §3, WARM_RIGHT_WRONG.pyramid och .floor): tre
// våningar, episteme (vad) i botten, techne (hur) i mitten och phronesis (när
// och varför) i toppen, med våningarnas namn till höger.
// - Pågår: kant i ljuslåga som pulserar långsamt.
// - Fylls (rätt svar): grönt stiger nedifrån, våningen blinkar och lyfter.
// - Spricker (fel svar): våningen skakar, en röd spricka ritas och kanten blir
//   röd och streckad; våningarna ovanför släcks till 38 %.
// - Hel pyramid: guld nedifrån och upp, strålar och ett lugnt sken.
// Stegets multiplikator i kvitt eller dubbelt (ORDER 305b: potten gånger
// DOUBLE_OR_NOTHING.growth för varje steg; förut BACK.stepMultiplier)
// står vid våningens namn.
// ORDER 310 (Anders 2026-10-05): pyramiden visar raketens egen ordning,
// nedifrån och upp som raketens steg (incident.steps[].axis). Våningarnas
// form och multiplikatorn hör till platsen (steg 1, 2, 3); namnen följer
// raketens steg, så att handlingen (techne) står i toppen i ORDER 306:s
// raketer (episteme, phronesis, techne). Utan `axes` gäller den gamla
// ordningen (episteme, techne, phronesis).

import { strings } from '../../../content/strings';
import { t as tt } from '../../../content/nexusStrings';
import { useLanguage } from '../../../content/language';
import { DOUBLE_OR_NOTHING } from '../../../sim/balance';
import { WARM_RIGHT_WRONG } from '../../../ui/theme/nexusTheme.warm.rattfel';
import type { KnowledgeAxis } from '../../types';

// ORDER 310 — 'next': våningen ovanför ett rätt steg medan spelaren väljer
// (Designs kvitt eller dubbelt §3: streckad kant i ljuslåga).
export type LevelState = 'empty' | 'current' | 'filled' | 'cracked' | 'next';

/** Den gamla, fasta ordningen nedifrån och upp (de 29 vinbarsraketerna). */
export const DEFAULT_AXES: readonly KnowledgeAxis[] = ['episteme', 'techne', 'phronesis'];
// Våningarnas platser nedifrån och upp i ramen 300 × 250. Banden i temat
// heter efter den gamla ordningen; här är de bara platser.
const SLOTS = ['episteme', 'techne', 'phronesis'] as const;
const P = WARM_RIGHT_WRONG.pyramid;
const half = (y: number) => (P.baseHalf * (y - P.apex[1])) / (P.baseY - P.apex[1]);
/** Våningen på plats i (0 = botten): y överkant och nederkant i ramen. */
export function floorBand(i: number): readonly [number, number] {
  return P.bands[SLOTS[Math.max(0, Math.min(SLOTS.length - 1, i))]] as unknown as readonly [number, number];
}
function band(i: number): string {
  const [y0, y1] = floorBand(i);
  const cx = P.apex[0];
  return `${cx - half(y0)},${y0} ${cx + half(y0)},${y0} ${cx + half(y1)},${y1} ${cx - half(y1)},${y1}`;
}
/** ORDER 323 §3 — ramen tätt kring våningarna (topp till botten, bredast vid
 *  botten), så att pyramiden i kvitt eller dubbelt blir lika hög som rutorna. */
export const PYRAMID_CROP = (() => {
  const top = P.bands[SLOTS[SLOTS.length - 1]][0];
  const bottom = P.bands[SLOTS[0]][1];
  const w = 2 * half(bottom);
  return { x: P.apex[0] - w / 2, y: top, w, h: bottom - top } as const;
})();
/** Raketens våningar nedifrån och upp: stegens kunskapsformer i raketens ordning. */
export function axesOf(steps: readonly { axis: KnowledgeAxis }[] | null | undefined): readonly KnowledgeAxis[] {
  return steps && steps.length > 0 ? steps.map((s) => s.axis) : DEFAULT_AXES;
}
/** Stegets multiplikator i kvitt eller dubbelt: plats i, inte kunskapsform. */
export function stepMult(i: number, lang: string): string {
  return `×${(DOUBLE_OR_NOTHING.growth ** i).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB')}`;
}

export function KnowledgePyramid({ levels, full, small = false, testId, showMult = false, axes = DEFAULT_AXES, instantBelow = -1, legend = !small, crop = false }: { levels: LevelState[]; full: boolean; small?: boolean; testId?: string; showMult?: boolean; axes?: readonly KnowledgeAxis[]; instantBelow?: number; legend?: boolean; crop?: boolean }) {
  const lang = useLanguage();
  const cracked = levels.indexOf('cracked');
  const asks = strings.service.incident.stepAsks as Record<string, string>;
  const mult = (i: number) => stepMult(i, lang);
  const stateOf = (i: number): string => (full ? 'gold' : cracked >= 0 && i > cracked ? 'above' : levels[i] ?? 'empty');
  const floors = axes.slice(0, SLOTS.length);
  return (
    <div className="nx-pyramid" data-small={small} data-full={full} data-testid={testId} role="img"
      aria-label={strings.pyramid.aria(levels.filter((l) => l === 'filled').length, levels.length)}>
      <svg viewBox={crop ? `${PYRAMID_CROP.x} ${PYRAMID_CROP.y} ${PYRAMID_CROP.w} ${PYRAMID_CROP.h}` : `0 0 ${P.viewBox[0]} ${P.viewBox[1]}`} className="nx-pyr-svg" aria-hidden>
        <defs>
          {floors.map((_, i) => <clipPath key={i} id={`nx-pyr-${i}${testId ?? ''}`}><polygon points={band(i)} /></clipPath>)}
        </defs>
        {full && !small && Array.from({ length: WARM_RIGHT_WRONG.motion.pyramidFull.rays.count }, (_, k) => {
          const ang = (-90 + (k - 5) * 16) * (Math.PI / 180);
          return <line key={k} className="nx-pyr-ray" style={{ animationDelay: `${k * 30}ms` }} x1={P.apex[0]} y1={P.apex[1]} x2={P.apex[0] + Math.cos(ang) * 60} y2={P.apex[1] + Math.sin(ang) * 60} />;
        })}
        {floors.map((a, i) => {
          const [y0, y1] = floorBand(i);
          const st = stateOf(i);
          return (
            <g key={`${i}:${a}`} className="nx-pyr-floor" data-state={st} data-axis={a} data-slot={i} data-instant={i < instantBelow || undefined} data-testid={testId ? `${testId}-${a}` : undefined} style={{ animationDelay: full ? `${i * WARM_RIGHT_WRONG.motion.pyramidFull.goldSweep.stagger}ms` : undefined }}>
              <polygon points={band(i)} className="nx-pyr-bg" />
              <g clipPath={`url(#nx-pyr-${i}${testId ?? ''})`}>
                <rect className="nx-pyr-fill" x={0} y={y0} width={P.viewBox[0]} height={y1 - y0} style={{ transformOrigin: `0 ${y1}px` }} />
              </g>
              {st === 'cracked' && <polyline className="nx-pyr-crack" points={`${P.apex[0] - 6},${y0} ${P.apex[0] + 8},${(y0 + y1) / 2 - 8} ${P.apex[0] - 4},${(y0 + y1) / 2 + 6} ${P.apex[0] + 6},${y1}`} />}
              <polygon points={band(i)} className="nx-pyr-edge" />
            </g>
          );
        })}
      </svg>
      {legend && (
        <ul className="nx-pyr-legend">
          {floors.map((_, i) => floors.length - 1 - i).map((i) => (
            <li key={i} data-state={stateOf(i)} data-axis={floors[i]}>
              <span className="nx-pyr-dot" />
              <strong>{strings.service.incident.stepName[floors[i]]}</strong>
              <span className="nx-small">{asks[floors[i]] ? asks[floors[i]].charAt(0).toUpperCase() + asks[floors[i]].slice(1) : ''}</span>
              {showMult && <span className="nx-pyr-mult">{mult(i)}</span>}
            </li>
          ))}
        </ul>
      )}
      {full && legend && <span className="nx-pyr-cheer" aria-hidden>{tt(lang, 'pyramid.full')}</span>}
    </div>
  );
}

// ORDER 299 (Vision Owner 2026-10-03, "Raketen och rummet"): "Pyramidpanelen
// krymps till en smal list med multiplikatorerna och säkerheten på en rad."
// Pyramiden i liten form, våningarna som tre chips med sin multiplikator, och
// säkerheten i Back your knowledge. Våningarnas tillstånd som i den stora.
// ORDER 310 — chipsen i raketens egen ordning (steg 1, 2, 3).
export function PyramidStrip({ levels, full, testId, showMult, confidence, axes = DEFAULT_AXES }: { levels: LevelState[]; full: boolean; testId?: string; showMult: boolean; confidence: string | null; axes?: readonly KnowledgeAxis[] }) {
  const lang = useLanguage();
  const cracked = levels.indexOf('cracked');
  const stateOf = (i: number): string => (full ? 'gold' : cracked >= 0 && i > cracked ? 'above' : levels[i] ?? 'empty');
  const mult = (i: number) => stepMult(i, lang);
  return (
    <div className="nx-pyr-strip" data-testid={testId} data-full={full}>
      <KnowledgePyramid levels={levels} full={full} small axes={axes} testId={testId ? `${testId}-mini` : undefined} />
      <ol className="nx-pyr-chips">
        {axes.slice(0, SLOTS.length).map((a, i) => (
          <li key={`${i}:${a}`} className="nx-pyr-chip" data-state={stateOf(i)} data-axis={a} data-testid={testId ? `${testId}-${a}` : undefined}>
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
