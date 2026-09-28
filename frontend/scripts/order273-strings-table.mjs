// ORDER 273 (strängtabellen) — bygger frontend/src/content/nexusStrings.ts.
//
// Läser spelets två strängfiler (strings.sv.ts och strings.en.ts, samma
// nästlade form) med TypeScripts kompilator-API, parar ihop löven på
// nyckelväg och skriver en tabell där varje löv är `{ sv: …, en: … }`
// (källtexten ur respektive fil). Funktioner, tupler och `{…} as Record`
// är löv i sin helhet. Före tabellen står Designs `nexusStrings.ts`
// (leveransen 2026-09-28) ordagrant: STRINGS, t, Lang och serviceClock.
//
// Därefter läggs två listor på:
//   DESIGN  — Designs ordval där Designs nyckel avser samma plats som ett av
//             spelets löv (Vision Owner 2026-09-28: "låt Designs ordval gälla
//             där de skiljer sig"). Varje post är från → till, per språk.
//   ADDED   — nya löv (Designs nycklar som saknade motsvarighet och som
//             spelet nu använder, klockslaget per språk, språkvalet).
//   REMOVED — löv som ersatts av ett nytt löv.
// och "Måltidens hus" heter "the House of the Meal" i alla engelska löv.
//
// Källfilerna togs bort i ORDER 273. Skriptet läser dem ur git:
//   node scripts/order273-strings-table.mjs            # från 4376789 (main före ORDER 273)
//   node scripts/order273-strings-table.mjs --rev <rev>
//   node scripts/order273-strings-table.mjs --files <sv.ts> <en.ts>
//   … --out <fil>  (standard: src/content/nexusStrings.ts), --check (skriv inte, jämför)
//
// Utskrift: antalet löv, nycklar som bara finns i en av filerna (skriptet
// stannar med kod 1 om någon sådan inte är löst i RESOLVED nedan).

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(ROOT, '..');
const DESIGN_FILE = resolve(REPO, 'documentation/leveranser/nexus-leverans-2026-09-28/nexusStrings.ts');
const BASE_REV = '4376789';

// ---------------------------------------------------------------------
// Argument
// ---------------------------------------------------------------------

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const outFile = resolve(ROOT, opt('--out') ?? 'src/content/nexusStrings.ts');
const check = args.includes('--check');

function readSources() {
  const fi = args.indexOf('--files');
  if (fi >= 0) return { sv: readFileSync(args[fi + 1], 'utf8'), en: readFileSync(args[fi + 2], 'utf8') };
  const rev = opt('--rev') ?? BASE_REV;
  const show = (p) => execFileSync('git', ['show', `${rev}:frontend/src/content/${p}`], { cwd: REPO, encoding: 'utf8' });
  return { sv: show('strings.sv.ts'), en: show('strings.en.ts') };
}

// ---------------------------------------------------------------------
// Läsa en strängfil till en nästlad trädform
// ---------------------------------------------------------------------

// Nod: { kind: 'branch', keys: [{ name, node, comment }] } | { kind: 'leaf', text }
function parseStrings(source, file) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let init = null;
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (d.name.getText(sf) === 'strings') init = d.initializer;
    }
  }
  if (!init) throw new Error(`${file}: hittar inte \`export const strings\``);
  // `{…} as const` på roten.
  while (ts.isAsExpression(init) || ts.isParenthesizedExpression(init) || ts.isSatisfiesExpression(init)) init = init.expression;

  const comments = (node) => {
    const ranges = ts.getLeadingCommentRanges(source, node.getFullStart()) ?? [];
    return ranges.map((r) => source.slice(r.pos, r.end));
  };
  const walk = (obj) => {
    const keys = [];
    for (const p of obj.properties) {
      if (!ts.isPropertyAssignment(p)) throw new Error(`${file}: oväntad egenskap ${p.getText(sf)}`);
      const name = p.name.getText(sf);
      const value = p.initializer;
      const node = ts.isObjectLiteralExpression(value) ? walk(value) : { kind: 'leaf', text: leafText(value) };
      keys.push({ name, node, comment: comments(p) });
    }
    return { kind: 'branch', keys };
  };
  // Källtexten med fortsättningsrader utan sin ursprungliga indragning.
  const leafText = (n) => {
    const text = n.getText(sf);
    const lines = text.split('\n');
    if (lines.length === 1) return text;
    const rest = lines.slice(1).filter((l) => l.trim() !== '');
    const indent = Math.min(...rest.map((l) => l.match(/^ */)[0].length));
    return [lines[0], ...lines.slice(1).map((l) => l.slice(indent))].join('\n');
  };
  return walk(init);
}

