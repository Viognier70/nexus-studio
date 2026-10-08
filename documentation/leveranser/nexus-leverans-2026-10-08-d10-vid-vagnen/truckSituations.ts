// truckSituations.ts — order 320: det som syns vid vagnen i de sex situationerna. Kameran: avstånd i meter.
// Varje situation spelas i steg. Frågorna och utfallen kommer från Codes situationskort (inte en del av D10).
export const TRUCK_SITUATIONS = {
  rain:    { weather: 'rain', steps: { lid: { cam: 8, clips: ['truck.serveLidded'] }, table: { cam: 10, clips: ['staff.liftTable', 'staff.carryTable', 'staff.setTable'], hatchEmpty: true }, tight: { cam: 10, clips: ['guest.huddle'], queue: 'QUEUE_TIGHT', table: 'RAIN_TABLE' } } },
  wasp:    { weather: 'sun', steps: { wasps: { cam: 6, targets: ['SHELF_D10.ketchup', 'openCan'] }, freeze: { cam: 6, clips: ['guest.freeze', 'guest.backAway'] }, lids: { cam: 6, clips: ['staff.capSauces'], hatchEmpty: true, waspsLeave: 1.8 } } },
  card:    { weather: 'sun', steps: { error: { cam: 6, clips: ['guest.tapCard', 'guest.tryAgain', 'staff.checkTerminal'], hud: 'pin.terminal', queueStops: true }, swish: { cam: 6, clips: ['staff.pointSwish', 'guest.takePhone', 'guest.scanSwish'], hud: 'pin.swish' } } },
  sausage: { weather: 'sun', steps: { box: { cam: 5, clips: ['staff.takeFromBox'], boxLeft: '{SAUSAGE.lowAt}' }, veg: { cam: 5, clips: ['staff.switchTongs', 'staff.turnVeg'] } } },
  dog:     { weather: 'sun', steps: { leash: { cam: 7, table: 'A', clips: ['dog.sit', 'dog.sniff', 'guest.stepAside'] }, bowl: { cam: 7, table: 'B', clips: ['dog.drink', 'dog.lie'] } } },
  rival:   { weather: 'sun', steps: { wide: { cam: 20, hud: 'pin.rival' }, close: { cam: 13, clips: ['fika.sipCup', 'guest.toastCup'], regular: 'TRUCK_REGULAR' } } }
} as const;
// HUD-nålarna: text i HUD:en, aldrig i bilden. Nålen sitter 2,4 % av höjden över föremålet.
export const SITUATION_PINS = { 'pin.terminal': 'TERMINAL.p', 'pin.swish': 'SWISH_SIGN.p', 'pin.rival': 'RIVAL_SIGN.p' } as const;
