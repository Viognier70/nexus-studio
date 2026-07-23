export const strings = {
  brand: {
    title: 'NEXUS',
    subtitle: 'Grythyttan — Strategisk vy'
  },
  labels: {
    grythyttan: 'Grythyttan',
    kvarteret: 'Kvarteret',
    vinbaren: 'Vinbaren'
  },
  buildings: {
    campus: { label: 'Grythyttans campus', sub: 'Utbildning och forskning' },
    church: { label: 'Grythyttans kyrka', sub: 'Landmärke' },
    hotel: { label: 'Måltidens hotell', sub: 'Hotell och konferens' },
    cafe: { label: 'Bergslagsbönor', sub: 'Café' },
    bakery: { label: 'Sockerlaven', sub: 'Bageri' },
    wineBar: { label: 'Vinbaren', sub: 'Din verksamhet' },
    plot: { label: 'Ledig lokal', sub: 'Tillgänglig etablering' }
  },
  view: {
    outward: 'Bakåt',
    outwardAria: 'Zooma ut ett steg'
  },
  policies: {
    heading: 'Verksamhet',
    subheading: 'Riktning och villkor',
    staffCount: 'Personal',
    training: 'Utbildning',
    service: 'Servicekoncept',
    pricing: 'Prissättning',
    capacity: 'Platser',
    ingredients: 'Inköp',
    welcomeDrink: 'Välkomstdryck',
    localSourcing: 'Lokala leverantörer',
    on: 'på',
    off: 'av',
    serviceValues: {
      vardaglig: 'Vardaglig',
      formell: 'Formell'
    },
    pricingValues: {
      låg: 'Låg',
      medel: 'Medel',
      hög: 'Hög'
    },
    ingredientValues: {
      grund: 'Grundsortiment',
      utvald: 'Utvalt',
      premium: 'Premium'
    }
  },
  sustainability: {
    heading: 'Villkor',
    econ: 'Ekonomiskt',
    social: 'Socialt',
    ecolog: 'Ekologiskt',
    direction: {
      stabil: 'Stabilt',
      förbättras: 'Förbättras',
      försämras: 'Försämras',
      kritisk: 'Kritiskt'
    },
    causeLabel: 'Orsak',
    consequenceLabel: 'Väntad följd'
  },
  operations: {
    heading: 'Rörelse',
    guestsSeated: 'Vid bord',
    guestsWaiting: 'I väntan',
    workload: 'Arbetsbelastning',
    served: 'Serverade i kväll'
  },
  timeControls: {
    pause: 'Paus',
    speed1: '1×',
    speed2: '2×',
    speed4: '4×',
    resetSeed: 'Börja om från fröet',
    devReplayScenario: 'Utlös scenariot igen',
    devLabel: 'Utvecklarläge'
  },
  scenario: {
    triggerTitle: 'Ett större sällskap står utanför.',
    triggerBody:
      'Sällskapet är åtta personer utan bordsbokning. Serveringen är nästan fullsatt och personalen har tempo. Hur svarar du?',
    choiceA: 'Ta emot sällskapet direkt.',
    choiceASummary:
      'Alla bereds plats så snart det går. Trycket på personalen kommer att öka.',
    choiceB: 'Be sällskapet vänta och bjud på välkomstdryck.',
    choiceBSummary:
      'Sällskapet väntar med välkomstdryck. Väntetiden mjuknar men resursanvändningen ökar.',
    choiceC: 'Avvisa sällskapet för att skydda kvällens service.',
    choiceCSummary:
      'Sällskapet vänds i entrén. Nuvarande gäster fortsätter, men ryktet kan påverkas.',
    unfoldingHint:
      'Scenariot utvecklar sig i restaurangen. Följ det där.'
  },
  info: {
    role: 'Roll',
    intent: 'Just nu',
    destination: 'På väg mot',
    close: 'Stäng',
    building: 'Byggnad'
  },
  modeSwitch: {
    toFirstPerson: 'Första-personsprototyp',
    back: 'Tillbaka till strategisk vy'
  },
  disclaimer:
    'Vertikal skiva 002. Alla platser, byggnader och personer är stiliserade platshållare. Ingen anspråk görs på arkitektonisk trohet eller rättigheter. Grythyttan används enbart som narrativ inspiration.',
  intents: {
    boende: 'är på hemväg',
    student: 'är på väg till campus',
    besökare: 'söker en trevlig kväll',
    gäst: 'väntar en bordsupplevelse',
    leverantör: 'levererar råvaror'
  },
  destinations: {
    vinbar: 'Vinbaren',
    café: 'Bergslagsbönor',
    bageri: 'Sockerlaven',
    hotell: 'Måltidens hotell',
    campus: 'Campus'
  },
  guestIntents: {
    arriving: 'anländer till entrén',
    waiting: 'väntar på bord',
    seated: 'har blivit placerad',
    ordering: 'ger sin beställning',
    dining: 'njuter av måltiden',
    paying: 'betalar notan',
    leaving: 'är på väg ut',
    declined: 'lämnar entrén'
  },
  staffTasks: {
    idle: 'ser över salen',
    greet: 'välkomnar en gäst',
    seat: 'placerar sällskapet',
    order: 'tar upp beställningen',
    serve: 'serverar bordet',
    decant: 'dekanterar vinet',
    flambe: 'flamberar vid bordet',
    clear: 'dukar av',
    welcomeDrink: 'häller upp välkomstdryck'
  }
} as const;
