// ORDER 324 A (Anders 2026-10-10): besluten om FÖR_GRANSKNING_323.md
// (documentation/blueprints/BESLUT_GRANSKNING_323.md) förda in i spelet på
// svenska och engelska samtidigt. Testet läser samma tabeller som spelet.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DILEMMAS } from '../fika/dilemmas';
import { FIKA_TEXT } from '../fikaStrings';
import { TABLE } from '../nexusStrings';
import { PYRAMID_STRINGS } from '../design/pyramidStrings';
import { FIKA } from '../../sim/balance';

const HERE = dirname(fileURLToPath(import.meta.url));
const json = (p: string) => JSON.parse(readFileSync(resolve(HERE, '..', p), 'utf8'));
const text = (id: string) => (FIKA_TEXT.dilemmas as Record<string, any>)[id];

describe('ORDER 324 A — vagnens dilemman', () => {
  it('kylboxen: svar A kostar som att slänga alla varor (900 kr)', () => {
    const a = DILEMMAS.find((d) => d.id === 'fika-vagn-kylboxen')!.options.find((o) => o.id === 'A')!;
    expect(a.economy).toEqual([{ kind: 'cost', key: 'discardGoodsSek' }]);
    expect(FIKA.economy.discardGoodsSek).toBe(900);
    expect(text('fika-vagn-kylboxen').explanation.sv).toContain('gifter som inte förstörs av värme');
    expect(text('fika-vagn-kylboxen').explanation.en).toContain('toxins that heat does not destroy');
  });

  it('dricksen: ägaren och burken, inte dricksen i kassan förra veckan', () => {
    const t = text('fika-vagn-dricksen');
    expect(t.question.sv).toBe('Det låg mycket i dricksburken i kväll. Vi stod båda i luckan. Ska du som äger vagnen ha del av den?');
    expect(t.options.A.sv).toContain('Jag tar ut min lön ur vagnen, inte ur burken.');
    expect(t.options.C.sv).toBe('Vi delar lika i kväll, så ser vi sen.');
    for (const lang of ['sv', 'en'] as const) expect(t.question[lang]).not.toMatch(/förra veckan|last week/i);
  });

  it('kortet: reserven är Swish och en andra läsare, inte att betala nästa gång', () => {
    const a = text('fika-vagn-kortet').options.A;
    expect(a.sv).toContain('Swish och en andra läsare');
    expect(a.en).toContain('Swish and a second reader');
    expect(a.sv).not.toContain('nästa gång');
    expect(a.en).not.toContain('next time');
  });

  // ORDER 324b: kylboxens lagtext är granskad av Anders; benen väntar på juristen.
  it('lagtexterna i vagnen: kylboxen granskad, benen inte än', () => {
    expect(DILEMMAS.find((d) => d.id === 'fika-vagn-kylboxen')!.legal!.legalReviewed).toBe(true);
    expect(DILEMMAS.find((d) => d.id === 'fika-vagn-benen')!.legal!.legalReviewed).toBe(false);
  });
});

describe('ORDER 324 A — termer och språk', () => {
  it('nivåerna: Village, Block, Street, Your place', () => {
    const l = TABLE.village.levels;
    expect([l.village.en, l.district.en, l.street.en, l.room.en]).toEqual(['Village', 'Block', 'Street', 'Your place']);
  });

  it('fikats nivåer heter grounded', () => {
    expect(Object.values(FIKA_TEXT.grade.en)).toEqual(['Well grounded', 'Partly grounded', 'Weakly grounded']);
  });

  it('pyramiden följer triaden', () => {
    expect(PYRAMID_STRINGS['pyramid.full.sub']).toEqual({ sv: 'Vad och varför, hur och när. Du kunde alla tre.', en: 'What and why, how and when. You knew all three.' });
  });

  it('frågebanken och utkasten', () => {
    const bank = json('../strategic/content/questions/bank.text.en.json').texts;
    expect(bank['stensota-brons-02'].prompt).toContain('well-aged rib-eye');
    const sv = json('../strategic/content/questions/drafts.text.sv.draft.json').texts;
    const en = json('../strategic/content/questions/drafts.text.en.json').texts;
    expect(sv['somm-h2'].options[1]).toMatch(/^Låt flaskan stå upprätt ett dygn, svalt\./);
    expect(en['somm-h2'].options[1]).toMatch(/^Stand it upright for 24 hours, somewhere cool\./);
    expect(sv['somm-h7'].explanation).toContain('fuktig, möglig, unken ton');
  });

  it('de svenska felen', () => {
    const menu = json('incidents/menu.text.sv.draft.json').texts;
    expect(menu['mn02-pinot'].steps[1].options.c.label).toContain('i ett glas med vid kupa');
    const ft = json('incidents/foodtruck/situationer320.text.sv.draft.json').texts;
    expect(ft['ft13-priset'].halfGrip.experience).toContain('bara lite mer än hälften så mycket');
    expect(JSON.stringify(TABLE)).not.toContain('Måltidbiblioteket');
  });
});

// ORDER 324b (Anders 2026-10-10): ft06-stangningen steg 2, svar A och förklaringarna till A och D
// omskrivna av Claude; ft06 granskad av Anders.
describe('ORDER 324b — ft06-stangningen', () => {
  const meta = json('incidents/foodtruck/bas.meta.json').incidents.find((i: { id: string }) => i.id === 'ft06-stangningen');
  const step = (lang: 'sv' | 'en') =>
    json(`incidents/foodtruck/bas.text.${lang === 'sv' ? 'sv.draft' : 'en'}.json`).texts['ft06-stangningen'].steps[1].options;

  it('svar A: kylboxen, och förklaringarna till A och D', () => {
    const sv = step('sv');
    const en = step('en');
    expect(sv.a.label).toBe('Kyler ner dem i kylboxen och säljer dem i morgon.');
    expect(en.a.label).toBe('Chills them in the cool box and sells them tomorrow.');
    expect(sv.a.explanation).toBe('Varmhållen mat som blir över ska kastas. Den har redan stått varm i timmar, och att kyla och värma den igen ökar risken.');
    expect(en.a.explanation).toBe('Hot-held food that is left over should be thrown away. It has already been held hot for hours, and cooling and reheating it adds to the risk.');
    expect(sv.d.explanation).toBe('Korven har stått varm i timmar. Den blir inte säker igen av att ligga i sin förpackning.');
    expect(en.d.explanation).toBe('The sausages have been held hot for hours. Putting them back in the packet does not make them safe again.');
  });

  it('ft06 är granskad', () => {
    expect(meta.legal.legalReviewed).toBe(true);
  });
});
