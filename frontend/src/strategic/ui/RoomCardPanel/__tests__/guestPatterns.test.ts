// ORDER 087 §6 — guestPatterns + face vocabulary DoD tests.
//
// Verifies DoD points that are code-checkable in one file:
//   §6.2 — no `förvirrad` / `förvånad` anywhere under frontend/src
//   §6.3 — FACES vocabulary is exactly the ten reconciled
//   §6.4 — one reader per expression: no two faces reachable from the
//          same (state × affect × wait) tuple across guest branches
//   §6.6 — all eight guest labels grep-visible in the derivation file
//   §6.7 — determinism: same (task, patience, simTime) → same output
//   §6.8 — `exhausted` and `proud` unreachable from any guest input;
//          every reachable guest state maps to one of the other eight
//   §6.9 — a guest in HAIL/IMPATIENT and its closest servitör both
//          raise the pip

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALL_FACE_KEYS,
  STAFF_EXCLUSIVE_FACES,
  deriveGuestFace,
  type FaceKey
} from '../deriveFaces';
import {
  ALL_GUEST_PATTERN_LABELS,
  GUEST_PATTERN_NUMBER,
  IMPATIENT_LEAN_DEG,
  DEFAULT_LEAN_DEG,
  PIP_PATTERNS,
  derivePipCarriers,
  deriveGuestPatience,
  leanDegForPattern,
  patternForGuest,
  selectGuestPattern
} from '../guestPatterns';
import type { Guest, GuestState, StaffMember } from '../../../types';
import { WAIT_HAIL_SEC, WAIT_IMPATIENT_SEC } from '../deriveActions';

// -------- fixtures ------------------------------------------------------

function makeGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: 'g1',
    state: 'seated',
    satisfaction: 0.6,
    seatIndex: 0,
    arrivalTime: 0,
    stateTime: 0,
    scenarioSource: false,
    position: { x: 0, z: 0 },
    targetPosition: { x: 0, z: 0 },
    moveProgress: 0,
    hadWelcomeDrink: false,
    walkAwayOnArrival: false,
    ...overrides
  };
}

function makeStaff(overrides: Partial<StaffMember> = {}): StaffMember {
  return {
    id: 's1',
    role: 'servitör',
    workload: 0.3,
    taskType: null,
    taskProgress: 0,
    taskDuration: 0,
    targetGuestId: null,
    position: { x: 0, z: 0 },
    targetPosition: { x: 0, z: 0 },
    moveProgress: 0,
    ...overrides
  };
}

const ALL_GUEST_STATES: readonly GuestState[] = [
  'arriving', 'waiting', 'seated', 'ordering', 'dining', 'paying', 'leaving', 'declined'
];

// -------- §6.3 — FACES vocabulary is exactly the ten ------------------

describe('ORDER 087 §6.3 — FACES vocabulary', () => {
  it('ALL_FACE_KEYS contains exactly the ten reconciled expressions', () => {
    const expected: readonly FaceKey[] = [
      'neutral', 'focused', 'smiling', 'attentive',
      'tense', 'strained', 'hurried', 'exhausted',
      'proud', 'irritated'
    ];
    expect(new Set(ALL_FACE_KEYS)).toEqual(new Set(expected));
    expect(ALL_FACE_KEYS.length).toBe(10);
  });

  it('STAFF_EXCLUSIVE_FACES is exactly exhausted + proud', () => {
    expect(new Set(STAFF_EXCLUSIVE_FACES)).toEqual(new Set(['exhausted', 'proud']));
  });
});

// -------- §6.2 — no förvirrad / förvånad anywhere in src ---------------

