import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as studioSet from '../src/renderers-studio';
import { renderSeededStudio } from './render-studio';

// Doc 186 rules 1-7 — the root element's hover and selection, and Escape walking up to the parent.

const itemOf = (element: Element) => {
  const item = element.closest<HTMLElement>('[data-slot="studio-grid-item"]');
  if (!item) throw new Error('not inside a studio grid item');
  return item;
};

const marked = (flag: 'data-hovered' | 'data-selected') =>
  Array.from(document.querySelectorAll<HTMLElement>(`[data-slot="studio-grid-item"][${flag}]`));

const actionMenus = () => screen.queryAllByRole('dialog', { name: 'Element actions' });
const hoverOver = (element: Element) => fireEvent.pointerOver(element);
const press = (element: Element) => fireEvent.pointerDown(element);
const escape = () => fireEvent.keyDown(document, { key: 'Escape' });

async function renderStudio() {
  const view = renderSeededStudio();
  const name = itemOf(await screen.findByRole('textbox', { name: 'Name' }));
  const email = itemOf(await screen.findByRole('textbox', { name: 'Email' }));
  // The sample's root is a Form (doc 192 rule 8); only the root is framed outside a grid item.
  const rootFrame = view.container.querySelector<HTMLElement>(
    '[data-slot="studio-element"][data-element-type="Form"]',
  );
  const centre = view.container.querySelector<HTMLElement>(
    '[data-slot="form-studio-center-panel"]',
  );
  if (!rootFrame || !centre) throw new Error('studio did not render its root frame and canvas');
  return { ...view, name, email, rootFrame, centre };
}

describe('root frame (rules 1-2)', () => {
  it('carries the root element id under the studio', async () => {
    const { rootFrame, name } = await renderStudio();
    expect(rootFrame).toHaveAttribute('data-element-id', expect.stringMatching(/^el-\d+$/));
    expect(rootFrame.getAttribute('data-element-id')).not.toBe(
      name.getAttribute('data-element-id'),
    );
  });

  // Arbitrary `data-[…]` variants: shadcn/tailwind.css redefines `data-selected:` to match only
  // `[data-selected="true"]`, which the frame's presence flag never matches (browser-found, doc 186).
  it('draws a hovered frame dashed ring and a selected one solid ring', async () => {
    const { rootFrame } = await renderStudio();
    expect(rootFrame).toHaveClass(
      'border-dashed',
      'data-[hovered]:border-ring',
      'data-[selected]:border-ring',
      'data-[selected]:border-solid',
    );
    expect(rootFrame).not.toHaveClass('data-[hovered]:border-solid');
    expect(rootFrame.className).not.toMatch(/(^|\s)data-(hovered|selected):/);
  });

  it('renders the frame without an id or flags outside the Form Studio', async () => {
    const schema: JsonSchema = { type: 'object', properties: {} };
    const uischema = {
      type: 'VerticalLayout',
      elements: [{ type: 'Heading', text: 'Bare' }],
    } as UISchemaElement;
    const { container } = render(
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={{}}
        renderers={[
          ...studioSet.controlRenderers,
          ...studioSet.displayRenderers,
          ...studioSet.layoutRenderers,
        ]}
        cells={studioSet.cells}
      />,
    );
    await screen.findByRole('heading', { name: 'Bare' });
    const frame = container.querySelector('[data-slot="studio-element"]');
    expect(frame).not.toBeNull();
    expect(frame).not.toHaveAttribute('data-element-id');
    expect(frame).not.toHaveAttribute('data-hovered');
    expect(frame).not.toHaveAttribute('data-selected');
  });
});

describe('root hover (rule 3)', () => {
  it('hovers the root when the pointer is over its frame outside every grid item', async () => {
    const { rootFrame } = await renderStudio();
    hoverOver(rootFrame);
    expect(rootFrame).toHaveAttribute('data-hovered');
    expect(marked('data-hovered')).toEqual([]);
  });

  it('hovers the root over the gaps between its items', async () => {
    const { rootFrame } = await renderStudio();
    hoverOver(rootFrame.querySelector('.grid-stack') as HTMLElement);
    expect(rootFrame).toHaveAttribute('data-hovered');
  });

  it('hovers the innermost grid item, not the root, over an item', async () => {
    const { rootFrame, name } = await renderStudio();
    hoverOver(rootFrame);
    expect(rootFrame).toHaveAttribute('data-hovered');
    hoverOver(name);
    expect(marked('data-hovered')).toEqual([name]);
    expect(rootFrame).not.toHaveAttribute('data-hovered');
  });

  it('clears root hover when the pointer moves onto the canvas outside the root frame', async () => {
    const { rootFrame, centre } = await renderStudio();
    hoverOver(rootFrame);
    expect(rootFrame).toHaveAttribute('data-hovered');
    hoverOver(centre);
    expect(rootFrame).not.toHaveAttribute('data-hovered');
  });
});

describe('root selection (rules 4-6)', () => {
  it('selects the root when its frame is pressed, moving the selection off an item', async () => {
    const { rootFrame, name } = await renderStudio();
    press(name);
    press(rootFrame);
    expect(rootFrame).toHaveAttribute('data-selected');
    expect(marked('data-selected')).toEqual([]);
  });

  it('deselects the root when the canvas outside the root frame is pressed', async () => {
    const { rootFrame, centre } = await renderStudio();
    press(rootFrame);
    expect(rootFrame).toHaveAttribute('data-selected');
    press(centre);
    expect(rootFrame).not.toHaveAttribute('data-selected');
  });

  it('shows no actions popover for the hovered or selected root', async () => {
    const { rootFrame, name } = await renderStudio();
    hoverOver(name);
    await waitFor(() => expect(actionMenus()).toHaveLength(1));

    hoverOver(rootFrame);
    press(rootFrame);
    await waitFor(() => expect(actionMenus()).toHaveLength(0));
    expect(rootFrame).toHaveAttribute('data-hovered');
    expect(rootFrame).toHaveAttribute('data-selected');
  });

  it('keeps the root selected after the document changes under it', async () => {
    const { rootFrame, name } = await renderStudio();
    press(rootFrame);
    hoverOver(name);
    const menu = await screen.findByRole('dialog', { name: 'Element actions' });
    fireEvent.click(within(menu).getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete element?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument(),
    );
    expect(rootFrame).toHaveAttribute('data-selected');
  });
});

describe('Escape (rule 7)', () => {
  it('selects the parent on each press, then the root, then nothing', async () => {
    const { rootFrame, email } = await renderStudio();
    const row = itemOf(email.parentElement as HTMLElement);
    const contact = itemOf(row.parentElement as HTMLElement);
    expect(row).toHaveAttribute('data-element-type', 'HorizontalLayout');
    expect(contact).toHaveAttribute('data-element-type', 'VerticalLayout');

    press(email);
    escape();
    expect(marked('data-selected')).toEqual([row]);
    escape();
    expect(marked('data-selected')).toEqual([contact]);
    escape();
    expect(marked('data-selected')).toEqual([]);
    expect(rootFrame).toHaveAttribute('data-selected');
    escape();
    expect(rootFrame).not.toHaveAttribute('data-selected');
  });

  it('does nothing when nothing is selected', async () => {
    const { rootFrame } = await renderStudio();
    escape();
    expect(marked('data-selected')).toEqual([]);
    expect(rootFrame).not.toHaveAttribute('data-selected');
  });
});
