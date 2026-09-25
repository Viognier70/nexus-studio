// ORDER 264 (Nexus v1 etapp 2) — öva, prov, medaljer, Teatern.
//
// Speldesign > Kunskapen. DoD: "Test hävdar att ingen väg i koden kan
// sänka en medalj." Det prövas på två sätt:
//   1. statiskt: bara `awardMedal` (som tar högsta) och starttillståndet
//      skriver `medals` i produktionskoden (plus `carryKnowledge`, som
//      själv går via awardMedal, och LOAD_STATE/RESET som byter spel);
//   2. dynamiskt: tusentals slumpade åtgärder över flera dagar, där
//      medaljerna jämförs före och efter varje åtgärd.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reducer } from '../../simulation/reducer';
import { makeInitialState } from '../../simulation/model';
import { EXAM, MEDAL_LEVELS, PRACTICE } from '../../../sim/balance';
import { carryKnowledge } from '../../../sim/save';
import {
  awardMedal,
  isPavilionUnlocked,
  medalRank,
  scheduleSlotsLeft,
  THEATRE
} from '../pavilionVisit';
import { bankQuestionById } from '../questionBank';
import { createRng } from '../../util/rng';
import type { PavilionKey, SimAction, SimulationState } from '../../types';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '../../..');

function answerAll(s: SimulationState, correctCount: number): SimulationState {
  const visit = s.pavilionVisit!;
  for (let i = 0; i < visit.questionIds.length; i++) {
    const q = bankQuestionById(s.pavilionVisit!.questionIds[i])!;
    const right = i < correctCount;
    const idx = right ? q.correctIndex : (q.correctIndex + 1) % q.options.length;
    s = reducer(s, { type: 'ANSWER_VISIT', chosenIndex: idx });
    expect(s.pavilionVisit!.showingExplanation).toBe(true);
    s = reducer(s, { type: 'NEXT_VISIT_QUESTION' });
  }
  return s;
}

function takeExam(s: SimulationState, pavilion: PavilionKey, correct: number): SimulationState {
  s = reducer(s, { type: 'VISIT_PAVILION', pavilion, mode: 'exam' });
  expect(s.pavilionVisit?.mode).toBe('exam');
  s = answerAll(s, correct);
  return reducer(s, { type: 'CLOSE_VISIT' });
}

// Ny morgon med tomt schema (utan att köra en hel dag).
function freshMorning(s: SimulationState, dayNumber = s.day.dayNumber): SimulationState {
  return { ...s, day: { ...s.day, dayNumber, period: 'morning', pickedActivityIds: [], pavilionVisitsToday: [] } };
}

describe('ORDER 264 — öva', () => {
  it('fem frågor med förklaring efter varje svar; varje rätt svar ger en kredit', () => {
    let s = makeInitialState(3);
    s = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'metodkoket', mode: 'practice' });
    expect(s.pavilionVisit!.questionIds).toHaveLength(PRACTICE.questions);
    const before = s.knowledgeCredits.techne;
    s = answerAll(s, 3);
    expect(s.knowledgeCredits.techne - before).toBe(3);
    expect(s.pavilionVisit!.result).toMatchObject({ correct: 3, total: PRACTICE.questions, passed: null, medalAwarded: null });
    expect(s.medals.metodkoket).toBeUndefined();
  });

  it('ett besök tar en schemaplats; satsningar och besök delar platserna', () => {
    let s = makeInitialState(3);
    expect(scheduleSlotsLeft(s)).toBe(2);
    s = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'stensota', mode: 'practice' });
    expect(scheduleSlotsLeft(s)).toBe(1);
    s = answerAll(s, 0);
    s = reducer(s, { type: 'CLOSE_VISIT' });
    s = reducer(s, { type: 'PICK_ACTIVITY', id: 'train-service' });
    expect(scheduleSlotsLeft(s)).toBe(0);
    const blocked = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'kalastorget', mode: 'practice' });
    expect(blocked).toBe(s);
    expect(reducer(s, { type: 'PICK_ACTIVITY', id: 'runner-shift' }).day.pickedActivityIds).toHaveLength(1);
  });

  it('inget besök utanför morgonen', () => {
    let s = makeInitialState(3);
    s = reducer(s, { type: 'START_SERVICE' });
    expect(reducer(s, { type: 'VISIT_PAVILION', pavilion: 'stensota', mode: 'practice' })).toBe(s);
  });
});

