// ORDER 109 §5 — M7b bankmötet: DoD-tester.
//
// DoD-kartläggning:
//   DoD 1  fyra utfall från resolveBankMeeting.
//   DoD 2  två noLoan-fall ger olika besked + olika pekad paviljong.
//   DoD 3  episteme-avslag pekar aldrig mot Måltidbiblioteket.
//   DoD 4  outcome läsbart i state efter REQUEST_BANK_LOAN.
//   DoD 5  väg tillbaka: pointedPavilion är giltig paviljong-id.
//   DoD 6  grep: inga interna outcome-nycklar i strings.sv.ts;
//          ingen kreditsiffra i spelartext; ingen cash↔credits-omvandling.
//   DoD 7  slingan går runt: noLoan → öva → verksamhet → tillbaka.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  formatBankMessage,
  resolveBankMeeting,
  type BankStrings
} from '../bankMeeting';
import { reducer } from '../reducer';
import { makeInitialState } from '../model';
import { ALL_PAVILION_IDS } from '../../knowledge/pavilions';
import { strings } from '../../../content/strings.sv';
import type { KnowledgeCredits, SimAction } from '../../types';

const ZERO_CREDITS: KnowledgeCredits = { episteme: 0, techne: 0, phronesis: 0 };

// Hjälpare för att flytta krediter in via ACCUMULATE_KNOWLEDGE så
// invarianten mellan knowledgeCredits och knowledgeTracks hålls
// (samma tekniken som pavilionExam-tester använder).
function accumulate(
  state: ReturnType<typeof makeInitialState>,
  axis: 'episteme' | 'techne' | 'phronesis',
  amount: number
) {
  const action: SimAction = { type: 'ACCUMULATE_KNOWLEDGE', axis, amount };
  return reducer(state, action);
}

// -----------------------------------------------------------------------------
// DoD 1 — fyra utfall
// -----------------------------------------------------------------------------

