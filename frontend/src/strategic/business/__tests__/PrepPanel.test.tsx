// ORDER 114 Steg 1 DoD 1 — PrepPanel gate:as på hasMiseEnPlace.
//
// Före ORDER 114 renderade PrepPanel MISE EN PLACE-strippen även för
// foodtruck (som saknar mise-en-place-fas). Panelen visade permanent
// 0% på alla items eftersom `state.day.prepReadiness` aldrig beräknas
// när prep-fasen hoppas över (ORDER 111 §3(d)). Guardan i PrepPanel.tsx
// stänger den luckan — testet asserterar noll rendering för foodtruck
// och regressions-grön rendering för restaurant.

// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PrepPanel } from '../PrepPanel';
import { SimStateCtx } from '../../simulation/SimulationProvider';
import { makeInitialState } from '../../simulation/model';
import { capacityForBusiness } from '../businessClass';
import type { SimulationState } from '../../types';

function withProvider(state: SimulationState): ReactNode {
  return (
    <SimStateCtx.Provider value={state}>
      <PrepPanel />
    </SimStateCtx.Provider>
  );
}

function withFoodtruck(): SimulationState {
  const base = makeInitialState();
  return {
    ...base,
    businessClass: 'foodtruck',
    policies: {
      ...base.policies,
      capacity: capacityForBusiness('foodtruck', base.policies.staffCount)
    },
    day: {
      ...base.day,
      period: 'lunch',
      prepReadiness: { plates: 0, veg: 0, protein: 0, sauce: 0, mise: 0 }
    }
  };
}

function withRestaurant(): SimulationState {
  const base = makeInitialState();
  return {
    ...base,
    // restaurant är default; skruvar bara period + prepReadiness så
    // panelen har underlag att rita.
    day: {
      ...base.day,
      period: 'lunch',
      prepReadiness: { plates: 0.8, veg: 0.7, protein: 0.9, sauce: 0.6, mise: 0.75 }
    }
  };
}

describe('ORDER 114 §5 DoD 1 — PrepPanel gate:d på hasMiseEnPlace', () => {
  it('foodtruck → panelen renderas inte (null)', () => {
    const { container } = render(withProvider(withFoodtruck()));
    // Panelen använder aria-label="Mise en place"; utan render finns den inte.
    expect(container.querySelector('[aria-label="Mise en place"]')).toBeNull();
    expect(container.textContent ?? '').not.toContain('Mise en place');
    expect(container.textContent ?? '').not.toContain('MISE EN PLACE');
  });

  it('restaurant → panelen renderas (regression)', () => {
    const { container } = render(withProvider(withRestaurant()));
    const panel = container.querySelector('[aria-label="Mise en place"]');
    expect(panel).toBeTruthy();
    expect(container.textContent ?? '').toContain('Mise en place');
  });
});
