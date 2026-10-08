// ORDER 319b och 319c — Designs D9 (luckanStrings.ts) och tillägget (luckanStrings.tillagg.ts), inslagna
// oförändrade: markeringen, menyn, vädren och kvällens lägen, frågekortet, repliken från luckan och
// marschallerna. Prototypens exempelfrågor (q.*) är inte med (Anders 2026-10-08: "Frågorna tas ur
// foodtruckens bank, inte prototypens exempel"); kortets fråga och svar kommer ur banken. Raden om vad
// spelaren ser (curious.moment.*) är exempelfrågornas q.*.moment, oförändrade.

export const LUCKAN_STRINGS = {
  'weather.sun': { sv: 'Sol', en: 'Sun' },
  'weather.rain': { sv: 'Regn', en: 'Rain' },
  'weather.wind': { sv: 'Blåst', en: 'Wind' },
  'weather.cool': { sv: 'Sval kväll', en: 'Cool evening' },
  'evening.day': { sv: 'Dagsljus', en: 'Daylight' },
  'evening.golden': { sv: 'Sen eftermiddag', en: 'Late afternoon' },
  'evening.lighting': { sv: 'Marschallerna tänds', en: 'The torches are lit' },
  'evening.dusk': { sv: 'Skymning', en: 'Dusk' },
  'curious.legend': { sv: 'Nyfiken · går att prata med', en: 'Curious · you can talk to them' },
  'curious.tip': { sv: 'Nyfiken. Klicka för att prata.', en: 'Curious. Click to talk.' },
  'curious.talking': { sv: 'Ni pratar', en: 'Talking' },
  'menu.title': { sv: 'Svensk grill', en: 'Swedish grill' },
  'menu.grilled': { sv: 'Grillad korv {price}', en: 'Grilled sausage {price}' },
  'menu.halfSpecial': { sv: 'Halv special {price}', en: 'Half special {price}' },
  'menu.wrap': { sv: 'Tunnbrödsrulle {price}', en: 'Tunnbröd wrap {price}' },
  'menu.mash': { sv: 'Korv med mos {price}', en: 'Sausage and mash {price}' },
  'menu.drinks': { sv: 'Läsk och kaffe {price}', en: 'Fizzy drinks and coffee {price}' },
  'card.kicker': { sv: 'Nyfiken gäst', en: 'Curious guest' },
  'card.held': { sv: 'Det här hade hållit', en: 'This would have held' },
  'verdict.right': { sv: 'Rätt', en: 'Right' },
  'verdict.ok': { sv: 'Nästan', en: 'Almost' },
  'verdict.wrong': { sv: 'Inte den här gången', en: 'Not this time' },
  'line.sender': { sv: '{name}, medhjälpare', en: '{name}, assistant' },
  'line.1': { sv: 'Kom fram, den är alldeles nygrillad!', en: 'Come on over, it\'s fresh off the grill!' },
  'line.2': { sv: 'Välkommen! Det tar bara ett par minuter.', en: 'Welcome! It only takes a couple of minutes.' },
  'line.3': { sv: 'Kom hit och smaka, senapen är hemgjord.', en: 'Come and have a taste, the mustard\'s homemade.' },
  'line.4': { sv: 'Hej! Ställ dig här, så fixar vi det.', en: 'Hi! Step up here and we\'ll sort you out.' },
  'torch.lighting': { sv: 'medhjälparen tänder', en: 'the assistant is lighting them' },
  'torch.wait': { sv: 'lång kö, medhjälparen väntar', en: 'long queue, the assistant waits' },
  'curious.moment.sign': { sv: 'Läser skylten och tittar på klockan.', en: 'Reading the sign and checking the time.' },
  'curious.moment.smell': { sv: 'Luktar på röken och pekar mot grillen.', en: 'Sniffing the smoke and pointing at the grill.' },
  'curious.moment.cold': { sv: 'Står med armarna i kors vid skylten. Det är kallt.', en: 'Standing by the sign with arms crossed. It\'s cold.' }
} as const;
