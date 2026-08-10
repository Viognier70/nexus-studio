// ORDER 047 §2 — the four instruments.
//
// Sits during service (lunch/dinner) as a compact vertical stack on
// the left edge, one block per instrument. Each block: an uppercase
// name label, a word band describing the current state, and a subtle
// filled bar behind. No numbers.
//
// The instruments show what the business is doing tonight (state) —
// distinct from the ORDER 043 §9 competence-meter prohibition (which
// stands for what the player has become). Business instruments are
// the trade: service level, guest satisfaction, staff morale, revenue.
//
// Reads that back into the room (Vision Owner's §2.1 sharpening):
// each instrument moves in response to what happened, and the moves
// propagate into the sim — morale in particular is the connective
// tissue (see simulation/morale.ts).

import { useEffect, useRef, useState } from 'react';
import { economicReadingNormalised } from '../simulation/cashReading';
import { useSimState } from '../simulation/SimulationProvider';
import { COVERS_PER_MEMBER } from '../simulation/team';
import type { SustainabilityKey } from '../types';

// -------- panel styles ---------------------------------------------------

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 96,
  left: 16,
  width: 220,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  pointerEvents: 'none',
  zIndex: 34
};

const BLOCK_STYLE: React.CSSProperties = {
  position: 'relative',
  padding: '8px 12px 10px',
  background: 'rgba(20, 14, 10, 0.62)',
  border: '1px solid rgba(168, 146, 106, 0.35)',
  borderRadius: 3,
  color: '#f0e8d4',
  fontFamily: 'system-ui, sans-serif',
  overflow: 'hidden'
};

const NAME_STYLE: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  opacity: 0.62,
  marginBottom: 2
};

const BAND_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.3
};

const BAR_TRACK_STYLE: React.CSSProperties = {
  position: 'relative',
  marginTop: 6,
  height: 3,
  background: 'rgba(168, 146, 106, 0.18)',
  borderRadius: 2,
  overflow: 'hidden'
};

const BAR_FILL_STYLE = (fraction: number): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: `${Math.max(0, Math.min(1, fraction)) * 100}%`,
  background: 'rgba(216, 190, 130, 0.75)',
  transition: 'width 0.35s ease-out'
});

// -------- readouts -------------------------------------------------------

// Rummets tempo — inverse of load. Load = active guests / capacity.
// Low load = "Lugnt"; mid = "Ihop"; high = "Under press"; overload = "Ur takt".
interface Reading {
  band: string;
  fraction: number;   // 0 = low, 1 = high — used to fill the bar
}

function tempoReading(activeGuests: number, teamCap: number): Reading {
  const load = activeGuests / Math.max(1, teamCap);
  // fraction climbs with load so a fuller bar reads as more strained.
  const fraction = Math.max(0, Math.min(1, load / 1.6));
  if (load < 0.4) return { band: 'Lugnt', fraction };
  if (load < 0.9) return { band: 'Ihop', fraction };
  if (load < 1.3) return { band: 'Under press', fraction };
  return { band: 'Ur takt', fraction };
}

function satisfactionReading(meanSat: number, hasSeated: boolean): Reading {
  if (!hasSeated) return { band: 'Väntar', fraction: 0 };
  if (meanSat >= 0.75) return { band: 'Nöjda', fraction: meanSat };
  if (meanSat >= 0.55) return { band: 'Balanserade', fraction: meanSat };
  if (meanSat >= 0.35) return { band: 'Otåliga', fraction: meanSat };
  return { band: 'Missnöjda', fraction: meanSat };
}

function moraleReading(morale: number): Reading {
  if (morale >= 0.85) return { band: 'På topp', fraction: morale };
  if (morale >= 0.65) return { band: 'Håller', fraction: morale };
  if (morale >= 0.40) return { band: 'Trötta', fraction: morale };
  return { band: 'Utmattade', fraction: morale };
}

