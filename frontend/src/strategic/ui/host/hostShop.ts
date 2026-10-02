// hostShop.ts — hovmästarens beslut, rivalbandet, jämförelsen efter kvällen och butiken.
// Godkänd riktning 2026-10-02: 1l (nålar + handgrepp), 1e (lyktor på en lina), 1i med facket ur 1h.
// Färger och ytor kommer ur nexusTheme.warm.ts (WARM). Rollernas färger ur staffRing.ts (ROLE_COLOUR).
// Inga speltal här: tider, priser, krav och antal platser sätter Code i balance.ts (nycklarna i *_KEY).

/* ---------------- Nålarna ---------------- */

/** Ett beslut som rummet säger till om. Nålen står där beslutet finns. */
export interface HostPin {
  id: string;                       // 'door' | 'wine' | 'bar' | …
  anchor: 'door' | 'table' | 'bar' | 'lounge' | 'pass';
  anchorId?: string;                // bordets eller platsens id i wineBarRoom.ts
  icon: string;                     // lucide 0.460.0
  whereKey: string;                 // 'pin.where.*'
  questionKey: string;              // 'pin.<id>.q'
  answers: [HostPinAnswer, HostPinAnswer];
  /** Svaret Per väljer när tiden går ut. Det är alltid det SÄKRA svaret, aldrig det bästa (Vision Owner 2026-10-02),
   *  så att det lönar sig att välja själv. Streckat på kortet och märkt pin.perTag. */
  perDefault: 1 | 2;
}
export interface HostPinAnswer { textKey: string; doneKey: string; effect: string; }

export const PIN = {
  /** Sekunder innan Per väljer själv. Code sätter. */
  timeout_KEY: 'balance.host.pinSeconds',
  /** Mått från 24 m. Huvudet är en rund pappersknapp med ikonen; ringen runt den är tiden som återstår (conic, ljuslåga). */
  headVh: 5.4, headMinPx: 40, stemVh: 4.2, ringPx: 3.5,
  /** Ringen brinner ned medurs från klockan 12. */
  ring: { remaining: '#ffd58f', spent: 'rgba(255,213,143,.22)' },
  /** Kortet öppnas åt sidan, över en vägg eller gatan, aldrig över ett bord. Varje ankare har ett fast håll. */
  cardSide: { door: 'outsideWall', table: 'backWall', bar: 'outsideWall', lounge: 'outsideWall', pass: 'backWall' },
  cardWidthVh: 32, cardMinPx: 270,
  /** En prickad tråd i ljuslåga går från nålens huvud till kortet, som i raketkortet. */
  thread: { colour: '#ffd58f', dash: [2, 7] },
  /** Bara en nål är öppen åt gången. Tangenterna 1 och 2 svarar, Esc stänger. */
  maxOpen: 1,
  /** Under en raket väntar nålarna och tiden står still. */
  pauseDuringRocket: true,
  /** Nålen har ingen fråga i serif och inga lyktor, så att den inte förväxlas med raketen. */
  questionFont: 'body',
  /** Beslut 2026-10-02: när tiden går ut väljer Per perDefault, och servicen stannar aldrig. */
  onTimeout: 'perDefault' as const,
  /** Skillnaden syns på kortet: Pers svar har streckad kant och ljusare papper, märket pin.perTag, och raden pin.safeNote under svaren.
   *  Utfallet av Pers svar ska i balance.ts ligga under det bästa svaret, men aldrig ge förlust. */
  perAnswer: { border: '1.5px dashed rgba(42,28,19,.45)', fill: '#efe2c8', tag: 'pin.perTag', note: 'pin.safeNote' }
} as const;

/* ---------------- Handgreppen ---------------- */

