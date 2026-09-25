// ORDER 262 (Nexus v1 etapp 0) — alla tal från speldesignen ligger i
// `balance.ts`, och bara där.
//
// Testet läser speldesignen själv (samma källa som `balance.ts` påstår
// sig beskriva) i stället för en kopierad lista:
//   1. varje `section` i balance.ts är en rubrik i speldesignen,
//   2. varje tal i speldesignen finns som värde i balance.ts, utom de
//      som står i NOT_GAME_VALUES nedan med skäl,
//   3. ingen annan fil under `src/sim/` innehåller talvärden,
//   4. golvstegen (15, 30, 55, 90) står ingen annanstans i `src/`.
//
// Punkt 3 skyddar framtida logik: i etapp 0 finns ännu ingen annan fil
// under `src/sim/`, så punkten prövar inget i dag. Punkt 4 prövar den
// befintliga koden. Andra tal i befintlig kod som motsvarar
// speldesignens mekanik (t.ex. `QUESTIONS_PER_EXAM`) hör till den gamla
// mekaniken och byts ut i den etapp som bygger om den; de är listade i
// `documentation/architecture/ORDER_262_RAPPORT.md` §4.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as balance from '../balance';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '../..');
const DESIGN_MD = resolve(
  HERE,
  '../../../../documentation/foundation/vision/NEXUS_SPELDESIGN_V1.md'
);
const design = readFileSync(DESIGN_MD, 'utf8');

// Tal i speldesignen som inte är spelvärden. Varje post har ett skäl.
const NOT_GAME_VALUES: { value: number; where: string; reason: string }[] = [
  { value: 25, where: 'inledningen', reason: '"Alla 25 beslut" — antal beslut i beslutsdokumentet' },
  { value: 11, where: 'Servicen > Lagret', reason: '"elva kuvert" — exempel på en prognos i ord' }
];

// Svenska räkneord som speldesignen skriver tal med. "en/ett" utelämnas:
// de är obestämd artikel lika ofta som tal.
const NUMBER_WORDS: Record<string, number> = {
  två: 2, tre: 3, fyra: 4, fem: 5, sex: 6, sju: 7, åtta: 8, nio: 9,
  tio: 10, elva: 11, tolv: 12, tjugo: 20
};

// Ett tal i speldesignen. `percent` är sant när "%" eller "procent…"
// följer direkt — då lagras det som andel i balance.ts (5 % → 0.05).
interface DesignNumber { value: number; percent: boolean }

function numbersInDesign(md: string): DesignNumber[] {
  const text = md
    .replace(/\d{4}-\d{2}-\d{2}/g, '')   // datum
    .replace(/VS\d+/g, '');              // dokumentnamn (VS001)
  const out = new Map<string, DesignNumber>();
  const add = (value: number, rest: string) => {
    const percent = /^\s*(%|procent)/i.test(rest);
    out.set(`${value}|${percent}`, { value, percent });
  };
  for (const m of text.matchAll(/\d+(?: \d{3})*(?:,\d+)?/g)) {
    add(Number(m[0].replace(/ /g, '').replace(',', '.')), text.slice(m.index! + m[0].length));
  }
  const letter = 'A-Za-zÅÄÖåäöÉé';
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    const re = new RegExp(`(?<![${letter}])${word}(?![${letter}])`, 'gi');
    for (const m of text.matchAll(re)) add(value, text.slice(m.index! + m[0].length));
  }
  return [...out.values()].sort((a, b) => a.value - b.value);
}

function numbersIn(value: unknown, acc: number[] = []): number[] {
  if (typeof value === 'number') acc.push(value);
  else if (Array.isArray(value)) value.forEach((v) => numbersIn(v, acc));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => numbersIn(v, acc));
  return acc;
}