describe('ORDER 264 — prov och medaljer', () => {
  it('åtta av tio frågor; sex rätt ger brons, fem rätt ger ingen medalj', () => {
    let s = makeInitialState(5);
    s = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'kalastorget', mode: 'exam' });
    const ids = s.pavilionVisit!.questionIds;
    expect(ids).toHaveLength(EXAM.questionsDrawn);
    expect(new Set(ids).size).toBe(EXAM.questionsDrawn);
    s = answerAll(s, EXAM.correctToPass - 1);
    expect(s.pavilionVisit!.result).toMatchObject({ passed: false, medalAwarded: null });
    expect(s.medals.kalastorget).toBeUndefined();
    s = reducer(s, { type: 'CLOSE_VISIT' });
    s = freshMorning(s, 2);
    s = takeExam(s, 'kalastorget', EXAM.correctToPass);
    expect(s.medals.kalastorget).toBe('brons');
  });

  it('omprov drar på nytt: en annan ordning eller andra frågor', () => {
    let s = makeInitialState(5);
    s = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'kalastorget', mode: 'exam' });
    const first = s.pavilionVisit!.questionIds.join(',');
    s = reducer(answerAll(s, 0), { type: 'CLOSE_VISIT' });
    s = freshMorning(s, 2);
    s = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'kalastorget', mode: 'exam' });
    expect(s.pavilionVisit!.questionIds.join(',')).not.toBe(first);
  });

  it('provet gäller nästa nivå: efter brons prövas silver', () => {
    let s = makeInitialState(5);
    s = takeExam(s, 'stensota', EXAM.questionsDrawn);
    expect(s.medals.stensota).toBe('brons');
    s = freshMorning(s, 2);
    s = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'stensota', mode: 'exam' });
    expect(s.pavilionVisit!.level).toBe('silver');
    // Silver har ännu inga egna frågor: bronsfrågor märkta som platshållare.
    expect(s.pavilionVisit!.questionIds.every((id) => id.endsWith('@silver'))).toBe(true);
  });

  it('platina är taket: inget prov över platina, och platina ger belöningsflaggan', () => {
    let s = makeInitialState(5);
    for (let d = 0; d < MEDAL_LEVELS.length; d++) {
      s = freshMorning(s, d + 1);
      s = takeExam(s, 'metodkoket', EXAM.questionsDrawn);
    }
    expect(s.medals.metodkoket).toBe('platina');
    s = freshMorning(s, 9);
    expect(reducer(s, { type: 'VISIT_PAVILION', pavilion: 'metodkoket', mode: 'exam' })).toBe(s);
    const practice = reducer(s, { type: 'VISIT_PAVILION', pavilion: 'metodkoket', mode: 'practice' });
    expect(practice.pavilionVisit!.level).toBe('platina');
  });

  it('Teatern är låst tills silver i två paviljonger', () => {
    let s = makeInitialState(5);
    expect(isPavilionUnlocked(s, THEATRE)).toBe(false);
    expect(reducer(s, { type: 'VISIT_PAVILION', pavilion: THEATRE, mode: 'practice' })).toBe(s);
    s = { ...s, medals: { stensota: 'silver', metodkoket: 'brons' } };
    expect(isPavilionUnlocked(s, THEATRE)).toBe(false);
    s = { ...s, medals: { stensota: 'silver', metodkoket: 'guld' } };
    expect(isPavilionUnlocked(s, THEATRE)).toBe(true);
    s = reducer(s, { type: 'VISIT_PAVILION', pavilion: THEATRE, mode: 'exam' });
    expect(s.pavilionVisit?.pavilion).toBe(THEATRE);
  });
});

