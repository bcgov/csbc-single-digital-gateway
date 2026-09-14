import type { UISchemaElement } from '@jsonforms/core';
import { JsonFormsDispatch } from '@jsonforms/react';
import { useContext, useRef } from 'react';
import { GridContext } from './grid-context';
import { useSizeToContent, type ItemSizing } from './grid-size-to-content';

export interface GridElementDispatchProps {
  /**
   * The element's id in its Grid (the widget id), carried in the widget's `props` (doc 183 rule 7). An
   * id, not an index: gridstack freezes widget props at add time, and indices change when elements are
   * sorted or moved.
   */
  elementId?: unknown;
  /**
   * `false` disables the dispatched element, e.g. a management view's item (doc 180 rule 17b).
   * AND-ed with the Grid's own `enabled`, so it can only ever disable.
   */
  enabled?: boolean;
  /**
   * `'fit'` sizes the item to exactly its content; `'min'` keeps the content as its minimum height, for
   * items a person may resize vertically (doc 180 rule 10d). Absent → `'min'` when the element has a
   * hand-set height, else `'fit'`, so a static grid keeps the height the studio wrote (bug B2). Inside a
   * VerticalLayout or HorizontalLayout the item always fits and a hand-set height is ignored (rule 29).
   */
  sizing?: ItemSizing;
}

/** The element's hand-set height — a positive authored `options.gridItem.h` (doc 180 rule 10d, bug B1). */
function authoredHeightOf(element: UISchemaElement | undefined): number | undefined {
  const gridItem = element?.options?.['gridItem'];
  const h =
    typeof gridItem === 'object' && gridItem !== null ? (gridItem as { h?: unknown }).h : undefined;
  return typeof h === 'number' && h > 0 ? h : undefined;
}

/**
 * The built-in grid item: dispatches the element with `elementId` through JSONForms, so the renderers in play
 * (plain for `default`, framed for `studio`) decide what the child looks like. A consumer that
 * overrides `GRID_ELEMENT_COMPONENT` can wrap this to add item-level chrome.
 *
 * The wrapper `<div>` is the block-level first child gridstack measures for `sizeToContent` — a
 * dispatched renderer may return text or nothing — and `useSizeToContent` re-measures the item once
 * this content exists (rule 10c).
 */
export function GridElementDispatch({ elementId, enabled, sizing }: GridElementDispatchProps) {
  const grid = useContext(GridContext);
  const contentRef = useRef<HTMLDivElement>(null);
  const element = typeof elementId === 'string' ? grid?.elementsById.get(elementId) : undefined;
  const inAxisLayout = grid !== null && grid.layout !== 'grid';
  const authoredH = inAxisLayout ? undefined : authoredHeightOf(element);
  const resolvedSizing = inAxisLayout
    ? 'fit'
    : (sizing ?? (authoredH === undefined ? 'fit' : 'min'));
  useSizeToContent(contentRef, grid?.sizeToContent === true, resolvedSizing, authoredH);

  if (!grid || !element) return null;

  return (
    <div ref={contentRef} data-slot="grid-element">
      <JsonFormsDispatch
        uischema={element}
        schema={grid.schema}
        path={grid.path}
        enabled={grid.enabled && enabled !== false}
        {...(grid.renderers ? { renderers: grid.renderers } : {})}
        {...(grid.cells ? { cells: grid.cells } : {})}
      />
    </div>
  );
}