function revenueReading(netRev: number, netCost: number): Reading {
  const ratio = netCost > 30 ? netRev / netCost : netRev / 30;
  // The bar fills as revenue crosses 0 → 2× cost (arbitrary but
  // readable). At ratio < 1 the bar is low (going back); at ratio ≥ 1
  // it's around half; at ratio 2 it's full.
  const fraction = Math.max(0, Math.min(1, ratio / 2));
  if (ratio < 0.9) return { band: 'Går back', fraction };
  if (ratio < 1.15) return { band: 'Täcker', fraction };
  return { band: 'Går över', fraction };
}

// -------- component -------------------------------------------------------

// ORDER 048 §3 — sustainability triad ("trade strip") that flashes
// when a capital moves. Three labeled cells above the four
// instruments; on a write, the affected cell gets a warm-gold
// border + direction glyph (↑ / ↓) that fades over ~1.8 s. Two
// simultaneous writes = two flashes in the same beat = the player
// sees the trade.

interface SustainabilityFlash {
  direction: 'up' | 'down';
  triggeredAtMs: number;   // wall-clock, not simTime — the flash
                           // envelope should run in real seconds so
                           // it stays perceptible at 2× / 4× speed.
}

const FLASH_DURATION_MS = 1800;
// Short labels — full "Ekologiskt" doesn't fit at 10 px in a ~70 px
// cell without wrapping. "Ekologi" reads as the same axis, matches
// the wager panel's noun form.
const SUSTAINABILITY_LABEL: Record<SustainabilityKey, string> = {
  economic:   'Ekonomi',
  social:     'Socialt',
  ecological: 'Ekologi'
};
const SUSTAINABILITY_ORDER: readonly SustainabilityKey[] = ['economic', 'social', 'ecological'];

const TRIAD_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginBottom: 4
};

const CELL_STYLE: React.CSSProperties = {
  flex: 1,
  padding: '5px 6px 5px 7px',
  background: 'rgba(20, 14, 10, 0.62)',
  border: '1px solid rgba(168, 146, 106, 0.35)',
  borderRadius: 3,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 9,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  color: '#f0e8d4',
  opacity: 0.62,
  transition: 'opacity 0.6s ease-out, border-color 0.6s ease-out',
  position: 'relative',
  minHeight: 20,
  boxSizing: 'border-box'
};

const CELL_FLASH_STYLE: React.CSSProperties = {
  ...CELL_STYLE,
  opacity: 1,
  borderColor: 'rgba(240, 214, 152, 0.95)',
  transition: 'none'
};

const GLYPH_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 4,
  right: 6,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0,
  color: '#f7ecd0'
};

