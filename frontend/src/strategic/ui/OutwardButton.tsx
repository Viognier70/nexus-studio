import { useCamera } from '../camera/CameraContext';
import { strings } from '../../content/strings';

export function OutwardButton() {
  const { outward } = useCamera();
  return (
    <button
      type="button"
      className="gb-outward"
      onClick={outward}
      aria-label={strings.legacy.outwardAria}
    >
      {strings.legacy.outward}
    </button>
  );
}
