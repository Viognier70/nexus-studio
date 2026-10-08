// ORDER 319b — de nyfikna vid foodtruckens lucka: bubblan över huvudet och repliken från luckan (Designs
// D9 curiousMarker.ts och tilläggets HATCH_LINE). Ritas i scenen av scene/village/CuriousMarker.tsx
// (drei Html); DOM-delarna står här, som HostViews för hovmästarens nålar.

import { useEffect, useRef } from 'react';
import type { Lang } from '../../../content/language';
import { t as tt, type StringKey } from '../../../content/nexusStrings';
import './curious.css';

/** Designs mått (curiousMarker.ts CURIOUS_MARKER), pixlar vid 1440 × 900 och meter i världen. */
export const CURIOUS_MARKER = {
  bubble: { radiusPx: 13, offsetAboveHeadPx: 30, tailPx: 7, borderPx: 2, borderHoverPx: 3, hoverScale: 1.15, dots: 3, dotRadiusPx: 1.9, dotGapPx: 4.8 },
  colours: {
    paper: '#f5ead5', border: '#b98a3c', borderHover: '#f0cd82', dots: '#6b4a2e',
    talkingFill: '#f0cd82', talkingDots: '#2a1c13', ring: '#d9b476', ringTalking: '#f0cd82', arc: '#f0cd82', shadow: 'rgba(20,12,7,.35)'
  },
  ring: { radiusM: 0.44, dashM: [0.12, 0.09] as [number, number], widthM: 0.035, widthHoverM: 0.05 },
  arc: { radiusPx: 17.5, widthPx: 2.5 },
  fade: { inS: 0.3, outS: 0.5 },
  hit: { radiusPx: 23 }
} as const;

interface BubbleProps {
  lang: Lang;
  gold: boolean;
  hover: boolean;
  talkable: boolean;
  /** Andelen av tvekan som är kvar (bågen), eller null. */
  arc: number | null;
  scale: number;
  onHover: (h: boolean) => void;
  onOpen: () => void;
}

/** Pratbubblan: papper med mässingskant och tre prickar, spetsen ned mot huvudet. Guld när ni pratar. */
export function CuriousBubble({ lang, gold, hover, talkable, arc, scale, onHover, onOpen }: BubbleProps) {
  const B = CURIOUS_MARKER.bubble, C = CURIOUS_MARKER.colours, A = CURIOUS_MARKER.arc;
  const r = B.radiusPx, size = (A.radiusPx + A.widthPx + B.tailPx) * 2;
  const cx = size / 2, cy = size / 2;
  const edge = gold || hover ? C.borderHover : C.border, fill = gold ? C.talkingFill : C.paper;
  // Klicket på bubblan stannar vid bubblan: kamerans styrning (camera/useDesktopControls.ts) och scenens
  // klick (R3F, t.ex. torgets landmärke under bubblan, Landmarks.tsx) lyssnar på canvasens värd, som
  // bubblan ligger i, och Reacts egna lyssnare ligger högre upp. Därför lyssnar bubblan själv.
  const ref = useRef<HTMLDivElement>(null);
  const openRef = useRef(onOpen);
  openRef.current = onOpen;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    const click = (e: Event) => { e.stopPropagation(); openRef.current(); };
    for (const k of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'wheel']) el.addEventListener(k, stop);
    el.addEventListener('click', click);
    return () => { for (const k of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'wheel']) el.removeEventListener(k, stop); el.removeEventListener('click', click); };
  }, []);
  return (
    <div
      ref={ref}
      className="nx-curious-bubble"
      data-testid="curious-bubble"
      data-state={gold ? 'talking' : hover ? 'hover' : 'idle'}
      title={talkable ? tt(lang, 'curious.tip') : tt(lang, 'curious.talking')}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      style={{ transform: `translate(0, ${-B.offsetAboveHeadPx * scale}px) scale(${scale * (hover && !gold ? B.hoverScale : 1)})`, width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {arc !== null && (
          <circle cx={cx} cy={cy} r={A.radiusPx} fill="none" stroke={C.arc} strokeWidth={A.widthPx}
            strokeDasharray={`${2 * Math.PI * A.radiusPx * arc} ${2 * Math.PI * A.radiusPx}`}
            transform={`rotate(-90 ${cx} ${cy})`} />
        )}
        <path d={`M ${cx - B.tailPx * 0.7} ${cy + r - 2} L ${cx} ${cy + r + B.tailPx} L ${cx + B.tailPx * 0.7} ${cy + r - 2} Z`} fill={fill} stroke={edge} strokeWidth={B.borderPx} />
        <circle cx={cx} cy={cy} r={r} fill={fill} stroke={edge} strokeWidth={hover ? B.borderHoverPx : B.borderPx} />
        {Array.from({ length: B.dots }, (_, i) => (
          <circle key={i} cx={cx + (i - (B.dots - 1) / 2) * B.dotGapPx} cy={cy} r={B.dotRadiusPx} fill={gold ? C.talkingDots : C.dots} />
        ))}
      </svg>
    </div>
  );
}

/** Repliken från luckan: avsändaren (medhjälparen) och en av de fyra replikerna. */
export function HatchLine({ lang, line, scale }: { lang: Lang; line: number; scale: number }) {
  return (
    <div className="nx-hatch-line" data-testid="hatch-line" style={{ transform: `scale(${scale})` }}>
      <div className="nx-hatch-line-sender">{tt(lang, 'line.sender', { name: tt(lang, 'truck.assistant.name') })}</div>
      <div className="nx-hatch-line-text">{tt(lang, `line.${line + 1}` as StringKey)}</div>
    </div>
  );
}
