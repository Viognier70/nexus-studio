// ORDER 121 §8 DoD 4, 5, 6 — figureRig-tester.
//
// DoD 4 (golvtestet): fötterna når golvet i alla sex poser. "Når" =
// mät lägsta y-koordinaten över en cykel, den ska tangera golvplanet
// (y ≤ 0.005). Att kroppen dippar något UNDER golvplanet är Design-
// beslut och en av de fyra flaggorna i figureRig.ts §slutet — det är
// inte ett golv-missfall.
//
// DoD 5 (läckagetestet): disposeFigureRig frigör materialen och tar
// bort rig.root ur föräldergruppen. Efter dispose ska den inte längre
// finnas i scengrafen och materialen ska vara markerade dispose:ade.
//
// DoD 6 (mått + samma höjd): guest och staff har båda totalHeight
// 1,70 m; skillnaden ligger i axelbredd (guest 0,46 / staff 0,40).

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  createFigureRig,
  disposeFigureRig,
  applyPose,
  poseIdle,
  poseSeated,
  poseWalk,
  poseGreet,
  poseWork,
  poseCarry,
  FIGURE,
  type FigureRig,
  type FigurePose
} from '../figureRig';

// ---------- hjälpare ---------------------------------------------------

/**
 * Läser lägsta världs-y bland alla mesh-vertices i riggen. Samma
 * teknik som measureFigure i figureRig.ts — traverse + samla riktiga
 * hörn (ingen roterad AABB som blåser upp bounding-boxen).
 */
function minWorldY(rig: FigureRig): number {
  rig.root.updateWorldMatrix(true, true);
  const v = new THREE.Vector3();
  let min = Infinity;
  rig.root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const geometry = o.geometry as THREE.BufferGeometry;
    const pos = geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      if (v.y < min) min = v.y;
    }
  });
  return min;
}

function samplePose(
  rig: FigureRig,
  poseFn: (arg: number) => FigurePose,
  samples: number
): number {
  let lowest = Infinity;
  for (let i = 0; i < samples; i++) {
    const arg = i / samples;   // 0..1 (cykel eller sekunder — båda tolererar detta intervall)
    applyPose(rig, poseFn(arg));
    const y = minWorldY(rig);
    if (y < lowest) lowest = y;
  }
  return lowest;
}

// ---------- DoD 6: mått + samma höjd ---------------------------------

describe('ORDER 121 §5 / §8 DoD 6 — mått + samma höjd', () => {
  it('guest-riggen har totalhöjd 1,70 m och axelbredd 0,46 m', () => {
    const rig = createFigureRig({ variant: 'guest' });
    try {
      expect(rig.variant).toBe('guest');
      expect(rig.shoulderWidth).toBeCloseTo(0.46, 3);
      // FIGURE.totalHeight är kontraktet. Verifiera att konstanten
      // inte drivit iväg från 1,70 m under kopian.
      expect(FIGURE.totalHeight).toBeCloseTo(1.70, 3);
    } finally {
      disposeFigureRig(rig);
    }
  });

  it('staff-riggen har totalhöjd 1,70 m och axelbredd 0,40 m', () => {
    const rig = createFigureRig({ variant: 'staff' });
    try {
      expect(rig.variant).toBe('staff');
      expect(rig.shoulderWidth).toBeCloseTo(0.40, 3);
    } finally {
      disposeFigureRig(rig);
    }
  });

  it('guest och staff har SAMMA höjd — skillnaden är axelbredd, inte längd', () => {
    const guestRig = createFigureRig({ variant: 'guest' });
    const staffRig = createFigureRig({ variant: 'staff' });
    try {
      // Applicera poseIdle vid t=0 så vi mäter kroppsformen i vila.
      applyPose(guestRig, poseIdle(0));
      applyPose(staffRig, poseIdle(0));
      guestRig.root.updateWorldMatrix(true, true);
      staffRig.root.updateWorldMatrix(true, true);

      // Läs hjässans världs-y via headAnchor. headAnchor sitter
      // FIGURE.headAnchorOffset (0,18 m) OVER hjässan, så subtrahera.
      const gh = guestRig.joints.headAnchor.getWorldPosition(new THREE.Vector3()).y - FIGURE.headAnchorOffset;
      const sh = staffRig.joints.headAnchor.getWorldPosition(new THREE.Vector3()).y - FIGURE.headAnchorOffset;
      // poseIdle andas litet nedåt — inom några mm av 1,70.
      expect(gh).toBeGreaterThan(1.69);
      expect(gh).toBeLessThan(1.705);
      expect(sh).toBeGreaterThan(1.69);
      expect(sh).toBeLessThan(1.705);
      // Skillnaden mellan varianternas hjässor ska vara försumbar.
      expect(Math.abs(gh - sh)).toBeLessThan(0.005);
    } finally {
      disposeFigureRig(guestRig);
      disposeFigureRig(staffRig);
    }
  });

  it('shoulderWidth kan skrivas över via options', () => {
    const custom = createFigureRig({ variant: 'guest', shoulderWidth: 0.55 });
    try {
      expect(custom.shoulderWidth).toBeCloseTo(0.55, 3);
    } finally {
      disposeFigureRig(custom);
    }
  });
});

// ---------- DoD 4: golvtestet ----------------------------------------

