// ORDER 231 — verifiera att modulen `stensotaBrons.ts` matchar
// källfilen `PAVILJONGFRAGOR_BRONS.md` (Stensöta-sektionen).
//
// Samma pattern som `metodkoketBrons.test.ts` (ORDER 229) + verifierar
// frågeställare per fråga (ORDER 231:s addition, VO 2026-09-21:
// "Sommelieren och Gästen delar axis + spar i Stensöta och går inte
// att härleda... låt parity-testet verifiera frågeställaren per fråga
// mot källfilen, precis som ankaret") + verifierar ankarfördelningen
// 4/5/1 (order/setDown/morgon) som VO angav.
//
// Källfilen är kanonisk. Om VO redigerar en Stensöta-fråga eller ett
// FRÅGESTÄLLARE/ANKARE-fält utan att regenerera modulen bryter testet.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STENSOTA_BRONS_QUESTIONS } from '../stensotaBrons';
import type { QuestionAsker } from '../questionFormats';
import type { AnchorId } from '../../simulation/anchors';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_MD = resolve(
  HERE,
  '../../../../../documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md'
);

// -----------------------------------------------------------------
// Parser — identisk struktur som Metodkökets test.
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

// ORDER 231 — mappning från källfilens bestämda-form-frågeställare till
// modul-fältets grundform. Endast dessa tre används i Stensötas tio;
// listan utökas när Kalastorget/Måltidsbiblioteket kräver fler.
const ASKER_LOOKUP: Record<string, QuestionAsker> = {
  Kocken: 'kock',
  Sommelieren: 'sommelier',
  Gästen: 'gäst',
  Värden: 'värd',
  Servitören: 'servitör',
  Lärlingen: 'lärling'
};

// ORDER 231 — mappning från rå-ankartext till AnchorId per VO:s
// specifikation 2026-09-21.
const ANCHOR_LOOKUP: Record<string, AnchorId | null> = {
  'när beställningen tas upp': 'order',
  'när vin serveras': 'setDown',
  morgon: null
};

// -----------------------------------------------------------------
// Testerna
// -----------------------------------------------------------------

describe('ORDER 231 — Stensötas tio bronsfrågor matchar källfilen', () => {
  const md = readFileSync(SOURCE_MD, 'utf8');
  const parsed = parseBlocks(md, 'Stensöta');

  it('parsar exakt 10 Stensöta-block ur PAVILJONGFRAGOR_BRONS.md', () => {
    expect(parsed).toHaveLength(10);
  });

  it('modulen exporterar exakt 10 frågor', () => {
    expect(STENSOTA_BRONS_QUESTIONS).toHaveLength(10);
  });

  it('varje modul-fråga har brons-nivå, techne/sommellerie/stensota', () => {
    for (const q of STENSOTA_BRONS_QUESTIONS) {
      expect(q.level).toBe('brons');
      expect(q.axis).toBe('techne');
      expect(q.spar).toBe('sommellerie');
      expect(q.pavilion).toBe('stensota');
      expect(q.format).toBe('flerval');
    }
  });

  it('varje modul-fråga har fyra alternativ och en giltig correctIndex', () => {
    for (const q of STENSOTA_BRONS_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
    }
  });

  it('varje modul-fråga har ankare med giltig phase och rå-text', () => {
    for (const q of STENSOTA_BRONS_QUESTIONS) {
      expect(q.anchor).toBeDefined();
      expect(q.anchor!.phase).toMatch(/^(service|morning|evening)$/);
      expect(q.anchor!.rawText.length).toBeGreaterThan(0);
    }
  });

  // Kärntestet — replikat === källa, fråga för fråga. Verifierar även
  // frågeställare och anchorId per VO:s addition (2026-09-21).
  it.each(Array.from({ length: 10 }, (_, i) => i))(
    'fråga %i: prompt/alternativ/rätt/förklaring/ankare/frågeställare matchar källfilen',
    (i) => {
      const p = parsed[i];
      const q = STENSOTA_BRONS_QUESTIONS[i];
      expect(q.prompt).toBe(p.fraga);
      expect(q.options[0]).toBe(p.a);
      expect(q.options[1]).toBe(p.b);
      expect(q.options[2]).toBe(p.c);
      expect(q.options[3]).toBe(p.d);
      expect(q.correctIndex).toBe(LETTER_TO_INDEX[p.ratt]);
      expect(q.explanation).toBe(p.forklaring);
      expect(q.anchor!.rawText).toBe(p.ankare);
      // ORDER 231 addition — frågeställare per fråga.
      const expectedAsker = ASKER_LOOKUP[p.fragestallare];
      expect(expectedAsker, `okänd FRÅGESTÄLLARE "${p.fragestallare}" i källfilen`).toBeDefined();
      expect(q.askerRole).toBe(expectedAsker);
      // ORDER 231 addition — anchorId enligt VO:s mappning.
      const expectedAnchorId = ANCHOR_LOOKUP[p.ankare];
      if (expectedAnchorId === null) {
        // "morgon" har ingen anchorId — bara phase.
        expect(q.anchor!.anchorId).toBeUndefined();
        expect(q.anchor!.phase).toBe('morning');
      } else if (expectedAnchorId !== undefined) {
        expect(q.anchor!.anchorId).toBe(expectedAnchorId);
        expect(q.anchor!.phase).toBe('service');
      } else {
        throw new Error(
          `okänd ANKARE-formulering "${p.ankare}" — utöka ANCHOR_LOOKUP eller normalisera källan`
        );
      }
    }
  );

  it('id-serien är stensota-brons-01..10 i ordning', () => {
    const ids = STENSOTA_BRONS_QUESTIONS.map((q) => q.id);
    const expected = Array.from(
      { length: 10 },
      (_, i) => `stensota-brons-${String(i + 1).padStart(2, '0')}`
    );
    expect(ids).toEqual(expected);
  });

  it('inga dubbletter i frågan bland de tio (varje prompt unik)', () => {
    const prompts = new Set(STENSOTA_BRONS_QUESTIONS.map((q) => q.prompt));
    expect(prompts.size).toBe(10);
  });

  // ORDER 231 — VO:s 4/5/1-fördelning (order/setDown/morgon) är
  // avsedd; om källfilen redigeras så den avviker ska det synas här.
  it('ankarfördelning: 4 order + 5 setDown + 1 morgon', () => {
    const orderCount = STENSOTA_BRONS_QUESTIONS.filter(
      (q) => q.anchor?.anchorId === 'order'
    ).length;
    const setDownCount = STENSOTA_BRONS_QUESTIONS.filter(
      (q) => q.anchor?.anchorId === 'setDown'
    ).length;
    const morningCount = STENSOTA_BRONS_QUESTIONS.filter(
      (q) => q.anchor?.phase === 'morning'
    ).length;
    expect(orderCount).toBe(4);
    expect(setDownCount).toBe(5);
    expect(morningCount).toBe(1);
    expect(orderCount + setDownCount + morningCount).toBe(10);
  });

  it('frågeställarfördelning: 5 sommelier + 4 gäst + 1 kock', () => {
    const sommelier = STENSOTA_BRONS_QUESTIONS.filter((q) => q.askerRole === 'sommelier').length;
    const gast = STENSOTA_BRONS_QUESTIONS.filter((q) => q.askerRole === 'gäst').length;
    const kock = STENSOTA_BRONS_QUESTIONS.filter((q) => q.askerRole === 'kock').length;
    expect(sommelier).toBe(5);
    expect(gast).toBe(4);
    expect(kock).toBe(1);
  });
});
