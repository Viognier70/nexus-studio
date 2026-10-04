// ORDER 273 — spelet på engelska (Vision Owner 2026-09-28).
//
// DoD som grep-verifierbar artefakt: varje strängliteral och varje
// template-text i spelets källkod läses med TypeScripts parser (inte
// kommentarer), och ingen får innehålla svensk text utanför de sparade
// svenska filerna (`*.sv.ts`, `*.sv.draft.json`). Svensk text känns igen på
// å, ä, ö eller på minst två vanliga svenska småord. Egennamn på platser,
// byggnader och paviljonger står kvar på svenska (CLAUDE.md regel 7), och
// kodens interna nycklar (rollerna 'värd', 'servitör' …) är inte
// spelartext. Raketbankens engelska text prövas för sig.
//
// Strängtabellen (content/nexusStrings.ts) har svenska och engelska sida vid
// sida med avsikt och undantas från genomsökningen av källkoden. I stället
// prövas tabellen själv: varje löv har både `sv` och `en`, och
// `pickLang(TABLE, 'en')` (och Designs STRINGS på engelska) har ingen svensk
// text, med samma igenkänning som för källkoden.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { STRINGS, TABLE, pickLang } from '../content/nexusStrings';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Egennamn och interna nycklar som får innehålla å, ä, ö.
const ALLOWED = [
  'Grythyttan', 'Hjälmaren', 'Hjälmarens', 'Örebro', 'Bergslagen', 'Bergslagens', 'Nora', 'Sävsjön',
  'Måltidens hus', 'Måltidens Hus', 'Måltidsbiblioteket', 'Metodköket', 'Stensöta', 'Kalastorget', 'Gastronomiska Teatern',
  'Björken', 'Prästgatans krog', 'Bergsmansöl', 'Torgets vinkällare', 'prästgatans', 'bergsmansöl', 'vinkällare',
  // ORDER 297 — byns krogar (Designs Byn i kvällsljus).
  'Sjöboden',
  // ORDER 301 — avhandlingarnas titlar i Kunskapsgrundens källor (egennamn).
  'Sinnesupplevelsens estetik: vinprovaren, i gränslandet mellan konsten och vetenskapen', 'Den arbetande gommen: vinprovarens dubbla grepp, från analys till upplevelse',
  // Kodens interna nycklar (typer och uppräkningar), inte spelartext.
  'värd', 'servitör', 'kock', 'lärling', 'ölkrog', 'gästgiveri', 'säsong', 'låg', 'hög', 'förbättras', 'försämras',
  'besökare', 'gäst', 'leverantör', 'boende', 'faluröd'
];

// Filer utan spelartext: Designs rumsmodeller och golvzoner (mått, flaggor
// och anteckningar), kartans data (gatunamn är egennamn), talen i
// balance.ts, bankernas validerare, den engelska kunskapsbanken (författar-
// namn), mallfrågorna från ORDER 107 (START_EXAM anropas inte från
// gränssnittet) och matkärrans arketyper (visas inte).
const NOT_PLAYER_TEXT = [
  // Strängtabellen: svenska och engelska sida vid sida (ORDER 273).
  /^content\/nexusStrings\.ts$/,
  // ORDER 290 — Designs strängtabeller (sv och en sida vid sida), inslagna i
  // STRINGS i nexusStrings.ts.
  /^content\/design\/[A-Za-z]+Strings\.ts$/,
  // Designs tokens för rätt och fel (anteckningar om vad som ersätts, visas inte).
  /^ui\/theme\/nexusTheme\.warm\.rattfel\.ts$/,
  /^strategic\/scene\/[A-Za-z.]+\.ts$/,
  /^strategic\/content\/(roadRoles|streetProfiles|grythyttan|layout)\.ts$/,
  /^sim\/(balance|incidentBank)\.ts$/,
  /^strategic\/knowledge\/(questionBank|questionCoverage|questionTemplates|maltidbiblioteketBrons)\.ts$/,
  /^content\/knowledgeBank\.ts$/,
  /^strategic\/ui\/foodtruck\/(archetypes|guestFaces)\.ts$/
];
const SWEDISH_WORDS = ['och', 'att', 'det', 'som', 'inte', 'med', 'för', 'är', 'på', 'av', 'har', 'kan', 'ska', 'vid', 'när', 'eller', 'utan', 'också', 'kvällen', 'gästen', 'personalen'];

function playerTextFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'testHarness') continue;
      playerTextFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.sv\.ts$/.test(entry) && !/\.d\.ts$/.test(entry)) {
      if (!NOT_PLAYER_TEXT.some((re) => re.test(relative(SRC, full)))) acc.push(full);
    }
  }
  return acc;
}

function isSwedish(text: string): boolean {
  let t = text;
  for (const name of ALLOWED) t = t.split(name).join('');
  if (/[åäöÅÄÖ]/.test(t)) return true;
  const words = t.toLowerCase().match(/[a-zåäö]+/g) ?? [];
  return words.filter((w) => SWEDISH_WORDS.includes(w)).length >= 2;
}

