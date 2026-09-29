// ORDER 286a — bildtexten vid figuren när raketen börjar i rummet. DOM, inte
// R3F: monteras i drei <Html> av WineBarFigures (scenens filer får inga
// bindestrecksattribut, ORDER 090 §5).
export function TheatreCaption({ text }: { text: string }) {
  return <div className="nx-theatre-caption" data-testid="theatre-caption">{text}</div>;
}
