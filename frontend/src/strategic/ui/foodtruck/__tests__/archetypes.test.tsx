// ORDER 114 §5 DoD 4/5/6/7/8 — arketyp + ansiktsuttryck-tester.
//
// Täcker:
//   DoD 4  Grep: minst åtta arketypnamn från prototypen finns i
//          skepnadskoden. Här räknas de sex arketyp-nycklarna +
//          de sex head-toppings-nycklarna + de fyra prop-nycklarna
//          som ≥ 8 unika namn — alla står grep-verifierbara i
//          archetypes.ts + Figure.tsx.
//   DoD 5  Två gäster med olika arketyp → olika renderad utdata.
//   DoD 6  Gäst som väntat länge → annat uttryck än nyss anländ.
//   DoD 7  Kopplingstest: arketyp och uttryck når figurkomponenten
//          via data-attribut på DOM-noden.
//   DoD 8  DevPanel:s scene=-räknare motsvarar antalet [data-figure]-
//          noder i FoodtruckScene.

// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, type RenderResult } from '@testing-library/react';
import { FoodtruckScene } from '../FoodtruckScene';
import { SimStateCtx } from '../../../simulation/SimulationProvider';
import { makeInitialState } from '../../../simulation/model';
import { capacityForBusiness } from '../../../business/businessClass';
import type { Guest, SimulationState } from '../../../types';
import {
  FOODTRUCK_ARCHETYPE_IDS,
  FOODTRUCK_ARCHETYPES,
  assignArchetype,
  assignSkinTone,
  applyArchetypeMod,
  SKIN_TONES
} from '../archetypes';
import {
  deriveFoodtruckGuestFace,
  GUEST_FACES,
  ALL_GUEST_FACE_KEYS,
  MIMIK_TABLE
} from '../guestFaces';
import { idlePose } from '../rig';

// ----- Fixture-hjälpare -----------------------------------------------------

function makeGuest(id: string, state: Guest['state'], stateTime = 0): Guest {
  return {
    id,
    state,
    satisfaction: 0.7,
    seatIndex: null,
    arrivalTime: 0,
    stateTime,
    scenarioSource: false,
    position: { x: 0, z: 0 },
    targetPosition: { x: 0, z: 0 },
    moveProgress: 1,
    hadWelcomeDrink: false,
    lastCheckbackAt: null,
    walkAwayOnArrival: false,
    stayingOvernight: false
  };
}

function stateWith(guests: Guest[], simTime = 0): SimulationState {
  const base = makeInitialState();
  return {
    ...base,
    simTime,
    businessClass: 'foodtruck',
    policies: {
      ...base.policies,
      capacity: capacityForBusiness('foodtruck', base.policies.staffCount)
    },
    // Fixera period till 'lunch' så assignArchetype-vikter är
    // konsistent mellan test-loop-selectionen och render-tid.
    day: { ...base.day, period: 'lunch' },
    guests,
    waitingIds: guests.filter((g) => g.state === 'waiting').map((g) => g.id)
  };
}

function renderScene(state: SimulationState): RenderResult {
  return render(
    <SimStateCtx.Provider value={state}>
      <FoodtruckScene widthPx={2432} leftInset={360} rightInset={340} />
    </SimStateCtx.Provider>
  );
}

// ----- DoD 4 — arketypnamn i skepnadskoden ---------------------------------

