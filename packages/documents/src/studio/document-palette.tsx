import { mdiPalette } from '@mdi/js';
import { FADE_IN } from './canvas-zoom';
import { StudioPanel } from './studio-panel';

/**
 * The floating Palette (doc 233 rule 13): the components an author can place on a focused Form's page. Shown only
 * while a Form is focused, on the canvas's left, mirroring the inspector on its right; it collapses like the
 * inspector (rule 14). SPIKE: no content yet.
 */
export function DocumentPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <StudioPanel
      label="Palette"
      title="Palette"
      icon={mdiPalette}
      side="left"
      width="w-64"
      open={open}
      onOpenChange={onOpenChange}
      slot="document-studio-palette"
      className={FADE_IN}
    >
      <div
        data-slot="document-studio-palette-content"
        className="min-h-0 flex-1 overflow-auto p-3"
      />
    </StudioPanel>
  );
}
