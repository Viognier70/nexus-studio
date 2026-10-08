// ORDER 320 (Anders 2026-10-08: "Priserna i balance.ts ska stämma med räkneuppgifterna i ORDER_320, eftersom
// analysen annars ger fel svar … Lägg till ett test som kontrollerar att talen i ft-priset och ft-slut är samma
// som i balance.ts. Ändras ett pris ska testet fallera, inte situationen ge ett felaktigt svar.")
//
// Talen i situationernas text (svenska och engelska) räknas här fram ur balance.ts: priset hos oss och hos
// Grillvagnen, inköpet, marginalerna och kvoten (ft-priset), och korvarna kvar, kön och andelen hel special
// (ft-slut). Varje tal i texten ska gå att räkna fram, och de som uppgiften bygger på ska stå där.

import { describe, expect, it } from 'vitest';
import { RIVAL_PRICES, SAUSAGE, TRUCK_MENU } from '../balance';
import { FOODTRUCK_ALL, type Incident } from '../incidentBank';
import svFile from '../../content/incidents/foodtruck/situationer320.text.sv.draft.json';
import enFile from '../../content/incidents/foodtruck/situationer320.text.en.json';

type Texts = Record<string, unknown>;
const SV = (svFile as { texts: Texts }).texts;
const EN = (enFile as { texts: Texts }).texts;

/** All text i en situation, som en sträng. */
function all(t: unknown): string {
  return JSON.stringify(t);
}

/** Talen i en text: siffror (med decimalkomma eller punkt), inte de i nycklarna. */
function numbers(t: unknown): string[] {
  const values: string[] = [];
  const walk = (x: unknown) => {
    if (typeof x === 'string') values.push(x);
    else if (x && typeof x === 'object') Object.values(x).forEach(walk);
  };
  walk(t);
  return values.join(' ').match(/\d+(?:[.,]\d+)?/g) ?? [];
}

describe('ORDER 320 — talen i ft-priset och ft-slut är balance.ts tal', () => {
  it('ft-priset: halv special hos oss, hos Grillvagnen och inköpet, marginalerna och kvoten', () => {
    const ours = TRUCK_MENU.halfSpecial, theirs = RIVAL_PRICES.halfSpecial, goods = TRUCK_MENU.goodsHalfSpecial;
    const mOurs = ours - goods, mTheirs = theirs - goods, diff = ours - theirs;
    const ratio = (mOurs / mTheirs).toFixed(1);
    const allowed = new Set([ours, theirs, goods, mOurs, mTheirs, diff].map(String));
    for (const [lang, t, dec] of [['sv', SV['ft13-priset'], ratio.replace('.', ',')], ['en', EN['ft13-priset'], ratio]] as const) {
      const s = all(t);
      expect(s, lang).toContain(`${theirs} kr`);
      expect(s, lang).toContain(`${ours} kr`);
      expect(s, lang).toContain(`${goods} kr`);
      expect(s, lang).toContain(`${ours} − ${goods} = ${mOurs}`);
      expect(s, lang).toContain(`${theirs} − ${goods} = ${mTheirs}`);
      expect(s, lang).toContain(`${mOurs}/${mTheirs}`);
      expect(s, lang).toContain(dec);
      expect(s, lang).toContain(`${diff} kr`);
      for (const n of numbers(t)) expect(allowed.has(n) || n === dec, `${lang}: talet ${n} går inte att räkna fram ur balance.ts`).toBe(true);
    }
  });

  it('ft-slut: korvarna kvar (lådan visar få kvar), kön och var tredje som tar hel special', () => {
    const queue = SAUSAGE.queueAtLow;
    const full = Math.round(queue * SAUSAGE.fullSpecialShare);
    const single = queue - full;
    const need = single + full * SAUSAGE.perFullSpecial;
    const allTwo = queue * SAUSAGE.perFullSpecial;
    // Uppgiften: korven räcker precis till kön.
    expect(need).toBe(SAUSAGE.lowAt);
    expect(SAUSAGE.fullSpecialShare).toBeCloseTo(1 / 3);
    const words: Record<'sv' | 'en', Record<number, string>> = {
      sv: { 3: 'tre', 6: 'sex', 9: 'nio', 12: 'tolv', 18: 'arton' },
      en: { 3: 'three', 6: 'six', 9: 'nine', 12: 'twelve', 18: 'eighteen' }
    };
    const third = { sv: 'var tredje', en: 'one in three' };
    for (const [lang, t] of [['sv', SV['ft11-slut']], ['en', EN['ft11-slut']]] as const) {
      const s = all(t).toLowerCase();
      for (const n of [SAUSAGE.lowAt, queue, single, full, allTwo]) expect(words[lang][n], `${lang}: ordet för ${n}`).toBeDefined();
      expect(s, lang).toContain(words[lang][SAUSAGE.lowAt]);
      expect(s, lang).toContain(words[lang][queue]);
      expect(s, lang).toContain(words[lang][allTwo]);
      expect(s, lang).toContain(third[lang]);
      expect(s, lang).toContain(`${queue}`);
      expect(s, lang).toContain(`${single} + ${full * SAUSAGE.perFullSpecial} = ${need}`);
      const allowed = new Set([queue, full, single, need, allTwo].map(String));
      for (const n of numbers(t)) expect(allowed.has(n), `${lang}: talet ${n} går inte att räkna fram ur balance.ts`).toBe(true);
    }
  });

  it('situationerna finns i spelets bank', () => {
    const ids = FOODTRUCK_ALL.map((i: Incident) => i.id);
    expect(ids).toContain('ft13-priset');
    expect(ids).toContain('ft11-slut');
  });
});
