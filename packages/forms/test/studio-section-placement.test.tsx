import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  allowedInLayout,
  GRID_LAYOUT_TYPES,
  isGridLayoutType,
  layoutKindOf,
  SECTION_TYPE,
} from '../src/renderers/gridstack/grid-layouts';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { applyMove } from '../src/studio/layout/apply-layout';
import { createElementIds } from '../src/studio/layout/element-ids';
import { addTargetId, insertElement } from '../src/studio/layout/insert-element';
import { PALETTE_TEMPLATES } from '../src/studio/palette/palette-templates';

// Doc 212 rules 4-7, 19, 23 — where a Section may sit, enforced once in `allowedInLayout` and restated by the
// metaschema, plus the palette entry that creates one.

const schema: JsonSchema = { type: 'object', properties: {} };
const el = (element: object) => element as UISchemaElement;
const noKey = () => 'unused';

const ajv = createAjv();
const validate = ajv.compile(UISCHEMA_METASCHEMA);
const uischemaOk = (uischema: unknown) => validate(uischema) === true;
const section = (element: object = {}) => ({ type: 'Section', elements: [], ...element });
/** Doc 201 rule 15: a Form's title is required, so every Form fixture carries one. */
const formOf = (...elements: object[]) => el({ type: 'Form', label: 'Untitled form', elements });

function fixture() {
  const stack = el({ type: 'VerticalLayout', elements: [] });
  const row = el({ type: 'HorizontalLayout', options: { columns: 2 }, elements: [] });
  const grid = el({ type: 'Grid', elements: [] });
  const inner = el(section({ label: 'Inner' }));
  const outer = el(section({ label: 'Outer', elements: [inner] }));
  const root = formOf(stack, row, grid, outer);
  const ids = createElementIds();
  return { stack, row, grid, inner, outer, root, ids, document: { schema, uischema: root } };
}

describe('allowedInLayout (rules 4-6)', () => {
  it('admits a Section at the root, in a VerticalLayout and in another Section', () => {
    // A Section's own kind is `vertical` (rule 6), so "in another Section" IS the vertical case.
    expect(allowedInLayout(SECTION_TYPE, 'vertical')).toBe(true);
    expect(layoutKindOf(SECTION_TYPE)).toBe('vertical');
  });

  it('refuses a Section in a HorizontalLayout row', () => {
    expect(allowedInLayout(SECTION_TYPE, 'horizontal')).toBe(false);
  });

  it('refuses a Section in a Grid', () => {
    expect(allowedInLayout(SECTION_TYPE, 'grid')).toBe(false);
  });

  it('still refuses a Form inside a Section — root-only is unchanged (rule 7)', () => {
    // `NEVER_IN_LAYOUT` refuses a Form in every kind, and a Section is just another vertical layout.
    for (const kind of ['vertical', 'horizontal', 'grid'] as const)
      expect(allowedInLayout('Form', kind), kind).toBe(false);
  });

  it('leaves the placement of every other element alone', () => {
    expect(allowedInLayout('Heading', 'grid')).toBe(true);
    expect(allowedInLayout('Separator', 'horizontal')).toBe(false);
    expect(allowedInLayout('Separator', 'vertical')).toBe(true);
  });
});

describe('the one rule, in the one place (rule 5)', () => {
  it('refuses an insert into a row rather than inserting and reverting', () => {
    const { row, ids, document } = fixture();
    addTargetId(document.uischema, null, ids);

    const result = insertElement(document, 'section', { gridId: ids.idOf(row) }, ids, noKey);

    expect(result.inserted).toBeUndefined();
    expect(result.uischema).toBe(document.uischema);
  });

  it('refuses an insert into a Grid', () => {
    const { grid, ids, document } = fixture();
    addTargetId(document.uischema, null, ids);

    const result = insertElement(document, 'section', { gridId: ids.idOf(grid) }, ids, noKey);

    expect(result.inserted).toBeUndefined();
  });

  it('accepts an insert into a VerticalLayout and into another Section', () => {
    const { stack, outer, ids, document } = fixture();
    addTargetId(document.uischema, null, ids);

    for (const target of [stack, outer]) {
      const result = insertElement(document, 'section', { gridId: ids.idOf(target) }, ids, noKey);
      expect(result.inserted).toBeDefined();
    }
  });

  it('refuses a MOVE into a row and into a Grid, so gridstack never leaves a ghost item', () => {
    const f = fixture();
    const move = (toGridId: string) => ({
      elementId: f.ids.idOf(f.inner),
      fromGridId: f.ids.idOf(f.outer),
      toGridId,
      fromNodes: [],
      toNodes: [],
    });

    // Doc 194: refusing only in write-back would leave gridstack's DOM moved.
    expect(applyMove(f.root, move(f.ids.idOf(f.row)), f.ids)).toBe(f.root);
    expect(applyMove(f.root, move(f.ids.idOf(f.grid)), f.ids)).toBe(f.root);
  });

  it('allows a MOVE into a VerticalLayout', () => {
    const f = fixture();
    const moved = applyMove(
      f.root,
      {
        elementId: f.ids.idOf(f.inner),
        fromGridId: f.ids.idOf(f.outer),
        toGridId: f.ids.idOf(f.stack),
        fromNodes: [],
        toNodes: [],
      },
      f.ids,
    );

    expect(moved).not.toBe(f.root);
  });
});

