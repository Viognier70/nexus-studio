// ORDER 299 (Vision Owner 2026-10-03): "Mätaren 'Stämningen i rummet' står där
// linjen med lyktorna satt. Den visar rummets samlade stämning just nu, som
// ett medel av gästernas stämningsvärden." Designs D1 §5 (MOOD_METER):
// etiketten, symbolen för rummets läge med ordet, och ett spår i fem steg med
// en fyllning i guld. Inga siffror.
// - Stiger: fyllningen växer på moveMs och lyser upp, symbolen lyfter.
// - Sjunker: det som förlorades står kvar streckat i lossHoldMs, symbolen skakar.
// - Mätaren ändras efter symbolerna över borden: delayAfterSymbolMs, och i
//   konsekvensögonblicket först vid CONSEQUENCE.meter.at efter svaret.
// Värdet: sim/guestMood.ts roomMoodValue med dödzonen i stableRoomMood.

import { useEffect, useRef, useState } from 'react';
import { t as tt, type StringKey } from '../../../content/nexusStrings';
import { useLanguage } from '../../../content/language';
import { useSimState } from '../../simulation/SimulationProvider';
import { consequenceElapsed } from '../../simulation/consequence';
import { meterFill, meterMove, roomMoodValue, stableRoomMood, type MoodId } from '../../../sim/guestMood';
import { CONSEQUENCE, MOOD_METER } from '../../scene/guestMood';
import { MoodSymbol } from './MoodSymbol';
import './host.css';

export function MoodMeter() {
  const sim = useSimState();
  const lang = useLanguage();
  const value = roomMoodValue(sim);
  const stable = useRef<MoodId | null>(null);
  stable.current = stableRoomMood(stable.current, value);
  const mood = stable.current;
  const fill = meterFill(value);
  const [shown, setShown] = useState<{ mood: MoodId | null; fill: number }>({ mood, fill });
  const [change, setChange] = useState<{ dir: 'up' | 'down'; from: number; key: number } | null>(null);
  // I konsekvensögonblicket väntar mätaren till CONSEQUENCE.meter.at.
  const moment = consequenceElapsed(sim);
  const holdMs = moment !== null && moment < CONSEQUENCE.meter.at ? (CONSEQUENCE.meter.at - moment) * 1000 : MOOD_METER.delayAfterSymbolMs;
  const afterAnswer = moment !== null && moment < CONSEQUENCE.durationS;
  const move = meterMove(shown.fill, fill, afterAnswer);
  const pending = move !== null || mood !== shown.mood;

  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => {
      const dir = meterMove(shown.fill, fill, afterAnswer);
      if (dir) setChange({ dir, from: shown.fill, key: Date.now() });
      setShown({ mood, fill: dir ? fill : shown.fill });
    }, holdMs);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, mood, move]);

  useEffect(() => {
    if (!change) return;
    const id = window.setTimeout(() => setChange(null), change.dir === 'down' ? MOOD_METER.lossHoldMs : MOOD_METER.moveMs);
    return () => window.clearTimeout(id);
  }, [change]);

  const word = shown.mood ? tt(lang, `mood.${shown.mood}` as StringKey) : tt(lang, 'rival.noGuests');
  const lostFrom = change?.dir === 'down' ? change.from : shown.fill;
  return (
    <div className="nx-mood-meter" data-testid="mood-meter" data-mood={shown.mood ?? ''} data-fill={shown.fill.toFixed(2)} data-change={change?.dir ?? ''}
      role="img" aria-label={tt(lang, 'hud.mood.a11y' as StringKey, { mood: word })}>
      <div className="nx-label">{tt(lang, 'hud.mood.title' as StringKey)}</div>
      <div className="nx-mood-head">
        {shown.mood && <span className="nx-mood-sym" key={change?.key ?? 0} data-change={change?.dir ?? ''}><MoodSymbol mood={shown.mood} /></span>}
        <span className="nx-mood-word">{word}</span>
      </div>
      <div className="nx-mood-track" aria-hidden data-glow={change?.dir === 'up'}>
        {Array.from({ length: MOOD_METER.steps }, (_, i) => {
          const part = Math.max(0, Math.min(1, shown.fill - i));
          const lost = Math.max(0, Math.min(1, lostFrom - i)) - part;
          return (
            <span key={i} className="nx-mood-step">
              <span className="nx-mood-fill" style={{ width: `${part * 100}%` }} />
              {lost > 0 && <span className="nx-mood-lost" style={{ left: `${part * 100}%`, width: `${lost * 100}%` }} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}
