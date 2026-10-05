// morningReviews.ts — D5 (2026-10-04): "Recensioner i morse". ORDER 303 C.
// Varje morgon, före inköpen, ett kort i papper ovanpå morgonens rum: vad byn säger om gårdagens kväll, hur ryktet
// ändrades och varför. Högst fyra rader, den största ändringen först. Varje rad är en följd av ett svar eller av
// personalen, aldrig en siffertabell (speldesignen: berättelse framför siffror). Ändringen står som en bricka:
// upp i papper med pil upp, ned i valnöt med pil ned. Inget grönt eller rött: de betyder rätt och fel i stunden.
// Talen ({delta}, {from}, {to}) kommer från balance.ts / ryktet. Raderna är nycklar med platshållare.

export interface ReviewLine {
  /** Vem som säger det: en gästgrupp (guestGroups.ts), byn eller personalen. */
  voice: 'student' | 'villager' | 'tourist' | 'gourmet' | 'business' | 'village' | 'staff';
  /** Vad som hände (raketens id och steg, eller personalens läge). */
  cause: string;
  delta: number;
  /** Nyckeln: citatet, och skälet med platshållare. */
  quoteKey: string; reasonKey: string;
}

export const REVIEW_CARD = {
  maxLines: 4, order: 'abs(delta) desc',
  paper: '#f1e6d0',          // newsprint, som tidningen
  ink: '#2a1c13', muted: '#6b5443', kicker: '#9a6a2a',
  up: { bg: '#f5ead5', fg: '#2a1c13', border: '1.5px solid #2a1c13', icon: 'arrow-up' },
  down: { bg: '#3a281c', fg: '#f5ead5', border: '1.5px solid #3a281c', icon: 'arrow-down' },
  /** Ryktet före och efter, som en rad i kortets topp: {from} → {to} och en tunn stapel med båda lägena. */
  summary: { bar: 'rgba(42,28,19,.12)', before: 'rgba(42,28,19,.35)', after: '#2a1c13' },
  /** Kortet kommer upp 600 ms efter morgonen, raderna en i taget med 180 ms emellan. Klick eller Enter går vidare till inköpen. */
  motion: { inMs: 600, perLineMs: 180, riseVh: 1.6 },
  /** Ryktet räknas inom klassen (ORDER 304 §2): kortet säger vilken klass recensionerna gäller. */
  classLine: 'review.classLine'
};

/** Exemplet i prototypen, en kväll med hälften rätt. Riktiga rader skrivs av sim-lagret ur kvällens händelser. */
export const EXAMPLE: ReviewLine[] = [
  { voice: 'gourmet', cause: 'fishWine.step1.wrong', delta: -4, quoteKey: 'review.q.fishWine', reasonKey: 'review.r.fishWine' },
  { voice: 'village', cause: 'birthday.step3.right', delta: 3, quoteKey: 'review.q.birthday', reasonKey: 'review.r.birthday' },
  { voice: 'tourist', cause: 'staff.spent', delta: -2, quoteKey: 'review.q.slow', reasonKey: 'review.r.slow' },
  { voice: 'student', cause: 'avec.stayed', delta: 1, quoteKey: 'review.q.avec', reasonKey: 'review.r.avec' }
];
