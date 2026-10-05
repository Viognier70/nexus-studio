// ORDER 308 — öppningen före första morgonen (Designs D2, omtag 2026-10-04).
//   1. Flödet: startskärmen → Nytt spel → namn och samtycke → öppningen → första morgonen.
//   2. Tidslinjen ur manuset: bilderna, svärtan, raderna och nålarna vid rätt tid.
//   3. Hoppa över: efter 3 s (LEVERANSNOT §3), direkt för den som sett öppningen.
//   4. Minskad rörelse: kameran står still i varje bild, raderna lyfts inte.
//   5. Byn: flygturen landar i spelets nivåer, nålarnas ankare, Ingrid utanför väggen.
//   6. Strängarna: sv och en ordagrant ur Designs openingStrings.ts.
//   7. Inget hämtas från nätet.
//   8. Överlägget i jsdom: tangent före 3 s hoppar inte över, efter 3 s gör den det,
//      och minskad rörelse syns i data-reduced.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as M from '../../strategic/opening/oppningManus';
import {
  blackAt, canSkip, cameraTime, captionAt, EMPTY_T0, emptyCam, framePose, GLIMPSE_T0, glimpseCam, layersAt, mentorDoor,
  OPENING_END, OPENING_KEYS, pinsAt, renderedPoly, REDUCED_HOLD, SKIP_AFTER_S, titleAt, VENUE_CENTRE, villagePose
} from '../../strategic/opening/openingTimeline';
import { flowScreen, NEW_GAME_FLOW_START, newGameFlow } from '../../strategic/opening/newGameFlow';
import { levelById, levelTarget } from '../../strategic/camera/eveningLevels';
import { computePlayerBusinessInterior } from '../../strategic/business/interiorLayout';
import { WORLD } from '../../strategic/content/world';
import { stringsFor } from '../../content/strings';
import { OPENING_STRINGS } from '../../content/design/openingStrings';

const HERE = dirname(fileURLToPath(import.meta.url));
const OPENING_DIR = resolve(HERE, '../../strategic/opening');

