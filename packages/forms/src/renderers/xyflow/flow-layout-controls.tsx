import { mdiArrowDown, mdiArrowRight } from '@mdi/js';
import { Icon } from '@mdi/react';
import { NativeSelect, NativeSelectOption } from '@repo/ui/native-select';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import type { FC } from 'react';
import {
  LAYOUT_ALGORITHMS,
  isLayoutAlgorithm,
  type LayoutAlgorithm,
  type LayoutDirection,
} from './flow-elk';

// The canvas's layout controls (doc 198 rule 31): which ELK algorithm arranges the flow, and which way it runs.

/** Doc 196 rule 13: the canvas pans from any press, so a control on it opts out of the pane's gestures. */
const CANVAS_CONTROL = 'nodrag nopan pointer-events-auto';

export interface FlowLayoutControlsProps {
  readonly algorithm: LayoutAlgorithm;
  readonly direction: LayoutDirection;
  onAlgorithmChange(next: LayoutAlgorithm): void;
  onDirectionChange(next: LayoutDirection): void;
}

/**
 * Rule 31: a picker for the algorithm and a pair of toggles for the direction, sitting on the canvas itself — the
 * arrangement is a view of the document, not part of it, so it is chosen here rather than authored.
 */
export const FlowLayoutControls: FC<FlowLayoutControlsProps> = ({
  algorithm,
  direction,
  onAlgorithmChange,
  onDirectionChange,
}) => (
  // Doc 187 rule 5: the studio selects from a press on the canvas, so the controls swallow their own — choosing an
  // arrangement is not selecting the Flow.
  <div
    onPointerDown={(event) => event.stopPropagation()}
    data-slot="flow-layout-controls"
    className={`${CANVAS_CONTROL} flex items-center gap-1 rounded-md border bg-background p-1 shadow-sm`}
  >
    <NativeSelect
      size="sm"
      aria-label="Layout algorithm"
      className={CANVAS_CONTROL}
      value={algorithm}
      onChange={(event) => {
        if (isLayoutAlgorithm(event.target.value)) onAlgorithmChange(event.target.value);
      }}
    >
      {LAYOUT_ALGORITHMS.map(({ id, label }) => (
        <NativeSelectOption key={id} value={id}>
          {label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
    {/* Rule 32: one direction is always chosen, so an empty report from Base UI keeps the current one. */}
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Layout direction"
      className={CANVAS_CONTROL}
      value={[direction]}
      onValueChange={(next: string[]) => {
        const picked = (['vertical', 'horizontal'] as const).find((id) => next.includes(id));
        if (picked !== undefined) onDirectionChange(picked);
      }}
    >
      <ToggleGroupItem value="vertical" aria-label="Vertical" className={CANVAS_CONTROL}>
        <Icon path={mdiArrowDown} size="16px" />
      </ToggleGroupItem>
      <ToggleGroupItem value="horizontal" aria-label="Horizontal" className={CANVAS_CONTROL}>
        <Icon path={mdiArrowRight} size="16px" />
      </ToggleGroupItem>
    </ToggleGroup>
  </div>
);