/** Allt som nålarna frågar om går också att göra direkt. */
export const HANDS = {
  seat: {
    /** Klick på sällskap i kön → borden där sällskapet får plats lyser i ljuslåga. Klick på bord → Per visar dem dit. */
    fits: 'seatsFree >= party.size',
    glow: { border: '2px solid #ffd58f', fill: 'rgba(255,213,143,.16)', shadow: '0 0 22px rgba(255,190,90,.75)' },
    selected: { border: '3px solid #e8b93a', shadow: 'glowCurrent' }
  },
  /** Verben fäller ut ovanför sällskapet. Innehållet beror på läget (läser menyn, äter, efterrätt). */
  verbs: {
    comp: { icon: 'gift', options: ['host.comp.glass', 'host.comp.coffee'], cost_KEY: 'balance.host.compCost' },
    upsell: { icon: 'wine', options: ['host.upsell.dessert', 'host.upsell.wine'] }
  },
  /** Dra ringen: spöket (streckad ring i rollens färg) visar vart, etiketten säger vilken del av rummet. */
  move: { zones: ['floor', 'bar', 'lounge'], ghost: { dash: true, fillOpacity: 0.12 } }
} as const;

/* ---------------- Rivalbandet ---------------- */

export const RIVAL_BAND = {
  /** Under klockan och kvällskassan, lika brett som de två tillsammans. */
  placement: 'belowClockAndTill',
  /** Ställningen mäter kvällens gäster (Vision Owner 2026-10-02). */
  measure: 'guestsTonight' as const,
  /** x = gäster / flest gäster i byn i kväll. Ledaren står längst till höger. */
  position: 'guests / max(guests)',
  lantern: {
    ours:   { vh: 2.4, minPx: 16, fill: '#e8b93a', border: '2px solid #f0cd82', glow: '0 0 14px rgba(232,185,58,.8)', label: 'always' },
    venue:  { vh: 1.75, minPx: 12, fill: '#e7d6b8', glow: '0 0 8px rgba(255,213,143,.45)', label: 'hover' },
    /** Food trucks räknas som rivaler, med mindre lyktor. */
    truck:  { vh: 1.25, minPx: 9, fill: '#e7d6b8', glow: '0 0 8px rgba(255,213,143,.45)', label: 'hover' }
  },
  /** Vår lykta ligger överst och har alltid sitt namn ({company}). Löser namnkrocken från byn. */
  zOrder: ['truck', 'venue', 'ours'],
  /** Lyktorna glider när ställningen ändras. Vid en omkörning: guldpillen rival.overtake under vår lykta i 2,8 s, och ljudet kassan i svagare form. */
  glideMs: 1400,
  overtakeChipMs: 2800
} as const;

/* ---------------- Jämförelsen efter kvällen ---------------- */

/** Skärmen ligger efter Kvällens resultat och före butiken. Raderna i samma ordning som bandet (gäster). */
export const VILLAGE_COMPARE = {
  columns: ['guests', 'revenuePerGuest', 'revenuePerSeat'] as const,
  /** Vagnarna har inga stolar: cmp.noSeats i stället för ett tal. */
  trucksPerSeat: 'none' as const
} as const;

/* ---------------- Butiken ---------------- */

export type Pavilion = 'stensota' | 'method' | 'library' | 'party' | 'theatre';
export type Medal = 'bronze' | 'silver' | 'gold' | 'platinum';
export interface Ability {
  id: string;
  pavilion: Pavilion;
  icon: string;                     // lucide 0.460.0
  /** Medaljen öppnar men förbrukas inte. Nivån är ett förslag, Code sätter. */
  requires_KEY: string;             // 'balance.shop.<id>.requires'
  proposedRequires: Medal;
  /** Krediterna betalar. */
  price_KEY: string;                // 'balance.shop.<id>.price'
  /** Personalens kurser ingår i grenarna. Ringen runt stenen har rollens färg ur ROLE_COLOUR. */
  course?: 'sommelier' | 'chef' | 'floor';
}
const ab = (id: string, pavilion: Pavilion, icon: string, proposedRequires: Medal, course?: Ability['course']): Ability =>
  ({ id, pavilion, icon, proposedRequires, course, requires_KEY: `balance.shop.${id}.requires`, price_KEY: `balance.shop.${id}.price` });

