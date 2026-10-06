// ORDER 300 §4 (Anders 2026-10-04): "Mentorns närbild ersätts med ett
// porträtt med monogram." Initialen ur namnet i strängtabellen, i en rund
// ram i designsystemets mässing på mörkt trä.

export function Monogram(props: { name: string; caption?: string; className?: string; testId?: string }) {
  const initial = props.name.replace(/^(the|den|det|intendent|intendant)\s+/i, '').trim().charAt(0).toUpperCase();
  return (
    <div className={`nxs-monogram ${props.className ?? ''}`} aria-hidden data-testid={props.testId}>
      <div className="nxs-monogram-ring"><span>{initial}</span></div>
      {props.caption && <div className="nx-label nxs-monogram-caption">{props.caption}</div>}
    </div>
  );
}
