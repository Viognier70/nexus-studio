// ORDER 090 §5 — scene-layer prop-shape smoke test.
//
// The regression this exists to catch: R3F treats hyphenated JSX
// prop names as property paths into the underlying three.js object.
// A `<mesh data-testid="foo" />` becomes `object.data.testid = "foo"`
// during applyProps → `Cannot read properties of undefined (reading
// 'testid')` when the object has no `data` field → context lost, the
// whole scene tears down at mount.
//
// The 578-test suite that shipped with ORDER 088/089 was green when
// this crash reached the running build: `mount.test.tsx` mocks
// `<Canvas>` to null so the R3F reconciler never runs. This test
// closes that gap without adding a WebGL mock or a Canvas render
// pass — it scans every `.tsx` under `src/strategic/scene/` with the
// TypeScript compiler API, finds JSX opening elements whose tag
// starts with a lowercase letter (i.e. R3F primitives or DOM
// elements delegated through R3F), and fails if any attribute name
// contains a hyphen.
//
// DOM/SVG-only files under `ui/RoomCardPanel/` are intentionally NOT
// scanned — hyphenated attributes there (`stroke-width`, `text-anchor`,
// `data-testid` on a `<div>`) are correct.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCENE_DIR = resolve(HERE, '..');

function walkTsx(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip __tests__ — tests may legitimately use hyphenated
      // attributes on DOM elements they construct for assertion.
      if (entry === '__tests__') continue;
      walkTsx(full, acc);
    } else if (entry.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

interface Finding {
  file: string;
  line: number;
  tag: string;
  attribute: string;
}

function scanFile(file: string): Finding[] {
  const src = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: Finding[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sf);
      // Lowercase-first tags are three.js primitives (mesh, group,
      // boxGeometry, meshStandardMaterial, …) that R3F's reconciler
      // owns. Component tags (uppercase-first, or dotted like
      // `THREE.Mesh`) are React components — hyphenated props on
      // those are the component's own contract, not R3F's.
      const first = tagName.charAt(0);
      if (first === first.toLowerCase() && /^[a-z]/.test(tagName)) {
        for (const attr of node.attributes.properties) {
          if (ts.isJsxAttribute(attr)) {
            const name = attr.name.getText(sf);
            if (name.includes('-')) {
              const { line } = sf.getLineAndCharacterOfPosition(attr.getStart(sf));
              findings.push({ file, line: line + 1, tag: tagName, attribute: name });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return findings;
}

describe('ORDER 090 §5 — no hyphenated props on R3F primitives', () => {
  it('every scene .tsx uses camelCase / userData for R3F elements', () => {
    const files = walkTsx(SCENE_DIR);
    expect(files.length).toBeGreaterThan(0);

    const findings = files.flatMap(scanFile);

    if (findings.length > 0) {
      const message = findings
        .map(
          (f) =>
            `  ${f.file.slice(f.file.indexOf('frontend/'))}:${f.line}` +
            `  <${f.tag} ${f.attribute}=...>  — R3F reads '${f.attribute}' ` +
            `as a property path (e.g. object.${f.attribute.replace(/-/g, '.')}). ` +
            `Use camelCase, or pass through userData={{ … }}.`
        )
        .join('\n');
      throw new Error(
        `Found ${findings.length} hyphenated JSX attribute(s) on lowercase ` +
        `(R3F primitive) elements. R3F's applyProps will crash on mount:\n${message}`
      );
    }
  });
});
