import { mdiPlay } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Toggle } from '@repo/ui/toggle';
import type { FC } from 'react';

// The dock toggles' 24px square with grey-off / black-on icon (doc 181 rule 17), so the header reads as one set.
const TOGGLE_CLASSES = 'size-6 min-w-6 px-0 text-gray-70 aria-pressed:text-foreground';

export interface PreviewToggleProps {
  readonly pressed: boolean;
  readonly onPressedChange: (pressed: boolean) => void;
}

/**
 * The header's play toggle (doc 184 rules 1-3). Pressed while previewing; the icon stays play in both
 * modes (user decision), so the pressed state is the only cue, exactly as for the dock toggles.
 */
export const PreviewToggle: FC<PreviewToggleProps> = ({ pressed, onPressedChange }) => (
  <Toggle
    variant="outline"
    size="sm"
    aria-label="Preview"
    pressed={pressed}
    onPressedChange={(next) => onPressedChange(next)}
    className={TOGGLE_CLASSES}
  >
    <Icon path={mdiPlay} size="16px" />
  </Toggle>
);
