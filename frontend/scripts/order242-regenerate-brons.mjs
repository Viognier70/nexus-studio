// ORDER 242 — regenerera de fyra brons-modulerna från PAVILJONGFRAGOR_BRONS.md.
//
// Kanonisk källa: `documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md`
// (VO Observation 6-omskrivning: FRÅGA, A–D, FÖRKLARING är nu engelska).
//
// Script:et byter kirurgiskt ut endast prompt/options/explanation-strängar
// per fråga (identifierade via `id: 'X-brons-NN'`). Alla övriga fält
// (correctIndex, anchor, askerRole, pavilion, axis, level, spar, id)
// samt kommentarer och whitespace lämnas orörda.
//
// Körning: `node scripts/order242-regenerate-brons.mjs`

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const MD_PATH = resolve(REPO_ROOT, 'documentation/foundation/vision/content/PAVILJONGFRAGOR_BRONS.md');

const PAVILIONS = [
  { md: 'Metodköket',        idBase: 'metodkoket',        file: 'metodkoketBrons.ts' },
  { md: 'Stensöta',          idBase: 'stensota',          file: 'stensotaBrons.ts' },
  { md: 'Måltidsbiblioteket', idBase: 'maltidbiblioteket', file: 'maltidbiblioteketBrons.ts' },
  { md: 'Kalastorget',       idBase: 'kalastorget',       file: 'kalastorgetBrons.ts' }
];

// ---- Parser: läs alla code-fence-block i .md, filtrera per paviljong.
function parseBlocks(md, forPavilion) {
  const blocks = [];
  const codeFenceRe = /```\n([\s\S]*?)\n```/g;
  let m;
  while ((m = codeFenceRe.exec(md)) !== null) {
    const body = m[1];
    if (!body.startsWith('PAVILJONG:')) continue;
    const pMatch = body.match(/^PAVILJONG:\s*(.+)$/m);
    if (!pMatch || pMatch[1].trim() !== forPavilion) continue;

    // FRÅGA: kan spänna över flera rader tills nästa `A:`.
    const fragaMatch = body.match(/^FRÅGA:\s*([\s\S]*?)(?=\nA:)/m);
    const aMatch = body.match(/^A:\s*(.+)$/m);
    const bMatch = body.match(/^B:\s*(.+)$/m);
    const cMatch = body.match(/^C:\s*(.+)$/m);
    const dMatch = body.match(/^D:\s*(.+)$/m);
    // FÖRKLARING: kan också spänna över flera rader tills `ANKARE:`.
    const forklaringMatch = body.match(/^FÖRKLARING:\s*([\s\S]*?)(?=\nANKARE:)/m);

    if (!fragaMatch || !aMatch || !bMatch || !cMatch || !dMatch || !forklaringMatch) {
      throw new Error(`Kunde inte parsa block för ${forPavilion}:\n${body}`);
    }

    blocks.push({
      fraga: fragaMatch[1].trim(),
      options: [aMatch[1].trim(), bMatch[1].trim(), cMatch[1].trim(), dMatch[1].trim()],
      forklaring: forklaringMatch[1].trim()
    });
  }
  return blocks;
}

// ---- JS-strängliteral: föredra dubbla citattecken när strängen har '
// men inte "; annars enkla citattecken med \'-escapes.
function jsstr(s) {
  const hasSingle = s.includes("'");
  const hasDouble = s.includes('"');
  if (hasSingle && !hasDouble) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

// ---- Ersätt en enskild fältstring (prompt eller explanation).
// Matchar både single-line och multi-line form:
//   prompt: 'text',
//   prompt:\n      'text',
// Preserverar `fieldName:` + eventuell newline-indent före strängen,
// bara stränginnehållet byts.
function replaceStringField(text, fieldName, newValue) {
  const stringLiteral = "(?:'(?:\\\\.|[^\\\\'])*'|\"(?:\\\\.|[^\\\\\"])*\")";
  const re = new RegExp(`(${fieldName}:[ \\t]*(?:\\n[ \\t]+)?)${stringLiteral}(,)`);
  if (!re.test(text)) throw new Error(`Fältet ${fieldName} hittades inte`);
  return text.replace(re, `$1${jsstr(newValue)}$2`);
}

// ---- Ersätt options-arrayen (fyra strängar). Preserverar array-brackets
// och strängkomma-format.
function replaceOptions(text, newOptions) {
  const stringLiteral = "(?:'(?:\\\\.|[^\\\\'])*'|\"(?:\\\\.|[^\\\\\"])*\")";
  const re = new RegExp(
    `(options:[ \\t]*\\[[ \\t\\n]*)` +
    `${stringLiteral}([ \\t]*,[ \\t\\n]*)` +
    `${stringLiteral}([ \\t]*,[ \\t\\n]*)` +
    `${stringLiteral}([ \\t]*,[ \\t\\n]*)` +
    `${stringLiteral}([ \\t\\n]*\\],)`
  );
  if (!re.test(text)) throw new Error(`options-arrayen hittades inte`);
  const [a, b, c, d] = newOptions.map(jsstr);
  return text.replace(re, `$1${a}$2${b}$3${c}$4${d}$5`);
}

// ---- Huvudloop: för varje paviljong, ersätt de tio frågornas
// prompt/options/explanation.
const md = readFileSync(MD_PATH, 'utf8');

for (const p of PAVILIONS) {
  const blocks = parseBlocks(md, p.md);
  if (blocks.length !== 10) {
    throw new Error(`Förväntade 10 block för ${p.md}, fick ${blocks.length}`);
  }
  const tsPath = resolve(REPO_ROOT, 'frontend/src/strategic/knowledge', p.file);
  let src = readFileSync(tsPath, 'utf8');

  for (let i = 0; i < 10; i++) {
    const id = `${p.idBase}-brons-${String(i + 1).padStart(2, '0')}`;
    const block = blocks[i];

    // Hitta start på detta fråge-objekt via id-strängen.
    const idMarker = `id: '${id}',`;
    const startIdx = src.indexOf(idMarker);
    if (startIdx === -1) throw new Error(`Hittar inte ${id} i ${p.file}`);

    // Hitta start på nästa objekt (eller slut på array).
    let endIdx;
    if (i < 9) {
      const nextId = `id: '${p.idBase}-brons-${String(i + 2).padStart(2, '0')}',`;
      endIdx = src.indexOf(nextId, startIdx);
      if (endIdx === -1) throw new Error(`Hittar inte ${nextId} i ${p.file}`);
    } else {
      // Sista frågan: sluttar vid `\n];`
      endIdx = src.indexOf('\n];', startIdx);
      if (endIdx === -1) throw new Error(`Hittar inte '\\n];' efter sista frågan i ${p.file}`);
      endIdx += 3; // inkludera `\n];`
    }

    // Applicera tre replacements på blocket.
    let blockText = src.substring(startIdx, endIdx);
    blockText = replaceStringField(blockText, 'prompt', block.fraga);
    blockText = replaceOptions(blockText, block.options);
    blockText = replaceStringField(blockText, 'explanation', block.forklaring);

    src = src.substring(0, startIdx) + blockText + src.substring(endIdx);
  }

  writeFileSync(tsPath, src);
  console.log(`Regenererad: ${p.file} (10 frågor)`);
}

console.log('Klart — 4 moduler × 10 frågor.');
