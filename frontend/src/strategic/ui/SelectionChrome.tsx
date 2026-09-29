import { strings } from '../../content/strings';
import type { Landmark } from '../content/world';

interface Props {
  landmark: Landmark | null;
  onClose: () => void;
}

const VERIFICATION_LABEL: Record<Landmark['verification'], string> = {
  verified: 'Verified — OpenStreetMap',
  approximate: 'Approximate — VERIFICATION REQUIRED',
  placeholder: 'Placeholder (Gray Box)'
};

const KIND_LABEL: Record<Landmark['kind'], string> = {
  institution: 'Institution',
  commercial: 'Business',
  municipal: 'Public place',
  religious: 'Church',
  placeholder: 'Placeholder'
};

export function SelectionChrome({ landmark, onClose }: Props) {
  if (!landmark) return null;
  const src = landmark.source;
  return (
    <div className="gb-selection" role="status" aria-live="polite">
      <div className="gb-selection-head">
        <div>
          <div className="gb-selection-title">{landmark.displayName}</div>
          <div className="gb-selection-kind">{KIND_LABEL[landmark.kind]}</div>
        </div>
        <button
          type="button"
          className="gb-selection-close"
          onClick={onClose}
          aria-label={strings.legacy.closeSelection}
        >
          ×
        </button>
      </div>
      <div className="gb-selection-verify">
        {VERIFICATION_LABEL[landmark.verification]}
      </div>
      {landmark.note && <div className="gb-selection-note">{landmark.note}</div>}
      {src.osmId != null && src.osmType && (
        <div className="gb-selection-source">
          OSM: {src.osmType}/{src.osmId}
        </div>
      )}
    </div>
  );
}
