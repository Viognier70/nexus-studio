// ORDER 299 (Vision Owner 2026-10-03, "Kamerastyrning. Knappar: vrid åt
// vänster och höger, zooma in och ut, återställ."). Samma kamera som Q/E,
// scrollen och nivåknapparna (CameraContext); återställ går till krogens
// vy (förvalet myBusiness, 24 m). Gränserna i krogen gäller (roomBounds.ts).

import { LocateFixed, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import { useCamera } from '../camera/CameraContext';
import './service/service.css';

const ROTATE_STEP_RAD = 0.26;
const ZOOM_STEP_LOG = 0.25;

export function CameraButtons() {
  const lang = useLanguage();
  const cam = useCamera();
  const buttons: { key: StringKey; id: string; Icon: typeof ZoomIn; run: () => void }[] = [
    { key: 'cam.left', id: 'left', Icon: RotateCcw, run: () => cam.rotate(-ROTATE_STEP_RAD, 0) },
    { key: 'cam.right', id: 'right', Icon: RotateCw, run: () => cam.rotate(ROTATE_STEP_RAD, 0) },
    { key: 'cam.in', id: 'in', Icon: ZoomIn, run: () => cam.zoomBy(-ZOOM_STEP_LOG) },
    { key: 'cam.out', id: 'out', Icon: ZoomOut, run: () => cam.zoomBy(ZOOM_STEP_LOG) },
    { key: 'cam.reset', id: 'reset', Icon: LocateFixed, run: () => cam.jumpToPreset('myBusiness') }
  ];
  return (
    <div className="nx-cam-buttons" role="group" aria-label={tt(lang, 'cam.group')} data-testid="camera-buttons">
      {buttons.map(({ key, id, Icon, run }) => (
        <button key={id} type="button" className="nx-cam-btn" data-testid={`camera-${id}`} aria-label={tt(lang, key)} title={tt(lang, key)} onClick={run}>
          <Icon size={18} aria-hidden />
        </button>
      ))}
    </div>
  );
}
