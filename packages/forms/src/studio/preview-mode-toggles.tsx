import { mdiEyeOutline, mdiFormTextbox } from '@mdi/js';
import { Icon } from '@mdi/react';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import type { FC } from 'react';

// The preview mode picker (doc 211 rules 27-31) — Fillable / Readable, beside the size picker while previewing.
//
// It answers a question an author could not ask before: not "can this be filled in", which preview already
// showed, but "does it READ" — how the answers look to the reviewer, the caseworker, or the citizen opening the
// application they sent last week. Same document, same answers, the other half of the form's life.

/** The modes offered, in order. Fillable is the default (rule 30) — preview's behaviour before this feature. */
export const PREVIEW_MODES = ['fillable', 'readable'] as const;
export type PreviewMode = (typeof PREVIEW_MODES)[number];

const MODE_ICONS: Readonly<Record<PreviewMode, string>> = Object.freeze({
  fillable: mdiFormTextbox,
  readable: mdiEyeOutline,
});

const MODE_LABELS: Readonly<Record<PreviewMode, string>> = Object.freeze({
  fillable: 'Fillable',
  readable: 'Readable',
});

/** The dock toggles' 24px square, so the header reads as one set (doc 181 rule 17, doc 184 rule 15). */
const TOGGLE_CLASSES =
  'size-6 min-w-6 px-0 group-data-[spacing=0]/toggle-group:px-0 text-gray-70 aria-pressed:text-foreground';

export interface PreviewModeTogglesProps {
  readonly value: PreviewMode;
  onValueChange(next: PreviewMode): void;
}

/**
 * Rule 27: a SINGLE-select group, shaped exactly like `ViewportToggles` — the same `ToggleGroup`, the same 24px
 * square, and the same guard for Base UI reporting an EMPTY set when the already-pressed item is pressed again.
 * A preview always has a mode, so an empty report keeps the current one rather than clearing it.
 */
export const PreviewModeToggles: FC<PreviewModeTogglesProps> = ({ value, onValueChange }) => (
  <ToggleGroup
    variant="outline"
    size="sm"
    spacing={0}
    aria-label="Preview mode"
    value={[value]}
    onValueChange={(next: string[]) => {
      const picked = PREVIEW_MODES.find((id) => next.includes(id));
      if (picked !== undefined) onValueChange(picked);
    }}
  >
    {PREVIEW_MODES.map((id) => (
      <ToggleGroupItem
        key={id}
        value={id}
        className={TOGGLE_CLASSES}
        aria-label={MODE_LABELS[id]}
        data-slot={`preview-mode-${id}`}
      >
        <Icon path={MODE_ICONS[id]} size="16px" />
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);