describe('ORDER 121 §8 DoD 4 — golvtestet, fötterna når golvet i alla sex poser', () => {
  // Design-beslut per figureRig.ts §slutet flagga 3: "1,700 m är ett tak,
  // så gångstuds och andning sänker kroppen i stället för att lyfta den.
  // Mätt lägsta punkt över hela cykeln, per pose: poseWalk och poseCarry
  // −0,029 m (gångstudsen), poseSeated −0,012 m, poseGreet −0,009 m,
  // poseIdle −0,007 m, poseWork −0,000 m."
  //
  // "Når golvet" = lägsta y ≤ 0,005 m (i praktiken tangerar eller går
  // strax under). Den övre gränsen −0,05 m förhindrar en degenererad
  // pose som skulle dyka en decimeter under.

  const CASES: Array<[string, (a: number) => FigurePose]> = [
    ['poseWalk', (a) => poseWalk(a)],
    ['poseIdle', (a) => poseIdle(a * 5)],
    ['poseSeated', (a) => poseSeated(a * 5)],
    ['poseGreet', (a) => poseGreet(a * 5)],
    ['poseWork', (a) => poseWork(a * 5)],
    ['poseCarry', (a) => poseCarry(a * 5)]
  ];

  it.each(CASES)('%s — lägsta fot-y i intervallet [-0.05, 0.005]', (_name, poseFn) => {
    const rig = createFigureRig({ variant: 'guest' });
    try {
      const lowest = samplePose(rig, poseFn, 32);
      expect(lowest).toBeLessThanOrEqual(0.005);   // fötterna når golvet
      expect(lowest).toBeGreaterThanOrEqual(-0.05); // ingen degenererad dyk
    } finally {
      disposeFigureRig(rig);
    }
  });

  it('samma test för staff-varianten', () => {
    for (const [name, poseFn] of CASES) {
      const rig = createFigureRig({ variant: 'staff' });
      try {
        const lowest = samplePose(rig, poseFn, 32);
        expect(lowest, `staff ${name}`).toBeLessThanOrEqual(0.005);
        expect(lowest, `staff ${name}`).toBeGreaterThanOrEqual(-0.05);
      } finally {
        disposeFigureRig(rig);
      }
    }
  });
});

// ---------- DoD 5: läckagetestet -------------------------------------

describe('ORDER 121 §8 DoD 5 — läckagetestet, disposeFigureRig städar', () => {
  it('rig.root tas bort ur föräldergruppen efter dispose', () => {
    const parent = new THREE.Group();
    const rig = createFigureRig({ variant: 'guest' });
    parent.add(rig.root);
    expect(parent.children).toContain(rig.root);
    disposeFigureRig(rig);
    expect(parent.children).not.toContain(rig.root);
  });

  it('materialen är dispose:ade efter dispose', () => {
    const rig = createFigureRig({ variant: 'guest' });
    const materials = rig.materials.slice(); // snapshot
    expect(materials.length).toBeGreaterThan(0);
    // Spionera på dispose-anropen via en flagga per material.
    const disposeCounts = materials.map(() => 0);
    materials.forEach((m, i) => {
      const orig = m.dispose.bind(m);
      m.dispose = () => { disposeCounts[i] += 1; orig(); };
    });
    disposeFigureRig(rig);
    // Varje material ska ha fått exakt ett dispose-anrop.
    for (let i = 0; i < materials.length; i++) {
      expect(disposeCounts[i], `material[${i}]`).toBe(1);
    }
  });

  it('idempotent: dubbelt dispose-anrop kraschar inte', () => {
    const parent = new THREE.Group();
    const rig = createFigureRig({ variant: 'guest' });
    parent.add(rig.root);
    disposeFigureRig(rig);
    expect(() => disposeFigureRig(rig)).not.toThrow();
    expect(parent.children).not.toContain(rig.root);
  });

  it('flera riggar dispose:ade oberoende', () => {
    const parent = new THREE.Group();
    const a = createFigureRig({ variant: 'guest' });
    const b = createFigureRig({ variant: 'staff' });
    parent.add(a.root);
    parent.add(b.root);
    expect(parent.children.length).toBe(2);
    disposeFigureRig(a);
    expect(parent.children).not.toContain(a.root);
    expect(parent.children).toContain(b.root);
    disposeFigureRig(b);
    expect(parent.children).not.toContain(b.root);
  });
});

// ---------- DoD 6 komplement: headAnchor följer sittande ------------

describe('ORDER 121 §6 — pip-ankaret följer huvudet, inte pucken', () => {
  it('poseSeated sänker headAnchor jämfört med poseIdle (sitshöjd 0,45 m)', () => {
    const rig = createFigureRig({ variant: 'guest' });
    try {
      applyPose(rig, poseIdle(0));
      rig.root.updateWorldMatrix(true, true);
      const standingAnchor = rig.joints.headAnchor.getWorldPosition(new THREE.Vector3()).y;

      applyPose(rig, poseSeated(0));
      rig.root.updateWorldMatrix(true, true);
      const seatedAnchor = rig.joints.headAnchor.getWorldPosition(new THREE.Vector3()).y;

      // hipDrop = 0,41 m i poseSeated. Bålens pitch och headens pitch
      // tar litet till, så anchor-fallet ligger runt 0,4-0,5 m.
      const drop = standingAnchor - seatedAnchor;
      expect(drop).toBeGreaterThan(0.3);
      expect(drop).toBeLessThan(0.6);
    } finally {
      disposeFigureRig(rig);
    }
  });
});