export function InstrumentsPanel() {
  const sim = useSimState();
  const period = sim.day.period;

  // Track sustainability flash state — one entry per capital, or null
  // if no recent write. Wall-clock timestamps so the fade holds real
  // seconds regardless of sim speed. See ORDER 048 §3 flash design.
  const [flashes, setFlashes] = useState<Record<SustainabilityKey, SustainabilityFlash | null>>({
    economic: null,
    social: null,
    ecological: null
  });
  // ORDER 050 §3 (2026-08-10) — economic now derives from state.cash
  // via the shared reading helper; social/ecological remain stored.
  const currentReadings: Record<SustainabilityKey, number> = {
    economic: economicReadingNormalised(sim),
    social: sim.capitals.values.social,
    ecological: sim.capitals.values.ecological
  };
  const lastValuesRef = useRef<Record<SustainabilityKey, number>>(currentReadings);

  // On every render, detect capital-value changes and fire a flash.
  // Uses a small epsilon to filter float noise from clamp arithmetic.
  useEffect(() => {
    const EPSILON = 1e-4;
    const now = performance.now();
    const changes: Partial<Record<SustainabilityKey, SustainabilityFlash>> = {};
    for (const key of SUSTAINABILITY_ORDER) {
      const prev = lastValuesRef.current[key];
      const curr = currentReadings[key];
      const delta = curr - prev;
      if (Math.abs(delta) > EPSILON) {
        changes[key] = { direction: delta > 0 ? 'up' : 'down', triggeredAtMs: now };
        lastValuesRef.current[key] = curr;
      }
    }
    if (Object.keys(changes).length > 0) {
      setFlashes((prev) => ({ ...prev, ...changes }));
    }
  }, [sim.capitals.values, sim.cash]);

  // Expire flashes past the duration — request one animation tick
  // once we know a flash is running.
  useEffect(() => {
    const anyActive = SUSTAINABILITY_ORDER.some((k) => flashes[k] !== null);
    if (!anyActive) return;
    const now = performance.now();
    const cleared: Partial<Record<SustainabilityKey, null>> = {};
    for (const key of SUSTAINABILITY_ORDER) {
      const f = flashes[key];
      if (f && now - f.triggeredAtMs > FLASH_DURATION_MS) {
        cleared[key] = null;
      }
    }
    if (Object.keys(cleared).length > 0) {
      setFlashes((prev) => ({ ...prev, ...cleared }));
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      // Force a re-render so the anyActive check re-evaluates.
      setFlashes((prev) => ({ ...prev }));
    });
    return () => window.cancelAnimationFrame(raf);
  }, [flashes]);

  // Visible only during service post-prep. During opening + prep the
  // panels would show pre-service state, which is not the reading the
  // player needs — the OpeningPanel + prep stream carry that moment.
  if (period !== 'lunch' && period !== 'dinner') return null;
  if (sim.day.openingEndsAt !== null) return null;
  if (sim.day.prepEndsAt !== null) return null;

  // Aggregate reads.
  let activeGuests = 0;
  let seatedCount = 0;
  let satSum = 0;
  for (const g of sim.guests) {
    if (
      g.state === 'arriving' ||
      g.state === 'waiting' ||
      g.state === 'seated' ||
      g.state === 'ordering' ||
      g.state === 'dining' ||
      g.state === 'paying'
    ) {
      activeGuests += 1;
    }
    if (
      g.state === 'seated' ||
      g.state === 'ordering' ||
      g.state === 'dining' ||
      g.state === 'paying'
    ) {
      seatedCount += 1;
      satSum += g.satisfaction;
    }
  }
  const teamCap = Math.max(1, sim.team.members.length * COVERS_PER_MEMBER);
  const meanSat = seatedCount > 0 ? satSum / seatedCount : 0;

  const revStart = sim.day.revenueAtServiceStart ?? 0;
  const costStart = sim.day.costAtServiceStart ?? 0;
  const netRev = sim.revenue - revStart;
  const netCost = sim.cost - costStart;

  const tempo = tempoReading(activeGuests, teamCap);
  const satisfaction = satisfactionReading(meanSat, seatedCount > 0);
  const morale = moraleReading(sim.morale);
  const revenue = revenueReading(netRev, netCost);

  return (
    <div style={PANEL_STYLE} role="region" aria-label="Kvällens mätare">
      <div style={TRIAD_STYLE} role="group" aria-label="Hållbarheter">
        {SUSTAINABILITY_ORDER.map((key) => {
          const flash = flashes[key];
          const active = flash !== null;
          const style = active ? CELL_FLASH_STYLE : CELL_STYLE;
          return (
            <div key={key} style={style}>
              {SUSTAINABILITY_LABEL[key]}
              {flash && (
                <span style={GLYPH_STYLE} aria-hidden>
                  {flash.direction === 'up' ? '↑' : '↓'}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <Instrument name="Rummets tempo" reading={tempo} />
      <Instrument name="Bordens läge" reading={satisfaction} />
      <Instrument name="Lagets ork" reading={morale} />
      <Instrument name="Kvällens intäkt" reading={revenue} />
    </div>
  );
}

interface InstrumentProps {
  name: string;
  reading: Reading;
}

function Instrument({ name, reading }: InstrumentProps) {
  return (
    <div style={BLOCK_STYLE}>
      <div style={NAME_STYLE}>{name}</div>
      <div style={BAND_STYLE}>{reading.band}</div>
      <div style={BAR_TRACK_STYLE}>
        <div style={BAR_FILL_STYLE(reading.fraction)} />
      </div>
    </div>
  );
}
