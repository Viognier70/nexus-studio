import { useCamera } from '../camera/CameraContext';
import { useSimState } from '../simulation/SimulationProvider';
import { strings } from '../../content/strings.sv';

// ORDER 157 §3 — provspelet 2026-08-31: HUD-etiketten skrev VINBAREN
// oavsett vilken klass spelaren drev. ORDER 139 upphävde beslutet att
// dagens lokal blir vinbaren — vinbaren är egen byggnad, spelaren kan
// driva kvarterskrogen, ölkrogen, gästgiveriet, foodtrucken eller
// nattklubben här. Vid business/myBusiness-preseterna läser vi därför
// `sim.businessClass` och slår upp den bestämda formen i
// `strings.businessClass` (post-ORDER 140, samma tabell TeamPanel
// och andra HUD-texter använder). För andra preset (village/district)
// står labeln kvar oförändrad — de är ortsnivåer, inte klassnivåer.
const CAMERA_LABEL_SV: Record<string, string> = {
  grythyttan: 'Grythyttan',
  kvarteret: 'Kvarteret',
  // 'vinbaren' behålls som fallback för klass som saknar spelartext,
  // men läses aldrig i praktiken eftersom sim.businessClass alltid är
  // satt när business/myBusiness-preseterna är aktiva.
  vinbaren: 'Vinbaren'
};

export function ViewLabel() {
  const { label } = useCamera();
  const sim = useSimState();
  // business/myBusiness-preseterna bär båda label 'vinbaren' i
  // viewLevels.ts. Vid dessa läser vi klass-namnet i stället för
  // preset-labeln, så spelaren ser sin egen verksamhet.
  const isBusinessView = label === 'vinbaren';
  const displayLabel = isBusinessView
    ? strings.businessClass[sim.businessClass] ?? CAMERA_LABEL_SV[label] ?? label
    : CAMERA_LABEL_SV[label] ?? label;
  return (
    <div className="gb-viewlabel" aria-live="polite">
      {displayLabel}
    </div>
  );
}
