import { ClearableInput } from './clearable-input';
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
