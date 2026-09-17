import { mdiAlertCircle } from '@mdi/js';
import { Icon } from '@mdi/react';

// Small pieces shared by the step rail's stage rows and page items (doc 202 rules 24b, 27d), in their own module so
// neither row file has to import the other.

/** Rule 24b: why a forward page or stage is closed — it names what to do rather than just "unavailable". */
export const BLOCKED_HINT = 'complete the current page first';

/** Rule 27d: the spoken half of an error flag, so it is never conveyed by the red icon alone. */
export const HAS_ERRORS_HINT = 'has errors';

/** Rule 27d: the visible half — a destructive alert icon beside the flagged name. */
export function ErrorFlag() {
  return (
    <>
      <Icon
        path={mdiAlertCircle}
        size="16px"
        aria-hidden="true"
        data-slot="runner-error-flag"
        className="shrink-0 text-destructive"
      />
      <span className="sr-only">{HAS_ERRORS_HINT}</span>
    </>
  );
}
