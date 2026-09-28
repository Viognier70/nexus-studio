// ORDER 271 — medaljen som rund form (LEVERANSNOT §3: "Medaljerna är den
// enda runda formen"). Tom ring när medaljen inte är tagen.

import type { MedalLevelId, PavilionKey } from '../../types';
import { NxIcon, PAVILION_ICON } from './icons';

export function MedalDisc(props: {
  level: MedalLevelId | null | undefined;
  size?: number;
  // En röd ring runt medaljen som just tagits (MD1 "Silver i dag").
  fresh?: boolean;
  // Paviljongens ikon mitt i medaljen (O2, MD2).
  pavilion?: PavilionKey;
  label?: string;
  testId?: string;
}) {
  const size = props.size ?? 104;
  return (
    <span
      className="nxs-medal"
      data-level={props.level ?? 'none'}
      data-fresh={props.fresh ? 'true' : undefined}
      style={{ width: `calc(${size} * var(--nx-u))`, height: `calc(${size} * var(--nx-u))`, ['--d' as string]: size } as React.CSSProperties}
      role={props.label ? 'img' : undefined}
      aria-label={props.label}
      aria-hidden={props.label ? undefined : true}
      data-testid={props.testId}
    >
      {props.pavilion && props.level && <NxIcon name={PAVILION_ICON[props.pavilion]} size={Math.round(size * 0.4)} />}
    </span>
  );
}
