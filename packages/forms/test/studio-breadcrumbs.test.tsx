import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { mdiFileDocumentOutline } from '@mdi/js';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { GridHTMLElement } from 'gridstack';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';

// Doc 186 rules 8-18 — the footer breadcrumb trail.

type GestureHandler = (event: Event, el: HTMLElement) => void;

const itemOf = (element: Element) => {
  const item = element.closest<HTMLElement>('[data-slot="studio-grid-item"]');
  if (!item) throw new Error('not inside a studio grid item');
  return item;
};

const trail = () => screen.getByRole('navigation', { name: 'Element path' });
const queryTrail = () => screen.queryByRole('navigation', { name: 'Element path' });
/** Every button in the trail, by accessible name (text, or aria-label for the ⋯ trigger). */
const crumbButtons = () => within(trail()).queryAllByRole('button');
const crumbNames = () =>
  crumbButtons().map((button) => button.getAttribute('aria-label') ?? button.textContent);
const crumb = (label: string) => within(trail()).getByRole('button', { name: label });
const current = () => trail().querySelector<HTMLElement>('[aria-current="page"]');
const actionsFor = (item: HTMLElement) =>
  document.querySelector(`[data-studio-actions-for="${item.getAttribute('data-element-id')}"]`);

/** The single studio grid item of `type` in a document holding one of each. */
const itemOfType = (type: string) => {
  const item = document.querySelector<HTMLElement>(
    `[data-slot="studio-grid-item"][data-element-type="${type}"]`,
  );
  if (!item) throw new Error(`no ${type} item`);
  return item;
};

const press = (element: Element) => fireEvent.pointerDown(element);
const enter = (element: Element) => fireEvent.pointerEnter(element);
/** Leaves towards the footer, so the studio's window-exit rule (relatedTarget null) cannot clear hover. */
const leave = (element: Element) =>
  fireEvent.pointerLeave(element, {
    relatedTarget: document.querySelector('[data-slot="form-studio-footer"]'),
  });

async function renderStudio() {
  const view = render(<FormStudio />);
  const name = itemOf(await screen.findByRole('textbox', { name: 'Name' }));
  const email = itemOf(screen.getByRole('textbox', { name: 'Email' }));
  const city = itemOf(screen.getByRole('textbox', { name: 'City' }));
  const delivery = itemOf(city.parentElement as HTMLElement);
  const greeting = itemOf(screen.getByRole('heading', { name: 'Hello, FormStudio!' }));
  const rootFrame = view.container.querySelector<HTMLElement>(
    '[data-slot="studio-element"][data-element-type="VerticalLayout"]',
  );
  if (!rootFrame) throw new Error('no root frame');
  return { ...view, name, email, city, delivery, greeting, rootFrame };
}

/** gridstack keeps drag/resize callbacks on the instance rather than as DOM listeners (see grid-editor.test). */
function gestureHandlers(container: HTMLElement) {
  const root = container.querySelector<GridHTMLElement>('.grid-stack');
  const grid = root?.gridstack as unknown as
    | { _gsEventHandler: Record<string, GestureHandler | undefined> }
    | undefined;
  // eslint-disable-next-line no-underscore-dangle -- gridstack's own private handler table
  return grid?._gsEventHandler ?? {};
}

describe('placement (rule 8)', () => {
  it('renders the trail first in a one-line, fixed-height footer', async () => {
    await renderStudio();
    const footer = document.querySelector('[data-slot="form-studio-footer"]');
    expect(footer).toHaveClass(
      'h-9',
      'shrink-0',
      'grow-0',
      'border-t',
      'flex',
      'items-center',
      'px-2',
    );
    expect(footer?.firstElementChild).toBe(trail());
    expect(trail().querySelector('[data-slot="breadcrumb-list"]')).toHaveClass('flex-nowrap');
  });
});

describe('path (rules 9-11)', () => {
  it('shows only the root, as a button and not current, when nothing is selected', async () => {
    await renderStudio();
    expect(crumbNames()).toEqual(['VerticalLayout']);
    expect(current()).toBeNull();
  });

  it('shows root › ancestors › the selected element, which is current and not a button', async () => {
    const { email } = await renderStudio();
    press(email);
    expect(crumbNames()).toEqual(['VerticalLayout', 'VerticalLayout', 'HorizontalLayout']);
    expect(current()).toHaveTextContent('Email');
    expect(current()?.tagName).not.toBe('BUTTON');
    expect(trail().querySelectorAll('[data-slot="breadcrumb-separator"]')).toHaveLength(3);
    // Four segments do not collapse (rule 16).
    expect(within(trail()).queryByRole('button', { name: 'Show hidden path' })).toBeNull();
  });

  it('shows the root as a document icon named and titled by its label (rule 10b)', async () => {
    await renderStudio();
    const root = crumb('VerticalLayout');
    expect(root).toHaveAttribute('aria-label', 'VerticalLayout');
    expect(root).toHaveAttribute('title', 'VerticalLayout');
    expect(root.querySelector('svg path')).toHaveAttribute('d', mdiFileDocumentOutline);
    expect(root).toHaveTextContent('');
  });

  it('truncates long labels and keeps the full label in a title', async () => {
    const { email } = await renderStudio();
    press(email);
    // The root segment is an icon (rule 10b); every labelled segment truncates.
    for (const button of crumbButtons().slice(1)) {
      expect(button).toHaveClass('max-w-40', 'truncate');
      expect(button).toHaveAttribute('title', button.textContent);
    }
    expect(current()).toHaveAttribute('title', 'Email');
  });

  it('shows the root as current when the root is selected', async () => {
    const { rootFrame } = await renderStudio();
    press(rootFrame);
    expect(crumbNames()).toEqual([]);
    expect(current()).toHaveAttribute('aria-label', 'VerticalLayout');
    expect(current()?.querySelector('svg path')).toHaveAttribute('d', mdiFileDocumentOutline);
  });

  it('labels a Heading by its text', async () => {
    const { greeting } = await renderStudio();
    press(greeting);
    expect(current()).toHaveTextContent('Hello, FormStudio!');
  });

  it('falls back to the root after the selected element is deleted', async () => {
    const { name } = await renderStudio();
    press(name);
    expect(current()).toHaveTextContent('Name');
    const menu = await screen.findByRole('dialog', { name: 'Element actions' });
    fireEvent.click(within(menu).getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete element?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(crumbNames()).toEqual(['VerticalLayout']));
    expect(current()).toBeNull();
  });
});

