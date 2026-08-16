// ORDER 113 §2.3 — figur-komponent, portad från prototypens `Guest`
// (rad 87-149 i guest-reel.jsx).
//
// Renderar en figur som SVG med armar, ben, torso och huvud. Pose-
// värden (i grader) kommer från `rig.ts`. Positiva vinklar svänger
// framåt (+x); rendering använder negation för att SVG-y-axeln pekar
// nedåt — vinkel `p.lean=5.5` blir `rotate(-5.5)` i SVG.
//
// **Vad "lemvinkel" innebär i grep-verifieringstermer:** funktionerna
// `Arm` och `Leg` nedan tar en `a: [number, number]`-vinkeltupel och
// applicerar den som `rotate(${-a[0]})` på hip-leden respektive
// `rotate(${-a[1]})` på knä-leden. Grep på `rotate(${` i denna fil
// returnerar därför en punkt per lem-rotation.

import type { Pose, FigureVariant } from './rig';
import { RIG_INK, RIG_FAR, RIG_ACCENT, RIG_GROUND } from './rig';

interface ArmProps {
  a: [number, number];
  fill: string;
}

function Arm({ a, fill }: ArmProps) {
  return (
    <g transform={`translate(0,-96) rotate(${-a[0]})`}>
      <rect x={-9} y={0} width={18} height={48} fill={fill} />
      <g transform={`translate(0,48) rotate(${-a[1]})`}>
        <rect x={-8} y={0} width={16} height={44} fill={fill} />
        <rect x={-9} y={44} width={18} height={15} fill={fill} />
      </g>
    </g>
  );
}

interface LegProps {
  a: [number, number];
  fill: string;
}

function Leg({ a, fill }: LegProps) {
  return (
    <g transform={`rotate(${-a[0]})`}>
      <rect x={-11} y={0} width={22} height={60} fill={fill} />
      <g transform={`translate(0,60) rotate(${-a[1]})`}>
        <rect x={-10} y={0} width={20} height={62} fill={fill} />
        <rect x={-9} y={62} width={34} height={12} fill={fill} />
      </g>
    </g>
  );
}

interface HeadProps {
  headAngle: number;
  mouth: number;
  variant: FigureVariant;
}

function Head({ headAngle, mouth, variant }: HeadProps) {
  return (
    <g transform={`translate(0,-112) rotate(${-headAngle})`}>
      {/* Nacke */}
      <rect x={-11} y={-16} width={22} height={18} fill={RIG_INK} />
      {/* Ansikte (bakgrund + kontur) */}
      <rect
        x={-27}
        y={-70}
        width={54}
        height={58}
        fill={RIG_GROUND}
        stroke={RIG_INK}
        strokeWidth={4}
      />
      {/* Hatt/topping-varianter */}
      {variant === 'Cap' && (
        <g>
          <rect x={-29} y={-78} width={58} height={18} fill={RIG_ACCENT} />
          <rect x={27} y={-66} width={26} height={7} fill={RIG_ACCENT} />
        </g>
      )}
      {variant === 'Bun' && (
        <g>
          <rect x={-29} y={-76} width={58} height={16} fill={RIG_INK} />
          <circle cx={-36} cy={-58} r={17} fill={RIG_INK} />
        </g>
      )}
      {variant === 'plain' && (
        <rect x={-29} y={-76} width={58} height={16} fill={RIG_INK} />
      )}
      {/* Öra */}
      <rect x={7} y={-48} width={8} height={10} fill={RIG_INK} />
      {/* Mun — höjd växer med mouth-värdet (0..1) */}
      <rect x={4} y={-30} width={14} height={2 + mouth * 9} fill={RIG_INK} />
    </g>
  );
}

export interface FigureProps {
  pose: Pose;
  x: number;
  y: number;
  scale: number;
  variant: FigureVariant;
  // Test-hook: data-attribut för grep i tester.
  id?: string;
}

// Huvudkomponenten — komponerar Arm/Leg/Head + torso enligt Guest-
// komponentens layer-ordning från prototypen (rad 114-148).
export function Figure({ pose, x, y, scale, variant, id }: FigureProps) {
  const p = pose;
  return (
    <g
      data-figure={id ?? 'anonymous'}
      data-figure-lean={p.lean.toFixed(3)}
      data-figure-leg-near={p.legNear[0].toFixed(3)}
      transform={`translate(${x},${y}) scale(${scale})`}
    >
      <g transform={`translate(0,${-122 + p.hipDrop}) rotate(${-p.lean})`}>
        {/* Bakre lem först — z-ordning så främre lem täcker */}
        <Leg a={p.legFar} fill={RIG_FAR} />
        <Arm a={p.armFar} fill={RIG_FAR} />
        {/* Torso */}
        <rect x={-31} y={-112} width={62} height={112} fill={RIG_INK} />
        {/* Accent-band längst upp på torson (halsring) */}
        <rect x={-34} y={-112} width={68} height={15} fill={RIG_ACCENT} />
        {/* Främre ben */}
        <Leg a={p.legNear} fill={RIG_INK} />
        {/* Huvud */}
        <Head headAngle={p.head} mouth={p.mouth} variant={variant} />
        {/* Främre arm — sist så den täcker torson */}
        <Arm a={p.armNear} fill={RIG_INK} />
      </g>
    </g>
  );
}