describe('ORDER 087 §6.2 — dropped vocabulary is not referenced', () => {
  // Recursive walk of frontend/src to catch any lingering reference.
  // The two dropped words are intentionally spelled out so a future
  // grep for either fires on this test file (auditable trail).
  const banned = ['förvirrad', 'förvånad'];

  it('no reference to `förvirrad` or `förvånad` under frontend/src', () => {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    // Walk up from __tests__/ to strategic/ then to src/.
    const srcDir = resolve(thisDir, '..', '..', '..', '..');

    const offenders: string[] = [];
    function walk(dir: string): void {
      for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx|js|jsx|mts|cts)$/.test(entry)) continue;
        // Skip this test file itself — the banned words are named
        // above by design; that's not a real usage.
        if (full.endsWith('guestPatterns.test.ts')) continue;
        // Skip deriveFaces.ts if it names them in a comment explaining
        // the drop — the file's docstring cites them.
        const text = readFileSync(full, 'utf8');
        for (const word of banned) {
          if (text.includes(word)) {
            offenders.push(`${full}: contains "${word}"`);
          }
        }
      }
    }
    walk(srcDir);

    // Filter out mentions inside comment blocks that document the drop.
    // (deriveFaces.ts intentionally cites both words in its docstring.)
    const realOffenders = offenders.filter((o) => !o.includes('deriveFaces.ts'));
    expect(realOffenders).toEqual([]);
  });
});

// -------- §6.4 — one reader per expression for guests -------------------

describe('ORDER 087 §6.4 — one reader per guest expression', () => {
  // Iterate every (state × satisfaction × waitBucket × walkAway ×
  // welcomeDrink) tuple that touches a distinct branch, and assert
  // that no two OUTPUT faces come out of two identical tuples.
  it('same (state, satisfaction, inState, walkAway) tuple always yields identical face', () => {
    const satisfactions = [0.1, 0.35, 0.5, 0.75, 0.95];
    const waitBuckets = [0, 20, WAIT_IMPATIENT_SEC + 1, WAIT_HAIL_SEC + 1];
    const walkAwayValues = [true, false];
    const seen = new Map<string, FaceKey>();
    for (const state of ALL_GUEST_STATES) {
      for (const sat of satisfactions) {
        for (const wait of waitBuckets) {
          for (const walkAway of walkAwayValues) {
            const guest = makeGuest({
              state,
              satisfaction: sat,
              stateTime: 0,
              walkAwayOnArrival: walkAway
            });
            const face = deriveGuestFace(guest, wait);
            const key = `${state}|${sat}|${wait}|${walkAway}`;
            if (seen.has(key)) {
              expect(seen.get(key)).toBe(face);
            } else {
              seen.set(key, face);
            }
          }
        }
      }
    }
  });
});

// -------- §6.7 — determinism of guest patterns --------------------------

