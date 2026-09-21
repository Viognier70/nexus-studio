// ORDER 233 — verifiera att modulen `kalastorgetBrons.ts` matchar
// källfilen `PAVILJONGFRAGOR_BRONS.md` (Kalastorget-sektionen).
//
// Samma pattern som ORDER 229/231/232. Utökar ANCHOR_LOOKUP med tre
// nya nycklar: "när gästen tas emot" → greet, "när notan begärs" →
// requestCheck, "när en gäst klagar" → phase='service' utan anchorId
// (väntar på Fas 2 `guest_complaint`-event per ORDER 224 §7).
//
// Källfilen är kanonisk. Om VO redigerar en fråga eller ett
// FRÅGESTÄLLARE/ANKARE-fält utan att regenerera modulen bryter testet.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KALASTORGET_BRONS_QUESTIONS } from '../kalastorgetBrons';
import type { QuestionAsker } from '../questionFormats';
import type { AnchorId } from '../../simulation/anchors';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_MD = resolve(
  HERE,
  '../../../../../documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md'
);

// -----------------------------------------------------------------
// Parser — identisk struktur som föregående paviljongstester.
// -----------------------------------------------------------------

interface ParsedBlock {
  paviljong: string;
  fragestallare: string;
  fraga: string;
  a: string;
  b: string;
  c: string;
  d: string;
  ratt: 'A' | 'B' | 'C' | 'D';
  forklaring: string;
  ankare: string;
}

function parseBlocks(md: string, forPavilion: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const codeFenceRe = /```\n([\s\S]*?)\n```/g;
  let m: RegExpExecArray | null;
  while ((m = codeFenceRe.exec(md)) !== null) {
    const body = m[1];
    if (!body.startsWith('PAVILJONG:')) continue;
    const parsed = parseSingleBlock(body);
    if (parsed && parsed.paviljong === forPavilion) {
      blocks.push(parsed);
    }
  }
  return blocks;
}

const FIELD_KEYS = [
  'PAVILJONG',
  'FRÅGESTÄLLARE',
  'FRÅGA',
  'A',
  'B',
  'C',
  'D',
  'RÄTT',
  'FÖRKLARING',
  'ANKARE'
] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

function parseSingleBlock(body: string): ParsedBlock | null {
  const lines = body.split('\n');
  const fields = new Map<FieldKey, string[]>();
  let current: FieldKey | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const keyMatch = /^([A-ZÅÄÖ]+):\s*(.*)$/.exec(line);
    if (keyMatch && (FIELD_KEYS as readonly string[]).includes(keyMatch[1])) {
      current = keyMatch[1] as FieldKey;
      const rest = keyMatch[2];
      if (rest.length > 0) fields.set(current, [rest]);
      else fields.set(current, []);
    } else if (current !== null && line.length > 0) {
      const bucket = fields.get(current) ?? [];
      bucket.push(line);
      fields.set(current, bucket);
    }
  }
  const get = (k: FieldKey): string => (fields.get(k) ?? []).join(' ').trim();
  const ratt = get('RÄTT');
  if (!/^[ABCD]$/.test(ratt)) return null;
  return {
    paviljong: get('PAVILJONG'),
    fragestallare: get('FRÅGESTÄLLARE'),
    fraga: get('FRÅGA'),
    a: get('A'),
    b: get('B'),
    c: get('C'),
    d: get('D'),
    ratt: ratt as 'A' | 'B' | 'C' | 'D',
    forklaring: get('FÖRKLARING'),
    ankare: get('ANKARE')
  };
}

const LETTER_TO_INDEX: Record<'A' | 'B' | 'C' | 'D', number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3
};

const ASKER_LOOKUP: Record<string, QuestionAsker> = {
  Kocken: 'kock',
  Sommelieren: 'sommelier',
  Gästen: 'gäst',
  Värden: 'värd',
  Servitören: 'servitör',
  Lärlingen: 'lärling'
};

// ORDER 233 — utökar ANCHOR_LOOKUP med tre nya nycklar:
//   "när gästen tas emot"  → koreografi-ankaret greet
//   "när notan begärs"     → koreografi-ankaret requestCheck
//   "när en gäst klagar"   → phase='service' utan anchorId
//                             (väntar på Fas 2 guest_complaint-event)
interface AnchorMapping {
  phase: 'service' | 'morning' | 'evening';
  anchorId: AnchorId | null;
}
const ANCHOR_LOOKUP: Record<string, AnchorMapping> = {
  'när gästen tas emot': { phase: 'service', anchorId: 'greet' },
  'när beställningen tas upp': { phase: 'service', anchorId: 'order' },
  'när vin serveras': { phase: 'service', anchorId: 'setDown' },
  'när notan begärs': { phase: 'service', anchorId: 'requestCheck' },
  'när en gäst klagar': { phase: 'service', anchorId: null },
  morgon: { phase: 'morning', anchorId: null },
  kväll: { phase: 'evening', anchorId: null }
};

// -----------------------------------------------------------------
// Testerna
// -----------------------------------------------------------------

