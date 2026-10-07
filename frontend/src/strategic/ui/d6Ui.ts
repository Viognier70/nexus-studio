// ORDER 317 — Designs D6 del 2 (nexus-leverans-2026-10-07-d6-del-2/d6Ui.ts), oförändrad nedanför denna rad.

// d6Ui.ts — D6 del 2, 2026-10-07 (ORDER 313 §2, §3, §6, §7 och §9, BESLUT 2026-10-07 del 4 punkt 7 och 8).
// Avsändarna, teckenförklaringen, kurskortet, Byn just nu och det låsta i början. Formen är den varma
// (nexusTheme.warm): valnöt rgba(44,30,21,.95) med mässingskant, papper #f5ead5, bläck #2a1c13, guld #f0cd82.
// Ingen text i bilden. Alla texter är nycklar i d6Strings.ts. Inga speltal: {loan}, {cost}, {have} med flera
// kommer från balance.ts eller sim-lagret.

export type SenderId = 'asa' | 'bank' | 'per' | 'village' | 'house' | 'staff';
export type Path = { d: string; fill?: string; stroke?: string; sw?: number; rule?: 'evenodd' };

// ---------- 1. Avsändarna ----------
// Alla meddelanden till spelaren har en avsändare: märket, namnet och raden under (vad avsändaren är).
// Åsa talar i pratbubblan med porträttet (asaFigure.ts, D6 del 1). De andra fyra har ett runt märke, 4,6 % av höjden,
// och kortet: huvudet på valnöt, texten på papper. Personalen talar i rummet över figuren: märket är rollringen runt
// initialen, raden är "namn, roll" (sender.staff), och bubblan har en pil ned mot figuren.
export const SENDERS: Record<SenderId, { nameKey: string; subKey?: string; form: 'bubble' | 'card' | 'inRoom'; plate?: string; rim?: string; glyph?: Path[] }> = {
  asa: { nameKey: 'sender.asa', subKey: 'sender.asa.sub', form: 'bubble' },
  bank: { nameKey: 'sender.bank', subKey: 'sender.bank.sub', form: 'card', plate: '#3a281c', rim: '#d9b476',
    glyph: [{ d: 'M12 3.6 A8.4 8.4 0 1 1 11.99 3.6 Z', stroke: '#f0cd82', sw: 1.6 }, { d: 'M12 7.4 A2.3 2.3 0 1 1 11.99 7.4 Z M10.9 11.2 H13.1 L13.8 16.4 H10.2 Z', fill: '#f0cd82' }] },
  per: { nameKey: 'sender.per', subKey: 'sender.per.sub', form: 'card', plate: '#2e2a2b', rim: '#f4e6cc',
    glyph: [{ d: 'M9.2 6.2 H13 C15.4 6.2 16.8 7.6 16.8 9.6 C16.8 11.6 15.4 13 13 13 H11.4 V17.8 H9.2 Z M11.4 8.1 V11.1 H12.9 C14 11.1 14.6 10.5 14.6 9.6 C14.6 8.7 14 8.1 12.9 8.1 Z', fill: '#f4e6cc', rule: 'evenodd' }] },
  village: { nameKey: 'sender.village', subKey: 'sender.village.sub', form: 'card', plate: '#3a281c', rim: '#f0cd82',
    glyph: [{ d: 'M4.6 11.6 L12 5.2 L19.4 11.6 M6.6 10 V18.6 H17.4 V10', stroke: '#f4e6cc', sw: 1.7 }, { d: 'M10.6 18.6 V14.6 H13.4 V18.6', stroke: '#f4e6cc', sw: 1.5 }] },
  house: { nameKey: 'sender.house', subKey: 'sender.house.sub', form: 'card', plate: '#f5ead5', rim: '#2a1c13',
    glyph: [{ d: 'M4 7 C7 6 10 6.5 12 8 C14 6.5 17 6 20 7 V17.6 C17 16.7 14 17.1 12 18.6 C10 17.1 7 16.7 4 17.6 Z M12 8 V18.6', stroke: '#2a1c13', sw: 1.6 }] },
  staff: { nameKey: 'sender.staff', form: 'inRoom' }
};
/** Personalens märke: initialen i Young Serif på bläck, med rollringen som kant (ROLE_RING). */
export function staffBadge(name: string, role: keyof typeof ROLE_RING) { return { letter: name.charAt(0), plate: '#2a1c13', rim: ROLE_RING[role], ink: '#f4e6cc' }; }
/** Vem som skickar vad (ORDER 313 §3). */
export const MESSAGE_SOURCES = {
  asa: 'mentorn: morgonen, upplåsningen, tips',
  bank: 'lån, satsningar och veckoavräkningen',
  per: 'hovmästaren under servicen: bord, väntan, förslag',
  village: 'recensionerna i morse och ryktet',
  house: 'prov, kurser och medaljer',
  staff: 'repliker i rummet under en händelse. Avsändaren är personens namn och roll.'
};

