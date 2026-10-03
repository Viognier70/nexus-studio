// ORDER 299 — stämningens symbol som SVG i HUD:en, ur Designs sökvägar
// (scene/guestMood.ts MOOD_SYMBOL, samma som duken ritar över borden).

import { MOOD_SYMBOL, type MoodId } from '../../scene/guestMood';

export function MoodSymbol({ mood, px = MOOD_SYMBOL.sizePx }: { mood: MoodId; px?: number }) {
  const s = MOOD_SYMBOL.moods[mood];
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" aria-hidden className="nx-mood-symbol" data-mood={mood}>
      <circle cx="12" cy="12" r="11.6" fill={s.halo} />
      <circle cx="12" cy="12" r={MOOD_SYMBOL.plateR} fill={s.plate} stroke={s.rim} strokeWidth={MOOD_SYMBOL.rimW} />
      {s.parts.map((p, i) => p.mode === 'fill'
        ? <path key={i} d={p.d} fill={s.glyph} fillRule={p.evenodd ? 'evenodd' : undefined} />
        : <path key={i} d={p.d} fill="none" stroke={s.glyph} strokeWidth={p.w ?? 2} strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
  );
}
