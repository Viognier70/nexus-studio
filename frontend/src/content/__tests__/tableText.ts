// ORDER 273 — testhjälp: strängtabellens nycklar och svenska värden som text.
//
// Före ORDER 273 grep:ade ORDER 109/110-testerna källtexten i strings.sv.ts.
// Den texten står nu som `sv`-sidan i content/nexusStrings.ts (TABLE). Den
// engelska sidan får innehålla vanliga engelska ord som råkar vara lika en
// intern nyckel ("balanced all-rounder"), så testerna läser nycklarna och
// de svenska värdena, samma sak som de läste förut.

import { TABLE, pickLang } from '../nexusStrings';

export function svSideText(): string {
  const parts: string[] = [];
  const walk = (node: unknown, key: string) => {
    if (key) parts.push(key);
    if (typeof node === 'string') parts.push(node);
    else if (typeof node === 'function') parts.push(node.toString());
    else if (Array.isArray(node)) node.forEach((n) => walk(n, ''));
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, k);
  };
  walk(pickLang(TABLE, 'sv'), '');
  return parts.join('\n');
}
