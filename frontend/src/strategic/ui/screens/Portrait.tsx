// ORDER 271 — porträtten på skärmarna M1 (mentorn) och O1 (frågeställaren).
// Bilderna är Designs (paket 1, bilder/figur-*.png, LEVERANS.md:
// "Porträtten skärmarna använder"), renderade ur samma figurrigg som
// spelet och inbyggda i bygget (ingen hämtning i runtime).

import mentorUrl from './img/figur-mentorn.png';
import sommelierUrl from './img/figur-sommelieren.png';

export type PortraitWho = 'mentor' | 'sommelier';

const URL: Record<PortraitWho, string> = { mentor: mentorUrl, sommelier: sommelierUrl };

export function Portrait(props: { who: PortraitWho; className?: string }) {
  return (
    <div
      className={`nxs-portrait ${props.className ?? ''}`}
      style={{ backgroundImage: `url(${URL[props.who]})` }}
      aria-hidden
      data-testid={`portrait-${props.who}`}
    />
  );
}
