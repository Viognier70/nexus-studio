// ORDER 303 G (Anders 2026-10-04, provspel: "Pyramiden blev väldigt liten,
// och den var det mest spännande att se"): pyramidens ögonblick stort i den
// fria ytan.
//
// ORDER 310 (Anders 2026-10-05) — Designs kvitt eller dubbelt
// (documentation/leveranser/nexus-leverans-2026-10-05-kvitt-eller-dubbelt,
// LEVERANSNOT §0 och §3, pyramidStake.ts STAKE_MOMENT) ersätter ögonblicket
// och de tillfälliga knapparna från ORDER 305b. En kolumn i mitten av den
// fria ytan till höger om raketkortet:
//   - pyramiden (34 % av höjden, mitt på 40 %) i raketens egen ordning
//     (incident.steps[].axis, nedifrån och upp);
//   - raden Steg n · Axis · potten a → b om rätt (64,5 %), med fälten
//     Potten / Dubbelt + steget / Stegets kredit, Potten är borta / Potten var tom;
//   - valet efter varje rätt steg som inte är det sista (73,5 %): Stanna och
//     Gå vidare med nedräkningen i en ring mellan dem (8 s, de tre sista
//     sekunderna pulserar ringen i ljuslåga) och raden "När tiden går ut stannar du".
// Ögonblicket visas vid både rätt och fel (Designs §3).
//
// ORDER 310b (Anders 2026-10-05) — låset och väntan före avgörandet. Motorn
// låser svaret vid trycket och avgör det INCIDENTS.verdictSeconds senare
// (sim/incidents.ts `pending`), så kolumnen har två lägen till:
//   lock (0–900 ms): marken med kreditsymbolen och potten glider upp på
//         steget 150–780 och låset slår igen vid 900 (INCIDENTS.lockSeconds);
//   wait (900–3 800 ms): steget pulserar från glöd till ljuslåga, perioden
//         kortas från 900 till 320 ms (Designs waitPulse), raden visar
//         potten → om rätt. Avgörandet kommer när motorn avgör svaret.
// Reducerad rörelse: pulsen står still på 100 % och marken tonas in. Tiderna
// är desamma, eftersom väntan är spelets regel.
// Tiderna nedan i ms från avgörandet (D).
//   rätt: våningen fylls 0–500 (flash 500–750), potten rullar upp i 8 steg
//         200–900 (STAKE_MOMENT.right.potRoll);
//   fel:  våningen skakar och spricker, marken faller 200–900, potten slocknar
//         200–700; kolumnen tonas ut från 1 800 (wrong.back);
//   hel pyramid: står i mitten och krymper 2 150–2 600 (D5 pyramidMoment.ts t.shrink);
//   stannade: valet står kvar med Stanna markerad i 1 200 ms.
// Tal: potten är simuleringens (sim/incidents.ts growPot: potten × growth +
// stegets kredit, DOUBLE_OR_NOTHING i balance.ts). "Om rätt" räknas med
// samma regel (potIfRight nedan). ORDER 322: pyramiden står liten i raden.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GraduationCap, Lock, LockOpen } from 'lucide-react';
import { strings } from '../../../content/strings';
import { DOUBLE_OR_NOTHING, INCIDENTS } from '../../../sim/balance';
import type { KnowledgeAxis } from '../../types';
import { KnowledgePyramid, floorBand, PYRAMID_CROP, type LevelState } from './KnowledgePyramid';

/** D5 pyramidMoment.ts t.hold + t.shrink: den hela pyramiden står 1,5 s och krymper till 2 600 ms. */
export const PYRAMID_MOMENT_MS = 2600;
/** Designs tider (pyramidStake.ts STAKE_MOMENT), ms från avgörandet. */
export const STAKE_T = {
  fill: [0, 500],
  potRoll: [200, 900],
  potRollSteps: 8,
  wrongBack: 1800,
  wrongOut: 2250,
  doneShrink: [2150, 2600],
  stoppedHold: 1200,
  lastSeconds: 3,
  /** Väntan: pulsens period från 900 till 320 ms (pyramidStake.ts STAKE_MOMENT.wait.pulse). */
  waitPulseMs: [900, 320]
} as const;

/** Designs waitPulse (pyramidStake.ts): 0–1 vid ms från trycket, fasen integreras så att den inte hoppar.
 *  Väntan räknas från låset (INCIDENTS.lockSeconds) till avgörandet (INCIDENTS.verdictSeconds). */
export function waitPulse(ms: number): number {
  const a = INCIDENTS.lockSeconds * 1000, b = INCIDENTS.verdictSeconds * 1000;
  const [p0, p1] = STAKE_T.waitPulseMs;
  const u = Math.max(0, Math.min(1, (ms - a) / (b - a))), f0 = 1 / p0, f1 = 1 / p1;
  const phase = (b - a) * (f0 * u + (f1 - f0) * u * u / 2);
  return 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
}

/** Potten efter ett rätt steg med bästa svaret: potten × growth + potStep (sim/incidents.ts growPot). */
export function potIfRight(pot: number): number {
  return pot * DOUBLE_OR_NOTHING.growth + DOUBLE_OR_NOTHING.potStep;
}

