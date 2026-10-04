// ORDER 303 F (Anders 2026-10-04): "Statusläge (tangenten S eller en knapp):
// visar stämningssymbolen över alla bord samtidigt och orken som en ring vid
// fötterna på all personal." Ett läge för hela HUD:en, utan speltillstånd.

let on = false;
const subs = new Set<() => void>();
export const statusModeOn = () => on;
export function setStatusMode(v: boolean): void {
  if (v === on) return;
  on = v;
  subs.forEach((f) => f());
}
export const toggleStatusMode = () => setStatusMode(!on);
export function subscribeStatusMode(f: () => void): () => void {
  subs.add(f);
  return () => { subs.delete(f); };
}
