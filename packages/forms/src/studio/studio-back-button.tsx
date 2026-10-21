import { mdiArrowLeft } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import type { FC } from 'react';

/**
 * Doc 197 rule 16b: ONLY the arrow is on bcgov-gold (user decision 2026-09-17) — a gold square holding a bcgov-blue
 * arrow, with the words beside it on the header's own background. `h-6` keeps the row the height of the dock and
 * preview controls (doc 181 rule 17, doc 184 rule 19b).
 */
const BACK_CLASSES = 'mr-auto h-6 gap-1.5 border-0 px-0 text-xs font-semibold hover:bg-transparent';
const ICON_CLASSES =
  'flex size-6 shrink-0 items-center justify-center rounded-md bg-bcgov-gold text-bcgov-blue';

/** Rule 16b: the words, so the button reads without relying on the arrow alone. */
export const BACK_TO_STAGES_LABEL = 'Back to Stages';

export interface StudioBackButtonProps {
  readonly onClick: () => void;
}

/**
 * The header's Back button (doc 197 rules 14-16): shown only while a Form is drilled into, it clears the selection and
 * so returns the canvas to the Flow.
 *
 * `mr-auto` is what keeps the header's `justify-end` honest — the button pushes itself to the left edge and the toggles
 * stay right, whether or not it is mounted.
 */
export const StudioBackButton: FC<StudioBackButtonProps> = ({ onClick }) => (
  <Button variant="ghost" size="sm" className={BACK_CLASSES} onClick={onClick}>
    <span data-slot="studio-back-icon" className={ICON_CLASSES}>
      <Icon path={mdiArrowLeft} size="14px" />
    </span>
    {BACK_TO_STAGES_LABEL}
  </Button>
);