/** Ett startförslag per paviljong (Vision Owner 2026-10-02). Ordningen är stenarnas ordning från grinden. */
export const ABILITIES: Ability[] = [
  ab('sommBottle', 'stensota', 'wine', 'bronze', 'sommelier'),
  ab('wineFridge', 'stensota', 'refrigerator', 'silver'),
  ab('wineTasting', 'stensota', 'grape', 'gold', 'floor'),
  ab('fastPass', 'method', 'timer', 'bronze', 'chef'),
  ab('leftovers', 'method', 'recycle', 'silver'),
  ab('mise', 'method', 'chef-hat', 'gold', 'chef'),
  ab('menuStory', 'library', 'book-open-text', 'bronze'),
  ab('allergen', 'library', 'wheat-off', 'silver'),
  ab('critic', 'library', 'newspaper', 'gold'),
  ab('regulars', 'party', 'book-user', 'bronze'),
  ab('birthday', 'party', 'cake', 'silver'),
  ab('lova', 'party', 'heart-handshake', 'gold'),
  ab('chefsTable', 'theatre', 'utensils-crossed', 'bronze'),
  ab('signature', 'theatre', 'sparkles', 'gold')
];

export const SHOP = {
  /** Vägen går från I dag till stjärnan. Grenarna växlar upp och ned; Teatern är sista grenen och leder upp till stjärnan. */
  road: [
    { pavilion: 'stensota', x: 0.13, dir: 'up' },
    { pavilion: 'method', x: 0.31, dir: 'down' },
    { pavilion: 'library', x: 0.49, dir: 'up' },
    { pavilion: 'party', x: 0.67, dir: 'down' },
    { pavilion: 'theatre', x: 0.82, dir: 'up', endsInStar: true }
  ],
  /** Vägen är guld fram till den sista grinden som är öppen. */
  spineGoldTo: 'lastOpenGate',
  /** Stenens lägen. */
  stone: {
    owned:  { fill: '#e8b93a', border: '2px solid #f0cd82' },
    open:   { fill: '#f5ead5', border: '2px solid #ffd58f' },            // medaljen räcker, krediterna räcker
    short:  { fill: '#e9d9bc', border: '2px solid rgba(215,162,76,.5)', iconOpacity: 0.7 },  // medaljen räcker, inte krediterna
    locked: { fill: 'transparent', border: '2px dashed rgba(244,230,204,.55)', iconOpacity: 0.6 },
    selected: { shadow: 'glowCurrent' },
    inSlot: { badge: 'check', badgeFill: '#f0cd82' }
  },
  /** Köpta förmågor behålls. Bara det som ligger i facket gäller nästa kväll. Ett köp läggs i facket om det finns plats.
   *  Facket har få platser: två i början, fler när spelaren når stjärnan (Vision Owner 2026-10-02). Talen sätter Code. */
  slots_KEY: 'balance.shop.slots',             // förslag: 2
  slotsAtStar_KEY: 'balance.shop.slotsAtStar', // förslag: 3
  /** Platsen som öppnas vid stjärnan visas redan nu, streckad med en stjärna (shop.slot.star). Räknaren shop.slot.count står i fackets rubrik. */
  showStarSlot: true,
  keepOwned: true,
  autoSlotOnBuy: true
} as const;

/* ---------------- Behövs från sim-lagret ---------------- */
export interface HostShopSim {
  pins: { id: string; startedAt: number }[];          // nålar som är mogna, med starttid för tiden
  queue: { partyId: string; size: number; guestTypes: string[] }[];
  freeSeatsByTable: Record<string, number>;
  partyState: Record<string, 'menu' | 'eating' | 'dessert' | 'bill'>;
  guestsTonight: Record<string, number>;               // per krog och vagn, live
  afterEvening: Record<string, { guests: number; revenue: number; seats: number | null }>;
  medals: Record<Pavilion, Medal | null>;
  credits: number;
  owned: string[];
  slot: string[];
}
