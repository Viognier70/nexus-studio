// ORDER 249 §2 — inomhusbelysning delad mellan alla business-room-scener.
//
// Bakgrund (ORDER 249 rekognosering): den enda interior-light-källan i
// hela scenen låg tidigare i `PlayerBusiness.tsx:530` (en pointLight
// styrd av `nightFactor × serviceGain × interiorVisibility`). ORDER 184
// fejdar PlayerBusinesss shell + interior när `businessRoom`-kontraktet
// är monterat (RestaurantScene, BrewpubScene, m.fl.); ljuset fejdas då
// bort med resten. Konsekvens: under middag i höstlig Grythyttan (sol
// vid −5° elevation) fanns bara hemi (0.55) + moon (0.35) ≈ 0.9 units
// ambient — matsalen läste som svart.
//
// **Denna komponent monteras i varje businessRoom-scen** (RestaurantScene,
// BrewpubScene, kommande InnScene/WineBarScene/NightClubScene) och tar
// över interior-ljus-rollen. En pointLight per bord (och en per bar/
// köksstation om `barCentre` skickas in) — samma warm tungsten som
// PlayerBusiness använde (#ffb460).
//
// **Gate:ad på inService.** Under lunch/dinner brinner lamporna på
// full intensitet. Utanför service håller de en liten baseline så
// rummet inte läser som avgränsad tomrum sett från plazan. Utomhus
// (SunLightRig via DayLighting) är oförändrat — solen släcker sig
// vid dusk som förut.
//
// **castShadow={false} per lampa.** Skuggkartor på flera pointLights
// blir dyrt (six-face shadow-map per pointLight × 5+ lampor = 30 pass
// per frame). Interiörens plattor och pucks har inte kvalitet att
// bära pointLight-baserade skuggor ändå — hemi + moon räcker för att
// nedre delar av rummet inte ska bli helt platta.

import { useMemo } from 'react';
import { useSimState } from '../simulation/SimulationProvider';
// Vec2 = [x, z] tuple från businessRoom (samma format som
// resolveWorldPositions().tables). types.ts har en annan Vec2
// ({ x, z } objekt) — det är inte den vi vill ha här.
import type { Vec2 } from './businessRoom';

interface IndoorLampsProps {
  /** Världskoordinater för bord-centrum (resolveWorldPositions().tables). */
  tables: readonly Vec2[];
  /** Valfri bar-centrumposition. Om satt läggs en extra lampa där. */
  barCentre?: Vec2;
  /** Höjd i m över golvet där lamporna hänger. Default 1.9 m (under
   *  tak-eaven på 2.05 m); några scener kan vilja sätta lägre. */
  hangHeight?: number;
  /** Färg i hex. Default warm tungsten som PlayerBusiness använde. */
  color?: string;
  /** Distance (m). Default 3 — täcker ett fyrbord + 1 m kring det. */
  distance?: number;
  /** Peak-intensitet vid full inService. Default 4 per lampa. Valdes
   *  så tre-fyra lampor tillsammans ger samma total-illumination som
   *  PlayerBusinesss enda pointLight på 22 (24÷~5 lampor = ~4.8; runda
   *  ned för att undvika blowout). */
  intensity?: number;
  /** Baseline-intensitet utanför service. Default 0.5. */
  intensityOffService?: number;
}

export function IndoorLamps({
  tables,
  barCentre,
  hangHeight = 1.9,
  color = '#ffb460',
  distance = 3,
  intensity = 4,
  intensityOffService = 0.5
}: IndoorLampsProps) {
  const sim = useSimState();
  const inService = sim.day.period === 'lunch' || sim.day.period === 'dinner';
  const currentIntensity = inService ? intensity : intensityOffService;
  // Behåll ordning stabil så key-listan inte re-mountas per frame.
  const positions = useMemo(() => {
    const p: Array<{ key: string; xz: Vec2 }> = tables.map((t, i) => ({
      key: `table-${i}`,
      xz: t
    }));
    if (barCentre) p.push({ key: 'bar', xz: barCentre });
    return p;
  }, [tables, barCentre]);

  return (
    <>
      {positions.map(({ key, xz }) => (
        <pointLight
          key={key}
          position={[xz[0], hangHeight, xz[1]]}
          color={color}
          intensity={currentIntensity}
          distance={distance}
          decay={2}
          castShadow={false}
        />
      ))}
    </>
  );
}
