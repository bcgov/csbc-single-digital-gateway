import { mdiDockBottom, mdiDockLeft, mdiDockRight } from '@mdi/js';
import { Icon } from '@mdi/react';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import type { FC } from 'react';
import { DOCK_PANEL_ORDER, type DockPanel, type DockPanelId } from './dock-panels';

const DOCK_ICONS: Readonly<Record<DockPanelId, string>> = Object.freeze({
  left: mdiDockLeft,
  bottom: mdiDockBottom,
  right: mdiDockRight,
});

// 24px square (16px icon); `px-0` for both the item and the joined group's own `px-2` override.
// Grey (#9f9d9c) when off, black when on — user decision; the off grey is ~2.7:1 on white.
const TOGGLE_CLASSES =
  'size-6 min-w-6 px-0 group-data-[spacing=0]/toggle-group:px-0 text-gray-70 aria-pressed:text-foreground';

export interface DockTogglesProps {
  readonly panels: Readonly<Record<DockPanelId, DockPanel>>;
  /**
   * Which toggles to show, in order. Defaults to all three; doc 198 rule 17 drops `left` while the Flow canvas is
   * showing, because its panel is unreachable there.
   */
  readonly ids?: readonly DockPanelId[];
}

/** The header's Left / Bottom / Right panel toggles (doc 181 rules 15-17, doc 198 rule 17). */
export const DockToggles: FC<DockTogglesProps> = ({ panels, ids = DOCK_PANEL_ORDER }) => {
  const value = ids.filter((id) => panels[id].open);

  // The group reports the full set of pressed ids; toggle each panel whose membership changed.
  const onValueChange = (next: string[]) => {
    for (const id of ids) {
      if (next.includes(id) !== panels[id].open) panels[id].toggle();
    }
  };

  return (
    <ToggleGroup
      multiple
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Panels"
      value={value}
      onValueChange={onValueChange}
    >
      {ids.map((id) => (
        <ToggleGroupItem
          key={id}
          value={id}
          className={TOGGLE_CLASSES}
          aria-label={panels[id].config.label}
          aria-controls={panels[id].contentId}
        >
          <Icon path={DOCK_ICONS[id]} size="16px" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};
