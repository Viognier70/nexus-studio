// ORDER 326 A (Anders 2026-10-11) — vinbarens 29 äldre situationer i formen analys → upplevelse → handling
// (documentation/blueprints/SITUATIONER_306c_OMG1.md och SITUATIONER_306c_OMG2-4.md): följderna efter axeln, inget
// halvt grepp i liv och hälsa (vb15, vb27, vb28), svaret efter variant i vb31 (gripByVariant), tillsynens fyra
// varianter av steg 3, ⚖-situationerna dolda tills de är granskade, kedjorna på svaret som anges.

import { describe, expect, it } from 'vitest';
import { reducer } from '../../strategic/simulation/reducer';
import { makeNewGameState } from '../../strategic/simulation/model';
import { firstDayOfWeek } from '../calendar';
import { incidentBankFor, incidentById, optionGrip, optionQuality } from '../incidentBank';
import vinbarMeta from '../../content/incidents/vinbar.meta.json';
import vinbarSv from '../../content/incidents/vinbar.text.sv.draft.json';
import vinbarEn from '../../content/incidents/vinbar.text.en.json';
import type { SimulationState } from '../../strategic/types';
import { stocked } from '../../strategic/testHarness/stocked';
import { answerAndWait } from './verdict';

type Opt = { id: string; quality: string; grip?: string; triggers?: string[]; in?: Record<string, { quality: string; grip?: string }>; fail?: { triggers?: string[] } };
type Meta = { incidents: { id: string; form?: string; legal?: { legalReviewed: boolean }; lineBySituation?: Record<string, string>; steps: { axis: string; legal?: boolean; options: Opt[]; fail: { effects: Record<string, number>; triggers?: string[]; room?: unknown } }[] }[] };
type Texts = { texts: Record<string, { body: string; guestLine?: { a: string; b: string }; steps: { question: string; clue?: string; options: Record<string, { label: string }>; fail: { outcome: string; ongoing?: string } }[]; halfGrip?: Record<string, string>; staffTexts?: { success?: string; fail?: string }; success: { outcome: string }; staff: { outcome: string; ongoing?: string } }> };

const META = vinbarMeta as unknown as Meta;
const SV = vinbarSv as unknown as Texts;
const EN = vinbarEn as unknown as Texts;
const BY = new Map(META.incidents.map((i) => [i.id, i]));

const OLD_29 = ['vb04-dubbelbokning', 'vb05-dj', 'vb06-kylen', 'vb08-sallskap-pa-fem', 'vb10-berusad', 'vb13-delegationen', 'vb14-surdegen',
  'vb15-fisken', 'vb16-stamgasten', 'vb17-glasen', 'vb19-bongarna', 'vb20-notan', 'vb21-skuren-hand', 'vb22-recensenten', 'vb24-terroir',
  'vb25-efter-stangning', 'vb26-oppna-flaskor', 'vb27-allergireaktion', 'vb28-kylen-stannar', 'vb29-brak', 'vb30-korkgasten',
  'vb31-servetter-och-isen', 'vb33-vasen', 'vb34-vinglar', 'vb36-passet', 'vb35-tillsynen-a', 'vb35-tillsynen-b', 'vb35-tillsynen-c', 'vb35-tillsynen-d'];
const LEGAL = ['vb06-kylen', 'vb10-berusad', 'vb14-surdegen', 'vb15-fisken', 'vb21-skuren-hand', 'vb25-efter-stangning', 'vb27-allergireaktion',
  'vb28-kylen-stannar', 'vb29-brak', 'vb34-vinglar', 'vb36-passet', 'vb35-tillsynen-a', 'vb35-tillsynen-b', 'vb35-tillsynen-c', 'vb35-tillsynen-d'];

