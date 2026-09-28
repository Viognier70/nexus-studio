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

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Egennamn och interna nycklar som får innehålla å, ä, ö.
const ALLOWED = [
  'Grythyttan', 'Hjälmaren', 'Hjälmarens', 'Örebro', 'Bergslagen', 'Bergslagens', 'Nora', 'Sävsjön',
  'Måltidens hus', 'Måltidens Hus', 'Måltidsbiblioteket', 'Metodköket', 'Stensöta', 'Kalastorget', 'Gastronomiska Teatern',
  'Björken', 'Prästgatans krog', 'Bergsmansöl', 'Torgets vinkällare', 'prästgatans', 'bergsmansöl', 'vinkällare',
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

function literalsIn(file: string): { line: number; text: string }[] {
  const src = readFileSync(file, 'utf8');
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

  it('de svenska filerna finns kvar', () => {
    for (const f of ['content/strings.sv.ts', 'content/incidents/vinbar.text.sv.draft.json']) {
      expect(statSync(join(SRC, f)).isFile()).toBe(true);
    }
  });
});
