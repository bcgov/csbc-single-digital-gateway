import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import type { GridHTMLElement } from 'gridstack';
import { describe, expect, it } from 'vitest';
import {
  createGridRenderers,
  GridEditorProvider,
  type GridEditor,
} from '../src/renderers-gridstack';
import * as ui from '../src/renderers-ui';

// Doc 183 rule 16c (doc 189 bug B4) — a Grid whose last element is removed loses its last gridstack item too.
// gridstack 13.2.0's updateOptions only calls load(children) for a non-empty `children`, so it cannot do this itself.

const schema: JsonSchema = { type: 'object', properties: {} };
const set = createGridRenderers({ gridOptions: { staticGrid: false } });
const renderers = [...ui.displayRenderers, ...set.layoutRenderers];

function fakeEditor(): GridEditor {
  const ids = new WeakMap<object, string>();
  let next = 0;
  return {
    idOf: (element) => {
      if (!ids.has(element)) ids.set(element, `e${++next}`);
      return ids.get(element) as string;
    },
    onGesture: () => {},
  };
}

const form = (uischema: object, editor: GridEditor) => (
  <GridEditorProvider value={editor}>
    <JsonForms
      schema={schema}
      uischema={uischema as UISchemaElement}
      data={{}}
      renderers={renderers}
      cells={[]}
    />
  </GridEditorProvider>
);

describe('removing the last element of a Grid (doc 183 rule 16c)', () => {
  it('leaves no gridstack item behind', async () => {
    const editor = fakeEditor();
    const view = render(
      form({ type: 'Grid', elements: [{ type: 'Heading', text: 'Only' }] }, editor),
    );
    await screen.findByRole('heading', { name: 'Only' });
    await act(async () => {});
    const items = () => view.container.querySelectorAll('.grid-stack > .grid-stack-item');
    expect(items()).toHaveLength(1);

    view.rerender(form({ type: 'Grid', elements: [] }, editor));
    await act(async () => {});

    expect(items()).toHaveLength(0);
    const root = view.container.querySelector<GridHTMLElement>('.grid-stack');
    expect(root?.gridstack?.engine.nodes).toHaveLength(0);
  });

  it('still reloads a Grid that keeps some elements', async () => {
    const editor = fakeEditor();
    const kept = { type: 'Heading', text: 'Kept' };
    const view = render(
      form({ type: 'Grid', elements: [kept, { type: 'Heading', text: 'Gone' }] }, editor),
    );
    await screen.findByRole('heading', { name: 'Gone' });
    await act(async () => {});

    view.rerender(form({ type: 'Grid', elements: [kept] }, editor));
    await act(async () => {});

    expect(view.container.querySelectorAll('.grid-stack > .grid-stack-item')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Kept' })).toBeInTheDocument();
  });
});