describe('ORDER 326 A — de 29 i formen analys → upplevelse → handling', () => {
  it('alla 29 har formen, gästens två repliker och ledtrådarna efter steg 1 och 2', () => {
    for (const id of OLD_29) {
      const m = BY.get(id)!;
      expect([id, m.form, m.steps.map((s) => s.axis)]).toEqual([id, 'triad', ['episteme', 'phronesis', 'techne']]);
      for (const t of [SV, EN]) {
        const x = t.texts[id];
        expect(x.guestLine?.a, id).toMatch(/“.+”/);
        expect(x.guestLine?.b, id).toMatch(/“.+”/);
        expect(x.steps[0].clue, id).toMatch(t === SV ? /^Analys: / : /^Analysis: /);
        expect(x.steps[1].clue, id).toMatch(t === SV ? /^Upplevelse: / : /^Experience: /);
        expect(x.halfGrip === undefined || Object.keys(x.halfGrip).length === 4).toBe(true);
        expect(x.staffTexts?.success && x.staffTexts?.fail).toBeTruthy();
      }
    }
  });

  it('svenskan ur filen: ett urval av svaren och texterna', () => {
    const vb04 = SV.texts['vb04-dubbelbokning'];
    expect(Object.values(vb04.steps[2].options).map((o) => o.label)).toContain('Se i systemet vem som bokade först. De andra får baren och ett glas.');
    expect(vb04.steps[1].question).toBe('Vad behöver de två sällskapen?');
    expect(vb04.halfGrip!.outcomeAnalysis).toBe('Det andra sällskapet går. En av dem skriver något i telefonen.');
    expect(SV.texts['vb24-terroir'].body).toBe('Det lugnar sig. {gäst} vid baren frågar {personal} vad ordet terroir på vinlistan egentligen betyder. Två nya gäster kommer just in.');
    expect(SV.texts['vb35-tillsynen-c'].steps[2].question).toBe('Handläggaren bläddrar i egenkontrollen: hur vet personalen vad som står i den?');
    expect(SV.texts['vb35-tillsynen-a'].success.outcome).toBe('Han nekades {klockan}. Här är lappen.');
  });

  it('inga platshållare kvar (vb33–vb36: "Jag tar hand om det.", "Per tar över.", "Risk för erinran" …)', () => {
    const PLACEHOLDERS = ['Jag tar hand om det.', 'Jag tar det här.', 'Per tar över.', 'Vi tar det efter servicen.', 'Risk för erinran', 'Risk för varning', 'Anmärkning i rapporten, ingen påföljd', 'Vi skriver in det i rapporten.'];
    for (const id of OLD_29) {
      const all = JSON.stringify(SV.texts[id]);
      for (const p of PLACEHOLDERS) expect(all.includes(p), `${id}: ${p}`).toBe(false);
    }
  });

  it('steg 2 tar varken kassa eller ork och har ingen kedja; steg 3 har minst ett helt grepp', () => {
    for (const id of OLD_29) {
      const [, s2, s3] = BY.get(id)!.steps;
      expect([id, Math.min(0, s2.fail.effects.cash), s2.fail.effects.stamina, s2.fail.triggers ?? [], s2.fail.room ?? null]).toEqual([id, 0, 0, [], null]);
      expect(s3.options.some((o) => o.quality === 'best'), id).toBe(true);
      for (const o of s3.options.filter((x) => x.quality === 'ok')) expect(['analysis', 'experience']).toContain(o.grip);
    }
  });

  it('inget halvt grepp i liv och hälsa: vb15, vb27 och vb28 har bara helt grepp och fel i steg 3', () => {
    for (const id of ['vb15-fisken', 'vb27-allergireaktion', 'vb28-kylen-stannar']) {
      expect(BY.get(id)!.steps[2].options.map((o) => o.quality).sort()).toEqual(['best', 'wrong', 'wrong', 'wrong']);
    }
  });

  it('⚖: femton dolda tills de är granskade, varje steg märkt; resten är med i spelet', () => {
    const bank = new Set(incidentBankFor('vinbar').map((i) => i.id));
    for (const id of OLD_29) {
      const m = BY.get(id)!;
      const legal = LEGAL.includes(id);
      expect([id, m.legal?.legalReviewed ?? null, bank.has(id)]).toEqual([id, legal ? false : null, !legal]);
      if (legal) expect(m.steps.every((s) => s.legal)).toBe(true);
    }
  });

  it('vb31: svaret efter variant (gripByVariant) och repliken efter kvällens läge', () => {
    const m = BY.get('vb31-servetter-och-isen')!;
    expect(m.lineBySituation).toEqual({ middag: 'a', 'efter-middag': 'b' });
    const step = incidentById('vinbar', m.id)!.steps[2];
    const label = (id: string) => step.text.options[id].label;
    const byStart = (x: string) => step.options.find((o) => label(o.id).startsWith(x))!;
    const napkins = byStart('Fold napkins'), ice = byStart('Fetch ice'), glass = byStart('Scoop ice'), split = byStart('Split');
    expect([optionQuality(napkins, 'middag'), optionGrip(napkins, 'middag')]).toEqual(['best', undefined]);
    expect([optionQuality(napkins, 'efter-middag'), optionGrip(napkins, 'efter-middag')]).toEqual(['ok', 'analysis']);
    expect([optionQuality(ice, 'middag'), optionGrip(ice, 'middag')]).toEqual(['ok', 'analysis']);
    expect([optionQuality(ice, 'efter-middag'), optionGrip(ice, 'efter-middag')]).toEqual(['best', undefined]);
    expect([optionQuality(glass, 'middag'), optionQuality(glass, 'efter-middag'), optionGrip(glass, 'efter-middag')]).toEqual(['wrong', 'ok', 'experience']);
    expect([optionQuality(split, 'middag'), optionQuality(split, 'efter-middag')]).toEqual(['wrong', 'wrong']);
  });

  it('kedjorna på svaret som anges: vb08 halvt grepp → vb17, vb10 halvt och fel → vb29, vb14 fel → vb27', () => {
    const s3 = (id: string) => BY.get(id)!.steps[2].options;
    expect(s3('vb08-sallskap-pa-fem').filter((o) => o.triggers?.includes('vb17-glasen')).map((o) => [o.quality, o.grip])).toEqual([['ok', 'experience']]);
    expect(s3('vb10-berusad').filter((o) => o.triggers?.includes('vb29-brak')).map((o) => [o.quality, o.grip])).toEqual([['ok', 'experience']]);
    expect(s3('vb10-berusad').filter((o) => o.fail?.triggers?.includes('vb29-brak')).map((o) => o.quality)).toEqual(['wrong']);
    expect(s3('vb14-surdegen').filter((o) => o.fail?.triggers?.includes('vb27-allergireaktion')).map((o) => o.quality)).toEqual(['wrong']);
  });
});

