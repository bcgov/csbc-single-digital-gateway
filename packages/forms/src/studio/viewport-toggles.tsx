import { mdiCellphone, mdiMonitor, mdiTablet } from '@mdi/js';
import { Icon } from '@mdi/react';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import type { FC } from 'react';

// The preview size picker (doc 184 rules 15-17) — Desktop / Tablet / Mobile, shown beside the Preview toggle while
// previewing, so an author can see the form at the widths a citizen will.

/** The sizes offered, in order. Desktop is the default (rule 16). */
export const PREVIEW_VIEWPORTS = ['desktop', 'tablet', 'mobile'] as const;
export type PreviewViewport = (typeof PREVIEW_VIEWPORTS)[number];

const VIEWPORT_ICONS: Readonly<Record<PreviewViewport, string>> = Object.freeze({
  desktop: mdiMonitor,
  tablet: mdiTablet,
  mobile: mdiCellphone,
});

const VIEWPORT_LABELS: Readonly<Record<PreviewViewport, string>> = Object.freeze({
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
});

/**
 * Rule 17: the frame's width per size. Desktop fills the pane, so it is the shape preview has always had; the other
 * two cap it and the frame centres itself. Capping alone would change nothing inside — a window-width `sm:` still
 * fires in a desktop browser — which is why fillable layouts query the `fill-page` CONTAINER instead (rule 17b).
 *
 * Literal class strings, never interpolated — Tailwind only generates what it can see whole in the source. The widths
 * are written as arbitrary values rather than `max-w-3xl` / `max-w-sm` so the pixel sizes are stated, not implied.
 */
export const VIEWPORT_WIDTH: Readonly<Record<PreviewViewport, string>> = Object.freeze({
  desktop: 'w-full',
  tablet: 'w-full max-w-[768px]',
  mobile: 'w-full max-w-[400px]',
});

/** The dock toggles' 24px square, so the header reads as one set (doc 181 rule 17). */
const TOGGLE_CLASSES =
  'size-6 min-w-6 px-0 group-data-[spacing=0]/toggle-group:px-0 text-gray-70 aria-pressed:text-foreground';

export interface ViewportTogglesProps {
  readonly value: PreviewViewport;
  onValueChange(next: PreviewViewport): void;
}

/**
 * Rule 15: a SINGLE-select group — `ToggleGroup` without `multiple` — so exactly one size is always chosen.
 *
 * Base UI still reports the pressed set as an array, and pressing the already-active item reports an EMPTY one. A
 * preview always has a size, so an empty report keeps the current value instead of clearing it; without that guard,
 * clicking the selected size would leave the group with nothing pressed and no width to render.
 */
export const ViewportToggles: FC<ViewportTogglesProps> = ({ value, onValueChange }) => (
  <ToggleGroup
    variant="outline"
    size="sm"
    spacing={0}
    aria-label="Preview size"
    value={[value]}
    onValueChange={(next: string[]) => {
      const picked = PREVIEW_VIEWPORTS.find((id) => next.includes(id));
      if (picked !== undefined) onValueChange(picked);
    }}
  >
    {PREVIEW_VIEWPORTS.map((id) => (
      <ToggleGroupItem
        key={id}
        value={id}
        className={TOGGLE_CLASSES}
        aria-label={VIEWPORT_LABELS[id]}
      >
        <Icon path={VIEWPORT_ICONS[id]} size="16px" />
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);
