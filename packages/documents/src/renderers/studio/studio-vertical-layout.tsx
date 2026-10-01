import { rankWith, uiTypeIs, type Layout, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { useRef, useState } from 'react';
import { GAP_REM, layoutGap } from '../default/layout-gap';
import { ChildDispatch, elementKey, type VerticalBodyProps } from '../default/vertical-layout';
import { idOf, reorderElements } from './element-order';
import { useStudioEditor } from './studio-editor';
import { STUDIO_INTERACTIVE } from './studio-element';
import { useVerticalGrid } from './use-vertical-grid';

/** Outranks the spread default VerticalLayout (doc 236 rule 26). */
export const studioVerticalLayoutTester = rankWith(2, uiTypeIs('VerticalLayout'));

/**
 * A one-column gridstack grid of `elements`; with an editor they drag to reorder, written back as
 * `update(layoutId, { elements })` (doc 236 rules 26-31). Shared by the studio VerticalLayout and Form (rule 40).
 */
export function StudioVerticalGrid({
  layoutId,
  elements,
  gap,
  ...dispatch
}: VerticalBodyProps & { layoutId: string | undefined }) {
  const editor = useStudioEditor();
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const keys = elements.map(elementKey);
  // Measured heights outlive each per-order grid, so the next one is rendered already laid out (rule 30b).
  const heights = useRef(new Map<string, number>()).current;
  const rows = keys.map((key) => heights.get(key) ?? 1);
  const tops = rows.map((_, index) => rows.slice(0, index).reduce((sum, h) => sum + h, 0));
  useVerticalGrid(el, {
    heights,
    gapRem: GAP_REM[gap],
    editable: editor !== null && layoutId !== undefined,
    onReorder: (ordered) => {
      if (editor === null || layoutId === undefined) return;
      const next = reorderElements(elements, ordered);
      if (next !== elements) editor.update(layoutId, { elements: next });
    },
  });
  return (
    <div
      // A new order is a new grid (rule 30): see useVerticalGrid.
      key={keys.join('\u0000')}
      ref={setEl}
      data-slot="studio-vertical-layout"
      data-gap={gap}
      className={`grid-stack ${editor === null ? '' : STUDIO_INTERACTIVE}`}
    >
      {elements.map((child, index) => (
        <div
          key={keys[index]}
          className="grid-stack-item"
          gs-id={keys[index]}
          gs-x="0"
          gs-y={String(tops[index])}
          gs-w="1"
          gs-h={String(rows[index])}
        >
          <div className="grid-stack-item-content">
            <ChildDispatch child={child} {...dispatch} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudioVerticalLayoutRenderer({ uischema, visible, ...props }: LayoutProps) {
  if (!visible) return null;
  return (
    <StudioVerticalGrid
      layoutId={idOf(uischema)}
      elements={(uischema as Layout).elements ?? []}
      gap={layoutGap(uischema.options)}
      schema={props.schema}
      path={props.path}
      enabled={props.enabled}
      renderers={props.renderers}
      cells={props.cells}
    />
  );
}

export const studioVerticalLayoutEntry = {
  tester: studioVerticalLayoutTester,
  renderer: withJsonFormsLayoutProps(StudioVerticalLayoutRenderer),
};
