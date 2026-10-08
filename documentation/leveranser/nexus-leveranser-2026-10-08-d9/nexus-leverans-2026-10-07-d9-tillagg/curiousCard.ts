// curiousCard.ts — frågekortet vid en nyfiken gäst. Tillägg till D9, 2026-10-07.
//
// Ersätter CURIOUS_TALK i curiousMarker.ts: klicket på bubblan öppnar ett kort med en fråga i stället för att
// vinka fram gästen direkt. Kortet har samma form som situationskortet (raketkortet), men mindre: rubrik, vad
// spelaren ser, frågan, fyra svar och tidsbågen. Färgerna och rörelserna är WARM_RIGHT_WRONG
// (nexusTheme.warm.rattfel.ts). Rött betyder bara fel svar. Speltalen är platshållare från balance.ts.

export type CardGrade = 'right' | 'ok' | 'wrong';

export const CURIOUS_CARD = {
  /** Mått vid 1440 × 900, skalas med höjden. Kortet står till höger, mitt på höjden, och täcker inte gästen. */
  layout: { anchor: 'right', rightPx: 23, widthPx: 486, padPx: [20, 22], radiusPx: 20, gapPx: 11, rowMinHeightPx: 50, rowRadiusPx: 12 },
  surface: { bg: 'linear-gradient(180deg, #2e2016 0%, #231811 100%)', border: '1px solid rgba(215,162,76,.38)', shadow: '0 30px 80px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,220,160,.1)' },
  kicker: { key: 'card.kicker', colour: '#d7a24c' },     // Nyfiken gäst
  moment: { key: 'q.{id}.moment', colour: '#e7d6b8' },  // vad spelaren ser, en rad
  question: { key: 'q.{id}.q', font: 'Young Serif' },
  row: { bg: '#f5ead5', border: '1px solid rgba(215,162,76,.5)', key: '#2a1c13', keyText: '#f5ead5', text: '#2a1c13' },
  /** Tidsbågen uppe till höger: en ring som krymper medsols från klockan 12, med sekunderna i mitten. */
  timeArc: { diameterPx: 54, innerPx: 43, fill: '#ffd58f', track: 'rgba(255,213,143,.22)', seconds: 'Young Serif #ffd58f', durationS: 'CURIOUS.cardS' },
  fade: { inS: 0.2, outS: 0.3 }
};

/** Efter svaret. Tider i sekunder från trycket. */
export const CURIOUS_CARD_ANSWER = {
  right: { bg: '#5cb86a', border: '1px solid #3f9a52', key: '#3f9a52', mark: 'check', motion: 'lift 5 px, 480 ms', pill: '#5cb86a', verdict: 'verdict.right' },
  ok: { bg: '#f5ead5', border: '2px solid #b98a3c', key: '#b98a3c', mark: '½', motion: 'stiger in 1,5 cqh, 260 ms', pill: '#e3cfa6', verdict: 'verdict.ok' },
  wrong: { bg: '#e0533f', border: '1px solid #b8392a', key: '#b8392a', mark: 'x', motion: 'skakar 7 px, tre gånger, 380 ms', pill: '#e0533f', verdict: 'verdict.wrong' },
  /** Det rätta svaret när spelaren valde nästan eller fel: streckad grön kant och *Det här hade hållit*. */
  held: { border: '3px dashed #5cb86a', tag: 'card.held', tagColour: '#2f7a3f' },
  others: { opacity: 0.38 },
  /** Förklaringen på papper med domen som bricka. Lika vänlig vid alla tre. */
  paperAtS: 0.65,
  sceneAtS: 0.35,   // gästen svarar med kroppen
  beckonAtS: 0.7,   // vid rätt: truck.beckon och repliken
  closeAtS: 4.0,
  /** Ingen svarar innan bågen är slut: kortet tonar ut på 0,4 s och gästen bestämmer själv (CURIOUS.joinChance). */
  timeout: 'decideAlone'
};

/** Utfallen i scenen. Klippen finns i tillaggClips.ts och curiousClips.ts. */
export const CURIOUS_OUTCOMES = {
  right: {
    guest: ['guest.turnToHatch (0,9 s)', 'guest.walk till köns sista lediga plats', 'guest.joinQueue'],
    staff: 'truck.beckon', line: 'line.1–line.4 i tur och ordning, 3,6 s, från luckan (HATCH_LINE)',
    marker: 'bubblan fylls med guld och står kvar tills gästen står i kön', fullQueue: 'gästen går vidare'
  },
  ok: {
    guest: ['guest.hesitate (2,8 s)', 'guest.checkWatch (1,6 s)', 'guest.hesitate (2,2 s)', 'sedan bestämmer gästen själv (CURIOUS.joinChance)'],
    marker: 'tonas ut, och kortet kan inte öppnas igen', okHold: 'CURIOUS.okHoldS'
  },
  wrong: { guest: ['guest.shakeHead (0,9 s)', 'guest.walkOn', 'guest.walk'], marker: 'tonas ut på 0,5 s' }
};

/** Vilken fråga som kommer, efter vad gästen gör när spelaren klickar. Frågorna är exempel. */
export const CURIOUS_QUESTIONS = {
  pick: [
    { when: 'kväll med vädret cool', id: 'cold' },
    { when: 'gästen spelar guest.smellPoint', id: 'smell' },
    { when: 'annars (saktar in, går till skylten, läser, tittar på klockan, tvekar)', id: 'sign' }
  ],
  /** Svarens bedömning i ordning a1–a4. Svaren är ungefär lika långa, och felsvaren är verkliga misstag. */
  grades: { sign: ['ok', 'right', 'wrong', 'wrong'], smell: ['wrong', 'ok', 'right', 'wrong'], cold: ['right', 'wrong', 'ok', 'wrong'] } as Record<string, CardGrade[]>,
  content: 'Exempel. Codes frågor efter granskning i samma form: q.{id}.moment, .q, .a1–.a4, .why1–.why4.'
};

/** Repliken från luckan när gästen vinkas fram. Pappersbubbla med mässingskant, spetsen ned mot luckan. */
export const HATCH_LINE = {
  anchor: 'TRUCK_LAYOUT local [0, 1,25] (luckans hylla), bubblan 72 % åt vänster om spetsen så att den inte hamnar under kortet',
  sender: 'line.sender: {name}, medhjälpare (som avsändarmärket "Sara, servitör" i D6)',
  variants: ['line.1', 'line.2', 'line.3', 'line.4'], order: 'i tur och ordning',
  showS: 3.6, fadeInS: 0.25, fadeOutS: 0.35,
  style: { bg: '#f5ead5', border: '2px solid #b98a3c', radiusPx: 14, sender: '#6b4a2e versaler', text: 'Young Serif #2a1c13' }
};
