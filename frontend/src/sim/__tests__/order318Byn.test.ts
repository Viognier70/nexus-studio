// ORDER 318 (Anders 2026-10-07, provspelet kl. 22.13) — byn i ett enda mått:
// placeringen efter nöjda gäster, sammanfattningen som följer den, och "Lugn
// kväll" som inte står när krogen har flest gäster i byn.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { playerHasMostGuests, villageNow, villageNowSummary } from '../villageNow';
import { TABLE, pickLang } from '../../content/nexusStrings';
import type { VenueLive } from '../villageLive';

const read = (p: string) => readFileSync(resolve(__dirname, '../..', p), 'utf8');

// Provspelets kväll: flest gäster men få nöjda.
const evening: VenueLive[] = [
  { id: 'player', kind: 'player', guests: 22, content: 4 },
  { id: 'torgkrogen', kind: 'restaurant', guests: 18, content: 14 },
  { id: 'sjoboden', kind: 'restaurant', guests: 12, content: 9 },
  { id: 'pizzeria-grytan', kind: 'restaurant', guests: 9, content: 7 },
  { id: 'hotellets-matsal', kind: 'restaurant', guests: 8, content: 6 },
  { id: 'grillvagnen', kind: 'truck', guests: 6, content: 5 },
  { id: 'tacovagnen', kind: 'truck', guests: 3, content: 2 }
];

describe('ORDER 318 — byn i ett mått', () => {
  it('placeringen efter nöjda gäster, alla sju i ordning', () => {
    const rows = villageNow(evening, () => null);
    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.content)).toEqual([14, 9, 7, 6, 5, 4, 2]);
    expect(rows.find((r) => r.player)!.place).toBe(6);
  });

  it('sammanfattningen följer placeringen: flest gäster, men få nöjda', () => {
    const sum = villageNowSummary(villageNow(evening, () => null));
    expect(sum).toEqual({ kind: 'mostGuests', leader: 'torgkrogen' });
    expect(pickLang(TABLE, 'sv').villageNow.mostGuests('Torgkrogen')).toBe('Du drar flest gäster, men få är nöjda. Torgkrogen leder.');
    const lead = villageNowSummary(villageNow(evening.map((r) => (r.id === 'player' ? { ...r, content: 20 } : r)), () => null));
    expect(lead).toEqual({ kind: 'lead', second: 'torgkrogen' });
  });

  it('placeringen i klartext', () => {
    expect(pickLang(TABLE, 'sv').villageNow.place('6:e', 7)).toBe('6:e av 7 efter nöjda gäster');
  });

  it('"Lugn kväll" står inte när krogen har flest gäster', () => {
    expect(playerHasMostGuests(evening)).toBe(true);
    expect(playerHasMostGuests(evening.map((r) => (r.id === 'player' ? { ...r, guests: 18 } : r)))).toBe(false);
    expect(read('strategic/ui/host/RivalBand.tsx')).toMatch(/playerHasMostGuests\(live\)\) return null/);
  });

  it('bandet är ihopfällt från början; klick eller B fäller ut', () => {
    const panel = read('strategic/ui/host/VillageNowPanel.tsx');
    expect(panel).toMatch(/let open = false;/);
    expect(panel).toContain("VILLAGE_NOW_KEY = 'b'");
    expect(read('strategic/ui/host/RivalBand.tsx')).toContain('{expanded && <VillageNowPanel now={now} />}');
  });
});

describe('ORDER 318 — utan nöjda gäster ingen placering', () => {
  it('ingen säger "flest nöjda" när ingen krog har nöjda gäster', async () => {
    const { playerPlace } = await import('../villageNow');
    const early = evening.map((r) => ({ ...r, content: 0 }));
    const rows = villageNow(early, () => null);
    expect(playerPlace(rows)).toBeNull();
    expect(villageNowSummary(rows)).toEqual({ kind: 'noContent', mostGuests: true });
  });
});
