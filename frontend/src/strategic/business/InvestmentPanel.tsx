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

import { strings } from '../../content/strings';
import '../ui/screens/room.css';
import type { IngredientTier, PricingTier } from '../types';
import { useSimDispatch, useSimState } from '../simulation/SimulationProvider';

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
    <div className="nx nxr-panel">
      <div className="nx-label">{s.heading}</div>
      <div className="nx-small nx-muted nxr-body">{s.body}</div>

      <div className="nx-label nxr-group">{s.trainingHeading}</div>
      {TRAINING_LEVELS.map((level) => {
        const active = policies.trainingLevel === level;
        return (
          <button
            key={`training-${level}`}
            type="button"
            className="nxs-list-row nxr-option" aria-pressed={active}
            onClick={() =>
              dispatch({ type: 'SET_POLICY', patch: { trainingLevel: level } })
            }
          >
            <div>{s.trainingLevels[level]}</div>
            <div className="nxs-row-sub">{s.trainingDescriptions[level]}</div>
          </button>
        );
      })}

      <div className="nx-label nxr-group">{s.pricingHeading}</div>
      {PRICING_LEVELS.map((tier) => {
        const active = policies.pricing === tier;
        return (
          <button
            key={`pricing-${tier}`}
            type="button"
            className="nxs-list-row nxr-option" aria-pressed={active}
            onClick={() =>
              dispatch({ type: 'SET_POLICY', patch: { pricing: tier } })
            }
          >
            <div>{s.pricingLevels[tier]}</div>
            <div className="nxs-row-sub">{s.pricingDescriptions[tier]}</div>
          </button>
        );
      })}

      <div className="nx-label nxr-group">{s.ingredientHeading}</div>
      {INGREDIENT_LEVELS.map((tier) => {
        const active = policies.ingredientTier === tier;
        return (
          <button
            key={`ingredient-${tier}`}
            type="button"
            className="nxs-list-row nxr-option" aria-pressed={active}
            onClick={() =>
              dispatch({ type: 'SET_POLICY', patch: { ingredientTier: tier } })
            }
          >
            <div>{s.ingredientLevels[tier]}</div>
            <div className="nxs-row-sub">{s.ingredientDescriptions[tier]}</div>
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
