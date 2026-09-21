// ORDER 229 — verifiera att modulen `metodkoketBrons.ts` matchar
// källfilen `PAVILJONGFRAGOR_BRONS.md` exakt.
//
// **Källfilen är kanonisk. Modulen är replikat.** Testet parserar de
// tio Metodköket-blocken ur .md-filen vid varje körning, jämför mot
// modulens exporterade `METODKOKET_BRONS_QUESTIONS`, och bryter om
// någon glidning finns. Detta följer ORDER 160-principen: talen ur
// skriptets källa (här: den auktoritativa Vision Owner-filen), inte
// hardcodade fixtures.
//
// Så här driftas modulen framåt: när Vision Owner redigerar
// `PAVILJONGFRAGOR_BRONS.md` bryter testet på nästa CI-körning; en
// agent (eller manuell hand) uppdaterar `metodkoketBrons.ts` för att
// matcha, och testet blir grönt igen. Skulle någon råka fysisk redigera
// modulen utan att uppdatera källan bryter testet lika stark.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { METODKOKET_BRONS_QUESTIONS } from '../metodkoketBrons';

const HERE = dirname(fileURLToPath(import.meta.url));
// frontend/src/strategic/knowledge/__tests__/ → repo-root → documentation/…
// (5 x ../ når nexus-studio/ från __tests__/-mappen.)
const SOURCE_MD = resolve(
  HERE,
  '../../../../../documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md'
);

// -----------------------------------------------------------------
// Parser för brief-block-formatet (FRAGORNA_TILL_PAVILJONGERNA.md §7):
//
//   PAVILJONG: Metodköket
//   FRÅGESTÄLLARE: Kocken
//   FRÅGA: [en eller två meningar]
//   A: [alternativ]
//   B: [alternativ]
//   C: [alternativ]
//   D: [alternativ]
//   RÄTT: [bokstav]
//   FÖRKLARING: [två till tre meningar]
//   ANKARE: [text]
//
// Block ligger inuti trippel-backtick-kodstycken i .md-filen. Parsern
// extraherar alla blocks med `PAVILJONG: Metodköket`.
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
  // Fånga innehåll mellan ``` och ```. Kan vara ```-linjer med bara ```.
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

// Fält kan sträcka sig över flera rader (t.ex. FÖRKLARING är 2-3
// meningar). Parsern läser rad för rad och samlar rader under senaste
// nyckeln tills nästa nyckel dyker upp.
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

// -----------------------------------------------------------------
// Testerna
// -----------------------------------------------------------------

describe('ORDER 229 — Metodkökets tio bronsfrågor matchar källfilen', () => {
  const md = readFileSync(SOURCE_MD, 'utf8');
  const parsed = parseBlocks(md, 'Metodköket');

  it('parsar exakt 10 Metodköket-block ur PAVILJONGFRAGOR_BRONS.md', () => {
    expect(parsed).toHaveLength(10);
  });

  it('modulen exporterar exakt 10 frågor', () => {
    expect(METODKOKET_BRONS_QUESTIONS).toHaveLength(10);
  });

  it('varje modul-fråga har brons-nivå, kock som frågeställare, techne/kok/metodkoket', () => {
    for (const q of METODKOKET_BRONS_QUESTIONS) {
      expect(q.level).toBe('brons');
      expect(q.askerRole).toBe('kock');
      expect(q.axis).toBe('techne');
      expect(q.spar).toBe('kok');
      expect(q.pavilion).toBe('metodkoket');
      expect(q.format).toBe('flerval');
    }
  });

  it('varje modul-fråga har fyra alternativ och en giltig correctIndex', () => {
    for (const q of METODKOKET_BRONS_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
    }
  });

  it('varje modul-fråga har ankare med rå text som match:ar en av briefens former', () => {
    for (const q of METODKOKET_BRONS_QUESTIONS) {
      expect(q.anchor).toBeDefined();
      expect(q.anchor!.phase).toMatch(/^(service|morning|evening)$/);
      expect(q.anchor!.rawText.length).toBeGreaterThan(0);
    }
  });

  // Kärntestet — replikat === källa, fråga för fråga.
  it.each(Array.from({ length: 10 }, (_, i) => i))(
    'fråga %i: prompt/alternativ/rätt/förklaring/ankare matchar källfilens block',
    (i) => {
      const p = parsed[i];
      const q = METODKOKET_BRONS_QUESTIONS[i];
      // Bibehåll formuleringar exakt — briefen är källan.
      expect(q.prompt).toBe(p.fraga);
      expect(q.options[0]).toBe(p.a);
      expect(q.options[1]).toBe(p.b);
      expect(q.options[2]).toBe(p.c);
      expect(q.options[3]).toBe(p.d);
      expect(q.correctIndex).toBe(LETTER_TO_INDEX[p.ratt]);
      expect(q.explanation).toBe(p.forklaring);
      expect(q.anchor!.rawText).toBe(p.ankare);
    }
  );

  it('id-serien är metodkoket-brons-01..10 i ordning', () => {
    const ids = METODKOKET_BRONS_QUESTIONS.map((q) => q.id);
    const expected = Array.from(
      { length: 10 },
      (_, i) => `metodkoket-brons-${String(i + 1).padStart(2, '0')}`
    );
    expect(ids).toEqual(expected);
  });

  it('inga dubbletter i frågan bland de tio (varje prompt unik)', () => {
    const prompts = new Set(METODKOKET_BRONS_QUESTIONS.map((q) => q.prompt));
    expect(prompts.size).toBe(10);
  });
});