describe('ORDER 308 — 1. flödet', () => {
  it('Nytt spel efter namn och samtycke ger öppningen, sedan första morgonen', () => {
    const screens: string[] = [flowScreen(NEW_GAME_FLOW_START)];
    let s = newGameFlow(NEW_GAME_FLOW_START, { type: 'newGame', player: { name: 'Anders', consent: true, research: false } });
    screens.push(flowScreen(s));
    expect(s.player?.name).toBe('Anders');
    s = newGameFlow(s, { type: 'openingDone' });
    screens.push(flowScreen(s));
    expect(screens).toEqual(['start', 'opening', 'morning']);
    // En andra signal ändrar inget (öppningen spelas en gång per nytt spel).
    expect(newGameFlow(s, { type: 'openingDone' })).toBe(s);
    expect(newGameFlow(s, { type: 'newGame', player: { name: 'X', consent: false, research: false } })).toBe(s);
  });

  it('main.tsx kopplar registreringen till öppningen och öppningen till morgonen', () => {
    const main = readFileSync(resolve(HERE, '../../main.tsx'), 'utf8');
    expect(main).toMatch(/onNewGame=\{\(player\) => send\(\{ type: 'newGame', player \}\)\}/);
    expect(main).toMatch(/opening=\{game\.opening\}/);
    expect(main).toMatch(/onOpeningDone=\{\(\) => send\(\{ type: 'openingDone' \}\)\}/);
    const app = readFileSync(resolve(HERE, '../../strategic/StrategicApp.tsx'), 'utf8');
    expect(app).toMatch(/\{opening && <OpeningSequence /);
  });
});

describe('ORDER 308 — 2. tidslinjen', () => {
  it('är 41 s och slutar i svärta; morgonen tonar upp ur den', () => {
    expect(OPENING_END).toBe(41);
    expect(blackAt(0)).toBe(1);
    expect(blackAt(20)).toBe(0);
    expect(blackAt(40.6)).toBe(1);
    expect(blackAt(41)).toBe(1);
    expect(blackAt(41.5)).toBeCloseTo(0.5, 5);
    expect(blackAt(42.5)).toBe(0);
  });

  it('bilderna i manusets ordning och lager', () => {
    const at = (t: number) => layersAt(t);
    expect(at(5)).toEqual({ op: { village: 1, empty: 0, glimpse: 0 }, shot: 'fly' });
    expect(at(14)).toEqual({ op: { village: 1, empty: 0, glimpse: 0 }, shot: 'descend' });
    expect(at(17.3).op.village).toBe(1);
    expect(at(17.3).op.empty).toBeCloseTo(0.5, 5);
    expect(at(20).op).toEqual({ village: 0, empty: 1, glimpse: 0 });
    expect(at(25).op).toEqual({ village: 0, empty: 0, glimpse: 1 });
    expect(at(28).shot).toBe('decant');
    expect(at(31).shot).toBe('toast');
    expect(at(35).op).toEqual({ village: 1, empty: 0, glimpse: 0 });
    expect(at(40).shot).toBe('black');
  });

  it('en rad i taget, och nålarna vid rätt tid', () => {
    expect(titleAt(9)['opening.place'].k).toBe(1);
    expect(titleAt(9)['opening.line1'].k).toBe(1);
    expect(titleAt(9)['opening.line2'].k).toBe(1);
    expect(titleAt(12)['opening.line1'].k).toBe(0);
    expect(captionAt(9).key).toBeNull();
    expect(captionAt(21).key).toBe('opening.empty');
    expect(captionAt(28.5).key).toBe('opening.fill');
    expect(captionAt(38.6).key).toBe('opening.goal');
    // Raden står kvar genom glimtarnas hårda klipp.
    for (const t of [24.5, 26.8, 30.1, 32.5]) expect(captionAt(t).key).toBe('opening.fill');
    expect(pinsAt(14.6).map((p) => p.pin.id)).toEqual(['venue']);
    expect(pinsAt(35.6).map((p) => p.pin.id)).toEqual(['mentor']);
    expect(pinsAt(21)).toEqual([]);
    // Taknålen är borta innan taket lyfts (16 s).
    expect(pinsAt(16.01)).toEqual([]);
  });
});

describe('ORDER 308 — 3. hoppa över', () => {
  it('efter 3 s, eller direkt för den som har sett öppningen', () => {
    expect(SKIP_AFTER_S).toBe(3);
    expect(canSkip(0, false)).toBe(false);
    expect(canSkip(2.99, false)).toBe(false);
    expect(canSkip(3, false)).toBe(true);
    expect(canSkip(0, true)).toBe(true);
  });
});

describe('ORDER 308 — 4. minskad rörelse', () => {
  it('kameran står still i varje bild', () => {
    for (const shot of M.SHOTS) {
      const end = M.SHOTS[M.SHOTS.indexOf(shot) + 1]?.t ?? OPENING_END;
      const a = villagePose(cameraTime(shot.t + 0.01, true));
      const b = villagePose(cameraTime(end - 0.01, true));
      expect(b).toEqual(a);
      expect(cameraTime(shot.t + 0.01, true)).toBe(REDUCED_HOLD[shot.id]);
    }
    const empty = M.emptyBar().cam;
    expect(emptyCam(17.1, true, empty)).toEqual(emptyCam(23.4, true, empty));
    const g = M.glimpses().cam;
    expect(glimpseCam(23.6, true, g)).toEqual(glimpseCam(26.7, true, g));
    expect(glimpseCam(26.9, true, g)).not.toEqual(glimpseCam(26.7, true, g));
    // Utan minskad rörelse rör sig kameran.
    expect(villagePose(2)).not.toEqual(villagePose(6));
    expect(emptyCam(17.1, false, empty)).not.toEqual(emptyCam(23.4, false, empty));
    expect(EMPTY_T0).toBe(17);
    expect(GLIMPSE_T0).toBe(23.5);
  });

  it('raderna lyfts inte', () => {
    expect(titleAt(3, false)['opening.line1'].dy).toBeGreaterThan(0);
    expect(titleAt(3, true)['opening.line1'].dy).toBe(0);
    expect(captionAt(18.6, true).dy).toBe(0);
  });
});

describe('ORDER 308 — 5. byn', () => {
  it('flygturen landar i spelets nivåer (byn 660 m, gatan 42 m, krogen 25 m)', () => {
    const village = levelTarget(levelById('village'));
    const p = villagePose(6.5);
    expect(p.dist).toBeCloseTo(660, 6);
    expect(p.tx).toBeCloseTo(village.focus.x, 6);
    expect(p.tz).toBeCloseTo(village.focus.z, 6);
    expect(p.yaw).toBeCloseTo(village.yaw, 6);
    const street = levelTarget(levelById('street'));
    const q = villagePose(15.2);
    expect(q.dist).toBeCloseTo(42, 6);
    expect(q.tx).toBeCloseTo(street.focus.x, 6);
    expect(villagePose(17.199).dist).toBeCloseTo(25, 2);
    // Efter krogens nivå står byns kamera redan vid Måltidens hus (under vinbarens bilder), som i prototypen.
    expect(villagePose(17.3).dist).toBe(40);
    expect(framePose(24).fov).toBe(42);
    // Börjar över sjön på 980 m.
    expect(villagePose(0).dist).toBe(980);
  });

  it('taknålen står i vår krogs mitt, Ingrid utanför Måltidens hus vägg', () => {
    const room = computePlayerBusinessInterior();
    expect(VENUE_CENTRE).toEqual([room!.centre[0], room!.centre[1]]);
    const D = mentorDoor();
    expect(D.building).toBe('w193810975');
    const poly = renderedPoly(D.building, WORLD.buildings.find((b) => b.id === D.building)!.poly);
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i];
      const [xj, zj] = poly[j];
      if ((zi > D.z) !== (zj > D.z) && D.x < (xj - xi) * (D.z - zi) / (zj - zi) + xi) hit = !hit;
    }
    expect(hit).toBe(false);
    // Kameran i Ingrids bild står 36–40 m bort, aldrig närmare.
    for (const t of [33.5, 35, 36.5]) {
      const v = villagePose(t);
      expect(v.dist).toBeGreaterThanOrEqual(36);
      expect(v.dist).toBeLessThanOrEqual(40);
    }
  });
});

