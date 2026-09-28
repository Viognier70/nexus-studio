// ORDER 273 — spelets språk som inställning (Designs leverans 2026-09-28 §2:
// "Spelet går på engelska som standard och byter språk med en inställning").
//
// Standard är engelska. Valet sparas i localStorage under `nexus.lang`; varje
// läsning och skrivning ligger inom try/catch (privat fönster, blockerad
// lagring, testmiljö utan localStorage) och faller då tillbaka på engelska.
// content/strings.ts lyssnar här och byter `strings` till det valda språket;
// gränssnittet ritas om via useLanguage().

import { useSyncExternalStore } from 'react';
import type { Lang } from './nexusStrings';

export type { Lang } from './nexusStrings';

export const LANGUAGES: readonly Lang[] = ['en', 'sv'];
export const DEFAULT_LANG: Lang = 'en';
export const LANG_STORAGE_KEY = 'nexus.lang';

function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'sv';
}

function readStored(): Lang {
  try {
    const v = globalThis.localStorage?.getItem(LANG_STORAGE_KEY);
    return isLang(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

let current: Lang = readStored();
const listeners = new Set<(lang: Lang) => void>();

export function getLanguage(): Lang {
  return current;
}

// Byter språk, sparar valet och meddelar lyssnarna i den ordning de
// registrerades (content/strings.ts först, eftersom den laddas före
// gränssnittet).
export function setLanguage(lang: Lang): void {
  if (!isLang(lang) || lang === current) return;
  current = lang;
  try {
    globalThis.localStorage?.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Lagringen är inte tillgänglig; valet gäller ändå för sessionen.
  }
  for (const l of [...listeners]) l(lang);
}

export function onLanguageChange(listener: (lang: Lang) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// React: aktuellt språk; komponenten ritas om när språket byts.
export function useLanguage(): Lang {
  return useSyncExternalStore(onLanguageChange, getLanguage, getLanguage);
}
