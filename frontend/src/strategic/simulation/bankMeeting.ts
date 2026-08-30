// ORDER 109 — M7b bankmötet. Slingans gångjärn: läser
// `knowledgeCredits` genom `resolveLoanOutcome` och ger ett av fyra
// utfall + pekad paviljong vid avslag.
//
// Ren funktion, samma DoD som businessProfile.ts — ingen sim-state-
// läsning utanför den vektor som skickas in, ingen Math.random, inget
// nätanrop. Meddelanden refereras via `messageKey`; texterna själva
// bor i `content/strings.sv.ts:bank` för att hålla presentationslagret
// åtskilt (grep-testet fångar om interna nycklar läcker dit).
//
// §3-designen: `noLoan` uppstår på två sätt som ska säga olika saker:
//   - `under-floor`      : spelaren kan för lite av allt. Peka mot
//                          axeln som har mest signal (eller
//                          Måltidbiblioteket vid nollvektor) och säg
//                          "gå och öva".
//   - `episteme-sector`  : spelaren har läst allt men aldrig lagat mat
//                          och aldrig mött en gäst. Peka mot
//                          Metodköket eller Kalastorget (aldrig
//                          Måltidbiblioteket där hen redan varit).
//
// Två avslag → två pekningar → två meddelanden. Det är hela poängen
// med att skilja dem, per ordertexten §3.

import type {
  BankLoanTier,
  BankMessageKey,
  BankMeetingOutcomeState,
  BankNoLoanReason,
  KnowledgeCredits
} from '../types';
import type { PavilionId } from '../knowledge/pavilions';
import { resolveLoanOutcome } from './businessProfile';

// Re-exportera för externa användare (tester + reducer) som annars
// måste importera från både types.ts och bankMeeting.ts.
export type NoLoanReason = BankNoLoanReason;
export type { BankMessageKey };

// Outcome-formen som resolveBankMeeting returnerar. Speglar
// BankMeetingOutcomeState men utan `heldAt` (som är sim-time-fältet
// reducern sätter, inte något resolvern räknar ut). Håller resolvern
// oberoende av sim-tiden.
export type BankMeetingOutcome = Omit<BankMeetingOutcomeState, 'heldAt' | 'pointedPavilion'> & {
  pointedPavilion: PavilionId | null;
};

// Enkla, konstanta lånebelopp per tier. Skalan i SEK (state.cash är i
// SEK per ORDER 050 §3). Storleken kalibreras när R3 §§4–7 svarar
// på kreditekonomin; här är rimliga placeholders av samma
// storleksordning som befintligt T2-grandfather (2 400 kSEK).
const LOAN_AMOUNTS_SEK: Record<BankLoanTier, number> = {
  none: 0,
  foodtrucken: 600_000,
  'restaurant-small': 1_200_000,   // balanced-klass placeholder (R4 §3.7 p2)
  'restaurant-full': 2_400_000
};

// §3.1 — under floor. Peka mot axeln med starkast signal; vid
// nollvektor default till Måltidbiblioteket (episteme är den lägsta
// tröskeln att börja lyfta). Ties bryts phronesis > techne > episteme,
// samma precedens som readProfile.
function pointForUnderFloor(credits: KnowledgeCredits): PavilionId {
  const { episteme, techne, phronesis } = credits;
  if (episteme === 0 && techne === 0 && phronesis === 0) {
    return 'maltidbiblioteket';
  }
  if (phronesis >= techne && phronesis >= episteme) return 'kalastorget';
  if (techne >= episteme) return 'metodkoket';
  return 'maltidbiblioteket';
}

// §3.2 — episteme-sektorn. Aldrig Måltidbiblioteket (spelaren har varit
// där). Välj mellan Metodköket och Kalastorget efter vilken av techne
// och phronesis som har högst signal; tie → Kalastorget (precedens).
// I praktiken är båda oftast noll i en nearEpisteme-profil, så
// Kalastorget blir default — det ger den "möte"-sida som §3.2:s
// diagnostiska röst syftar på.
function pointForEpistemeSector(credits: KnowledgeCredits): PavilionId {
  const { techne, phronesis } = credits;
  if (phronesis >= techne) return 'kalastorget';
  return 'metodkoket';
}

// Huvudfunktion. Läser resolveLoanOutcome (den befintliga klass-
// bedömningen från ORDER 102) och paketerar den för M7b-scenen.
export function resolveBankMeeting(credits: KnowledgeCredits): BankMeetingOutcome {
  const base = resolveLoanOutcome(credits);
  const loanAmountSek = LOAN_AMOUNTS_SEK[base.loanTier];

  switch (base.klass) {
    case 'kvarterskrogen':
      return {
        klass: base.klass,
        loanTier: base.loanTier,
        loanAmountSek,
        granted: true,
        noLoanReason: null,
        pointedPavilion: null,
        messageKey: 'grantRestaurant'
      };
    case 'foodtrucken':
      return {
        klass: base.klass,
        loanTier: base.loanTier,
        loanAmountSek,
        granted: true,
        noLoanReason: null,
        pointedPavilion: null,
        messageKey: 'grantFoodtruck'
      };
    case 'balanced':
      return {
        klass: base.klass,
        loanTier: base.loanTier,
        loanAmountSek,
        granted: true,
        noLoanReason: null,
        pointedPavilion: null,
        messageKey: 'grantWide'
      };
    case 'nearEpisteme':
      // §3.2 — läst allt, aldrig gjort något. Avslag med pekning mot
      // Metodköket eller Kalastorget, aldrig Måltidbiblioteket.
      return {
        klass: base.klass,
        loanTier: base.loanTier,
        loanAmountSek: 0,
        granted: false,
        noLoanReason: 'episteme-sector',
        pointedPavilion: pointForEpistemeSector(credits),
        messageKey: 'rejectField'
      };
    case 'noLoan':
      // §3.1 — kan för lite av allt. Avslag med pekning mot den axel
      // som har mest signal (default Måltidbiblioteket vid nollvektor).
      return {
        klass: base.klass,
        loanTier: base.loanTier,
        loanAmountSek: 0,
        granted: false,
        noLoanReason: 'under-floor',
        pointedPavilion: pointForUnderFloor(credits),
        messageKey: 'rejectPractice'
      };
  }
}

// Formaterings-helper. Tar ut den engelska texten från strings.sv.ts:bank
// och substituerar {pavilion} med paviljongnamnet vid avslag. Presentations-
// koden anropar denna för att inte behöva känna till bankMessageKey-formen.
//
// Argumentet är shape:t på strings.bank så testet kan bygga en falsk
// strings-tabell utan att importera hela `content/strings.sv.ts`. Håller
// bankMeeting.ts fri från strings-modulen.
export interface BankStrings {
  grantRestaurant: string;
  grantFoodtruck: string;
  grantWide: string;
  rejectPractice: string;
  rejectField: string;
  pavilionNames: Record<PavilionId, string>;
}

export function formatBankMessage(
  outcome: BankMeetingOutcome,
  strings: BankStrings
): string {
  const template = strings[outcome.messageKey];
  if (!outcome.pointedPavilion) return template;
  const name = strings.pavilionNames[outcome.pointedPavilion];
  return template.replace('{pavilion}', name);
}