function sectionsIn(value: unknown, acc: string[] = []): string[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const s = (value as { section?: unknown }).section;
    if (typeof s === 'string') acc.push(s);
  }
  return acc;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      out.push(...sourceFiles(p));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const headings = new Set(
  design.split('\n').filter((l) => /^#{1,6} /.test(l)).map((l) => l.replace(/^#+ /, '').trim())
);
const exported = Object.values(balance);
const balanceNumbers = numbersIn(exported);

describe('ORDER 262 — balance.ts mot speldesignen', () => {
  it('varje grupp pekar på en rubrik som finns i speldesignen', () => {
    const sections = exported.flatMap((v) => sectionsIn(v));
    expect(sections.length).toBeGreaterThan(15);
    const missing = sections.flatMap((s) => s.split(' > ')).filter((part) => !headings.has(part));
    expect(missing).toEqual([]);
  });

  it('varje tal i speldesignen finns i balance.ts', () => {
    const excluded = new Set(NOT_GAME_VALUES.map((x) => x.value));
    const has = ({ value, percent }: DesignNumber) => {
      const want = percent ? value / 100 : value;
      return balanceNumbers.some((b) => Math.abs(b - want) < 1e-9);
    };
    const missing = numbersInDesign(design)
      .filter((n) => !excluded.has(n.value) && !has(n))
      .map((n) => `${n.value}${n.percent ? ' %' : ''}`);
    expect(missing).toEqual([]);
  });

  it('undantagen står faktiskt i speldesignen', () => {
    const inDesign = new Set(numbersInDesign(design).map((n) => n.value));
    for (const x of NOT_GAME_VALUES) expect(inDesign.has(x.value), x.reason).toBe(true);
  });

  it('speldesignens nyckeltal har rätt värde', () => {
    expect(balance.FLOOR.medalValue).toEqual({ none: 0, brons: 15, silver: 30, guld: 55, platina: 90 });
    expect([balance.FLOOR.mainPavilionWeight, balance.FLOOR.otherPavilionsWeight]).toEqual([0.6, 0.4]);
    expect(balance.FLOOR.maxPercent).toBe(90);
    expect(balance.MARKET.baseShareCap).toBe(0.2);
    expect(balance.MARKET.shareCapPerMedalStep).toBe(0.03);
    expect(balance.LOAN).toMatchObject({ amortisationWeeks: 8, interestRate: 0.05 });
    expect(balance.DOWNGRADE).toMatchObject({ consecutiveNegativeDayEnds: 3, warningDays: 2 });
    expect(balance.ACTION_BUTTON).toMatchObject({ blindSimSeconds: 20, maxPerEvening: 3 });
    expect(balance.EXAM).toMatchObject({ questionsDrawn: 8, questionsPerLevel: 10, correctToPass: 6 });
    expect(balance.PRACTICE.questions).toBe(5);
    expect(balance.DAY).toMatchObject({ scheduleSlots: 2, sundayScheduleSlots: 4 });
    expect(balance.HOLIDAYS.list.map((h) => h.week)).toEqual([1, 3, 5, 8]);
    expect(balance.REPUTATION).toMatchObject({ scale: 100, floor: 10 });
    expect(balance.WEEK.guestFactor.sun).toBe(0);
  });

  it('ingen annan fil under src/sim/ innehåller talvärden utom 0 och 1', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(resolve(SRC, 'sim'))) {
      if (file.endsWith('/balance.ts')) continue;
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const m of code.matchAll(/(?<![\w.$'"`])\d+(?:\.\d+)?(?![\w'"`])/g)) {
        if (m[0] !== '0' && m[0] !== '1') offenders.push(`${relative(SRC, file)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('golvstegen 15, 30, 55, 90 står ingen annanstans i src/', () => {
    const ladder = /(?<!\d)15(?!\d)[^\n]{0,80}(?<!\d)30(?!\d)[^\n]{0,80}(?<!\d)55(?!\d)[^\n]{0,80}(?<!\d)90(?!\d)/;
    const offenders = sourceFiles(SRC)
      .filter((f) => !f.endsWith('/sim/balance.ts'))
      .filter((f) => ladder.test(readFileSync(f, 'utf8')))
      .map((f) => relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});
