// ORDER 108 — källhänvisningar och APA-formatering.
//
// Rena funktioner. Ingen `Math.random`, inget nätanrop, inget språkmodell-
// anrop — samma DoD 2/3-krav som resten av knowledge/ (ORDER 107 §6).
// Bevakas av grep-testet i questionFormats.test.ts.
//
// APA-varianten är förenklad journal/bok-referens (Publication Manual 7).
// Full APA (kapitelverk, konferensbidrag, redaktörsböcker) implementeras
// när innehåll faktiskt behöver det — nu räcker: författare (år). Titel.
// Publikation. DOI/URL.
//
// Avsiktlig avgränsning: episteme-frågor är de enda som är obligatoriska
// att bära källor (coverageReport varnar). Techne/phronesis får ha
// källor men förväntas inte — se questionFormats.ts §BaseQuestion.

import type { QuestionSource } from './questionFormats';

// APA-7 för en enskild källa. Format:
//   Efternamn, F. M. (år). Titel. Publikation. https://doi.org/...
// Multi-author används med '&' före sista författaren. Publikation,
// DOI och URL är valfria — utelämnas ur strängen om de saknas i data.
export function formatSourceAPA(source: QuestionSource): string {
  const parts: string[] = [];
  parts.push(`${source.author} (${source.year}).`);
  parts.push(`${trimTrailingPeriod(source.title)}.`);
  if (source.publication) {
    parts.push(`${trimTrailingPeriod(source.publication)}.`);
  }
  if (source.doi) {
    parts.push(`https://doi.org/${source.doi}`);
  } else if (source.url) {
    parts.push(source.url);
  }
  return parts.join(' ');
}

// Formatera en lista av källor som en läsbar referenslista, en per rad.
// Ordning bevaras från indata — författaren väljer prioritet, inte funktionen.
export function formatSourcesAPA(sources: readonly QuestionSource[]): string {
  return sources.map(formatSourceAPA).join('\n');
}

// Undvik dubbelpunkt när title/publication redan innehåller avslutande punkt.
function trimTrailingPeriod(s: string): string {
  return s.endsWith('.') ? s.slice(0, -1) : s;
}
