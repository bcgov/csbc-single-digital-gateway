import { mdiFormatListBulleted, mdiTab } from '@mdi/js';
import { Icon } from '@mdi/react';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import type { FC } from 'react';
import { TABS_COMPONENTS, type TabsComponent } from '../renderers/gridstack/tabs-options';

// The preview's Tabs / List override (doc 216 rules 31-33), beside the Fillable / Readable picker.
//
// It answers "what would this look like broken out?" without editing the document — the author sees the other
// shape, then leaves preview and the override is gone (rule 31).

const ICONS: Readonly<Record<TabsComponent, string>> = Object.freeze({
  tabs: mdiTab,
  list: mdiFormatListBulleted,
});

const LABELS: Readonly<Record<TabsComponent, string>> = Object.freeze({
  tabs: 'Show as tabs',
  list: 'Show as a list',
});

/** The dock toggles' 24px square, so the header reads as one set (doc 184 rule 15, doc 211 rule 27). */
const TOGGLE_CLASSES =
  'size-6 min-w-6 px-0 group-data-[spacing=0]/toggle-group:px-0 text-gray-70 aria-pressed:text-foreground';

export interface TabsTogglesProps {
  /** The component preview is FORCING, or `null` for "however each element is authored". */
  readonly value: TabsComponent | null;
  onValueChange(next: TabsComponent | null): void;
}

/**
 * Rule 31: shaped like `PreviewModeToggles`, with ONE deliberate inversion.
 *
 * That group guards against Base UI reporting an EMPTY set when the pressed item is pressed again, because a
 * preview always HAS a mode. This one starts with NOTHING pressed — the override is absent, and every element
 * draws as authored — so the empty report is the useful signal, not a fault: pressing the pressed item clears
 * the override and hands the preview back to the document. Starting it pressed on `tabs` would silently
 * override an authored `list` the moment preview opened, which is the opposite of what preview is for.
 */
export const TabsToggles: FC<TabsTogglesProps> = ({ value, onValueChange }) => (
  <ToggleGroup
    variant="outline"
    size="sm"
    spacing={0}
    aria-label="Tabs display"
    value={value === null ? [] : [value]}
    onValueChange={(next: string[]) =>
      onValueChange(TABS_COMPONENTS.find((id) => next.includes(id)) ?? null)
    }
  >
    {TABS_COMPONENTS.map((id) => (
      <ToggleGroupItem
        key={id}
        value={id}
        className={TOGGLE_CLASSES}
        aria-label={LABELS[id]}
        data-slot={`preview-tabs-${id}`}
      >
        <Icon path={ICONS[id]} size="16px" />
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);
