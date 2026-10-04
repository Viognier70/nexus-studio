// VILLAGE_QUEUE — kön vid spelarens dörr i byn (byn i kvällsljus, 2026-10-02).
// Läggs i frontend/src/sim/balance.ts bredvid QUEUE. PLATSHÅLLARE: alla tal är null tills Code sätter dem.
//
// Platserna är inte tal: kön står på rummets köplatser (wineBarRoom.ts room.queueSpots, i ordning efter
// `order`: dörrmattan queueIn1–2, sedan trottoaren queueOut1–5), och kön är aldrig längre än platserna.
// Ett sällskap som kommer när alla platser är tagna väljer en annan krog i byn (sim/village.ts choose).
//
// Prototypen (byKvallSim.js) fyller i null med PROTO_QUEUE för att kunna spelas. De värdena följer inte med.
export const VILLAGE_QUEUE = {
  section: 'Servicen > Kön',
  openQuestion: 'F29',
  // När ett sällskap ställer sig i kö: när de som redan är inne plus sällskapet är fler än så här.
  // Förslag: rummets kapacitet (businessRoom.capacity, vinbaren 20), men det är Codes beslut.
  seats: null as number | null,
  // Hur länge ett sällskap står i kö innan det går hem, i spelsekunder. Den första i kön går aldrig.
  // Förslag: QUEUE.patienceSimSeconds med kunskapens tillägg (knowledgeInService.ts queuePatienceSeconds),
  // så att byn och servicen har samma tålamod.
  patienceSimSeconds: null as number | null,
  // Andelen tålamod kvar under vilken sällskapet spelar guest.queueImpatient i stället för guest.queueCalm
  // (vardagens koreografi §6). 0–1.
  impatientBelow: null as number | null
} as const;