describe('ORDER 264 — ingen väg sänker en medalj', () => {
  it('awardMedal tar aldrig en lägre nivå', () => {
    const m = awardMedal({ stensota: 'guld' }, 'stensota', 'brons');
    expect(m.stensota).toBe('guld');
    expect(awardMedal(m, 'stensota', 'platina').stensota).toBe('platina');
  });

  it('carryKnowledge (tillbaka en vecka) behåller de högsta medaljerna och krediterna', () => {
    const now = { ...makeInitialState(1), medals: { stensota: 'guld' as const }, knowledgeCredits: { episteme: 4, techne: 9, phronesis: 2 } };
    const old = { ...makeInitialState(1), medals: { stensota: 'brons' as const, kalastorget: 'brons' as const } };
    const merged = carryKnowledge(now, old);
    expect(merged.medals).toEqual({ stensota: 'guld', kalastorget: 'brons' });
    expect(merged.knowledgeCredits).toEqual(now.knowledgeCredits);
  });

  it('statiskt: bara awardMedal och starttillståndet skriver medals i produktionskoden', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) { if (n !== '__tests__') walk(p); }
        else if (/\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)) files.push(p);
      }
    };
    walk(SRC);
    const writers: string[] = [];
    for (const f of files) {
      // balance.ts: `medals` där är mognadsstegens krav (data), inte tillstånd.
      if (f.endsWith('/sim/balance.ts')) continue;
      const code = readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '');
      const lines = code.split('\n');
      lines.forEach((line, i) => {
        if (/\bmedals\s*[:=](?!=)/.test(line) && !/\bmedals\s*:\s*(Partial<|SimulationState\[)/.test(line)) {
          writers.push(`${relative(SRC, f)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    const allowed = [
      /^strategic\/knowledge\/pavilionVisit\.ts:\d+: (const medals = passed \? awardMedal|medals,$)/,
      /^strategic\/simulation\/model\.ts:\d+: medals: \{\},$/,
      /^sim\/save\.ts:\d+: (let medals = loaded\.medals|if \(level\) medals = awardMedal\(medals|medals,$)/
    ];
    const unexpected = writers.filter((w) => !allowed.some((re) => re.test(w)));
    expect(unexpected).toEqual([]);
  });

  it('dynamiskt: 4000 slumpade åtgärder över flera dagar sänker aldrig en medalj', () => {
    const rng = createRng(20260925);
    const pavilions: PavilionKey[] = ['maltidbiblioteket', 'kalastorget', 'stensota', 'metodkoket', THEATRE];
    let s = makeInitialState(11);
    for (let i = 0; i < 4000; i++) {
      const r = rng.next();
      let action: SimAction;
      if (r < 0.2) action = { type: 'VISIT_PAVILION', pavilion: rng.pick(pavilions), mode: rng.chance(0.6) ? 'exam' : 'practice' };
      else if (r < 0.5) action = { type: 'ANSWER_VISIT', chosenIndex: rng.int(0, 3) };
      else if (r < 0.62) action = { type: 'NEXT_VISIT_QUESTION' };
      else if (r < 0.7) action = { type: 'CLOSE_VISIT' };
      else if (r < 0.74) action = { type: 'START_SERVICE' };
      else if (r < 0.76) action = { type: 'CLOSE_DAY' };
      else if (r < 0.8) action = { type: 'START_QUIZ' };
      else if (r < 0.86) action = { type: 'ANSWER_QUIZ', chosenIndex: rng.int(0, 3) };
      else if (r < 0.9) action = { type: 'NEXT_QUIZ_QUESTION' };
      else if (r < 0.92) action = { type: 'SKIP_QUIZ' };
      else if (r < 0.94) action = { type: 'END_EVENING' };
      else action = { type: 'TICK', dt: 0.2 };
      const before = s.medals;
      s = reducer(s, action);
      // Hoppa fram i tiden ibland så att dagar passerar.
      if (s.day.period === 'dinner' && rng.chance(0.05)) {
        for (let t = 0; t < 400; t++) s = reducer(s, { type: 'TICK', dt: 0.2 });
      }
      for (const p of pavilions) {
        expect(medalRank(s.medals[p]), `${action.type} sänkte ${p}`).toBeGreaterThanOrEqual(medalRank(before[p]));
      }
    }
    expect(s.day.dayNumber).toBeGreaterThan(1);
    expect(Object.keys(s.medals).length).toBeGreaterThan(0);
  });
});