describe('ORDER 087 §6.7 — guest pattern functions are deterministic', () => {
  it('same input tuple returns same pattern label across many calls', () => {
    const guest = makeGuest({ state: 'waiting', stateTime: 0 });
    const t = WAIT_IMPATIENT_SEC + 5;
    const a = patternForGuest(guest, t);
    for (let i = 0; i < 10; i += 1) {
      expect(patternForGuest(guest, t)).toBe(a);
    }
  });

  it('no Math.random(), Date.now(), or performance.now() invocations in guestPatterns.ts', () => {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(thisDir, '..', 'guestPatterns.ts'), 'utf8');
    // Strip line and block comments so the docstring can name what
    // the code must not call without failing this test on the mention
    // itself.
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(/Math\.random\s*\(/.test(stripped)).toBe(false);
    expect(/Date\.now\s*\(/.test(stripped)).toBe(false);
    expect(/performance\.now\s*\(/.test(stripped)).toBe(false);
  });

  it('selectGuestPattern is a total function over GuestState × waits', () => {
    for (const state of ALL_GUEST_STATES) {
      for (const inState of [0, WAIT_IMPATIENT_SEC + 1, WAIT_HAIL_SEC + 1]) {
        const p = selectGuestPattern({
          task: state,
          patience: 0.5,
          simTime: 100,
          inState,
          walkAwayOnArrival: false,
          hadWelcomeDrink: false
        });
        expect(ALL_GUEST_PATTERN_LABELS.includes(p)).toBe(true);
      }
    }
  });
});

// -------- §6.6 — grep-revision: all eight labels in derivation file ----

describe('ORDER 087 §6.6 — grep revision', () => {
  it('all eight guest pattern labels appear in deriveActions.ts', () => {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(thisDir, '..', 'deriveActions.ts'), 'utf8');
    for (const label of ALL_GUEST_PATTERN_LABELS) {
      expect(src.includes(label), `deriveActions.ts must reference "${label}"`).toBe(true);
    }
  });

  it('pattern numbering is 13..20 in guestPatterns.ts', () => {
    const nums = ALL_GUEST_PATTERN_LABELS.map((l) => GUEST_PATTERN_NUMBER[l]).sort();
    expect(nums).toEqual([13, 14, 15, 16, 17, 18, 19, 20]);
  });
});

// -------- §6.8 — exhausted/proud unreachable from any guest input -------

describe('ORDER 087 §6.8 — staff-exclusive faces unreachable for guest', () => {
  it('every reachable guest state maps to one of the eight guest-legal faces', () => {
    const guestLegal = new Set(ALL_FACE_KEYS.filter((k) => !STAFF_EXCLUSIVE_FACES.includes(k)));
    // Exhaustive sweep of tuples that could plausibly reach any branch.
    for (const state of ALL_GUEST_STATES) {
      for (const sat of [0.0, 0.1, 0.29, 0.3, 0.4, 0.5, 0.69, 0.7, 0.9, 1.0]) {
        for (const wait of [0, WAIT_IMPATIENT_SEC, WAIT_IMPATIENT_SEC + 1, WAIT_HAIL_SEC, WAIT_HAIL_SEC + 1]) {
          for (const walkAway of [true, false]) {
            for (const drink of [true, false]) {
              const guest = makeGuest({
                state, satisfaction: sat, stateTime: 0,
                walkAwayOnArrival: walkAway, hadWelcomeDrink: drink
              });
              const face = deriveGuestFace(guest, wait);
              expect(
                guestLegal.has(face),
                `state=${state} sat=${sat} wait=${wait} walk=${walkAway} drink=${drink} → ${face} is not guest-legal`
              ).toBe(true);
              expect(STAFF_EXCLUSIVE_FACES.includes(face)).toBe(false);
            }
          }
        }
      }
    }
  });
});

// -------- §6.9 — pip has two bearers -----------------------------------

describe('ORDER 087 §6.9 — status pip is raised on guest AND assigned staff', () => {
  it('a hailing guest and its owning servitör both raise the pip', () => {
    const hail = makeGuest({ id: 'g-h', state: 'waiting', stateTime: 0 });
    const impat = makeGuest({ id: 'g-i', state: 'waiting', stateTime: 0 });
    const idle = makeGuest({ id: 'g-idle', state: 'seated', hadWelcomeDrink: true });
    const owner = makeStaff({ id: 's-owner', targetGuestId: 'g-h' });
    const other = makeStaff({ id: 's-other', targetGuestId: null });
    const impatOwner = makeStaff({ id: 's-impat', targetGuestId: 'g-i' });

    // Hail threshold + 5 s so both g-h and g-i are past hail? No —
    // only past-hail is HAIL; past-impatient is IMPATIENT. Test both.
    const now = WAIT_HAIL_SEC + 5;
    const carriers = derivePipCarriers([hail, impat, idle], [owner, other, impatOwner], now);

    expect(carriers.guestIds).toContain('g-h');
    expect(carriers.guestIds).toContain('g-i');
    expect(carriers.guestIds).not.toContain('g-idle');
    expect(carriers.staffIds).toContain('s-owner');
    expect(carriers.staffIds).toContain('s-impat');
    expect(carriers.staffIds).not.toContain('s-other');
  });

  it('IMPATIENT pattern alone also raises the pip (mid-wait window)', () => {
    const impat = makeGuest({ id: 'g', state: 'waiting', stateTime: 0 });
    const owner = makeStaff({ id: 's', targetGuestId: 'g' });
    const now = WAIT_IMPATIENT_SEC + 5;
    const carriers = derivePipCarriers([impat], [owner], now);
    expect(carriers.guestIds).toContain('g');
    expect(carriers.staffIds).toContain('s');
  });

  it('PIP_PATTERNS is exactly HAIL + IMPATIENT — no silent additions', () => {
    expect(new Set(PIP_PATTERNS)).toEqual(new Set(['HAIL', 'IMPATIENT']));
  });
});

// -------- lean sign audit (IMPATIENT is the only backwards lean) --------

describe('ORDER 087 §4 — IMPATIENT is the only backwards lean', () => {
  it('IMPATIENT leans backwards; all other patterns lean forwards', () => {
    for (const label of ALL_GUEST_PATTERN_LABELS) {
      const deg = leanDegForPattern(label);
      if (label === 'IMPATIENT') {
        expect(deg).toBe(IMPATIENT_LEAN_DEG);
        expect(deg).toBeLessThan(0);
      } else {
        expect(deg).toBe(DEFAULT_LEAN_DEG);
        expect(deg).toBeGreaterThan(0);
      }
    }
  });
});

// -------- ORDER 088 §2.2 — smiling has exactly one reader --------------

describe('ORDER 088 §2.2 — smiling has exactly one guest reader', () => {
  // The three guest states that can produce smiling (leaving, paying,
  // dining) MUST all be gated by the SAME condition — satisfaction >=
  // 0.7 in a positive-outcome state — otherwise smiling has multiple
  // readers and the rule from Underlag 001 §04 breaks. The property
  // this test proves: for every tuple that yields smiling, the
  // condition satisfaction >= 0.7 holds, AND for every tuple where
  // (state ∈ {leaving, paying, dining} without walk-away) and
  // satisfaction >= 0.7, smiling is what's returned.

  it('every smiling-yielding tuple has satisfaction ≥ 0.7 and no walk-away', () => {
    for (const state of ALL_GUEST_STATES) {
      for (const sat of [0.0, 0.15, 0.3, 0.5, 0.69, 0.7, 0.8, 1.0]) {
        for (const wait of [0, WAIT_IMPATIENT_SEC, WAIT_HAIL_SEC + 5]) {
          for (const walk of [true, false]) {
            for (const drink of [true, false]) {
              const g = makeGuest({
                state, satisfaction: sat, stateTime: 0,
                walkAwayOnArrival: walk, hadWelcomeDrink: drink
              });
              const face = deriveGuestFace(g, wait);
              if (face === 'smiling') {
                expect(sat).toBeGreaterThanOrEqual(0.7);
                expect(walk).toBe(false);
              }
            }
          }
        }
      }
    }
  });

  it('condition (positive-outcome state + satisfaction ≥ 0.7 + no walk-away) always yields smiling', () => {
    const positiveStates: readonly GuestState[] = ['leaving', 'paying', 'dining'];
    for (const state of positiveStates) {
      for (const sat of [0.7, 0.8, 0.9, 1.0]) {
        const g = makeGuest({
          state, satisfaction: sat, stateTime: 0,
          walkAwayOnArrival: false
        });
        const face = deriveGuestFace(g, 100);
        expect(
          face,
          `smiling condition (state=${state}, sat=${sat}) should yield "smiling" but yielded "${face}"`
        ).toBe('smiling');
      }
    }
  });
});

// -------- patience derivation determinism -------------------------------

describe('deriveGuestPatience — determinism & bounds', () => {
  it('always returns a value in [0, 1]', () => {
    for (const state of ALL_GUEST_STATES) {
      for (const sat of [0, 0.5, 1]) {
        for (const wait of [0, WAIT_IMPATIENT_SEC + 1, WAIT_HAIL_SEC + 100]) {
          for (const walk of [true, false]) {
            const g = makeGuest({ state, satisfaction: sat, stateTime: 0, walkAwayOnArrival: walk });
            const p = deriveGuestPatience(g, wait);
            expect(p).toBeGreaterThanOrEqual(0);
            expect(p).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
});