describe('ORDER 326 A — kedjan på ett halvt grepp i spelet', () => {
  const TICK = { type: 'TICK', dt: 0.2 } as const;
  const tick = (s: SimulationState, n: number) => { for (let i = 0; i < n; i++) s = reducer(s, TICK); return s; };
  const goOn = (s: SimulationState) => (s.incidents.active?.choosing ? reducer(s, { type: 'INCIDENT_GO' }) : s);

  it('vb08 med ihopskjutna bord (halvt grepp mot upplevelsen) köar vb17, glasen tar slut', () => {
    let s = makeNewGameState(7);
    s = { ...s, medals: { stensota: 'brons', metodkoket: 'brons', kalastorget: 'brons' }, speed: 2, day: { ...s.day, dayNumber: firstDayOfWeek(2) } };
    s = reducer(stocked(s), { type: 'START_SERVICE' });
    const id = 'vb08-sallskap-pa-fem';
    s = { ...s, incidents: { ...s.incidents, slots: [{ at: s.simTime, phase: 'rush' }, ...s.incidents.slots], queued: [id] } };
    s = tick(s, 700);
    for (let i = 0; i < 4000 && s.incidents.active?.id !== id; i++) {
      if (s.incidents.active) s = answerAndWait(goOn(s), incidentById('vinbar', s.incidents.active.id)!.steps[s.incidents.active.step].options.find((o) => o.quality === 'best')!.id);
      s = reducer(s, TICK);
    }
    expect(s.incidents.active?.id).toBe(id);
    for (let i = 0; i < 2000 && (s.incidents.active?.introLeft ?? 0) > 0; i++) s = reducer(s, TICK);
    const inc = incidentById('vinbar', id)!;
    const best = (k: number) => inc.steps[k].options.find((o) => o.quality === 'best')!.id;
    s = answerAndWait(goOn(s), best(0));
    s = answerAndWait(goOn(s), best(1));
    const half = inc.steps[2].options.find((o) => o.triggers?.includes('vb17-glasen'))!;
    s = answerAndWait(goOn(s), half.id);
    expect(s.incidents.log.at(-1)).toMatchObject({ id, quality: 'ok', halfGrip: 'experience' });
    expect(s.incidents.queued).toContain('vb17-glasen');
  }, 120000);
});
