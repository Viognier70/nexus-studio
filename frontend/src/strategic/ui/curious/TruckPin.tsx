// ORDER 320 — Designs D10 (truckSituations.ts SITUATION_PINS): HUD-nålen vid ett föremål vid vagnen, med vem eller
// vad som säger det och texten (kortläsaren, Swish-skylten, Grillvagnens skylt). Texten står i HUD:en, aldrig i
// bilden. Html i scenen (TruckSituationsScene.tsx) sätter nålen ovanför föremålet.

import { useLanguage } from '../../../content/language';
import { t as tt, type StringKey } from '../../../content/nexusStrings';
import './curious.css';

export function TruckPin({ who, text, vars, testId }: { who: StringKey; text: StringKey; vars?: Record<string, string | number>; testId: string }) {
  const lang = useLanguage();
  return (
    <div className="nx-truck-pin" data-testid={testId}>
      <div className="nx-truck-pin-who">{tt(lang, who)}</div>
      <div className="nx-truck-pin-text">{tt(lang, text, vars)}</div>
    </div>
  );
}