// Nyckelnamnet utan citattecken (för nyckelvägen).
const bare = (name) => name.replace(/^['"](.*)['"]$/, '$1');

// ---------------------------------------------------------------------
// Designs ordval, nya löv, borttagna löv
// ---------------------------------------------------------------------

// Nyckelväg → { sv?, en? } (källtext). Varje post: Designs nyckel inom [ ].
const DESIGN = {
  // [hud.clock.left] "{h} h {m} min left" — minuterna utan inledande nolla (G1: "3 h 8 min left").
  'service.clock.left': {
    sv: "(h: number, m: number) => (h > 0 ? `${h} h ${m} min kvar` : `${m} min kvar`)",
    en: "(h: number, m: number) => (h > 0 ? `${h} h ${m} min left` : `${m} min left`)"
  },
  // [hud.meter.cash / guests / staff]
  'rocket.meters.cash': { en: "'Takings'" },
  'rocket.meters.guests': { en: "'Guests'" },
  'rocket.meters.staff': { en: "'Staff'" },
  // [hud.feed.open]
  'panels.prep.doorsOpen': { sv: "'Dörrarna öppnas, servicen börjar.'", en: "'Doors open. Service begins.'" },
  // … och samma form på raderna bredvid (Designs "Doors open." i stället för "The doors open —").
  'panels.prep.doorsOpenReady': { sv: "'Dörrarna öppnas, salen är redo.'", en: "'Doors open. The room is ready.'" },
  'panels.prep.doorsOpenThin': {
    sv: '(station: string, item: string) => `Dörrarna öppnas, men ${station} ligger efter (${item}).`',
    en: '(station: string, item: string) => `Doors open, but ${station} is behind (${item}).`'
  },
  // [role.cook]
  'knowledge.askers.kock': { en: "'The cook'" },
  'team.roleLabel.kock': { en: "'Cook'" },
  'service.incident.staffRoles': {
    en: "{ värd: 'the host', servitör: 'the waiter', kock: 'the cook', lärling: 'the apprentice' } as Record<string, string>"
  },
  'invest.trainingDescriptions.2': { en: "'Cooks and waiters have routine. Blows are smoothed out before they show.'" },
  // [role.mentor] "The Mentor" (SVAR §26: "the Mentor")
  'introduction.mentor': { en: "'The Mentor'" },
  'screens.mentor.label': { en: "'The Mentor · from Campus'" },
  'screens.bank.firstOpening': { en: "'The Mentor said you took the exam today. Let me see.'" },
  // [rocket.state.now]
  'rocket.card.stepCurrent': { en: '(ask: string, sec: string) => `${ask} · ${sec} s · now`' },
  // [rocket.state.locked]
  'rocket.card.stepUnreached': { en: "'Locked'" },
  // [rocket.rightDone]
  'rocket.card.rightDone': { sv: "'Rätt · raketen klar'", en: "'Right · rocket complete'" },
  // [rocket.foot] + [rocket.keys] (keys är ett nytt löv nedan)
  'rocket.card.footer': {
    sv: "'Rummet väntar inte. Går tiden ut räknas det som fel svar.'",
    en: "'The room won’t wait. Running out of time counts as a wrong answer.'"
  },
  // [lesson.kicker]
  'rocket.lesson.label': {
    sv: '(weekday: string, hour: string) => `${weekday} · Stängt ${hour}.00 · kvällens lärdom`',
    en: '(weekday: string, hour: string) => `${weekday} · Closed ${hour}:00 · tonight’s lesson`'
  },
  // [lesson.legend.done / lesson.legend.wrong]
  'rocket.lesson.legendCleared': { en: "'✓ passed'" },
  'rocket.lesson.cellCleared': { en: "'passed'" },
  'rocket.lesson.legendFailed': { en: "'✗ wrong, staff took over'" },
  'rocket.lesson.cellFailed': { en: "'wrong, staff took over'" },
  // [lesson.next]
  'rocket.lesson.toStory': { en: "'Tonight’s story'" },
  // [bank.title]
  'screens.bank.heading': { en: "'A word with the bank'" },
  // [bank.diagnosis]
  'screens.bank.diagnosis': { en: "'The bank’s view'" },
  // [plan.slot]
  'screens.morning.slot': { en: '(n: number) => `Slot ${n}`' },
  // [plan.slotEmpty]
  'screens.morning.slotEmpty': { en: "'Choose an initiative or a pavilion'" },
  // [plan.initiatives] — och samma ord (initiative, slot) där spelet sa venture och place.
  'screens.morning.activities': { en: "'Initiatives'" },
  'screens.morning.slotActivity': { en: "'Initiative'" },
  'morning.activitiesHeading': { en: "'Today’s initiatives'" },
  'panels.activityEffects.panelAria': { en: "'The morning’s initiatives'" },
  'morning.slots': { en: '(used: number, total: number) => `Schedule: ${used} of ${total} slots`' },
  'morning.sundayBody': { en: "'Sunday. The restaurant is closed, and you have four slots in the schedule.'" },
  'screens.morning.sundayHeading': { en: "'Sunday. Four slots, a long day.'" },
  'knowledge.houseBody': {
    en: "'A visit takes one slot in today’s schedule. Practise for credits, or take an exam for the next medal.'"
  },
  'introduction.steps.exam': {
    en: "\"Good. Now the exam in the same pavilion: eight questions, and six right gives bronze. With bronze in Stensöta the bank can lend you enough for a wine bar. If it doesn't work, try again. Today the visits don't take a slot in the schedule.\""
  },
  // [plan.menu]
  'panels.menu.menuHeading': { sv: "'Kvällens meny'", en: "'Tonight’s menu'" },
  // [plan.buy]
  'panels.menu.stockHeading': { sv: "'Inköp'", en: "'Purchasing'" },
  // [paper.name]
  'newspaper.masthead': { sv: "'Lokaltidningen i Grythyttan'", en: "'The Grythyttan Local'" },
  // [paper.date] (spelet har veckan men inget datum)
  'newspaper.subhead': {
    sv: '(week: number) => `Söndag · vecka ${week}`',
    en: '(week: number) => `Sunday · week ${week}`'
  },
  // [paper.review]
  'newspaper.reviewHeading': { sv: "'Recension'", en: "'Review'" },
  // [paper.bankWord]
  'newspaper.bankHeading': { sv: "'Bankens ord'", en: "'From the bank'" },
  // [paper.nextFeast]
  'newspaper.holidayHeading': { sv: "'Nästa högtid'", en: "'Coming up'" },
  // [stranded.body] (första meningen står i rocket.stranded.cashShort)
  'rocket.stranded.cashShort': { en: "'Your cash won’t cover a new stake.'" },
  'economy.stranded.body': {
    sv: "'Det som öppnar en ny lokal är det du kan: en vecka i Måltidens hus med minst ett prov, så lyssnar banken igen.'",
    en: "'What opens a new venue is what you know: a week in the House of the Meal with at least one exam, and the bank will listen again.'"
  },
  // [stranded.medals]
  'rocket.stranded.medals': { en: "'Your medals stay. What you have learned is never taken from you.'" },
  // [stranded.bank]
  'economy.stranded.toBank': { sv: "'Gå till banken'", en: "'Go to the bank'" }
};

// Nya löv: nyckelväg → { sv, en }.
const ADDED = {
  // [hud.clock.last]
  'service.clock.lastOrders': { sv: "'Sista beställningen'", en: "'Last orders'" },
  // [hud.clock.start] — klockslaget per språk: "18.00" / "18:00".
  'service.clock.hhmm': {
    sv: '(h: string, m: string) => `${h}.${m}`',
    en: '(h: string, m: string) => `${h}:${m}`'
  },
  // [rocket.timeout]
  'rocket.card.outOfTime': {
    sv: '(role: string) => `Tiden gick ut · ${role} tar över`',
    en: '(role: string) => `Out of time · ${role} takes over`'
  },
  // [rocket.keys]
  'rocket.card.keys': { sv: "'Välj med 1–4'", en: "'Choose with 1–4'" },
  // [stranded.title]
  'rocket.stranded.title': { sv: "'Banken lånar inte ut i dag.'", en: "'The bank won’t lend today.'" },
  // [practice.next]
  'knowledge.nextQuestion': { sv: "'Nästa fråga'", en: "'Next question'" },
  // [hud.cash.value] "{k} tkr" / "SEK {k}k" — ersätter panels.cash.unit och panels.evening.thousandSuffix.
  'panels.cash.thousands': {
    sv: '(k: string) => `${k} tkr`',
    en: '(k: string) => `SEK ${k}k`'
  },
  // [hud.speed]
  'hud.speed': { sv: "'Tempo'", en: "'Speed'" },
  'hud.speedOption': {
    sv: '(n: number) => `${n}× tempo`',
    en: '(n: number) => `${n}× speed`'
  },
  // [hud.menu] och spelets meny (TopRightMenu) — språkvalet (ORDER 273).
  'menu.button': { sv: "'Meny'", en: "'Menu'" },
  'menu.firstPerson': { sv: "'Förstapersonsprototypen'", en: "'First-person prototype'" },
  'menu.language': { sv: "'Språk'", en: "'Language'" },
  'menu.english': { sv: "'English'", en: "'English'" },
  'menu.swedish': { sv: "'Svenska'", en: "'Svenska'" }
};

const REMOVED = [
  'rocket.card.timedOut', // → rocket.card.outOfTime (bandets rubrik)
  'panels.cash.unit', // → panels.cash.thousands
  'panels.evening.thousandSuffix' // → panels.cash.thousands
];

// Nycklar som bara finns i en av källfilerna: hur de löses (nyckelväg → { sv, en }).
const RESOLVED = {};

// "Måltidens hus" på engelska (Designs house.name).
function houseOfTheMeal(enText) {
  return enText
    .replace(/(^|['"`])Måltidens hus/g, '$1The House of the Meal')
    .replace(/Måltidens hus/g, 'the House of the Meal');
}

// ---------------------------------------------------------------------
// Para ihop
// ---------------------------------------------------------------------

const src = readSources();
const sv = parseStrings(src.sv, 'strings.sv.ts');
const en = parseStrings(src.en, 'strings.en.ts');

const onlyIn = { sv: [], en: [] };
function merge(a, b, path) {
  // a = sv-noden, b = en-noden (endera kan saknas).
  if (a && b && a.kind !== b.kind) throw new Error(`${path}: olika form i sv och en`);
  const kind = (a ?? b).kind;
  if (kind === 'leaf') return { kind: 'leaf', sv: a?.text, en: b?.text };
  const out = [];
  const bByName = new Map((b?.keys ?? []).map((k) => [bare(k.name), k]));
  const seen = new Set();
  for (const k of a?.keys ?? []) {
    const name = bare(k.name);
    seen.add(name);
    const p = path ? `${path}.${name}` : name;
    const other = bByName.get(name);
    if (!other) onlyIn.sv.push(p);
    out.push({ name: k.name, comment: k.comment, node: merge(k.node, other?.node, p) });
  }
  for (const k of b?.keys ?? []) {
    const name = bare(k.name);
    if (seen.has(name)) continue;
    const p = path ? `${path}.${name}` : name;
    onlyIn.en.push(p);
    out.push({ name: k.name, comment: k.comment, node: merge(undefined, k.node, p) });
  }
  return { kind: 'branch', keys: out };
}
const table = merge(sv, en, '');

function find(node, path) {
  let n = node;
  for (const part of path.split('.')) {
    const k = n.keys.find((x) => bare(x.name) === part);
    if (!k) return null;
    n = k.node;
  }
  return n;
}
function ensure(node, path) {
  const parts = path.split('.');
  let n = node;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    let k = n.keys.find((x) => bare(x.name) === part);
    if (!k) {
      const leaf = i === parts.length - 1;
      k = { name: /^[A-Za-z_$][\w$]*$/.test(part) ? part : `'${part}'`, comment: [], node: leaf ? { kind: 'leaf' } : { kind: 'branch', keys: [] } };
      n.keys.push(k);
    }
    n = k.node;
  }
  return n;
}

// Olösta ensidiga nycklar stoppar skriptet.
const unresolved = [...onlyIn.sv, ...onlyIn.en].filter((p) => !RESOLVED[p]);
for (const [p, v] of Object.entries(RESOLVED)) Object.assign(find(table, p), v);

// Engelska: "Måltidens hus" → "the House of the Meal".
const houseChanges = [];
(function renameHouse(n, path) {
  if (n.kind === 'leaf') {
    if (n.en && n.en.includes('Måltidens hus')) {
      const to = houseOfTheMeal(n.en);
      houseChanges.push(path);
      n.en = to;
    }
    return;
  }
  for (const k of n.keys) renameHouse(k.node, path ? `${path}.${bare(k.name)}` : bare(k.name));
})(table, '');

const designChanges = [];
for (const [p, v] of Object.entries(DESIGN)) {
  const leaf = find(table, p);
  if (!leaf || leaf.kind !== 'leaf') throw new Error(`DESIGN: ${p} är inget löv`);
  for (const lang of ['sv', 'en']) {
    if (v[lang] === undefined) continue;
    if (v[lang] === leaf[lang]) throw new Error(`DESIGN: ${p}.${lang} är redan Designs text`);
    designChanges.push({ path: p, lang, from: leaf[lang], to: v[lang] });
    leaf[lang] = v[lang];
  }
}
for (const [p, v] of Object.entries(ADDED)) {
  if (find(table, p)) throw new Error(`ADDED: ${p} finns redan`);
  Object.assign(ensure(table, p), { kind: 'leaf', sv: v.sv, en: v.en });
}
for (const p of REMOVED) {
  const parts = p.split('.');
  const parent = find(table, parts.slice(0, -1).join('.'));
  const i = parent.keys.findIndex((k) => bare(k.name) === parts.at(-1));
  if (i < 0) throw new Error(`REMOVED: ${p} finns inte`);
  parent.keys.splice(i, 1);
}

// ---------------------------------------------------------------------
// Skriva
// ---------------------------------------------------------------------

let leaves = 0;
function emit(node, indent) {
  const pad = '  '.repeat(indent);
  const lines = [];
  node.keys.forEach((k, i) => {
    const comma = i < node.keys.length - 1 ? ',' : '';
    for (const c of k.comment) lines.push(...c.split('\n').map((l) => pad + l.trimStart()));
    if (k.node.kind === 'branch') {
      lines.push(`${pad}${k.name}: {`, ...emit(k.node, indent + 1), `${pad}}${comma}`);
      return;
    }
    leaves++;
    const { sv: s, en: e } = k.node;
    if (s === undefined || e === undefined) throw new Error(`${k.name}: löv utan ${s === undefined ? 'sv' : 'en'}`);
    const oneLine = `${pad}${k.name}: { sv: ${s}, en: ${e} }${comma}`;
    if (!s.includes('\n') && !e.includes('\n') && oneLine.length <= 120) {
      lines.push(oneLine);
    } else {
      const inner = pad + '  ';
      const block = (label, text, last) => {
        const [first, ...rest] = text.split('\n');
        return [`${inner}${label}: ${first}`, ...rest.map((l) => inner + '  ' + l)].join('\n') + (last ? '' : ',');
      };
      lines.push(`${pad}${k.name}: {`, block('sv', s, false), block('en', e, true), `${pad}}${comma}`);
    }
  });
  return lines;
}

const designSource = readFileSync(DESIGN_FILE, 'utf8').trimEnd();
const body = emit(table, 1).join('\n');

const out = `// ORDER 273 — strängtabellen: svenska och engelska sida vid sida.
//
// GENERERAD av scripts/order273-strings-table.mjs (kan köras om, se skriptets
// huvud). Vision Owner 2026-09-28: Designs nexusStrings.ts är grunden, spelets
// egna strängar är sammanslagna in, och Designs ordval gäller där de skiljer sig.
//
// Filen har två delar:
//   1. Designs tabell (leveransen nexus-leverans-2026-09-28/nexusStrings.ts)
//      ordagrant: STRINGS (platt, { sv, en } per nyckel), t(lang, key, vars),
//      Lang och serviceClock(lang, min).
//   2. Spelets tabell TABLE med samma nästlade form som de tidigare
//      strings.sv.ts / strings.en.ts; varje löv är { sv, en }. Funktioner,
//      tupler och \`{…} as Record\`-objekt är löv i sin helhet.
// pickLang(TABLE, lang) ger tabellen för ett språk; content/strings.ts
// exporterar \`strings\` för det aktuella språket (content/language.ts).
//
// Egennamn på platser och paviljonger står kvar på svenska också i de
// engelska löven (CLAUDE.md regel 7); "Måltidens hus" heter på engelska
// "the House of the Meal" (Designs house.name).

// ───────────────────────────────────────────────────────────────────
// 1. Designs tabell (leveransen 2026-09-28, ordagrant)
// ───────────────────────────────────────────────────────────────────

${designSource}

// ───────────────────────────────────────────────────────────────────
// 2. Spelets tabell
// ───────────────────────────────────────────────────────────────────

export const TABLE = {
${body}
};

// En tabell med { sv, en }-löv → samma tabell med ett språks värden.
export type ForLang<T> = T extends { sv: infer A; en: infer B } ? A | B : { readonly [K in keyof T]: ForLang<T[K]> };

export type GameStrings = ForLang<typeof TABLE>;

function isLeaf(v: unknown): v is Entry {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  return keys.length === 2 && 'sv' in v && 'en' in v;
}

// Bygger tabellen för ett språk.
export function pickLang<T>(table: T, lang: Lang): ForLang<T> {
  const walk = (node: unknown): unknown => {
    if (isLeaf(node)) return (node as Record<Lang, unknown>)[lang];
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = walk(v);
    return out;
  };
  return walk(table) as ForLang<T>;
}
`;

const report = {
  leaves,
  onlyInSv: onlyIn.sv,
  onlyInEn: onlyIn.en,
  unresolved,
  houseOfTheMeal: houseChanges,
  design: designChanges.map((c) => `${c.path} [${c.lang}]: ${c.from}  →  ${c.to}`),
  added: Object.keys(ADDED),
  removed: REMOVED
};

if (unresolved.length > 0) {
  console.error('Nycklar som bara finns i en av filerna och inte är lösta:', unresolved);
  process.exit(1);
}
if (check) {
  const current = existsSync(outFile) ? readFileSync(outFile, 'utf8') : '';
  console.log(JSON.stringify(report, null, 2));
  if (current !== out) {
    console.error(`${outFile} skiljer sig från skriptets utdata`);
    process.exit(1);
  }
} else {
  writeFileSync(outFile, out);
  // Mätvärdena (antalet löv, ändringarna) läses ur den här filen (CLAUDE.md, ORDER 160).
  const reportDir = resolve(ROOT, 'reports/order273');
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(resolve(reportDir, 'strings-table.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