function literalsIn(file: string, source?: string): { line: number; text: string }[] {
  const src = source ?? readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: { line: number; text: string }[] = [];
  const visit = (n: ts.Node) => {
    // Importvägar, typer, felmeddelanden och konsolutskrifter är inte spelartext.
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isLiteralTypeNode(n)) return;
    if (ts.isNewExpression(n) && /Error$/.test(n.expression.getText(sf))) return;
    if (ts.isCallExpression(n) && /^console\./.test(n.expression.getText(sf))) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n)) {
      out.push({ line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, text: n.text });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

describe('ORDER 273 — ingen svensk spelartext', () => {
  it('källkoden utanför de svenska filerna har ingen svensk text', () => {
    const offenders: string[] = [];
    for (const file of playerTextFiles(SRC)) {
      for (const lit of literalsIn(file)) {
        if (isSwedish(lit.text)) offenders.push(`${relative(SRC, file)}:${lit.line} ${JSON.stringify(lit.text.slice(0, 80))}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('raketbankens engelska text har ingen svensk text utom platshållarna', () => {
    const en = JSON.parse(readFileSync(join(SRC, 'content/incidents/vinbar.text.en.json'), 'utf8'));
    const offenders: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (typeof v === 'string') {
        const t = v.replace(/\{(bord|gäst|vin|personal|klockan)\}/g, '');
        if (isSwedish(t)) offenders.push(`${path}: ${t.slice(0, 80)}`);
      } else if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
      }
    };
    walk(en.texts, 'texts');
    expect(offenders).toEqual([]);
  });

  it('den svenska texten finns kvar: varje löv i strängtabellen har sv, och raketbankens svenska utkast finns', () => {
    const missing: string[] = [];
    walkTable(TABLE, '', (path, leaf) => {
      if (!leaf || !('sv' in leaf) || isEmpty(leaf.sv)) missing.push(path);
    });
    expect(missing).toEqual([]);
    expect(statSync(join(SRC, 'content/incidents/vinbar.text.sv.draft.json')).isFile()).toBe(true);
  });
});

// ---------------------------------------------------------------------
// ORDER 273 — strängtabellen
// ---------------------------------------------------------------------

type Leaf = { sv: unknown; en: unknown };

function isLeafNode(v: unknown): v is Leaf {
  return !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 2 && 'sv' in v && 'en' in v;
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '';
}

// Går igenom TABLE; `leaf` är null för ett värde som varken är ett löv
// ({ sv, en }) eller en gren (ett objekt med löv och grenar).
function walkTable(node: unknown, path: string, visit: (path: string, leaf: Leaf | null) => void) {
  if (isLeafNode(node)) return visit(path, node);
  if (!node || typeof node !== 'object' || Array.isArray(node)) return visit(path, null);
  for (const [k, v] of Object.entries(node)) walkTable(v, path ? `${path}.${k}` : k, visit);
}

// Spelartexten i ett värde: text, texterna i tupler och Record-objekt och
// strängliteralerna och template-texten i funktioner (lästa med samma parser).
function textsOf(v: unknown, path: string, out: { path: string; text: string }[]) {
  if (typeof v === 'string') out.push({ path, text: v });
  else if (typeof v === 'function') {
    for (const lit of literalsIn(`${path}.ts`, `const f = ${v.toString()};`)) out.push({ path, text: lit.text });
  } else if (Array.isArray(v)) v.forEach((x, i) => textsOf(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) textsOf(x, `${path}.${k}`, out);
}

describe('ORDER 273 — strängtabellen, svenska och engelska sida vid sida', () => {
  it('varje löv i spelets tabell har både sv och en', () => {
    const bad: string[] = [];
    let leaves = 0;
    walkTable(TABLE, '', (path, leaf) => {
      if (!leaf) bad.push(`${path}: inget { sv, en }-löv`);
      else {
        leaves++;
        if (isEmpty(leaf.sv)) bad.push(`${path}: saknar sv`);
        if (isEmpty(leaf.en)) bad.push(`${path}: saknar en`);
        if (typeof leaf.sv !== typeof leaf.en || Array.isArray(leaf.sv) !== Array.isArray(leaf.en)) bad.push(`${path}: sv och en har olika form`);
      }
    });
    expect(bad).toEqual([]);
    expect(leaves).toBeGreaterThan(0);
  });

  it('varje nyckel i Designs STRINGS har både sv och en', () => {
    const bad = Object.entries(STRINGS).filter(([, e]) => isEmpty(e.sv) || isEmpty(e.en)).map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it("pickLang(TABLE, 'en') och Designs STRINGS på engelska har ingen svensk text", () => {
    const texts: { path: string; text: string }[] = [];
    textsOf(pickLang(TABLE, 'en'), 'TABLE', texts);
    for (const [k, e] of Object.entries(STRINGS)) texts.push({ path: `STRINGS.${k}`, text: e.en });
    const offenders = texts.filter((t) => isSwedish(t.text)).map((t) => `${t.path}: ${JSON.stringify(t.text.slice(0, 80))}`);
    expect(texts.length).toBeGreaterThan(600);
    expect(offenders).toEqual([]);
  });

  it("pickLang(TABLE, 'sv') ger svenska där engelskan skiljer sig (tabellen är inte en kopia av engelskan)", () => {
    const sv = pickLang(TABLE, 'sv');
    const en = pickLang(TABLE, 'en');
    expect(sv.service.clock.lastOrders).toBe(STRINGS['hud.clock.last'].sv);
    expect(en.service.clock.lastOrders).toBe(STRINGS['hud.clock.last'].en);
    expect(en.knowledge.houseHeading).toBe(STRINGS['house.name'].en);
    expect(sv.knowledge.houseHeading).toBe(STRINGS['house.name'].sv);
  });
});