describe('ORDER 308 — 6. strängarna', () => {
  it('varje rad och nål i manuset har sv och en, ordagrant ur Designs fil', () => {
    const sv = stringsFor('sv').prologue as Record<string, string>;
    const en = stringsFor('en').prologue as Record<string, string>;
    expect(OPENING_KEYS.length).toBe(8);
    for (const key of new Set([...OPENING_KEYS, 'opening.place', 'opening.yours', 'opening.empty', 'opening.fill', 'opening.mentor', 'opening.goal'])) {
      const k = key.replace('opening.', '');
      expect(OPENING_STRINGS[key], key).toBeDefined();
      expect(sv[k], key).toBe(OPENING_STRINGS[key].sv);
      expect(en[k], key).toBe(OPENING_STRINGS[key].en);
    }
    expect(sv.skip).toBe('Hoppa över');
    expect(en.skip).toBe('Skip');
  });

  it('komponenterna läser texten ur strängtabellen', () => {
    const src = readFileSync(resolve(OPENING_DIR, 'OpeningSequence.tsx'), 'utf8');
    expect(src).toMatch(/strings\.prologue\.skip/);
    expect(src).not.toMatch(/Hoppa över<|>Skip</);
  });
});

describe('ORDER 308 — 7. inget från nätet', () => {
  it('öppningens filer hämtar ingenting och laddar inget skript', () => {
    for (const f of readdirSync(OPENING_DIR).filter((x) => /\.(ts|tsx|js|css)$/.test(x))) {
      const src = readFileSync(resolve(OPENING_DIR, f), 'utf8');
      expect(src, f).not.toMatch(/https?:\/\//);
      expect(src, f).not.toMatch(/\bfetch\(|import\(|createElement\('script'\)|unpkg|cdn/i);
    }
  });
});
