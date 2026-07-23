import { useCamera } from '../camera/CameraContext';

export function OutwardButton() {
  const { outward } = useCamera();
  return (
    <button
      type="button"
      className="gb-outward"
      onClick={outward}
      aria-label="Zooma ut ett steg"
    >
      Bakåt
    </button>
  );
}