describe('the layout kind (Architecture)', () => {
  it('reports Section as the vertical kind, so every kind-keyed path handles it', () => {
    expect(layoutKindOf('Section')).toBe('vertical');
    expect(layoutKindOf('Form')).toBe('vertical');
  });

  it('is NOT in GRID_LAYOUT_TYPES, which would displace VerticalLayout for the axis testers', () => {
    // One type per kind there; this map is read by the axis testers and by `fill-layouts`.
    expect(GRID_LAYOUT_TYPES.vertical).toBe('VerticalLayout');
    expect(Object.values(GRID_LAYOUT_TYPES)).not.toContain('Section');
  });

  it('is a grid layout type, so the studio does not render it inert', () => {
    // `studio-content.tsx` locks anything that is not one, which would freeze a Section's own children.
    expect(isGridLayoutType('Section')).toBe(true);
  });
});

describe('the metaschema (rule 23)', () => {
  it('lists Section in the element type enum', () => {
    const element = UISCHEMA_METASCHEMA.definitions?.['element'] as unknown as {
      properties: { type: { enum: readonly string[] } };
    };
    expect(element.properties.type.enum).toContain('Section');
  });

  it('accepts a Section with elements, gap, variant, inset and a rich description', () => {
    expect(
      uischemaOk(
        formOf(
          section({
            label: 'Contact',
            options: {
              gap: 'lg',
              variant: 'container',
              inset: 'xl',
              description: { root: {} },
            },
            elements: [{ type: 'Heading', text: 'One' }],
          }),
        ),
      ),
    ).toBe(true);
  });

  it('accepts a bare Section, and a Section inside a Section', () => {
    expect(uischemaOk(formOf(section()))).toBe(true);
    expect(uischemaOk(formOf(section({ elements: [section()] })))).toBe(true);
  });

  it('refuses a Section with no elements key', () => {
    expect(uischemaOk(formOf({ type: 'Section', label: 'No children' }))).toBe(false);
  });

  it('refuses an unknown variant and an unknown inset', () => {
    expect(uischemaOk(formOf(section({ options: { variant: 'boxed' } })))).toBe(false);
    expect(uischemaOk(formOf(section({ options: { inset: 'xxl' } })))).toBe(false);
    // And a plain-string description, for doc 207's reason: it would render nothing.
    expect(uischemaOk(formOf(section({ options: { description: 'plain text' } })))).toBe(false);
  });

  it('refuses a Section inside a HorizontalLayout row, restating rule 4', () => {
    expect(
      uischemaOk(
        formOf({ type: 'HorizontalLayout', options: { columns: 2 }, elements: [section()] }),
      ),
    ).toBe(false);
  });

  it('refuses a Section inside a Grid, restating rule 4', () => {
    expect(uischemaOk(formOf({ type: 'Grid', elements: [section()] }))).toBe(false);
  });

  it('carries NO description on its `if`, so Monaco hover stays clean (doc 191 rule 11)', () => {
    const element = UISCHEMA_METASCHEMA.definitions?.['element'] as unknown as {
      allOf: readonly { if: unknown }[];
    };
    for (const branch of element.allOf)
      expect(JSON.stringify(branch.if)).not.toContain('description');
  });
});

describe('the palette entry (rule 19)', () => {
  it('offers a Section in the layout group', () => {
    const entry = PALETTE_TEMPLATES.find((template) => template.key === 'section');
    expect(entry?.group).toBe('layout');
    expect(entry?.label).toBe('Section');
    expect(entry?.icon).toBeTruthy();
  });

  it('builds a Section with empty elements and NO authored options', () => {
    const { ids, document } = fixture();
    const gridId = addTargetId(document.uischema, null, ids);

    const result = insertElement(document, 'section', { gridId }, ids, noKey);
    const inserted = result.inserted;
    expect(inserted).toBeDefined();

    const added = (result.uischema as unknown as { elements: UISchemaElement[] }).elements.at(-1);
    expect(added?.type).toBe('Section');
    // Entirely defaults: the inspector then shows what it IS, not what it was stamped with.
    expect((added as unknown as { elements: unknown[] }).elements).toEqual([]);
    expect(added?.options?.['variant']).toBeUndefined();
    expect(added?.options?.['inset']).toBeUndefined();
    expect(added?.options?.['gap']).toBeUndefined();
  });
});
