// ORDER 297b — bildfrekvensen på byns nivå och kvällens detaljer.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LIGHTS, SKY } from '../../strategic/village/villageEvening';
import { skyAt } from '../../strategic/village/EveningLighting';

const SCENE = resolve(dirname(fileURLToPath(import.meta.url)), '../../strategic/scene');

describe('ORDER 297b — byn i kvällsljus, efteråt', () => {
  it('scenen renderas inte om vid varje simuleringssteg (memo)', () => {
    expect(readFileSync(resolve(SCENE, 'StrategicScene.tsx'), 'utf8')).toMatch(/export const StrategicScene = memo\(/);
  });

  it('byns stillastående <Instances> räknar inte om matriserna i varje bildruta', () => {
    const missing: string[] = [];
    for (const f of readdirSync(SCENE).filter((f) => f.endsWith('.tsx'))) {
      const src = readFileSync(resolve(SCENE, f), 'utf8');
      const n = (src.match(/<Instances(?=[\s>])/g) ?? []).length;
      const framed = (src.match(/<Instances frames=\{STATIC_INSTANCE_FRAMES\}/g) ?? []).length;
      if (n !== framed) missing.push(`${f}: ${framed}/${n}`);
    }
    expect(missing).toEqual([]);
  });

  it('kyrktornet och sjön följer kvällen som i Designs leverans', () => {
    expect(LIGHTS.church.on[0]).toBeLessThan(LIGHTS.church.on[1]);
    expect(readFileSync(resolve(SCENE, 'CraftedLandmarks.tsx'), 'utf8')).toMatch(/name="church-tower"/);
    expect(readFileSync(resolve(SCENE, 'OsmWater.tsx'), 'utf8')).toMatch(/name="lake-surface"/);
    // Sjöns färg mörknar från skymningen till natten.
    const day = skyAt(0).lake.getHSL({ h: 0, s: 0, l: 0 }).l;
    const night = skyAt(1).lake.getHSL({ h: 0, s: 0, l: 0 }).l;
    expect(night).toBeLessThan(day);
    expect(SKY.length).toBeGreaterThan(1);
  });
});
