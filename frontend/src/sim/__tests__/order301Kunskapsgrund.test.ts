// ORDER 301 — kunskapsgrunden (documentation/foundation/KUNSKAPSGRUND_TRIAD.md).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TABLE, pickLang } from '../../content/nexusStrings';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
function files(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== '__tests__' && f !== 'node_modules') files(p, out); } else if (/\.(ts|tsx|json)$/.test(f)) out.push(p);
  }
  return out;
}
// Bibliografiska poster och noten om att avhandlingarna publicerades under namnet står som i filen §1.
const ALLOWED = /tidigare Herdenstam|formerly Herdenstam|Crichton-Fock \(Herdenstam\)|Herdenstam, A\. P\. F\.|under namnet Herdenstam|under the name Herdenstam/g;

describe('ORDER 301 — kunskapsgrunden', () => {
  it('ingen text citerar "Herdenstam" ensamt', () => {
    const bad: string[] = [];
    for (const f of files(SRC)) {
      const s = readFileSync(f, 'utf8').replace(ALLOWED, '');
      if (/Herdenstam/.test(s)) bad.push(f);
    }
    expect(bad).toEqual([]);
  });

  it('ingen text påstår att formerna är Aristoteles definitioner', () => {
    for (const lang of ['sv', 'en'] as const) {
      const json = JSON.stringify(pickLang(TABLE, lang));
      expect(json).not.toMatch(/efter Aristoteles|after Aristotle/);
    }
    expect(pickLang(TABLE, 'sv').knowledgeBase.attribution).toMatch(/TRIAD-modellen/);
  });

  it('Tre sätt att kunna: tre korta kort och raden om det dubbla greppet', () => {
    const h = pickLang(TABLE, 'sv').houseIntro;
    expect(h.forms.map((f) => `${f.name} – ${f.title}. ${f.question}`)).toEqual([
      'Episteme – Att veta. Vad finns i glaset?',
      'Phronesis – Att bedöma. Vad väcker det, för just den här gästen?',
      'Techne – Att göra. Vad gör du nu?'
    ]);
    expect(h.doubleGrip).toContain('Det dubbla greppet: att hålla analys och upplevelse samtidigt, och handla.');
    expect(h.readMore).toBe('Läs mer');
    expect(JSON.stringify(h)).not.toMatch(/”|“/);
  });

  it('Kunskapsgrunden har citaten och källorna, och eftertexterna samma källor', () => {
    const k = pickLang(TABLE, 'sv').knowledgeBase;
    expect(k.quotes).toHaveLength(3);
    expect(k.sources).toHaveLength(3);
    expect(k.sources[1]).toContain('Den arbetande gommen');
    const ui = readFileSync(resolve(SRC, 'strategic/knowledge/ui/KnowledgeFoundation.tsx'), 'utf8');
    expect((ui.match(/<Sources \/>/g) ?? []).length).toBe(2);
  });
});
