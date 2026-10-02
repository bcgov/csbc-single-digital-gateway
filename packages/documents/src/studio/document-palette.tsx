import { mdiPalette } from '@mdi/js';
import { useState } from 'react';
import { FADE_IN } from './canvas-zoom';
import type { PaletteItem } from './palette-items';
import { FoldsProvider } from './foldable-section';
import { PaletteList } from './palette-list';
import { StudioPanel } from './studio-panel';

/**
 * The floating Palette (doc 233 rule 13): the components an author can place on a focused Form's page. Shown only
 * while a Form is focused, on the canvas's left, mirroring the inspector on its right; it collapses like the
 * inspector (rule 14). It lists `items` to drag onto the page or append to the Form (doc 238).
 */
export function DocumentPalette({
  open,
  onOpenChange,
  items,
  onAppend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: readonly PaletteItem[];
  onAppend: (itemId: string) => void;
}) {
  // Here, not in the list: the docked and expanded panels both render the body, and must show one search.
  const [query, setQuery] = useState('');
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
      <div data-slot="document-studio-palette-content" className="min-h-0 flex-1 overflow-auto p-3">
        <FoldsProvider>
          <PaletteList items={items} query={query} onQueryChange={setQuery} onAppend={onAppend} />
        </FoldsProvider>
      </div>
    </StudioPanel>
  );
}
