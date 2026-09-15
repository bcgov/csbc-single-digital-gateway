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
import { dividersOf, FORM_TYPE, GRID_LAYOUT_TYPES } from '../gridstack/grid-layouts';
import { GAP_CLASS, GAP_REM, layoutGapOf } from '../gridstack/layout-gap';
import { LayoutNestingContext } from '../gridstack/layout-nesting';
import { gridPlacement, rowPlacement, type FillPlacement } from './fill-placement';

// The fillable form layouts (doc 193 rules 3-10): plain CSS, no gridstack, so no item wrappers insetting content and
// no heights rounded up to grid rows. Class strings are written out in full: Tailwind only generates literal classes.

/**
 * Rule 4: no padding or margin; hidden when its child renders nothing, so an absent child takes no gap. Doc 194 rule 4b:
 * a Separator is centred top-down in an item taller than it (a Grid row with a min-height or a taller neighbour).
 */
const ITEM_CLASS =
  'min-w-0 empty:hidden has-[>[data-slot=separator]]:flex has-[>[data-slot=separator]]:flex-col has-[>[data-slot=separator]]:justify-center';
/** Rule 8: one column below `sm`, the layout's columns from `sm` up. */
const COLUMNS_CLASS =
  'grid grid-cols-1 sm:[grid-template-columns:repeat(var(--fill-columns),minmax(0,1fr))]';
const PLACED_ITEM_CLASS = `${ITEM_CLASS} sm:[grid-column:var(--fill-column)]`;
/**
 * Doc 194 rule 15: from `sm` up, a rendered child after a rendered child draws a 1px rule centred in the gap before it
 * (`--fill-gap` on the row). `:empty` ignores pseudo-elements, so a child rendering nothing still hides.
 */
const DIVIDER_ITEM_CLASS =
  'relative sm:[:not(:empty)~&:not(:empty)]:before:absolute sm:[:not(:empty)~&:not(:empty)]:before:inset-y-0 sm:[:not(:empty)~&:not(:empty)]:before:left-[calc(var(--fill-gap)/-2)] sm:[:not(:empty)~&:not(:empty)]:before:w-px sm:[:not(:empty)~&:not(:empty)]:before:-translate-x-1/2 sm:[:not(:empty)~&:not(:empty)]:before:bg-border';

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
    <LayoutNestingContext.Provider value="vertical">
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

/** Rules 6-7: a HorizontalLayout or Grid — a CSS grid placed by `place`; children see `kind` (doc 194 rule 6). */
function createColumnsLayout(place: Place, kind: 'grid' | 'horizontal') {
  function FillColumns(props: LayoutProps) {
    const { uischema, visible } = props;
    if (!visible) return null;
    const { columns, children } = place(uischema.options, elementsOf(uischema));
    const dividers = kind === 'horizontal' && dividersOf(uischema.options);
    const style: Record<string, string> = { '--fill-columns': String(columns) };
    if (dividers) style['--fill-gap'] = `${GAP_REM[layoutGapOf(uischema.options)]}rem`;
    return (
      <LayoutNestingContext.Provider value={kind}>
        <div
          data-slot="fill-layout"
          data-layout-type={uischema.type}
          data-dividers={dividers ? '' : undefined}
          className={`${COLUMNS_CLASS} ${gapClassOf(uischema)}`}
          style={style as CSSProperties}
        >
          {children.map(({ element, index, column, minHeight }) => (
            <div
              key={index}
              data-slot="fill-item"
              className={
                dividers ? `${PLACED_ITEM_CLASS} ${DIVIDER_ITEM_CLASS}` : PLACED_ITEM_CLASS
              }
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
    renderer: withJsonFormsLayoutProps(createColumnsLayout(gridPlacement, 'grid')),
  },
  { tester: rankWith(1, uiTypeIs(GRID_LAYOUT_TYPES.vertical)), renderer: FillStackRenderer },
  {
    tester: rankWith(1, uiTypeIs(GRID_LAYOUT_TYPES.horizontal)),
    renderer: withJsonFormsLayoutProps(createColumnsLayout(rowPlacement, 'horizontal')),
  },
  { tester: rankWith(1, uiTypeIs(FORM_TYPE)), renderer: createFormRenderer(FillStackRenderer) },
]);