describe('hover (rules 12-13, 15)', () => {
  it("hovers a segment's element, opening its actions popover, and clears on leave", async () => {
    const { city, delivery } = await renderStudio();
    press(city);
    const grid = crumb('Grid');

    enter(grid);
    expect(delivery).toHaveAttribute('data-hovered');
    await waitFor(() => expect(actionsFor(delivery)).not.toBeNull());

    // The studio's own pointer listeners leave a breadcrumb hover alone (rule 15).
    fireEvent.pointerOver(grid);
    expect(delivery).toHaveAttribute('data-hovered');

    leave(grid);
    expect(delivery).not.toHaveAttribute('data-hovered');
    await waitFor(() => expect(actionsFor(delivery)).toBeNull());
    // The selected City keeps its popover.
    expect(actionsFor(city)).not.toBeNull();
  });

  it('hovers the root frame from the root segment, with no actions popover', async () => {
    const { rootFrame } = await renderStudio();
    enter(crumb('VerticalLayout'));
    expect(rootFrame).toHaveAttribute('data-hovered');
    expect(actionsFor(rootFrame)).toBeNull();
  });

  it('hovers the selected element from the current segment', async () => {
    const { city } = await renderStudio();
    press(city);
    enter(current() as HTMLElement);
    expect(city).toHaveAttribute('data-hovered');
  });

  it('ignores segment hover while a drag is in progress', async () => {
    const { container, city, delivery } = await renderStudio();
    press(city);
    const handlers = gestureHandlers(container);
    const box = city.closest('.grid-stack-item') as HTMLElement;

    act(() => handlers.dragstart?.(new Event('dragstart'), box));
    enter(crumb('Grid'));
    expect(delivery).not.toHaveAttribute('data-hovered');

    act(() => handlers.dragstop?.(new Event('dragstop'), box));
    enter(crumb('Grid'));
    expect(delivery).toHaveAttribute('data-hovered');
  });
});

describe('click (rule 14)', () => {
  it("selects a segment's element", async () => {
    const { city, delivery } = await renderStudio();
    press(city);
    fireEvent.click(crumb('Grid'));
    expect(delivery).toHaveAttribute('data-selected');
    expect(city).not.toHaveAttribute('data-selected');
    expect(crumbNames()).toEqual(['VerticalLayout']);
    expect(current()).toHaveTextContent('Grid');
  });
});

describe('collapse (rule 16)', () => {
  const schema: JsonSchema = {
    type: 'object',
    properties: { deepKey01: { type: 'string', title: 'Deep' } },
  };
  const uischema = {
    type: 'VerticalLayout',
    elements: [
      {
        type: 'Grid',
        label: 'Outer',
        elements: [
          {
            type: 'VerticalLayout',
            label: 'Middle',
            options: { gridItem: { w: 12 } },
            elements: [
              {
                type: 'HorizontalLayout',
                label: 'Row',
                elements: [{ type: 'Control', scope: '#/properties/deepKey01' }],
              },
            ],
          },
        ],
      },
    ],
  } as UISchemaElement;

  async function renderDeep() {
    render(<FormStudio schema={schema} uischema={uischema} />);
    const deep = itemOf(await screen.findByRole('textbox', { name: 'Deep' }));
    press(deep);
    return deep;
  }

  it('renders root › ⋯ › parent › current for a path of more than 4 segments', async () => {
    await renderDeep();
    expect(crumbNames()).toEqual(['VerticalLayout', 'Show hidden path', 'Row']);
    expect(current()).toHaveTextContent('Deep');
    expect(
      within(crumb('Show hidden path')).getByText('More', { exact: true }),
    ).toBeInTheDocument();
  });

  it('lists the hidden segments in path order in a dropdown marked as breadcrumbs', async () => {
    await renderDeep();
    fireEvent.click(crumb('Show hidden path'));
    const items = await screen.findAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Outer', 'Middle']);
    expect(items[0]?.closest('[data-studio-breadcrumbs]')).not.toBeNull();
  });

  it('hovers a hidden segment from its menu item and selects it on choosing', async () => {
    await renderDeep();
    fireEvent.click(crumb('Show hidden path'));
    const outer = await screen.findByRole('menuitem', { name: 'Outer' });

    enter(outer);
    expect(itemOfType('Grid')).toHaveAttribute('data-hovered');
    leave(outer);
    expect(itemOfType('Grid')).not.toHaveAttribute('data-hovered');

    fireEvent.click(screen.getByRole('menuitem', { name: 'Middle' }));
    expect(itemOfType('VerticalLayout')).toHaveAttribute('data-selected');
    expect(crumbNames()).toEqual(['VerticalLayout', 'Outer']);
    expect(current()).toHaveTextContent('Middle');
  });
});

describe('preview (rule 17)', () => {
  it('renders no breadcrumbs while previewing', async () => {
    const { email } = await renderStudio();
    press(email);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await waitFor(() => expect(queryTrail()).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByRole('textbox', { name: 'Name' });
    expect(crumbNames()).toEqual(['VerticalLayout']);
  });
});
