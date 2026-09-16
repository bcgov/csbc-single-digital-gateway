import { mdiArrowLeft } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import type { FC } from 'react';

// The header's 24px square, grey until hovered — the shape the dock and preview toggles use (doc 181 rule 17).
const BACK_CLASSES = 'mr-auto size-6 min-w-6 px-0 text-gray-70 hover:text-foreground';

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
  <Button
    variant="ghost"
    size="icon-xs"
    aria-label="Back to stage editor"
    className={BACK_CLASSES}
    onClick={onClick}
  >
    <Icon path={mdiArrowLeft} size="16px" />
  </Button>
);
