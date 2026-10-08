// ORDER 306b — Designs D8 (documentation/leveranser/nexus-leverans-2026-10-08-d8-vinbaren/d8Strings.ts):
// nycklarna som spelet visar. Ordningskortens ram (platserna, handgreppen, hjälpraden, låset), etiketterna
// för greppen, Kassan räcker inte och tiden ute. Sommelierns namn (Elin i prototypen) är {name}, den
// som arbetar i situationens roll (D8 (41)). Korten och förklaringarna står i situationens text (SITUATIONER_306b.md), så card.*, why.exp.*
// och why.ana.* är inte med; inte heller prototypens ram (ui.*, sc.*, st.*, hud.*, p3.*, room.*, icons.*).
// why.order visas inte för spelaren (Anders 2026-10-08, D8 (42)): den är föråldrad (b saknas = fel, Elin, 20 s),
// medan 306b ger halvt grepp när b saknas och steg 3 har INCIDENTS.stepSecondsByIndex.

export const D8_STRINGS = {
  'order.slots': { sv: 'Din ordning', en: 'Your order' },
  'order.cards': { sv: 'Handgreppen', en: 'The moves' },
  'order.hint': { sv: 'Klicka på ett kort för att lägga det på nästa plats. Klicka på en plats för att ta bort kortet.', en: 'Click a card to put it in the next place. Click a place to take the card away.' },
  'order.need': { sv: 'Lägg {n} kort till', en: 'Place {n} more' },
  'order.lock': { sv: 'Lås ordningen', en: 'Lock the order' },
  'grip.half.analysis': { sv: 'Halvt grepp: analysen höll', en: 'Half grip: the analysis held' },
  'grip.half.experience': { sv: 'Halvt grepp: upplevelsen höll', en: 'Half grip: the experience held' },
  'grip.full': { sv: 'Helt grepp', en: 'Full grip' },
  'why.wrong.serveFirst': { sv: 'Att servera innan vinet är karafferat ger gästerna satsen i glaset. Flaskan visas först, och serveringen kommer sist.', en: 'Serving before the wine is decanted puts the sediment in the glass. The bottle is shown first, and serving comes last.' },
  'timeout.verdict': { sv: 'Tiden ute: {name} tar över', en: 'Time up: {name} takes over' },
  'timeout.lock': { sv: 'Tiden ute', en: 'Time up' },
  'cost.short': { sv: 'Kassan räcker inte', en: 'Not enough in the till' }
};
