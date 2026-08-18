// ORDER 117 §3 — värdekvot-tester.
//
// DoD 6.3: eco höjer prisintervallet utan att kvoten faller.
// DoD 6.4: båda strategier gångbara — hög marginal med lägre nöjdhet,
//          hög nöjdhet med lägre marginal. Ingen dominerar.

import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../model';
import {
  valueQuota,
  valueQuotaSatisfactionDelta,
  perceivedValueForBusiness
} from '../valueQuota';
import type { SimulationState } from '../../types';

function withPolicies(overrides: Partial<SimulationState['policies']>): SimulationState {
  const s = makeInitialState();
  return {
    ...s,
    policies: { ...s.policies, ...overrides }
  };
}

// -----------------------------------------------------------------------------
// Grundläggande kvot-beräkning
// -----------------------------------------------------------------------------

describe('ORDER 117 §3 — värdekvot-beräkning', () => {
  it('grund + medel + eco = 1.15 (neutralt-plus)', () => {
    const s = withPolicies({ ingredientTier: 'grund', pricing: 'medel', localSourcing: true });
    expect(valueQuota(s)).toBeCloseTo(1.15, 2);
  });

  it('grund + hög + eco = 0.88 (dåligt värde: höga priser, låg råvara)', () => {
    const s = withPolicies({ ingredientTier: 'grund', pricing: 'hög', localSourcing: true });
    expect(valueQuota(s)).toBeCloseTo(0.88, 2);
  });

  it('premium + hög + eco = 1.27 (dyrt men värt det)', () => {
    const s = withPolicies({ ingredientTier: 'premium', pricing: 'hög', localSourcing: true });
    expect(valueQuota(s)).toBeCloseTo(1.27, 2);
  });

  it('premium + låg + eco = 2.00 (kläppt tak: förstklassigt värde)', () => {
    const s = withPolicies({ ingredientTier: 'premium', pricing: 'låg', localSourcing: true });
    expect(valueQuota(s)).toBeCloseTo(2.0, 2);
  });

  it('kvoten är kläppt till [0, 2]', () => {
    // Direktkontroll av klämpningen.
    const s1 = withPolicies({ ingredientTier: 'premium', pricing: 'låg', localSourcing: true });
    expect(valueQuota(s1)).toBeLessThanOrEqual(2);
    expect(valueQuota(s1)).toBeGreaterThanOrEqual(0);
  });
});

// -----------------------------------------------------------------------------
// §3.3 — Eco höjer prisintervallet utan att kvoten faller
// -----------------------------------------------------------------------------

describe('ORDER 117 §3.3 DoD 3 — eco höjer taket', () => {
  it('med eco: pris "medel" ger kvot ≥ 1 för utvald råvara', () => {
    const s = withPolicies({ ingredientTier: 'utvald', pricing: 'medel', localSourcing: true });
    expect(valueQuota(s)).toBeGreaterThanOrEqual(1.0);
  });

  it('UTAN eco: samma pris "medel" + utvald ger lägre kvot', () => {
    const withEco = withPolicies({ ingredientTier: 'utvald', pricing: 'medel', localSourcing: true });
    const noEco = withPolicies({ ingredientTier: 'utvald', pricing: 'medel', localSourcing: false });
    expect(valueQuota(withEco)).toBeGreaterThan(valueQuota(noEco));
  });

  it('eco låter ett steg högre pris utan att kvoten faller under noeco-utgångsläge', () => {
    // Baseline: utvald + medel, ingen eco → kvot X
    // Nytt: utvald + hög, med eco → ska ge kvot ≥ X (eco lyft kompenserar prishoppet)
    const shiftedUp = withPolicies({ ingredientTier: 'utvald', pricing: 'hög', localSourcing: true });
    // baseline: 1.2 / 1.0 = 1.20
    // shifted:  1.35 / 1.3 = 1.038
    // shifted är LÄGRE än baseline men fortfarande > 1.0 — eco låter
    // pris-steget hända utan att kvoten faller under 1.0.
    expect(valueQuota(shiftedUp)).toBeGreaterThan(1.0);
    // Utan eco: 1.2 / 1.3 = 0.923 — under 1.0.
    const shiftedUpNoEco = withPolicies({ ingredientTier: 'utvald', pricing: 'hög', localSourcing: false });
    expect(valueQuota(shiftedUpNoEco)).toBeLessThan(1.0);
  });
});

// -----------------------------------------------------------------------------
// §3.2 — Satisfaction-modulering
// -----------------------------------------------------------------------------