export type StakePhase = 'lock' | 'wait' | 'right' | 'choosing' | 'done' | 'wrong' | 'stopped';

function useElapsed(untilMs: number): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      const e = performance.now() - start;
      setT(e);
      if (e >= untilMs) window.clearInterval(id);
    }, 50);
    return () => window.clearInterval(id);
  }, [untilMs]);
  return t;
}

function prefersReduced(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function PyramidMoment({
  phase,
  axes,
  step,
  levels,
  potBefore,
  potAfter,
  choiceLeft = DOUBLE_OR_NOTHING.choiceSeconds,
  onStop,
  onGo
}: {
  phase: StakePhase;
  /** Raketens steg nedifrån och upp (incident.steps[].axis). */
  axes: readonly KnowledgeAxis[];
  /** Steget som avgjordes, 0 = det första. */
  step: number;
  levels: LevelState[];
  /** Potten före steget (krediter). */
  potBefore: number;
  /** Potten efter steget: rätt = den nya potten, stannade = potten som togs. */
  potAfter: number;
  choiceLeft?: number;
  onStop?: () => void;
  onGo?: () => void;
}) {
  const [gone, setGone] = useState(false);
  const life = phase === 'done' ? STAKE_T.doneShrink[1] : phase === 'wrong' ? STAKE_T.wrongOut : phase === 'stopped' ? STAKE_T.stoppedHold : 0;
  useEffect(() => {
    if (!life) return;
    const id = window.setTimeout(() => setGone(true), life);
    return () => window.clearTimeout(id);
  }, [life]);
  const waiting = phase === 'lock' || phase === 'wait';
  const t = useElapsed(waiting ? INCIDENTS.verdictSeconds * 1000 : 1000);
  if (gone) return null;

  const p = strings.pyramidMoment;
  const k = strings.rocket.card.kvitt;
  const reduced = prefersReduced();
  const right = phase !== 'wrong';
  const last = step >= axes.length - 1;
  const stepName = strings.service.incident.stepName[axes[step] ?? 'episteme'];

  // Potten i raden. Vid rätt rullar den upp i 8 steg (200–900 ms); vid fel slocknar den.
  const [r0, r1] = STAKE_T.potRoll;
  const rolls = phase === 'right' || phase === 'done';
  const roll = !rolls ? 1 : reduced ? (t >= r0 ? 1 : 0) : Math.floor(Math.max(0, Math.min(1, (t - r0) / (r1 - r0))) * STAKE_T.potRollSteps) / STAKE_T.potRollSteps;
  const shownPot = right ? Math.round(potBefore + (potAfter - potBefore) * roll) : potBefore;
  const potLabel = waiting ? p.pot : !right ? (potBefore > 0 ? p.gone : p.none) : phase === 'stopped' ? p.pot : potBefore > 0 ? p.doubled : p.first;
  // ORDER 322 A2 — "Om rätt" är potten efter nästa rätta svar (1 → 3 → 7): i väntan och vid fel svaret som
  // avgjordes, efter ett rätt steg nästa steg. Efter det sista steget, eller när spelaren stannat, finns inget nästa.
  const ifRight = waiting || !right ? potIfRight(potBefore) : last || phase === 'stopped' ? null : potIfRight(potAfter);
  // ORDER 310b — pulsen i väntan (0–1); stilla på 100 % med reducerad rörelse.
  const pulse = phase === 'wait' ? (reduced ? 1 : waitPulse(t)) : 0;

  // Valet: efter varje rätt steg som inte är det sista. Stannade: Stanna markerad.
  const showChoice = (phase === 'choosing' || phase === 'stopped') && !last;
  // Bara Stanna kan visas vald: efter Gå vidare öppnas nästa steg direkt.
  const picked = phase === 'stopped' ? 'stop' : null;
  const total = DOUBLE_OR_NOTHING.choiceSeconds;
  const secs = Math.max(0, Math.ceil(choiceLeft));
  const lastSecs = phase === 'choosing' && secs <= STAKE_T.lastSeconds;
  const nextName = !last ? strings.service.incident.stepName[axes[step + 1]] : '';
  const nextLevels = levels.map((l, i) => (phase === 'choosing' && i === step + 1 && l === 'empty' ? 'next' : l)) as LevelState[];
  // Marken: brässmarken med kreditsymbolen och potten som stod på spel. Den faller vid fel.
  const [y0, y1] = floorBand(step);
  // ORDER 323 §3 — pyramiden ritas i den täta ramen (PYRAMID_CROP), så marken räknas i den.
  const tokenTop = (((y0 + y1) / 2 - PYRAMID_CROP.y) / PYRAMID_CROP.h) * 100;

  return createPortal(
    <div className="nx nx-stake" role="status" data-testid="pyramid-moment" data-phase={phase} data-step={step} data-axis={axes[step]} data-reduced={reduced || undefined}
      aria-label={waiting ? p.onTable : undefined}>
      <div className="nx-stake-col">
        <div className="nx-stake-row" data-testid="pyramid-moment-line" data-out={phase === 'wrong' || undefined} aria-label={p.rowAria(stepName, potBefore, ifRight ?? potAfter)}>
          {/* ORDER 322 A1 — den lilla pyramiden i raden, bredvid steget; inget ritas över rummet. */}
          <div className="nx-stake-pyr" data-testid="stake-pyramid" data-shrink={phase === 'done' || undefined} data-out={phase === 'wrong' || undefined}
            style={waiting ? { ['--stake-pulse' as string]: pulse.toFixed(3) } : undefined} data-pulse={waiting ? pulse.toFixed(2) : undefined}>
            <KnowledgePyramid levels={nextLevels} full={phase === 'done'} axes={axes} legend={false} crop instantBelow={step} testId="pyramid-moment-pyramid" />
            {waiting && (
              // ORDER 310b — marken på steget och mässingslåset (öppet tills låset slår igen).
              <span className="nx-stake-token" data-phase={phase} data-testid="stake-token" style={{ top: `${tokenTop}%` }} aria-hidden>
                <GraduationCap size="42%" strokeWidth={2.2} />
                {potBefore > 0 && <span>{potBefore}</span>}
                <span className="nx-stake-lock" data-testid="stake-lock" data-shut={phase === 'wait' || undefined}>
                  {phase === 'wait' ? <Lock size="100%" strokeWidth={2.4} /> : <LockOpen size="100%" strokeWidth={2.4} />}
                </span>
              </span>
            )}
            {!right && (
              <span className="nx-stake-token" data-testid="stake-token" style={{ top: `${tokenTop}%` }} aria-hidden>
                <GraduationCap size="42%" strokeWidth={2.2} />
                {potBefore > 0 && <span>{potBefore}</span>}
              </span>
            )}
          </div>
          <div className="nx-stake-cell" data-kind="step" data-state={waiting ? 'wait' : right ? 'right' : 'wrong'} data-testid="stake-step">
            <span className="nx-stake-label">{p.stepTerm(step + 1)}</span>
            <span className="nx-stake-val">{stepName}</span>
          </div>
          <span className="nx-stake-op" aria-hidden>·</span>
          <div className="nx-stake-cell" data-kind="pot" data-state={right || waiting ? 'lit' : 'out'} data-doubled={rolls && t >= r0 ? true : undefined} data-testid="stake-pot" data-value={shownPot}>
            <span className="nx-stake-label">{potLabel}</span>
            <span className="nx-stake-val"><GraduationCap className="nx-stake-icon" aria-hidden /><span data-testid="stake-pot-value">{shownPot}</span></span>
          </div>
          {ifRight !== null && <>
            <span className="nx-stake-op" data-after={!waiting || undefined} aria-hidden>→</span>
            <div className="nx-stake-cell" data-kind="ifRight" data-after={!waiting || undefined} data-testid="stake-if-right" data-value={ifRight}>
              <span className="nx-stake-label">{p.ifRight}</span>
              <span className="nx-stake-val"><GraduationCap className="nx-stake-icon" aria-hidden /><span>{ifRight}</span></span>
            </div>
          </>}
        </div>

        {waiting && <p className="nx-stake-note nx-stake-wait-note" data-testid="stake-wait-note">{p.onTable}</p>}

        {showChoice && (
          <div className="nx-stake-choice" data-testid="incident-kvitt" role="group" aria-label={k.aria} data-picked={picked ?? undefined}>
            <div className="nx-stake-choices">
              <button type="button" className="nx-stake-opt" data-kind="stop" data-picked={picked === 'stop' || undefined}
                data-testid="incident-kvitt-stop" aria-keyshortcuts="1" disabled={phase !== 'choosing'} onClick={onStop}>
                <span className="nx-stake-key" aria-hidden>1</span>
                <span className="nx-stake-opt-text"><strong>{k.stop}</strong><span data-testid="incident-kvitt-stop-sub">{k.stopSub(potAfter)}</span></span>
              </button>
              <div className="nx-stake-ring" role="timer" data-testid="stake-countdown" data-last={lastSecs || undefined} data-value={picked ? '' : secs}
                aria-label={k.secondsLeft(secs)} style={{ ['--stake-ring' as string]: `${(360 * Math.max(0, Math.min(1, choiceLeft / total))).toFixed(1)}deg` }}>
                <span>{picked ? '' : secs}</span>
              </div>
              <button type="button" className="nx-stake-opt" data-kind="go" data-dim={picked === 'stop' || undefined}
                data-testid="incident-kvitt-go" aria-keyshortcuts="2" disabled={phase !== 'choosing'} onClick={onGo}>
                <span className="nx-stake-key" aria-hidden>2</span>
                <span className="nx-stake-opt-text"><strong>{k.go}</strong><span data-testid="incident-kvitt-go-sub">{k.goSub(nextName, potAfter, potIfRight(potAfter))}</span></span>
              </button>
            </div>
            <p className="nx-stake-note" data-testid="stake-note">{picked ? k.pickedStop : k.timeout}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
