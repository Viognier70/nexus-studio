// ORDER 313 §9 (Anders 2026-10-06, provspelet: spelaren förstår varken
// helheten eller hur det går för konkurrenterna i stunden) — panelen "Byn
// just nu": varje krog med antal gäster nu, en pil och spelarens krog
// markerad, och en rad som sammanfattar läget.
//
// ORDER 318 (Anders 2026-10-07, provspelet kl. 22.13: "6:e i byn", "Du drar
// flest gäster i kväll" och "Lugn kväll" samtidigt) — ett enda mått för
// placeringen: kvällens nöjda gäster (villageLive `content`, samma som byns
// kväll och bandet räknar, ORDER 303 B). Panelen visar två kolumner, Gäster
// och Nöjda, för alla krogar, så att det syns varför spelaren kan vara sjätte
// trots flest gäster, och sammanfattningen följer placeringen.
//
// Gästerna är bandets (sim/villageLive.ts villageLive): rivalernas kvällsplan
// gånger andelen som har kommit, spelarens de som har suttit vid ett bord
// (eller handlat vid luckan). Pilen jämför placeringen nu med placeringen för
// VILLAGE_NOW.trendWindowMin (balance.ts) spelminuter sedan: uppåt när
// krogen har klättrat, nedåt när den har fallit, vågrät annars. Utan
// historik ingen pil.

import { VILLAGE_NOW } from './balance';
import { PLAYER_VENUE } from './village';
import type { VenueLive } from './villageLive';

const TREND_WINDOW_MIN = VILLAGE_NOW.trendWindowMin;

export interface NowRow {
  id: string;
  guests: number;
  content: number;
  /** Placeringen efter nöjda gäster (1 = först). */
  place: number;
  trend: 'up' | 'down' | 'flat' | null;
  player: boolean;
}

const contentOf = (r: VenueLive) => r.content ?? r.guests;

/** Ordningen: flest nöjda gäster först, sedan flest gäster; vid lika står spelaren efter rivalerna. */
function ranked(rows: VenueLive[]): VenueLive[] {
  return rows.slice().sort((x, y) => contentOf(y) - contentOf(x) || y.guests - x.guests || Number(x.id === PLAYER_VENUE) - Number(y.id === PLAYER_VENUE));
}

/** `past(n)` ger raderna för n spelminuter sedan, eller null om de saknas. */
export function villageNow(rows: VenueLive[], past: (minutesAgo: number) => VenueLive[] | null): NowRow[] {
  const before = past(TREND_WINDOW_MIN);
  const placeBefore = before ? new Map(ranked(before).map((r, i) => [r.id, i + 1])) : null;
  return ranked(rows).map((r, i) => {
    const was = placeBefore?.get(r.id) ?? null;
    const place = i + 1;
    const trend = was === null ? null : place < was ? 'up' as const : place > was ? 'down' as const : 'flat' as const;
    return { id: r.id, guests: r.guests, content: contentOf(r), place, trend, player: r.id === PLAYER_VENUE };
  });
}

export type NowSummary =
  | { kind: 'none' }
  | { kind: 'noContent'; mostGuests: boolean }
  | { kind: 'lead'; second: string | null }
  | { kind: 'mostGuests'; leader: string }
  | { kind: 'behind'; leader: string; place: number };

/** Sammanfattningen följer placeringen (nöjda gäster). */
export function villageNowSummary(rows: NowRow[]): NowSummary {
  const player = rows.find((r) => r.player);
  if (!player || (player.content <= 0 && player.guests <= 0)) return { kind: 'none' };
  // Ingen krog har nöjda gäster än: ingen placering att sammanfatta.
  if (rows.every((r) => r.content <= 0)) return { kind: 'noContent', mostGuests: rows.every((r) => r.player || r.guests < player.guests) };
  const leader = rows[0];
  if (leader.player) return { kind: 'lead', second: rows[1] && rows[1].content > 0 ? rows[1].id : null };
  const mostGuests = rows.every((r) => r.player || r.guests < player.guests);
  if (mostGuests) return { kind: 'mostGuests', leader: leader.id };
  return { kind: 'behind', leader: leader.id, place: player.place };
}

/** Spelarens placering efter nöjda gäster, eller null utan nöjda gäster (ORDER 298: ingen plats med 0). */
export function playerPlace(rows: NowRow[]): number | null {
  const me = rows.find((r) => r.player);
  return me && me.content > 0 ? me.place : null;
}

/** Har spelarens krog flest gäster i byn just nu (då är kvällen inte lugn)? */
export function playerHasMostGuests(rows: VenueLive[]): boolean {
  const ours = rows.find((r) => r.id === PLAYER_VENUE);
  if (!ours || ours.guests <= 0) return false;
  return rows.every((r) => r.id === PLAYER_VENUE || r.guests < ours.guests);
}
