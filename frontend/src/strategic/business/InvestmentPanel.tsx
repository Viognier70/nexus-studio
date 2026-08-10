// ORDER 046 §2 — the morning investment panel.
//
// A thin surface over the existing SET_POLICY action for the three
// dials that shape the service beyond the team: training level (1-3),
// pricing (låg/medel/hög), ingredient tier (grund/utvald/premium).
//
// Not a scoreboard. Numbers are absent by design; the labels + one-
// line descriptions are the reading. Turns dev-cycled numbers into
// an intentional morning decision alongside TeamPanel — together
// they turn the day into a cycle rather than a series of evenings
// (DESIGN_BACKLOG B-003 pairs).
//
// Layout: left column under TeamPanel (top: 72 + TeamPanel height +
// gap). Morning-only, same visibility gate as TeamPanel. Non-modal.

import { strings } from '../../content/strings.sv';
import type { IngredientTier, PricingTier } from '../types';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

// Top offset accounts for TeamPanel: TeamPanel top 72 + its natural
// height varies by team size, but a comfortable min gap sits at 420 px
// (TeamPanel with 4 members + hire buttons ≈ 400 px). If TeamPanel
// overflows into this space the browser resolves the layer order via
// zIndex + pointerEvents — both panels sit on the same overlay layer.
const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 500,
  left: 16,
  width: 320,
  padding: '14px 16px 16px',
  background: 'rgba(30, 22, 16, 0.86)',
  color: '#f5f0e0',
  border: '1px solid #a8926a',
  borderRadius: 5,
  fontFamily: 'system-ui, sans-serif',
  fontSize: 13,
  lineHeight: 1.4,
  letterSpacing: 0.2,
  boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
  pointerEvents: 'auto',
  zIndex: 35,
  maxHeight: 'calc(100vh - 520px)',
  overflowY: 'auto'
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  opacity: 0.72,
  marginBottom: 4
};

const BODY_STYLE: React.CSSProperties = {
  marginBottom: 10,
  opacity: 0.9
};

const GROUP_HEADING_STYLE: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  opacity: 0.72,
  marginTop: 12,
  marginBottom: 6
};

const OPTION_BUTTON_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '7px 10px',
  marginBottom: 4,
  background: '#2a1e14',
  color: '#f5f0e0',
  border: '1px solid #6c5a3a',
  borderRadius: 3,
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: 0.3,
  cursor: 'pointer'
};

const OPTION_BUTTON_ACTIVE_STYLE: React.CSSProperties = {
  ...OPTION_BUTTON_STYLE,
  background: '#5a4126',
  border: '1px solid #d4b878',
  fontWeight: 700
};

const OPTION_DESC_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 400,
  opacity: 0.8,
  marginTop: 2
};

const TRAINING_LEVELS: readonly (1 | 2 | 3)[] = [1, 2, 3];
const PRICING_LEVELS: readonly PricingTier[] = ['låg', 'medel', 'hög'];
const INGREDIENT_LEVELS: readonly IngredientTier[] = ['grund', 'utvald', 'premium'];

export function InvestmentPanel() {
  const sim = useSimState();
  const dispatch = useSimDispatch();

  if (sim.day.period !== 'morning') return null;

  const { policies } = sim;
  const s = strings.invest;

  return (
    <div style={PANEL_STYLE}>
      <div style={HEADING_STYLE}>{s.heading}</div>
      <div style={BODY_STYLE}>{s.body}</div>

      <div style={GROUP_HEADING_STYLE}>{s.trainingHeading}</div>
      {TRAINING_LEVELS.map((level) => {
        const active = policies.trainingLevel === level;
        return (
          <button
            key={`training-${level}`}
            type="button"
            style={active ? OPTION_BUTTON_ACTIVE_STYLE : OPTION_BUTTON_STYLE}
            onClick={() =>
              dispatch({ type: 'SET_POLICY', patch: { trainingLevel: level } })
            }
          >
            <div>{s.trainingLevels[level]}</div>
            <div style={OPTION_DESC_STYLE}>{s.trainingDescriptions[level]}</div>
          </button>
        );
      })}

      <div style={GROUP_HEADING_STYLE}>{s.pricingHeading}</div>
      {PRICING_LEVELS.map((tier) => {
        const active = policies.pricing === tier;
        return (
          <button
            key={`pricing-${tier}`}
            type="button"
            style={active ? OPTION_BUTTON_ACTIVE_STYLE : OPTION_BUTTON_STYLE}
            onClick={() =>
              dispatch({ type: 'SET_POLICY', patch: { pricing: tier } })
            }
          >
            <div>{s.pricingLevels[tier]}</div>
            <div style={OPTION_DESC_STYLE}>{s.pricingDescriptions[tier]}</div>
          </button>
        );
      })}

      <div style={GROUP_HEADING_STYLE}>{s.ingredientHeading}</div>
      {INGREDIENT_LEVELS.map((tier) => {
        const active = policies.ingredientTier === tier;
        return (
          <button
            key={`ingredient-${tier}`}
            type="button"
            style={active ? OPTION_BUTTON_ACTIVE_STYLE : OPTION_BUTTON_STYLE}
            onClick={() =>
              dispatch({ type: 'SET_POLICY', patch: { ingredientTier: tier } })
            }
          >
            <div>{s.ingredientLevels[tier]}</div>
            <div style={OPTION_DESC_STYLE}>{s.ingredientDescriptions[tier]}</div>
          </button>
        );
      })}

      {/*
        ORDER 050 §7 step 6 (2026-08-10) — scale-down actions moved
        to ScaleDownPanel.tsx per Addendum A §6.3 ("one thing per
        surface"). Investment stays about where the money goes
        (training / pricing / ingredient tier); retreat is its own
        beat on the paired morning surface.
      */}
    </div>
  );
}
