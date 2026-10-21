import { mdiLockOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { LOCKED } from '../../studio/capabilities/governance';

/**
 * Doc 259 rule 9: an element the template restricts shows a small lock at its frame's top-left — the rule badge owns
 * the top-right — titled with what it may not do.
 */
export function LockBadge({ restrictions }: { restrictions: readonly string[] }) {
  const title = `${LOCKED}: ${restrictions.join(', ')}`;
  return (
    <span
      data-slot="studio-lock-badge"
      role="img"
      aria-label={title}
      title={title}
      className="pointer-events-auto absolute -top-2 -left-2 z-10 flex size-4 items-center justify-center rounded-sm bg-muted text-muted-foreground shadow-xs ring-1 ring-border"
    >
      <Icon path={mdiLockOutline} size="12px" />
    </span>
  );
}
