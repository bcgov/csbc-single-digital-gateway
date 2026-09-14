import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import type { GridHTMLElement, GridItemHTMLElement } from 'gridstack';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers-default';
import { GridEditorProvider, type GridEditor } from '../src/renderers-gridstack';
import { rowHasRoom } from '../src/renderers/gridstack/grid-layouts';
import { createElementIds } from '../src/studio/layout/element-ids';

// Doc 180 bug B3 — a HorizontalLayout's `maxRow: 1` capped every item at one 1rem grid row, hiding its
// content; drops are now refused by a free-column check instead (rules 27, 30).

const schema: JsonSchema = { type: 'object', properties: {} };

const heading = (text: string, gridItem?: object) =>
  ({ type: 'Heading', text, ...(gridItem ? { options: { gridItem } } : {}) }) as UISchemaElement;

function renderRow(uischema: object, editor?: GridEditor) {
  const form = (
    <JsonForms
      schema={schema}
      uischema={uischema as UISchemaElement}
      data={{}}
      renderers={[...defaults.displayRenderers, ...defaults.layoutRenderers]}
      cells={defaults.cells}
    />
  );
  return render(editor ? <GridEditorProvider value={editor}>{form}</GridEditorProvider> : form);
}

const rootOf = (container: HTMLElement) => container.querySelector<GridHTMLElement>('.grid-stack');

/** A foreign grid item, as gridstack hands it to `acceptWidgets` during a drag. */
function draggedItem() {
  const el = document.createElement('div');
  el.className = 'grid-stack-item';
  return el;
}

describe('HorizontalLayout item height (bug B3)', () => {
  it('sets no row cap, so an item can grow taller than one grid row', async () => {
    const { container } = renderRow({
      type: 'HorizontalLayout',
      elements: [heading('Left'), heading('Right')],
    });
    await screen.findByRole('heading', { name: 'Right' });
    await act(async () => {});
    const grid = rootOf(container)?.gridstack;
    const item = screen
      .getByRole('heading', { name: 'Left' })
      .closest<GridItemHTMLElement>('.grid-stack-item');

    expect(grid?.opts.maxRow).toBe(0);
    act(() => {
      if (item) grid?.update(item, { h: 5 });
    });
    expect(item?.gridstackNode?.h).toBe(5);
    expect(item?.gridstackNode?.y).toBe(0);
  });
});

describe('rowHasRoom (rule 30)', () => {
  it('is true only while the children widths leave a free column', () => {
    expect(rowHasRoom({ columns: 4 }, [heading('A', { w: 2 }), heading('B')])).toBe(true);
    expect(rowHasRoom({ columns: 3 }, [heading('A', { w: 2 }), heading('B')])).toBe(false);
    // Without authored columns the row has one column per child (at least 2).
    expect(rowHasRoom(undefined, [heading('A'), heading('B')])).toBe(false);
    expect(rowHasRoom(undefined, [heading('A')])).toBe(true);
  });
});

describe('drops into a HorizontalLayout (bug B3, rule 30)', () => {
  /** The mounted row's `acceptWidgets`, and the view's `unmount` so a second row can render alone. */
  async function acceptWidgetsOf(uischema: object) {
    const ids = createElementIds();
    const { container, unmount } = renderRow(uischema, {
      idOf: (el) => ids.idOf(el),
      onGesture: () => {},
    });
    await screen.findByRole('heading', { name: 'B' });
    await act(async () => {});
    const accept = rootOf(container)?.gridstack?.opts.acceptWidgets;
    return { accept: typeof accept === 'function' ? accept : undefined, unmount };
  }

  it('refuses a foreign item when the row is full, and accepts one while a column is free', async () => {
    const full = await acceptWidgetsOf({
      type: 'HorizontalLayout',
      options: { columns: 3 },
      elements: [heading('A', { w: 2 }), heading('B')],
    });
    expect(full.accept).toBeDefined();
    expect(full.accept?.(draggedItem())).toBe(false);
    full.unmount();

    const { accept: open } = await acceptWidgetsOf({
      type: 'HorizontalLayout',
      options: { columns: 4 },
      elements: [heading('A', { w: 2 }), heading('B')],
    });
    expect(open?.(draggedItem())).toBe(true);
  });
});