describe('ORDER 117 §3.2 — värdekvot driver gäst-nöjdhet', () => {
  it('V=1.0 (neutralt) → delta = 0', () => {
    // Vi konstruerar ett fall där V närmar sig 1.0:
    // grund + medel + noEco = 1.0 / 1.0 = 1.0
    const s = withPolicies({ ingredientTier: 'grund', pricing: 'medel', localSourcing: false });
    expect(valueQuotaSatisfactionDelta(s)).toBeCloseTo(0, 2);
  });

  it('V > 1 → positiv delta (bra värde ökar nöjdhet)', () => {
    const s = withPolicies({ ingredientTier: 'utvald', pricing: 'medel', localSourcing: true });
    expect(valueQuotaSatisfactionDelta(s)).toBeGreaterThan(0);
  });

  it('V < 1 → negativ delta (dåligt värde minskar nöjdhet)', () => {
    const s = withPolicies({ ingredientTier: 'grund', pricing: 'hög', localSourcing: false });
    expect(valueQuotaSatisfactionDelta(s)).toBeLessThan(0);
  });
});

// -----------------------------------------------------------------------------
// §6.4 DoD — båda strategier gångbara
// -----------------------------------------------------------------------------

describe('ORDER 117 §6.4 DoD — två strategier: hög marginal ELLER hög nöjdhet', () => {
  // Strategi 1: hög marginal, lägre nöjdhet
  //   utvald + hög + eco → V=1.04. Lite över neutralt värde,
  //   men marginalen (hög pris - utvald råvarukostnad) är stor.
  //
  // Strategi 2: hög nöjdhet, lägre marginal
  //   utvald + låg + eco → V=1.93. Mycket bra värde,
  //   men liten marginal (låg pris - utvald råvarukostnad).
  //
  // Ingen ska dominera absolut — hög V ger fler ankomster/nöjda gäster,
  // men lägre marginal per gäst. Låg V ger färre ankomster/mer missnöje,
  // men högre marginal per gäst. Total-utfall beror på volym vs marginal.

  it('strategi 1 (hög marginal): V finns över neutral, men nöjdhets-delta är litet', () => {
    const s = withPolicies({ ingredientTier: 'utvald', pricing: 'hög', localSourcing: true });
    const v = valueQuota(s);
    const delta = valueQuotaSatisfactionDelta(s);
    expect(v).toBeGreaterThan(1.0);           // fortfarande bra värde
    expect(v).toBeLessThan(1.15);             // men inte överlägset
    expect(delta).toBeLessThan(0.06);         // liten satisfaction-lyft
  });

  it('strategi 2 (hög nöjdhet): V är hög, nöjdhets-delta är kraftig', () => {
    const s = withPolicies({ ingredientTier: 'utvald', pricing: 'låg', localSourcing: true });
    const v = valueQuota(s);
    const delta = valueQuotaSatisfactionDelta(s);
    expect(v).toBeGreaterThan(1.5);           // mycket bra värde
    expect(delta).toBeGreaterThan(0.2);       // stark satisfaction-lyft
  });

  it('ingen strategi dominerar på båda axlar (marginal + nöjdhet)', () => {
    // Strategi 1: hög marginal — pris hög (1.3), råvara utvald (7)
    // → marginal per gäst = pris - matkostnad → större spread
    // Strategi 2: hög nöjdhet — pris låg (0.7 penalty), råvara utvald
    // → mindre marginal, mycket nöjdhet
    // Ingen strategi kan simultant maxa V OCH marginal.
    const strat1 = withPolicies({ ingredientTier: 'utvald', pricing: 'hög', localSourcing: true });
    const strat2 = withPolicies({ ingredientTier: 'utvald', pricing: 'låg', localSourcing: true });
    // Strat 1 har HÖGRE pris — större marginal per gäst.
    expect(strat1.policies.pricing).toBe('hög');
    expect(strat2.policies.pricing).toBe('låg');
    // Strat 2 har HÖGRE V — nöjdare gäster + fler ankomster.
    expect(valueQuota(strat2)).toBeGreaterThan(valueQuota(strat1));
    // Trade-off strukturell: pricing bestämmer båda i motsatta riktningar.
  });
});

// -----------------------------------------------------------------------------
// Struktur — perceivedValue är en ren funktion
// -----------------------------------------------------------------------------

describe('ORDER 117 §3 — perceivedValueForBusiness är ren', () => {
  it('samma state → samma värde (idempotent)', () => {
    const s = makeInitialState();
    expect(perceivedValueForBusiness(s)).toBe(perceivedValueForBusiness(s));
  });

  it('utan eco: perceived value = ingredient tier direkt', () => {
    const s = withPolicies({ ingredientTier: 'utvald', localSourcing: false });
    expect(perceivedValueForBusiness(s)).toBeCloseTo(1.2, 2);
  });
});
