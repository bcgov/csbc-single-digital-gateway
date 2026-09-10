import { JsonFormsDispatch } from '@jsonforms/react';
import { useContext, useRef } from 'react';
import { GridContext } from './grid-context';
import { useSizeToContent } from './grid-size-to-content';

export interface GridElementDispatchProps {
  /** Position of the element in the Grid's `elements`, carried in the widget's `props`. */
  index?: unknown;
}

/**
 * The built-in grid item: dispatches `elements[index]` through JSONForms, so the renderers in play
 * (plain for `default`, framed for `studio`) decide what the child looks like. A consumer that
 * overrides `GRID_ELEMENT_COMPONENT` can wrap this to add item-level chrome.
 *
 * The wrapper `<div>` is the block-level first child gridstack measures for `sizeToContent` — a
 * dispatched renderer may return text or nothing — and `useSizeToContent` re-measures the item once
 * this content exists (rule 10c).
 */
export function GridElementDispatch({ index }: GridElementDispatchProps) {
  const grid = useContext(GridContext);
  const contentRef = useRef<HTMLDivElement>(null);
  useSizeToContent(contentRef, grid?.sizeToContent === true);

  const element = typeof index === 'number' ? grid?.elements[index] : undefined;
  if (!grid || !element) return null;

  return (
    <div ref={contentRef} data-slot="grid-element">
      <JsonFormsDispatch
        uischema={element}
        schema={grid.schema}
        path={grid.path}
        enabled={grid.enabled}
        {...(grid.renderers ? { renderers: grid.renderers } : {})}
        {...(grid.cells ? { cells: grid.cells } : {})}
      />
    </div>
  );
}
