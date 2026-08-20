import { Input } from '@repo/ui/input';
import { ClearableInput } from './clearable-input';
import { applyItemBound, parseItemBound } from './item-bounds';
import { Row, SegmentedToggle } from './inspector-controls';
import {
  ACCORDION_DEFAULT_OPEN_OPTIONS,
  type AccordionDefaultOpen,
  type ControlNode,
} from './model';

/**
 * Inspector settings for an Accordion group field (feature 171).
 *
 * **Item noun** — the word for one entry ("question"), used for the "Add question" row, the empty
 * state and every row's accessible name. Clearing it falls back to "item".
 *
 * **Open by default** — which sections the READ-ONLY accordion opens on first render. There is no
 * "specific item" option on purpose: the author configures the field but never sees the items (they
 * are entered by whoever fills the form), so an index-based choice would silently misfire. An author
 * who wants a particular item open reorders it to first.
 *
 * **Min / Max items** — bounds on HOW MANY items, distinct from per-item completeness. A minimum of
 * 1 or more implies the field is required, and the range is kept satisfiable; both invariants live
 * in `item-bounds.ts`.
 */
export function AccordionGroupSettings({
  node,
  onChange,
}: {
  node: ControlNode;
  onChange: (patch: Partial<ControlNode>) => void;
}) {
  return (
    <>
      <Row label="Item noun" htmlFor="insp-item-label">
        <ClearableInput
          id="insp-item-label"
          value={node.itemLabel ?? 'item'}
          placeholder="item"
          onChange={(e) => onChange({ itemLabel: e.target.value })}
          onClear={() => onChange({ itemLabel: 'item' })}
        />
        <p className="text-xs text-muted-foreground">
          Names one entry — the add button reads “Add {(node.itemLabel ?? 'item').toLowerCase()}”.
        </p>
      </Row>
      <div className="grid grid-cols-2 gap-2">
        <Row label="Min items" htmlFor="insp-min-items">
          <Input
            id="insp-min-items"
            type="number"
            min={0}
            value={node.minItems ?? ''}
            placeholder="Any"
            onChange={(e) =>
              onChange(applyItemBound(node, 'minItems', parseItemBound(e.target.value)))
            }
          />
        </Row>
        <Row label="Max items" htmlFor="insp-max-items">
          <Input
            id="insp-max-items"
            type="number"
            min={0}
            value={node.maxItems ?? ''}
            placeholder="Any"
            onChange={(e) =>
              onChange(applyItemBound(node, 'maxItems', parseItemBound(e.target.value)))
            }
          />
        </Row>
      </div>
      <p className="text-xs text-muted-foreground">
        Leave blank for no limit. A minimum of 1 or more makes the field required.
      </p>
      <Row label="Open by default" htmlFor="insp-default-open">
        <SegmentedToggle<AccordionDefaultOpen>
          fullWidth
          options={[...ACCORDION_DEFAULT_OPEN_OPTIONS]}
          value={node.defaultOpen ?? 'none'}
          onValueChange={(defaultOpen) => onChange({ defaultOpen })}
        />
        <p className="text-xs text-muted-foreground">
          Which sections start expanded where the answers are displayed.
        </p>
      </Row>
    </>
  );
}
