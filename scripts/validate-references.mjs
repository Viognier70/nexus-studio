#!/usr/bin/env node
// ORDER 036 §3 reference-integrity validator.
//
// Every `collectedSources[].path` in every manifest.json under
// documentation/references/ must resolve to a file on disk, relative
// to the manifest that cites it. A citation that resolves nowhere is
// a build-blocking defect (ADR 002 §5.1): it means either a reference
// was moved without updating the manifest, or the manifest was
// synthesised from a filename that never existed.
//
// Failures are reported with:
//   - manifest path
//   - collectedSources entry index
//   - path as cited
//   - path as resolved (relative to CWD)
//
// Deliberately dependency-free — no import from the frontend bundle,
// matching the convention of parity-check.mjs and validate-world.mjs.
//
// Usage:
//   node scripts/validate-references.mjs
//   node scripts/validate-references.mjs --json     # machine output
//
// Exits 1 on any unresolved citation. Hook into pre-push alongside
// the other two validators.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';

const ROOT = 'documentation/references';
const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');

function findManifests(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findManifests(p));
    else if (entry.isFile() && entry.name === 'manifest.json') out.push(p);
  }
  return out;
}

const manifests = findManifests(ROOT).sort();
const failures = [];
let checked = 0;

for (const manifestPath of manifests) {
  const dir = dirname(manifestPath);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    failures.push({
      manifest: manifestPath,
      index: -1,
      path: null,
      resolved: null,
      reason: `manifest failed to parse: ${e.message}`
    });
    continue;
  }
  const sources = Array.isArray(manifest.collectedSources) ? manifest.collectedSources : [];
  for (let i = 0; i < sources.length; i++) {
    checked++;
    const entry = sources[i];
    const cited = entry?.path;
    if (typeof cited !== 'string' || cited.length === 0) {
      failures.push({
        manifest: manifestPath,
        index: i,
        path: cited ?? null,
        resolved: null,
        reason: 'missing or empty path'
      });
      continue;
    }
    const resolvedAbs = resolve(dir, cited);
    if (!existsSync(resolvedAbs)) {
      failures.push({
        manifest: manifestPath,
        index: i,
        path: cited,
        resolved: relative(process.cwd(), resolvedAbs),
        reason: 'file not found'
      });
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({
    manifests: manifests.length,
    checked,
    failures
  }, null, 2));
} else {
  console.log('\n=== ORDER 036 §3 reference-integrity check ===\n');
  console.log(`  scanned ${manifests.length} manifest(s), ${checked} collectedSources entries`);
  if (failures.length > 0) {
    console.log('');
    for (const f of failures) {
      console.log(`  FAIL ${f.manifest}[${f.index}]`);
      console.log(`       cited:    ${f.path}`);
      if (f.resolved) console.log(`       resolved: ${f.resolved}`);
      console.log(`       reason:   ${f.reason}`);
    }
    console.log(`\n${failures.length} unresolved citation(s).`);
  } else {
    console.log('\n  All citations resolve.');
  }
}

process.exit(failures.length > 0 ? 1 : 0);
