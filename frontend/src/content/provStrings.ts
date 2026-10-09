// ORDER 321 — provspelsläget (?prov): startskärmen och markeringen i hörnet. Vädrens namn är luckanStrings
// weather.*; platsernas namn står här.

export const PROV_STRINGS = {
  'prov.badge': { sv: 'Provspel', en: 'Test play' },
  'prov.kicker': { sv: 'Provspel', en: 'Test play' },
  'prov.heading': { sv: 'Börja direkt', en: 'Start straight away' },
  'prov.body': {
    sv: 'Medaljerna och kraven för steget räknas som uppfyllda. Provspelet sparas inte, och det syns inte i portfolion eller topplistan.',
    en: 'The medals and requirements for the step count as met. The test play is not saved, and it does not appear in the portfolio or the leaderboard.'
  },
  'prov.place': { sv: 'Var', en: 'Where' },
  'prov.place.foodtruck': { sv: 'Foodtrucken', en: 'The food truck' },
  'prov.place.vinbar': { sv: 'Vinbaren', en: 'The wine bar' },
  'prov.place.bistro': { sv: 'Bistron', en: 'The bistro' },
  'prov.week': { sv: 'Vecka i säsongen', en: 'Week of the season' },
  'prov.weekN': { sv: 'Vecka {n}', en: 'Week {n}' },
  'prov.cash': { sv: 'Kassa (kr)', en: 'Cash (SEK)' },
  'prov.weather': { sv: 'Väder', en: 'Weather' },
  'prov.weather.auto': { sv: 'Auto (prognosen)', en: 'Auto (the forecast)' },
  'prov.weatherNote': { sv: 'Gäller varje kväll i provspelet.', en: 'Applies every evening of the test play.' },
  'prov.incident': { sv: 'Situation i kväll (valfritt)', en: 'Situation tonight (optional)' },
  'prov.incident.none': { sv: 'Ingen, som vanligt', en: 'None, as usual' },
  'prov.incidentNote': {
    sv: 'Den köas när dörrarna öppnar och kommer så snart den kan, till exempel regnet när det börjar regna.',
    en: 'It is queued when the doors open and comes as soon as it can, for example the rain when it starts to rain.'
  },
  'prov.start': { sv: 'Börja', en: 'Start' },
  'prov.businessName': { sv: 'Provspelet', en: 'The test play' }
} as const;
