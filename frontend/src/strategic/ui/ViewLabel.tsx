import { useCamera } from '../camera/CameraContext';

const SV: Record<string, string> = {
  grythyttan: 'Grythyttan',
  kvarteret: 'Kvarteret',
  vinbaren: 'Vinbaren'
};

export function ViewLabel() {
  const { label } = useCamera();
  return (
    <div className="gb-viewlabel" aria-live="polite">
      {SV[label] ?? label}
    </div>
  );
}