describe('ORDER 233 — Kalastorgets tio bronsfrågor matchar källfilen', () => {
  const md = readFileSync(SOURCE_MD, 'utf8');
  const parsed = parseBlocks(md, 'Kalastorget');

  it('parsar exakt 10 Kalastorget-block ur PAVILJONGFRAGOR_BRONS.md', () => {
    expect(parsed).toHaveLength(10);
  });

  it('modulen exporterar exakt 10 frågor', () => {
    expect(KALASTORGET_BRONS_QUESTIONS).toHaveLength(10);
  });

  it('varje modul-fråga har brons-nivå, phronesis, spar=null, pavilion=kalastorget', () => {
    for (const q of KALASTORGET_BRONS_QUESTIONS) {
      expect(q.level).toBe('brons');
      expect(q.axis).toBe('phronesis');
      expect(q.spar).toBeNull();
      expect(q.pavilion).toBe('kalastorget');
      expect(q.format).toBe('flerval');
    }
  });

  it('varje modul-fråga har fyra alternativ och en giltig correctIndex', () => {
    for (const q of KALASTORGET_BRONS_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
    }
  });

  it('varje modul-fråga har ankare med giltig phase och rå-text', () => {
    for (const q of KALASTORGET_BRONS_QUESTIONS) {
      expect(q.anchor).toBeDefined();
      expect(q.anchor!.phase).toMatch(/^(service|morning|evening)$/);
      expect(q.anchor!.rawText.length).toBeGreaterThan(0);
    }
  });

  // Kärntestet — replikat === källa, fråga för fråga.
  it.each(Array.from({ length: 10 }, (_, i) => i))(
    'fråga %i: prompt/alternativ/rätt/förklaring/ankare/frågeställare matchar källfilen',
    (i) => {
      const p = parsed[i];
      const q = KALASTORGET_BRONS_QUESTIONS[i];
      expect(q.prompt).toBe(p.fraga);
      expect(q.options[0]).toBe(p.a);
      expect(q.options[1]).toBe(p.b);
      expect(q.options[2]).toBe(p.c);
      expect(q.options[3]).toBe(p.d);
      expect(q.correctIndex).toBe(LETTER_TO_INDEX[p.ratt]);
      expect(q.explanation).toBe(p.forklaring);
      expect(q.anchor!.rawText).toBe(p.ankare);
      const expectedAsker = ASKER_LOOKUP[p.fragestallare];
      expect(expectedAsker, `okänd FRÅGESTÄLLARE "${p.fragestallare}"`).toBeDefined();
      expect(q.askerRole).toBe(expectedAsker);
      const expectedAnchor = ANCHOR_LOOKUP[p.ankare];
      expect(expectedAnchor, `okänd ANKARE-formulering "${p.ankare}"`).toBeDefined();
      expect(q.anchor!.phase).toBe(expectedAnchor.phase);
      if (expectedAnchor.anchorId === null) {
        expect(q.anchor!.anchorId).toBeUndefined();
      } else {
        expect(q.anchor!.anchorId).toBe(expectedAnchor.anchorId);
      }
    }
  );

  it('id-serien är kalastorget-brons-01..10 i ordning', () => {
    const ids = KALASTORGET_BRONS_QUESTIONS.map((q) => q.id);
    const expected = Array.from(
      { length: 10 },
      (_, i) => `kalastorget-brons-${String(i + 1).padStart(2, '0')}`
    );
    expect(ids).toEqual(expected);
  });

  it('inga dubbletter i frågan bland de tio (varje prompt unik)', () => {
    const prompts = new Set(KALASTORGET_BRONS_QUESTIONS.map((q) => q.prompt));
    expect(prompts.size).toBe(10);
  });

  it('ankarfördelning: 1 greet + 4 order + 2 requestCheck + 1 guest_complaint-väntande + 1 morgon + 1 kväll', () => {
    const greetCount = KALASTORGET_BRONS_QUESTIONS.filter(
      (q) => q.anchor?.anchorId === 'greet'
    ).length;
    const orderCount = KALASTORGET_BRONS_QUESTIONS.filter(
      (q) => q.anchor?.anchorId === 'order'
    ).length;
    const requestCheckCount = KALASTORGET_BRONS_QUESTIONS.filter(
      (q) => q.anchor?.anchorId === 'requestCheck'
    ).length;
    // "guest_complaint-väntande" = phase='service' UTAN anchorId (Fas 2).
    const complaintWaiting = KALASTORGET_BRONS_QUESTIONS.filter(
      (q) => q.anchor?.phase === 'service' && q.anchor?.anchorId === undefined
    ).length;
    const morningCount = KALASTORGET_BRONS_QUESTIONS.filter(
      (q) => q.anchor?.phase === 'morning'
    ).length;
    const eveningCount = KALASTORGET_BRONS_QUESTIONS.filter(
      (q) => q.anchor?.phase === 'evening'
    ).length;
    expect(greetCount).toBe(1);
    expect(orderCount).toBe(4);
    expect(requestCheckCount).toBe(2);
    expect(complaintWaiting).toBe(1);
    expect(morningCount).toBe(1);
    expect(eveningCount).toBe(1);
    expect(
      greetCount + orderCount + requestCheckCount + complaintWaiting + morningCount + eveningCount
    ).toBe(10);
  });

  it('frågeställarfördelning: 4 värd + 3 gäst + 1 servitör + 1 lärling + 1 kock', () => {
    const vard = KALASTORGET_BRONS_QUESTIONS.filter((q) => q.askerRole === 'värd').length;
    const gast = KALASTORGET_BRONS_QUESTIONS.filter((q) => q.askerRole === 'gäst').length;
    const servitor = KALASTORGET_BRONS_QUESTIONS.filter((q) => q.askerRole === 'servitör').length;
    const larling = KALASTORGET_BRONS_QUESTIONS.filter((q) => q.askerRole === 'lärling').length;
    const kock = KALASTORGET_BRONS_QUESTIONS.filter((q) => q.askerRole === 'kock').length;
    expect(vard).toBe(4);
    expect(gast).toBe(3);
    expect(servitor).toBe(1);
    expect(larling).toBe(1);
    expect(kock).toBe(1);
  });
});
