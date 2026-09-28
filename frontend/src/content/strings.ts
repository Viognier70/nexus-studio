// ORDER 273 — spelets strängar för det aktuella språket.
//
// Tabellen med svenska och engelska sida vid sida står i nexusStrings.ts
// (TABLE). `strings` har samma nästlade form som förut och ger värdena för
// språket i content/language.ts (standard engelska). Alla komponenter och
// all simulering läser strängarna härifrån: `strings.service.clock.left(h, m)`.
//
// `strings` är en levande vy: varje nod läses ur det aktuella språkets
// tabell vid åtkomst, så också referenser som hålls på modulnivå
// (`const T = strings.panels.cash`) följer med när språket byts. Löven
// (text, funktioner, tupler och Record-objekt) lämnas ut som de är.

import { getLanguage } from './language';
import { TABLE, pickLang, type GameStrings, type Lang } from './nexusStrings';

const BY_LANG: Record<Lang, GameStrings> = {
  en: pickLang(TABLE, 'en'),
  sv: pickLang(TABLE, 'sv')
};

// Tabellen för ett bestämt språk (tester, verktyg).
export function stringsFor(lang: Lang): GameStrings {
  return BY_LANG[lang];
}

function isBranch(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function resolvePath(path: readonly string[]): unknown {
  let node: unknown = BY_LANG[getLanguage()];
  for (const key of path) {
    if (!isBranch(node)) return undefined;
    node = node[key];
  }
  return node;
}

const views = new Map<string, object>();

function liveView(path: readonly string[]): object {
  const id = path.join('\u0000');
  const cached = views.get(id);
  if (cached) return cached;
  const read = (prop: string): unknown => {
    const v = resolvePath([...path, prop]);
    return isBranch(v) ? liveView([...path, prop]) : v;
  };
  const view = new Proxy(
    {},
    {
      get: (_t, prop) => (typeof prop === 'string' ? read(prop) : undefined),
      has: (_t, prop) => {
        const node = resolvePath(path);
        return typeof prop === 'string' && isBranch(node) && prop in node;
      },
      ownKeys: () => {
        const node = resolvePath(path);
        return isBranch(node) ? Object.keys(node) : [];
      },
      getOwnPropertyDescriptor: (_t, prop) => {
        const node = resolvePath(path);
        if (typeof prop !== 'string' || !isBranch(node) || !(prop in node)) return undefined;
        return { value: read(prop), enumerable: true, configurable: true, writable: false };
      },
      set: () => false,
      deleteProperty: () => false
    }
  );
  views.set(id, view);
  return view;
}

export const strings = liveView([]) as GameStrings;