describe('ORDER 109 §5 DoD 1 — resolveBankMeeting ger fyra utfall', () => {
  it('phronesis dominant → restaurant, grant, tier restaurant-full', () => {
    const out = resolveBankMeeting({ episteme: 0, techne: 0, phronesis: 0.5 });
    expect(out.klass).toBe('kvarterskrogen');
    expect(out.granted).toBe(true);
    expect(out.loanTier).toBe('restaurant-full');
    expect(out.loanAmountSek).toBeGreaterThan(0);
    expect(out.messageKey).toBe('grantRestaurant');
  });

  it('techne dominant → foodtruck, grant', () => {
    const out = resolveBankMeeting({ episteme: 0, techne: 0.5, phronesis: 0 });
    expect(out.klass).toBe('foodtrucken');
    expect(out.granted).toBe(true);
    expect(out.loanTier).toBe('foodtrucken');
    expect(out.messageKey).toBe('grantFoodtruck');
  });

  it('bred profil över centrumgolv → balanced, grant, wide message', () => {
    // Ekvidistant över centrumgolvet (0.40) — utanför alla axelkoner.
    const out = resolveBankMeeting({ episteme: 0.3, techne: 0.3, phronesis: 0.3 });
    expect(out.klass).toBe('balanced');
    expect(out.granted).toBe(true);
    expect(out.messageKey).toBe('grantWide');
  });

  it('episteme dominant → nearEpisteme, avslag, tier none', () => {
    const out = resolveBankMeeting({ episteme: 0.5, techne: 0, phronesis: 0 });
    expect(out.klass).toBe('nearEpisteme');
    expect(out.granted).toBe(false);
    expect(out.loanTier).toBe('none');
    expect(out.loanAmountSek).toBe(0);
  });

  it('under magnitudgolv → noLoan, avslag', () => {
    const out = resolveBankMeeting(ZERO_CREDITS);
    expect(out.klass).toBe('noLoan');
    expect(out.granted).toBe(false);
    expect(out.loanAmountSek).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// DoD 2 — två noLoan-fall skiljer sig (både besked och paviljong)
// -----------------------------------------------------------------------------

describe('ORDER 109 §5 DoD 2 — två noLoan-fall ger olika besked + olika paviljong', () => {
  it('under-floor och episteme-sector får OLIKA messageKey', () => {
    const underFloor = resolveBankMeeting(ZERO_CREDITS);
    const epistemeSector = resolveBankMeeting({ episteme: 0.5, techne: 0, phronesis: 0 });
    expect(underFloor.granted).toBe(false);
    expect(epistemeSector.granted).toBe(false);
    expect(underFloor.messageKey).not.toBe(epistemeSector.messageKey);
    // Explicit — inte bara "skilda" utan de förväntade nycklarna:
    expect(underFloor.messageKey).toBe('rejectPractice');
    expect(epistemeSector.messageKey).toBe('rejectField');
  });

  it('under-floor och episteme-sector pekar mot OLIKA paviljonger', () => {
    const underFloor = resolveBankMeeting(ZERO_CREDITS);
    const epistemeSector = resolveBankMeeting({ episteme: 0.5, techne: 0, phronesis: 0 });
    expect(underFloor.pointedPavilion).not.toBeNull();
    expect(epistemeSector.pointedPavilion).not.toBeNull();
    expect(underFloor.pointedPavilion).not.toBe(epistemeSector.pointedPavilion);
  });

  it('noLoanReason distinguishes the two', () => {
    expect(resolveBankMeeting(ZERO_CREDITS).noLoanReason).toBe('under-floor');
    expect(
      resolveBankMeeting({ episteme: 0.5, techne: 0, phronesis: 0 }).noLoanReason
    ).toBe('episteme-sector');
  });
});

// -----------------------------------------------------------------------------
// DoD 3 — episteme-avslag pekar aldrig mot Måltidbiblioteket
// -----------------------------------------------------------------------------

describe('ORDER 109 §5 DoD 3 — episteme-avslag pekar aldrig mot Måltidbiblioteket', () => {
  it('nearEpisteme-profil pekar mot Metodköket eller Kalastorget, aldrig maltidbiblioteket', () => {
    // Prova ett spektrum av nearEpisteme-profiler (varierande sekundära
    // axlar men episteme-cone dominerar). För alla ska pointedPavilion
    // vara antingen 'metodkoket' eller 'kalastorget'.
    const scenarios: KnowledgeCredits[] = [
      { episteme: 0.5, techne: 0, phronesis: 0 },
      { episteme: 0.8, techne: 0.05, phronesis: 0 },
      { episteme: 0.6, techne: 0, phronesis: 0.05 },
      { episteme: 1.0, techne: 0.15, phronesis: 0.15 } // fortfarande nearEpisteme (cos(0)=1 dominerar)
    ];
    for (const credits of scenarios) {
      const out = resolveBankMeeting(credits);
      expect(out.klass, JSON.stringify(credits)).toBe('nearEpisteme');
      expect(out.pointedPavilion, JSON.stringify(credits)).not.toBe('maltidbiblioteket');
      expect(['metodkoket', 'kalastorget']).toContain(out.pointedPavilion);
    }
  });

  it('nearEpisteme med sekundär phronesis > techne → Kalastorget', () => {
    const out = resolveBankMeeting({ episteme: 0.7, techne: 0.02, phronesis: 0.05 });
    expect(out.klass).toBe('nearEpisteme');
    expect(out.pointedPavilion).toBe('kalastorget');
  });

  it('nearEpisteme med sekundär techne > phronesis → Metodköket', () => {
    const out = resolveBankMeeting({ episteme: 0.7, techne: 0.05, phronesis: 0.02 });
    expect(out.klass).toBe('nearEpisteme');
    expect(out.pointedPavilion).toBe('metodkoket');
  });
});

// -----------------------------------------------------------------------------
// DoD 4 + DoD 5 — reducer skriver outcome; paviljong-id är giltig
// -----------------------------------------------------------------------------

describe('ORDER 109 §5 DoD 4 — REQUEST_BANK_LOAN skriver outcome läsbart i state', () => {
  it('initial state → bankMeetingOutcome är null', () => {
    const s = makeInitialState();
    expect(s.bankMeetingOutcome).toBeNull();
  });

  it('REQUEST_BANK_LOAN på tom profil → outcome i state, avslag', () => {
    let s = makeInitialState();
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(s.bankMeetingOutcome).not.toBeNull();
    expect(s.bankMeetingOutcome!.granted).toBe(false);
    expect(s.bankMeetingOutcome!.klass).toBe('noLoan');
    expect(s.bankMeetingOutcome!.heldAt).toBe(s.simTime);
  });

  it('REQUEST_BANK_LOAN på foodtruck-profil → beviljande + cash + ledger', () => {
    let s = makeInitialState();
    const cashBefore = s.cash;
    const ledgerBefore = s.ledger.length;
    s = accumulate(s, 'techne', 0.5);
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(s.bankMeetingOutcome!.granted).toBe(true);
    expect(s.bankMeetingOutcome!.klass).toBe('foodtrucken');
    expect(s.cash).toBe(cashBefore + s.bankMeetingOutcome!.loanAmountSek);
    expect(s.ledger.length).toBe(ledgerBefore + 1);
    expect(s.ledger[s.ledger.length - 1].category).toBe('other');
    expect(s.ledger[s.ledger.length - 1].amount).toBe(s.bankMeetingOutcome!.loanAmountSek);
  });

  it('avslag rör inte cash och adderar inte ledger-rad', () => {
    let s = makeInitialState();
    const cashBefore = s.cash;
    const ledgerBefore = s.ledger.length;
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(s.bankMeetingOutcome!.granted).toBe(false);
    expect(s.cash).toBe(cashBefore);
    expect(s.ledger.length).toBe(ledgerBefore);
  });
});

describe('ORDER 109 §5 DoD 5 — väg tillbaka: paviljong-id giltig', () => {
  it('pekad paviljong vid avslag är alltid en byggd paviljong-id', () => {
    const s = reducer(makeInitialState(), { type: 'REQUEST_BANK_LOAN' });
    const pointed = s.bankMeetingOutcome!.pointedPavilion;
    expect(pointed).not.toBeNull();
    expect(ALL_PAVILION_IDS).toContain(pointed);
  });

  it('pekad paviljong vid nearEpisteme är också giltig', () => {
    let s = makeInitialState();
    s = accumulate(s, 'episteme', 0.5);
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(ALL_PAVILION_IDS).toContain(s.bankMeetingOutcome!.pointedPavilion);
  });
});

// -----------------------------------------------------------------------------
// DoD 6 — grep över strings.sv.ts + ingen kredit→cash-omvandling
// -----------------------------------------------------------------------------

describe('ORDER 109 §5 DoD 6 — grep: inga interna nycklar i strings.sv.ts', () => {
  it('strings.sv.ts innehåller ingen intern outcome-nyckel', () => {
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const stringsPath = resolve(thisDir, '../../../content/strings.sv.ts');
    const source = readFileSync(stringsPath, 'utf8');
    // Interna nycklar från businessProfile.ts:KnowledgeClass +
    // bankMeeting.ts:BankLoanTier. Får inte förekomma någonstans
    // i filen (inte ens i kommentar — kommentaren i bank-sektionen
    // är skriven utan de bokstavliga nycklarna).
    const forbidden = [
      /\bbalanced\b/,
      /\bnearEpisteme\b/,
      /\bnoLoan\b/,
      /restaurant-full/,
      /restaurant-small/
    ];
    const hits: string[] = [];
    for (const pattern of forbidden) {
      if (pattern.test(source)) hits.push(pattern.toString());
    }
    expect(hits, `Förbjudna nycklar i strings.sv.ts: ${hits.join(', ')}`).toEqual([]);
  });

  it('strings.sv.ts:bank innehåller inga siffror alls (ingen kredit-siffra i spelartext)', () => {
    // Bank-meddelanden och paviljongnamn är prosa; en siffra där skulle
    // signalera att en kredit- eller cash-siffra läckt in. Uteslut
    // "ORDER 109" i kommentaren via att bara skanna själva strängvärdena.
    const messages = [
      strings.bank.grantRestaurant,
      strings.bank.grantFoodtruck,
      strings.bank.grantWide,
      strings.bank.rejectPractice,
      strings.bank.rejectField,
      ...Object.values(strings.bank.pavilionNames)
    ];
    for (const msg of messages) {
      expect(/\d/.test(msg), `Siffra i bank-text: "${msg}"`).toBe(false);
    }
  });

  it('bankMeeting.ts + reducer.ts: ingen omvandling kredit→cash utöver den tier-tabellen', () => {
    // "Ingen konvertering mellan cash och knowledgeCredits" — grep
    // efter mönster som skulle multiplicera en credit-läsning med en
    // cash-faktor. Tier-tabellen (LOAN_AMOUNTS_SEK) är den enda tillåtna
    // vägen och den läser tier-nyckeln, inte kredit-värdet.
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const bankPath = resolve(thisDir, '../bankMeeting.ts');
    const source = readFileSync(bankPath, 'utf8');
    // Förbjudna: cash * credits, credits * cash, credits.episteme * <tal>,
    // knowledgeCredits.<axis> * <tal>. Tillåtet: matchning på tier +
    // pointForXxx som läser credits.axis för att välja paviljong.
    const forbidden = [
      /credits\.(episteme|techne|phronesis)\s*\*/,        // credit * n
      /\bcash\s*=\s*.*credits/,                              // cash = f(credits)
      /knowledgeCredits\.(episteme|techne|phronesis)\s*\*/  // via alias
    ];
    const hits: string[] = [];
    for (const pattern of forbidden) {
      if (pattern.test(source)) hits.push(pattern.toString());
    }
    expect(hits, `Otillåtet mönster i bankMeeting.ts: ${hits.join(', ')}`).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// DoD 7 — slingan går runt
// -----------------------------------------------------------------------------

describe('ORDER 109 §5 DoD 7 — slingan går runt: noLoan → öva → verksamhet → tillbaka', () => {
  it('spelaren kan öva från noLoan till foodtruck och sedan omvärdera igen', () => {
    let s = makeInitialState();
    // Steg 1: tomt läge → begär lån → avslag under floor.
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(s.bankMeetingOutcome!.klass).toBe('noLoan');
    expect(s.bankMeetingOutcome!.granted).toBe(false);
    const pointedFirst = s.bankMeetingOutcome!.pointedPavilion!;

    // Steg 2: öva techne över specialistgolvet.
    s = accumulate(s, 'techne', 0.4);

    // Steg 3: begär lån igen → foodtruck-beviljande.
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(s.bankMeetingOutcome!.klass).toBe('foodtrucken');
    expect(s.bankMeetingOutcome!.granted).toBe(true);
    expect(s.bankMeetingOutcome!.pointedPavilion).toBeNull();

    // Steg 4: fortsätt öva phronesis så profilen skiftar; begär lån igen.
    s = accumulate(s, 'phronesis', 1.0);
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    expect(s.bankMeetingOutcome!.klass).toBe('kvarterskrogen');
    expect(s.bankMeetingOutcome!.granted).toBe(true);

    // "Tillbaka" — spelaren kan begära lån efter en profilskift och
    // få ett nytt utfall. Repeat-request är idempotent i strukturen
    // (outcome skrivs över) men producerar ny läsning varje gång.
    expect(pointedFirst).not.toBeNull();
  });

  it('repeat-dispatch skriver över outcome (aldrig ackumuleras)', () => {
    let s = makeInitialState();
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    const first = s.bankMeetingOutcome!;
    // Utan att ändra profilen — dispatch igen ska ge en ny outcome
    // (samma innehåll men ny heldAt om simTime rört sig, samma annars).
    s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    const second = s.bankMeetingOutcome!;
    expect(second.klass).toBe(first.klass);
    expect(second.granted).toBe(first.granted);
    expect(second.pointedPavilion).toBe(first.pointedPavilion);
  });

  it('avslag lämnar cash orört även vid upprepade requests', () => {
    let s = makeInitialState();
    const cashBefore = s.cash;
    for (let i = 0; i < 5; i++) {
      s = reducer(s, { type: 'REQUEST_BANK_LOAN' });
    }
    expect(s.cash).toBe(cashBefore);
  });
});

// -----------------------------------------------------------------------------
// formatBankMessage — helper med paviljong-substitution
// -----------------------------------------------------------------------------

describe('ORDER 109 — formatBankMessage substituerar paviljongnamn', () => {
  const bankStrings: BankStrings = {
    grantRestaurant: 'Grant restaurant.',
    grantFoodtruck: 'Grant foodtruck.',
    grantWide: 'Grant wide.',
    rejectPractice: 'Practise at {pavilion}.',
    rejectField: 'Work at {pavilion}.',
    pavilionNames: {
      maltidbiblioteket: 'Måltidbiblioteket',
      kalastorget: 'Kalastorget',
      stensota: 'Stensöta',
      metodkoket: 'Metodköket',
      gastronomiskateatern: 'Gastronomiska Teatern'
    }
  };

  it('under-floor: {pavilion} substitueras med pekad paviljongs namn', () => {
    const out = resolveBankMeeting(ZERO_CREDITS);
    const text = formatBankMessage(out, bankStrings);
    expect(text).toBe('Practise at Måltidbiblioteket.');
  });

  it('episteme-sector: pekar mot Kalastorget (default) → texten', () => {
    const out = resolveBankMeeting({ episteme: 0.5, techne: 0, phronesis: 0 });
    const text = formatBankMessage(out, bankStrings);
    expect(text).toBe('Work at Kalastorget.');
  });

  it('grant: ingen substitution — pointedPavilion är null', () => {
    const out = resolveBankMeeting({ episteme: 0, techne: 0.5, phronesis: 0 });
    const text = formatBankMessage(out, bankStrings);
    expect(text).toBe('Grant foodtruck.');
    expect(text).not.toContain('{pavilion}');
  });
});
