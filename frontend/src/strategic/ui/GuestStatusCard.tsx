// ORDER 303 F — gästens lilla kort i statusläget (klick på gästen): vem och stämningen.
import { strings } from '../../content/strings';
import { t as tt, type StringKey } from '../../content/nexusStrings';
import { useLanguage } from '../../content/language';
import type { MoodId } from '../../sim/guestMood';

export function GuestStatusCard({ who, mood }: { who: string; mood: MoodId }) {
  const lang = useLanguage();
  return (
    <div className="nx-ring-tag nx-status-card" data-testid="guest-card">
      <div className="nx-status-card-head">{who}</div>
      <div>{strings.status.mood}: {tt(lang, `mood.${mood}` as StringKey)}</div>
    </div>
  );
}