// ---------- 2. Teckenförklaringen ----------
// Rollringens färger. Kocken är #7fa8ff (BESLUT 2026-10-07 punkt 8): ringen under figuren gäller.
// Rätta staffStatus.ts ROLE_RING.cook ('#ffffff') och staffRing.ts så att de stämmer med den här tabellen.
export const ROLE_RING = { host: '#f4e6cc', waiter: '#4fc3c8', sommelier: '#b98ae0', bartender: '#f2994a', cook: '#7fa8ff', dishwasher: '#a9b3bb', dj: '#ee6fb5' } as const;
export const LEGEND = {
  /** Statusläget (S): nere till höger, ovanför lägesknapparna, 52 % av höjden bred. Följer hudLayout (rect 'legend'). */
  status: { anchor: 'bottomRight', marginCqh: 3, widthCqh: 52, showWith: 'statusMode', toggleKey: 'S' },
  /** Menyn: Spelets regler → fliken Symbolerna, med en rad om varje grupp (legend.*.why). */
  menu: { tab: 'rules.tab.symbols', rows: 'legend.role, legend.stamina, legend.wellbeing, legend.mood' },
  groups: [
    { key: 'legend.role', who: 'staff', items: Object.keys(ROLE_RING).map((r) => 'role.' + r), symbol: 'rollringen (staffRing.ts)' },
    { key: 'legend.stamina', who: 'staff', items: ['legend.fresh', 'legend.tired', 'legend.spent'], symbol: 'ORK_RING i staffStatus.ts' },
    { key: 'legend.wellbeing', who: 'staff', items: ['legend.thriving', 'legend.okay', 'legend.low'], symbol: 'WELLBEING_SYMBOL i staffStatus.ts' },
    { key: 'legend.mood', who: 'guests', items: ['mood.delighted', 'mood.content', 'mood.waiting', 'mood.impatient', 'mood.displeased'], symbol: 'MOOD_SYMBOL i guestMood.ts' }
  ]
};

// ---------- 3. Kurskortet ----------
// Fyra rader i den här ordningen (ORDER 313 §6): lär ut, ger, gäller och kräver. Raden kräver har två delar:
// medaljen med ✓ eller ✗ och kostnaden med det spelaren har. ✓ är bläck med guld, ✗ är streckad valnöt.
// Inget grönt och inget rött: det är inte ett svar.
export const COURSE_CARD = {
  rows: ['course.row.teaches', 'course.row.gives', 'course.row.when', 'course.row.needs'],
  button: {
    ok: 'course.buy',
    medalMissing: 'course.needsMedal',  // {medal} = course.req.<medalj>.inline (gemen början, egennamnet behålls)
    creditsShort: 'course.short'       // {missing} = cost − have
  },
  disabled: { bg: 'transparent', border: '1.5px dashed #6b4a2e', ink: '#6b4a2e' },
  /** Om båda saknas visas medaljen på knappen: den går inte att köpa sig förbi. */
  precedence: ['medalMissing', 'creditsShort']
};

// ---------- 4. Byn just nu ----------
// Ersätter bandet "Byn i kväll" under servicen (ORDER 313 §9). Uppe till höger, 56 % av höjden bred.
// Varje krog och vagn med gäster nu och en pil för den senaste kvarten: uppåt, nedåt eller vågrät. Spelarens krog
// står på papper. Vagnarna har en mindre lykta (som i ställningen). Raden överst: now.lead.other eller now.lead.you.
// I fokusläget (under 14 m eller H, hudLayout) fälls panelen till listen now.strip.
export const VILLAGE_NOW = {
  anchor: 'topRight', widthCqh: 56, trendWindowMin: 15, sort: 'guestsNow desc',
  trend: { up: 'M6 14.5 L12 8.5 L18 14.5', down: 'M6 9.5 L12 15.5 L18 9.5', flat: 'M5.5 12 H18.5' },
  lantern: { venueCqh: 3.2, truckCqh: 2.2 },
  ordinals: { sv: ['etta', 'tvåa', 'trea', 'fyra', 'femma', 'sexa', 'sjua'], en: ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'] },
  folded: 'now.strip'
};

// ---------- 5. Det låsta i början ----------
// Första morgonen (ORDER 313 §2): öva och prov är öppna. Satsa, Butiken och Stå för ditt svar är låsta: streckad kant,
// ett lås i stället för ikonen och raden start.locked. Texten håller kontrasten (#cdb898 och #e9dcc4 på valnöt).
// Efter första provet öppnas de, får brickan start.new den morgonen, och Åsa säger asa.line.unlock.
export const START_LOCKS = {
  open: ['practise', 'test'],
  locked: ['invest', 'shop', 'stand'],
  unlockWhen: 'firstTestPassed',
  lockedLineKey: 'start.locked',
  newTagKey: 'start.new',
  asaLine: { before: 'asa.line.welcome', after: 'asa.line.unlock' }
};
