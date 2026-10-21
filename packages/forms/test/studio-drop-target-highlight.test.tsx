import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as studioSet from '../src/renderers-studio';
import { GridDragSourceProvider } from '../src/renderers/gridstack/grid-drag-source';
import { GridEditorProvider, type GridEditor } from '../src/renderers/gridstack/grid-editor';

// Doc 224 — a container lights up while a drag it would accept is in progress.
//
// The DRAG itself is a hand check: gridstack drags cannot be scripted (doc 180 records a synthetic
// drag freezing the tab, doc 189 the same for drag-in) and jsdom drives none of it. What is pinned
// here is everything either side of the drag — which containers light for a given source, that the
// answer comes from `accepts`, and that a consumer without the wiring is unchanged.

const schema: JsonSchema = { type: 'object', properties: {} };
// The STUDIO set: the highlight sits on the element's own box (`studio-grid-item` inside a grid,
// `studio-element` for the root), which the bare grid renderers do not draw at all.
const renderers = [
  ...studioSet.controlRenderers,
  ...studioSet.displayRenderers,
  ...studioSet.layoutRenderers,
];

const uischema = {
  type: 'Form',
  id: 'root1',
  elements: [{ type: 'VerticalLayout', id: 'stack1', elements: [] }],
} as unknown as UISchemaElement;

const editorFor = (accepts?: GridEditor['accepts']): GridEditor => ({
  idOf: (element) => String((element as { id?: string }).id ?? 'anon'),
  onGesture: () => {},
  ...(accepts ? { accepts } : {}),
});

function renderCanvas(
  source: { template: string } | { elementId: string } | null,
  editor: GridEditor,
) {
  return render(
    <GridEditorProvider value={editor}>
      <GridDragSourceProvider value={source}>
        <JsonForms
          schema={schema}
          uischema={uischema}
          data={{}}
          renderers={renderers}
          cells={studioSet.cells}
        />
      </GridDragSourceProvider>
    </GridEditorProvider>,
  );
}

/**
 * Every element box currently lit. Rule 3: the highlight is the CONTAINER's own box — `studio-grid-item`
 * for anything inside a grid, `studio-element` for the root — not the grid's drop area, so a Section's
 * heading and padding light with it.
 */
const lit = () => [
  ...document.querySelectorAll(
    '[data-slot="studio-grid-item"].bg-blue-10, [data-slot="studio-element"].bg-blue-10',
  ),
];

describe('a container lights only while a drag is in progress (rule 1)', () => {
  it('lights nothing when nothing is being dragged', () => {
    renderCanvas(null, editorFor());
    expect(lit()).toHaveLength(0);
  });

  it('lights while a drag is in progress', () => {
    renderCanvas({ template: 'text' }, editorFor());
    expect(lit().length).toBeGreaterThan(0);
  });
});

describe('it lights only what `accepts` admits (rules 2, 4)', () => {
  it('asks accepts with the source being dragged, and stays dark when refused', () => {
    const asked: unknown[] = [];
    renderCanvas(
      { template: 'separator' },
      editorFor((layout, source, layoutId) => {
        asked.push({ layout, source, layoutId });
        return false;
      }),
    );
    expect(lit()).toHaveLength(0);
    // The SAME source the drop would carry — one predicate, so a lit container can never refuse.
    expect(asked).toContainEqual(expect.objectContaining({ source: { template: 'separator' } }));
  });

  it('lights the container that accepts and leaves the one that refuses dark', () => {
    // `accepts` is asked per layout ELEMENT ID (doc 216 rule 12), which is what lets one container
    // light while another on the same canvas does not.
    renderCanvas(
      { template: 'text' },
      editorFor((_layout, _source, layoutId) => layoutId === 'stack1'),
    );
    const litIds = lit().length;
    expect(litIds).toBe(1);
  });

  it('lights everything when the editor declares no accepts at all', () => {
    // An editor without the optional gate admits every candidate, so the highlight follows.
    renderCanvas({ elementId: 'x1' }, editorFor());
    expect(lit().length).toBeGreaterThan(0);
  });
});

describe('the palette announces its own drags (rule 5)', () => {
  it('calls beginDrag with the pressed template, since no grid hears a drag-in start', async () => {
    const { PaletteItemRenderer } = await import('../src/renderers/studio-palette/palette-item');
    const { StudioPaletteProvider } =
      await import('../src/renderers/studio-palette/palette-actions');
    const began: string[] = [];
    render(
      <StudioPaletteProvider value={{ add: () => {}, beginDrag: (t) => began.push(t) }}>
        <PaletteItemRenderer
          uischema={{ type: 'PaletteItem', template: 'text', label: 'Text' } as never}
        />
      </StudioPaletteProvider>,
    );
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Text' }));
    expect(began).toEqual(['text']);
  });

  it('stays silent for an item that is activated but never dragged in', async () => {
    const { PaletteItemRenderer } = await import('../src/renderers/studio-palette/palette-item');
    const { StudioPaletteProvider } =
      await import('../src/renderers/studio-palette/palette-actions');
    const began: string[] = [];
    render(
      <StudioPaletteProvider value={{ add: () => {}, beginDrag: (t) => began.push(t) }}>
        <PaletteItemRenderer
          uischema={
            {
              type: 'PaletteItem',
              template: 'stage',
              label: 'Stage',
              options: { dragIn: false },
            } as never
          }
        />
      </StudioPaletteProvider>,
    );
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Stage' }));
    expect(began).toEqual([]);
  });
});

describe('click-to-add obeys the same capability as the drag (doc 221 B2)', () => {
  // The drag path was gated all along, which is exactly what hid this: dragging into a locked
  // container was refused while CLICKING a palette item with that container selected inserted anyway.
  // `insertElement`'s capability argument is OPTIONAL, so omitting it typechecked and the gate sat
  // there consulting `undefined`.
  const CLOSED = {
    edit: 'none',
    remove: false,
    move: false,
    addChildren: false,
    removeChildren: false,
    reorderChildren: false,
    edges: false,
  } as const;

  const docWith = () =>
    ({
      type: 'Form',
      id: 'root1',
      elements: [{ type: 'VerticalLayout', id: 'stack1', elements: [] }],
    }) as unknown as UISchemaElement;

  /**
   * Studio ids are per-mount COUNTERS (doc 197), not the authored `id`, so the target must be the id
   * `ids.idOf` hands back for that layout. Addressing it by its authored name made `findById` miss and
   * `insertElement` return undefined — which is also what a refusal looks like, so the locked case
   * passed while proving nothing. The ungoverned case is what caught it.
   */
  const insertInto = async (capabilities: unknown) => {
    const { insertElement } = await import('../src/studio/layout/insert-element');
    const { createElementIds } = await import('../src/studio/layout/element-ids');
    const ids = createElementIds();
    const uischema = docWith();
    const document = { schema, uischema };
    const layout = (uischema as unknown as { elements: UISchemaElement[] }).elements[0]!;
    const gridId = ids.idOf(layout);
    return insertElement(
      document,
      'text',
      { gridId, placement: { x: 0, y: 0, w: 12 }, nodes: [] },
      ids,
      () => 'k1',
      capabilities as never,
    );
  };

  it('refuses an insert into a container the template locked', async () => {
    expect((await insertInto({ default: { '*': CLOSED } })).inserted).toBeUndefined();
  });

  it('still inserts when ungoverned, so an untemplated document is unchanged', async () => {
    expect((await insertInto(undefined)).inserted).toBeDefined();
  });
});
