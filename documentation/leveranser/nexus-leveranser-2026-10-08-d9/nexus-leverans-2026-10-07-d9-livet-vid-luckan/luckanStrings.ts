// luckanStrings.ts — D9: livet vid luckan. Slås in i STRINGS. { sv, en }, brittisk engelska. 17 nycklar.
// Inga speltal: {price} kommer från balance.ts. Menyn visas i HUD:en när man pekar på skylten, aldrig i modellen.
// Prototypens egna nycklar (ui.*, sc.*, ctl.*, clip.*, prop.*, lk.why.*) står bara i prototypen.

export const LUCKAN_STRINGS: Record<string, { sv: string; en: string }> = {
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
  'menu.drinks': { sv: 'Läsk och kaffe {price}', en: 'Fizzy drinks and coffee {price}' }
};