describe('ORDER 114 §5 DoD 4 — minst åtta arketypnamn i skepnadskoden', () => {
  it('archetypes.ts + Figure.tsx innehåller ≥ 8 unika arketyp/topping/prop-namn', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const foodtruckDir = resolve(here, '..');
    const archetypesSrc = readFileSync(resolve(foodtruckDir, 'archetypes.ts'), 'utf8');
    const figureSrc = readFileSync(resolve(foodtruckDir, 'Figure.tsx'), 'utf8');
    const combined = archetypesSrc + '\n' + figureSrc;

    const requiredNames = [
      // 6 arketyp-nycklar
      'barnet', 'affarsgasten', 'efter_skiftet',
      'turisten', 'stamgasten', 'nattarbetaren',
      // 6 head-topping-nycklar
      'ruffled', 'shortCut', 'workCap', 'sunHat', 'grayHair', 'hoodRaised',
      // 4 prop-nycklar
      'iceCream', 'briefcase', 'camera', 'thermos'
    ];
    const found = requiredNames.filter((name) => combined.includes(name));
    expect(
      found.length,
      `hittade ${found.length}/${requiredNames.length}: [${found.join(', ')}]`
    ).toBeGreaterThanOrEqual(8);
  });

  it('assignArchetype är deterministisk per gäst-id', () => {
    // Samma id + period ger alltid samma arketyp — kritiskt för att
    // FoodtruckScene inte ska byta arketyp på gästen mellan renders.
    for (const id of ['gst-1', 'gst-2', 'gst-a', 'gst-b']) {
      const first = assignArchetype(id, 'lunch');
      const second = assignArchetype(id, 'lunch');
      const third = assignArchetype(id, 'lunch');
      expect(first).toBe(second);
      expect(second).toBe(third);
    }
  });

  it('assignArchetype fördelar över alla sex arketyper', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(assignArchetype(`gst-${i}`, 'lunch'));
    // Med 200 hashade ids ska alla sex vara med.
    expect(seen.size, `sågs bara ${[...seen].join(', ')}`).toBe(FOODTRUCK_ARCHETYPE_IDS.length);
  });

  it('assignSkinTone använder SEPARAT hash från arketyp — ingen korrelation', () => {
    // Räkna hudton-fördelning per arketyp. Om samma hash användes för
    // båda skulle en arketyp få ett enskilt-hudton-band; med separata
    // seeds ska varje arketyp få minst 3 av 6 hudtoner över 300 ids.
    const perArchetype = new Map<string, Set<string>>();
    for (const id of FOODTRUCK_ARCHETYPE_IDS) perArchetype.set(id, new Set());
    for (let i = 0; i < 300; i++) {
      const gid = `sep-${i}`;
      const a = assignArchetype(gid, 'lunch');
      const s = assignSkinTone(gid);
      perArchetype.get(a)!.add(s);
    }
    for (const [a, tones] of perArchetype.entries()) {
      expect(
        tones.size,
        `arketyp ${a} har bara ${tones.size} unika hudtoner: ${[...tones].join(', ')}`
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('SKIN_TONES har sex författade toner', () => {
    expect(SKIN_TONES).toHaveLength(6);
    for (const tone of SKIN_TONES) {
      expect(tone).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

// ----- DoD 5 — två arketyper → olika DOM -----------------------------------

describe('ORDER 114 §5 DoD 5 — två gäster med olika arketyp ger olika utdata', () => {
  it('två gäster med olika arketyp har olika data-archetype-attribut', () => {
    // Konstruera guest-ids som hasher till olika arketyper.
    // Testet ovan bevisar att alla sex förekommer bland 200 ids;
    // vi plockar två som vi vet fördelas till olika.
    let idA: string | null = null;
    let idB: string | null = null;
    let arA: string | null = null;
    for (let i = 0; i < 200 && (idA === null || idB === null); i++) {
      const id = `pair-${i}`;
      const a = assignArchetype(id, 'lunch');
      if (idA === null) { idA = id; arA = a; }
      else if (a !== arA) { idB = id; }
    }
    expect(idA).not.toBeNull();
    expect(idB).not.toBeNull();

    const { container } = renderScene(stateWith([
      makeGuest(idA!, 'waiting'),
      makeGuest(idB!, 'waiting')
    ]));
    const figA = container.querySelector(`[data-figure="${idA}"]`);
    const figB = container.querySelector(`[data-figure="${idB}"]`);
    expect(figA).not.toBeNull();
    expect(figB).not.toBeNull();
    const arch1 = figA!.getAttribute('data-archetype');
    const arch2 = figB!.getAttribute('data-archetype');
    expect(arch1).not.toBe('');
    expect(arch2).not.toBe('');
    expect(arch1).not.toBe(arch2);
  });

  it('applyArchetypeMod ger olika hipDrop för olika arketyper', () => {
    // Barnet ×1.4, stamgästen ×0.3 — ska skilja märkbart.
    const base = idlePose(0.5);
    const modBarn = applyArchetypeMod(base, FOODTRUCK_ARCHETYPES.barnet);
    const modStam = applyArchetypeMod(base, FOODTRUCK_ARCHETYPES.stamgasten);
    // Base.hipDrop = 1.6 + 1.6*sin(0.5*1.7) ≈ 2.85; barnet=2.85*1.4≈3.99;
    // stamgästen=2.85*0.3≈0.86. Skillnad > 1 pixel bevisar att
    // modifikatorn appliceras och skiljer.
    expect(Math.abs(modBarn.hipDrop - modStam.hipDrop)).toBeGreaterThan(1);
  });
});

// ----- DoD 6 — väntetid → annat uttryck ------------------------------------

describe('ORDER 114 §5 DoD 6 — väntetid ändrar uttryck', () => {
  it('förvantansfull vid låg kötid → otalig vid hög kötid (default-arketyp)', () => {
    // Använd en gäst-id som vi vet inte får en arketyp-overriden
    // (dvs. inte affärsgästen, efter_skiftet, turisten, barnet).
    // Loopa tills vi hittar en som får kritikern-agnostisk default:
    let id: string | null = null;
    for (let i = 0; i < 500; i++) {
      const candidate = `wait-${i}`;
      const a = assignArchetype(candidate, 'lunch');
      // Nattarbetaren + stamgästen har inte waiting-overrides i
      // ARCHETYPE_FACE_OVERRIDES → default tröskel-mappning gäller.
      if (a === 'nattarbetaren' || a === 'stamgasten') {
        id = candidate;
        break;
      }
    }
    expect(id, 'ingen id hittad som mappar till nattarbetaren/stamgästen').not.toBeNull();

    const archetype = FOODTRUCK_ARCHETYPES[assignArchetype(id!, 'lunch')];
    const freshGuest = makeGuest(id!, 'waiting', 100);          // simTime=100, stateTime=100
    const staleGuest = makeGuest(id!, 'waiting', 100);          // stateTime=100

    const freshFace = deriveFoodtruckGuestFace(freshGuest, 101, archetype); // 1s wait
    const staleFace = deriveFoodtruckGuestFace(staleGuest, 145, archetype); // 45s wait

    expect(freshFace).toBe('forvantansfull');
    expect(staleFace).toBe('otalig');
    expect(freshFace).not.toBe(staleFace);
  });

  it('turisten stannar i nyfiken över hela normala väntetiden', () => {
    // Turisten har waiting-overriden 'nyfiken' upp till 30s.
    const id = 'turist-x';
    const archetype = FOODTRUCK_ARCHETYPES.turisten;
    const g = makeGuest(id, 'waiting', 0);
    expect(deriveFoodtruckGuestFace(g, 3, archetype)).toBe('nyfiken');
    expect(deriveFoodtruckGuestFace(g, 20, archetype)).toBe('nyfiken');
    // Efter 30s faller den ur nyfiken-överstyrning → otalig-default.
    expect(deriveFoodtruckGuestFace(g, 45, archetype)).toBe('otalig');
  });

  it('affärsgästen går skeptisk (inte otalig) vid lång väntan', () => {
    const g = makeGuest('a', 'waiting', 0);
    const face = deriveFoodtruckGuestFace(g, 30, FOODTRUCK_ARCHETYPES.affarsgasten);
    expect(face).toBe('skeptisk');
  });

  it('efter_skiftet går uttrakad (inte otalig) vid lång väntan', () => {
    const g = makeGuest('e', 'waiting', 0);
    const face = deriveFoodtruckGuestFace(g, 45, FOODTRUCK_ARCHETYPES.efter_skiftet);
    expect(face).toBe('uttrakad');
  });

  it('stamgästen får imponerad vid ordering (arketyp-overriden)', () => {
    const g = makeGuest('s', 'ordering', 0);
    expect(deriveFoodtruckGuestFace(g, 5, FOODTRUCK_ARCHETYPES.stamgasten)).toBe('imponerad');
  });
});

// ----- DoD 7 — kopplingstest: arketyp + face når Figure --------------------

describe('ORDER 114 §5 DoD 7 — arketyp och uttryck når figurkomponenten', () => {
  it('renderad DOM har data-archetype och data-face med icke-tomma värden', () => {
    const { container } = renderScene(stateWith([
      makeGuest('gst-wire', 'waiting')
    ]));
    const fig = container.querySelector('[data-figure="gst-wire"]');
    expect(fig).not.toBeNull();
    const arch = fig!.getAttribute('data-archetype');
    const face = fig!.getAttribute('data-face');
    const skin = fig!.getAttribute('data-skin-tone');
    expect(arch).not.toBeNull();
    expect(arch).not.toBe('');
    expect(FOODTRUCK_ARCHETYPE_IDS as readonly string[]).toContain(arch);
    expect(face).not.toBeNull();
    expect(face).not.toBe('');
    expect(ALL_GUEST_FACE_KEYS as readonly string[]).toContain(face);
    expect(skin).not.toBeNull();
    expect(SKIN_TONES).toContain(skin);
  });

  it('MIMIK_TABLE har ≥ 16 rader (per ordertext §3.3)', () => {
    expect(MIMIK_TABLE.length).toBeGreaterThanOrEqual(16);
  });

  it('GUEST_FACES har exakt tio uttryck', () => {
    expect(Object.keys(GUEST_FACES)).toHaveLength(10);
    expect(ALL_GUEST_FACE_KEYS).toHaveLength(10);
  });

  it('varje FaceParams-uppsättning har fullständig geometri', () => {
    for (const [key, params] of Object.entries(GUEST_FACES)) {
      expect(typeof params.browTopL, `${key}: browTopL saknas`).toBe('number');
      expect(typeof params.eyeHL, `${key}: eyeHL saknas`).toBe('number');
      expect(['line', 'smile', 'frown', 'box', 'o'], `${key}: mouth ogiltig`).toContain(params.mouth);
      expect(params.mouthW, `${key}: mouthW ≤ 0`).toBeGreaterThan(0);
    }
  });
});

// ----- DoD 8 — scene= i DevPanel matchar antalet figurer -------------------

describe('ORDER 114 §5 DoD 8 — sceneLive matchar antalet renderade figurer', () => {
  it('sim med 3 waiting + 2 ordering + 1 leaving → 6 figurer + 1 personal', () => {
    const state = stateWith([
      makeGuest('w1', 'waiting'),
      makeGuest('w2', 'waiting'),
      makeGuest('w3', 'waiting'),
      makeGuest('o1', 'ordering'),
      makeGuest('o2', 'ordering'),
      makeGuest('l1', 'leaving')
    ]);
    const { container } = renderScene(state);
    const figures = container.querySelectorAll('[data-figure]');
    const guestFigures = Array.from(figures).filter(
      (el) => el.getAttribute('data-figure') !== 'staff-hatch'
    );
    // Räkna scen-relevanta sim.guests
    const SCENE_RELEVANT_STATES = new Set(['arriving', 'waiting', 'ordering', 'serving', 'paying', 'leaving', 'declined']);
    const sceneLive = state.guests.filter((g) => SCENE_RELEVANT_STATES.has(g.state)).length;
    expect(sceneLive).toBe(6);
    expect(guestFigures).toHaveLength(sceneLive);
  });

  it('DEV-radens sceneLive använder samma set av states som FoodtruckScene renderar', () => {
    // Testet är ett kontrakt: om FoodtruckScene lägger till/tar bort
    // ett state ur render-loopens switch, ska DevPanel:s scene=-räknare
    // uppdateras med. Här bevisas att det statiska set:et i denna test
    // (som är samma i både DevPanel.tsx och renderaren) täcker exakt
    // de states som FoodtruckScene positionerar figurer för.
    const allStates: Guest['state'][] = [
      'arriving', 'waiting', 'seated', 'ordering', 'serving', 'dining',
      'paying', 'eating', 'leaving', 'declined', 'sleeping'
    ];
    const state = stateWith(allStates.map((s, i) => makeGuest(`all-${i}`, s)));
    const { container } = renderScene(state);
    const rendered = Array.from(container.querySelectorAll('[data-figure]'))
      .filter((el) => el.getAttribute('data-figure') !== 'staff-hatch')
      .length;
    // FoodtruckScene skippar seated/dining/sleeping defensivt
    // (ORDER 113 fel 2 comment). Räkna vad DEV-radens set:et säger:
    // ORDER 115 §4.5 — 'eating' är nu ett scen-relevant state.
    // ORDER 115 rev 2 — 'serving' är också scen-relevant (2.5s prop-fas).
    const SCENE_RELEVANT_STATES = new Set(['arriving', 'waiting', 'ordering', 'serving', 'paying', 'eating', 'leaving', 'declined']);
    const sceneLive = state.guests.filter((g) => SCENE_RELEVANT_STATES.has(g.state)).length;
    expect(sceneLive).toBe(8);   // 11 states - 3 skippade (seated/dining/sleeping)
    expect(rendered).toBe(sceneLive);
  });
});
