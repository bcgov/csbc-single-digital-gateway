import {
  rankWith,
  uiTypeIs,
  type JsonFormsRendererRegistryEntry,
  type Layout,
  type LayoutProps,
  type UISchemaElement,
} from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import type { CSSProperties } from 'react';
import { createFormRenderer } from '../gridstack/form-renderer';
import { FORM_TYPE, GRID_LAYOUT_TYPES } from '../gridstack/grid-layouts';
import { GAP_CLASS, layoutGapOf } from '../gridstack/layout-gap';
import { LayoutNestingContext } from '../gridstack/layout-nesting';
import { gridPlacement, rowPlacement, type FillPlacement } from './fill-placement';

// The fillable form layouts (doc 193 rules 3-10): plain CSS, no gridstack, so no item wrappers insetting content and
// no heights rounded up to grid rows. Class strings are written out in full: Tailwind only generates literal classes.

/** Rule 4: no padding or margin; hidden when its child renders nothing, so an absent child takes no gap. */
const ITEM_CLASS = 'min-w-0 empty:hidden';
/** Rule 8: one column below `sm`, the layout's columns from `sm` up. */
const COLUMNS_CLASS =
  'grid grid-cols-1 sm:[grid-template-columns:repeat(var(--fill-columns),minmax(0,1fr))]';
const PLACED_ITEM_CLASS = `${ITEM_CLASS} sm:[grid-column:var(--fill-column)]`;

interface FillChildProps {
  readonly layout: LayoutProps;
  readonly element: UISchemaElement;
}

/** One child, dispatched with the layout's schema, path, enabled state, renderers and cells. */
function FillChild({ layout, element }: FillChildProps) {
  const { schema, path, enabled, renderers, cells } = layout;
  return (
    <JsonFormsDispatch
      uischema={element}
      schema={schema}
      path={path}
      enabled={enabled}
      {...(renderers ? { renderers } : {})}
      {...(cells ? { cells } : {})}
    />
  );
}

const elementsOf = (uischema: UISchemaElement) => (uischema as Layout).elements ?? [];
const gapClassOf = (uischema: UISchemaElement) => GAP_CLASS[layoutGapOf(uischema.options)];

/** Rule 5: a Form or VerticalLayout — a flex column of its children in order. */
function FillStack(props: LayoutProps) {
  const { uischema, visible } = props;
  if (!visible) return null;
  return (
    <LayoutNestingContext.Provider value>
      <div
        data-slot="fill-layout"
        data-layout-type={uischema.type}
        className={`flex flex-col ${gapClassOf(uischema)}`}
      >
        {elementsOf(uischema).map((element, index) => (
          <div key={index} data-slot="fill-item" className={ITEM_CLASS}>
            <FillChild layout={props} element={element} />
          </div>
        ))}
      </div>
    </LayoutNestingContext.Provider>
  );
}

type Place = (elementOptions: unknown, elements: readonly UISchemaElement[]) => FillPlacement;

/** Rules 6-7: a HorizontalLayout or Grid — a CSS grid placed by `place`. */
function createColumnsLayout(place: Place) {
  function FillColumns(props: LayoutProps) {
    const { uischema, visible } = props;
    if (!visible) return null;
    const { columns, children } = place(uischema.options, elementsOf(uischema));
    return (
      <LayoutNestingContext.Provider value>
        <div
          data-slot="fill-layout"
          data-layout-type={uischema.type}
          className={`${COLUMNS_CLASS} ${gapClassOf(uischema)}`}
          style={{ '--fill-columns': String(columns) } as CSSProperties}
        >
          {children.map(({ element, index, column, minHeight }) => (
            <div
              key={index}
              data-slot="fill-item"
              className={PLACED_ITEM_CLASS}
              style={
                { '--fill-column': column, ...(minHeight ? { minHeight } : {}) } as CSSProperties
              }
            >
              <FillChild layout={props} element={element} />
            </div>
          ))}
        </div>
      </LayoutNestingContext.Provider>
    );
  }
  return FillColumns;
}

const FillStackRenderer = withJsonFormsLayoutProps(FillStack);

/** Rule 3: one entry per layout type — the Form a fragment around the column (doc 192 rule 4). */
export const fillLayoutRenderers: readonly JsonFormsRendererRegistryEntry[] = Object.freeze([
  {
    tester: rankWith(1, uiTypeIs(GRID_LAYOUT_TYPES.grid)),
    renderer: withJsonFormsLayoutProps(createColumnsLayout(gridPlacement)),
  },
  { tester: rankWith(1, uiTypeIs(GRID_LAYOUT_TYPES.vertical)), renderer: FillStackRenderer },
  {
    tester: rankWith(1, uiTypeIs(GRID_LAYOUT_TYPES.horizontal)),
    renderer: withJsonFormsLayoutProps(createColumnsLayout(rowPlacement)),
  },
  { tester: rankWith(1, uiTypeIs(FORM_TYPE)), renderer: createFormRenderer(FillStackRenderer) },
]);
