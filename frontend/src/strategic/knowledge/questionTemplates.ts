// ORDER 107 §4.3 — mall med ett komplett exempel per format.
//
// Syftet är att ge Vision Owner en form att skriva innehåll mot: varje
// exempel visar alla fält som frågan måste ha, med värden som är tänkta
// att vara körbara i harnessen (validateQuestion + scoreQuestion) och
// läsbara som mall. Innehållet i exemplen är plausibelt men INTE tänkt
// som produktionsfrågor — Vision Owner §5 skriver dem.
//
// Exemplen används också av tester som säkerhet för att varje format
// är fullt validerbart och scorable end-to-end. Ändras strukturen på
// någon fråga så bör exemplet uppdateras först — det avslöjar
// symmetri-brott innan produktionsfrågor migreras.

import type {
  FlervalQuestion,
  GestaltningQuestion,
  ParningQuestion,
  SituationQuestion
} from './questionFormats';

// §3.1 exempel — flerval. Techne-riktad (kok), matchar Metodkökets
// avsedda profil. Ett rätt svar av fyra.
export const FLERVAL_EXAMPLE: FlervalQuestion = {
  id: 'template-flerval',
  format: 'flerval',
  axis: 'techne',
  spar: 'kok',
  pavilion: 'metodkoket',
  prompt: 'Vid sous vide-tillagning av kalvkött till medium rare — vilken kärntemperatur ska du sikta på?',
  options: [
    '52 °C',
    '56 °C',
    '62 °C',
    '68 °C'
  ],
  correctIndex: 1
};

// §3.2 exempel — situationsbedömning. Phronesis-riktad (Kalastorget),
// spårlöst. Rangordning av fyra handlingar; scenariot avsett att pröva
// prioritering under press.
export const SITUATION_EXAMPLE: SituationQuestion = {
  id: 'template-situation',
  format: 'situation',
  axis: 'phronesis',
  spar: null,
  pavilion: 'kalastorget',
  scenario:
    'Sex personer sitter tio minuter efter bokad tid. En av dem markerar tydligt att hen är nöjd med väntan, ' +
    'en annan är märkbart otålig. Övriga fyra sitter tysta. Restaurangens värdinna är upptagen med två andra ' +
    'bord. Vilken handling gör du först?',
  actions: [
    'Går fram, ber om ursäkt och nämner en konkret tid när ni får sitta.',
    'Väntar tills värdinnan blir ledig — det är hennes bord.',
    'Går fram till den otålige ensam och lugnar med ett vinerbjudande.',
    'Serverar bordet vatten och bröd innan värdinnan kommer.'
  ],
  intendedRanking: [0, 3, 2, 1]   // 0=bäst, 1=sämst
};

// §3.3 exempel — parning. Phronesis, spårlöst, tre par situationer
// och bemötanden. Mäter mönsterigenkänning: rätt bemötande till rätt
// gäst-signal.
export const PARNING_EXAMPLE: ParningQuestion = {
  id: 'template-parning',
  format: 'parning',
  axis: 'phronesis',
  spar: null,
  pavilion: 'kalastorget',
  situations: [
    'En gäst tittar länge på vinlistan och undviker ögonkontakt.',
    'En gäst frågar snabbt vad du rekommenderar utan att titta i menyn.',
    'En gäst skickar tillbaka en rätt utan att förklara varför.'
  ],
  responses: [
    'Beskriv två viner i olika prisklasser utan att kommentera valet.',
    'Fråga vad hen brukar tycka om, och föreslå därifrån.',
    'Fråga rakt ut vad som inte stämde, utan att försvara köket.'
  ],
  correctPairs: [0, 1, 2]
};

// §3.4 exempel — gestaltning (omarbetad). Sommellerie-riktad
// (Stensöta). Spelaren väljer bland tre färdiga gestaltningar; det som
// prövas är hållning, inte fakta.
export const GESTALTNING_EXAMPLE: GestaltningQuestion = {
  id: 'template-gestaltning',
  format: 'gestaltning',
  axis: 'techne',
  spar: 'sommellerie',
  pavilion: 'stensota',
  scenario:
    'En stamgäst är osäker mellan två viner till kvällens rätt. Båda skulle passa, men på olika sätt. ' +
    'Vilken av dessa gestaltningar väljer du?',
  gestaltningar: [
    'Rekommenderar det dyrare vinet — det speglar dig som säker sommelier och gäster brukar följa auktoritet.',
    'Serverar ett glas av vardera att smaka; låter gästen välja när smakerna finns i minnet.',
    'Frågar först vad gästen egentligen är sugen på och matchar därifrån.'
  ],
  intendedIndex: 2
};

// Sammansatt export för test och coverage-verifikation.
export const ALL_TEMPLATE_EXAMPLES = [
  FLERVAL_EXAMPLE,
  SITUATION_EXAMPLE,
  PARNING_EXAMPLE,
  GESTALTNING_EXAMPLE
] as const;
