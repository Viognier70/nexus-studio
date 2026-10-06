// ORDER 313 §9 (Anders 2026-10-06, provspelet: spelaren förstår varken
// helheten eller hur det går för konkurrenterna i stunden) — panelen "Byn
// just nu": varje krog med antal gäster nu, en pil uppåt eller nedåt och
// spelarens krog markerad, och en rad som sammanfattar läget.
//
// Gästerna är bandets (sim/villageLive.ts villageLive): rivalernas kvällsplan
// gånger andelen som har kommit, spelarens de som har suttit vid ett bord.
// Pilen jämför de senaste VILLAGE_NOW.trendWindowMin (balance.ts) spelminuterna
// med lika många dessförinnan: uppåt när krogen drar gäster minst lika
// fort som förut, nedåt när takten sjunker. Utan historik ingen pil.

import { VILLAGE_NOW } from './balance';
import { PLAYER_VENUE } from './village';
import type { VenueLive } from './villageLive';

const TREND_WINDOW_MIN = VILLAGE_NOW.trendWindowMin;

export interface NowRow {
  id: string;
  guests: number;
  trend: 'up' | 'down' | null;
  player: boolean;
}

/** `past(n)` ger raderna för n spelminuter sedan, eller null om de saknas. */
export function villageNow(rows: VenueLive[], past: (minutesAgo: number) => VenueLive[] | null): NowRow[] {
  const a = past(TREND_WINDOW_MIN);
  const b = past(TREND_WINDOW_MIN + TREND_WINDOW_MIN);
  const at = (list: VenueLive[] | null, id: string) => list?.find((r) => r.id === id)?.guests ?? null;
  return rows
    .map((r) => {
      const g10 = at(a, r.id);
      const g20 = at(b, r.id);
      const trend = g10 === null || g20 === null ? null : r.guests - g10 >= g10 - g20 && r.guests - g10 > 0 ? 'up' as const : 'down' as const;
      return { id: r.id, guests: r.guests, trend, player: r.id === PLAYER_VENUE };
    })
    // Flest först; vid lika antal står vi efter rivalerna (som villageRank).
    .sort((x, y) => y.guests - x.guests || Number(x.player) - Number(y.player));
}

/** Sammanfattningen: vem som drar flest, och var spelaren står (null utan gäster). */
export function villageNowSummary(rows: NowRow[]): { leader: string | null; playerRank: number | null; playerLeads: boolean } {
  const leader = rows.find((r) => r.guests > 0) ?? null;
  const i = rows.findIndex((r) => r.player);
  const playerRank = i >= 0 && rows[i].guests > 0 ? i + 1 : null;
  return { leader: leader?.id ?? null, playerRank, playerLeads: !!leader?.player };
}
