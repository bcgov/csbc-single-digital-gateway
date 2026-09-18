import type { UISchemaElement } from '@jsonforms/core';
import { mdiContentCopy, mdiDeleteOutline } from '@mdi/js';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { GridHTMLElement } from 'gridstack';
import { describe, expect, it } from 'vitest';
import { STUDIO_GRID_CLASS } from '../src/renderers/studio/studio-grid-class';
import { renderSeededStudio } from './render-studio';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';

/** Doc 184 rule 19: entering and leaving preview are two buttons now, so one matcher finds whichever shows. */
const PREVIEW_BUTTON = /^(Preview|Exit preview)$/;

// Doc 185 rules 1-14, 28 — hover, selection and the actions popover. Copy and delete are in
// studio-element-commands.test.tsx.

const HOVERED_BORDER =
  '[&>.grid-stack-item>.grid-stack-item-content:has(>[data-hovered])]:border-ring';
const SELECTED_BORDER =
  '[&>.grid-stack-item>.grid-stack-item-content:has(>[data-selected])]:border-ring';
const SELECTED_SOLID =
  '[&>.grid-stack-item>.grid-stack-item-content:has(>[data-selected])]:border-solid';

type GestureHandler = (event: Event, el: HTMLElement) => void;

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

async function renderStudio() {
  const view = renderSeededStudio();
  const name = itemOf(await screen.findByRole('textbox', { name: 'Name' }));
  const city = itemOf(await screen.findByRole('textbox', { name: 'City' }));
  const deliveryHeading = itemOf(screen.getByRole('heading', { name: 'Delivery address' }));
  const delivery = itemOf(deliveryHeading.parentElement as HTMLElement);
  const slot = (slotName: string) => {
    const element = view.container.querySelector<HTMLElement>(`[data-slot="${slotName}"]`);
    if (!element) throw new Error(`no ${slotName}`);
    return element;
  };
  return { ...view, name, city, delivery, centre: slot('form-studio-center-panel'), slot };
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

describe('sample data properties (rule 28)', () => {
  it('keys every sample property with an 8-character nanoid-style key, titled with its label', () => {
    const properties = STUDIO_SAMPLE_SCHEMA.properties ?? {};
    for (const key of Object.keys(properties)) expect(key).toMatch(/^[\w-]{8}$/);
    expect(Object.values(properties).map((property) => property.title)).toEqual([
      'Name',
      'About',
      'Quantity',
      'Budget',
      'Team size',
      'Email',
      'Phone',
      'Best time to call',
      'Preferred contact method',
      'Supports needed',
      'City',
      'Postal Code',
      'Province',
      'Email me product news',
      'Text me delivery updates',
    ]);
  });

  it('points every sample Control at an existing property', () => {
    const scopes: string[] = [];
    const walk = (element: UISchemaElement) => {
      if ('scope' in element && typeof element.scope === 'string') scopes.push(element.scope);
      const children = 'elements' in element ? (element.elements as UISchemaElement[]) : [];
      children.forEach(walk);
    };
    walk(STUDIO_SAMPLE_UISCHEMA);

    // Doc 188 rule 32 added Team size, Preferred contact method, Province and the two booleans.
    expect(scopes).toHaveLength(15);
    for (const scope of scopes) {
      const key = scope.replace('#/properties/', '');
      expect(key).toMatch(/^[\w-]{8}$/);
      expect(Object.hasOwn(STUDIO_SAMPLE_SCHEMA.properties ?? {}, key)).toBe(true);
    }
  });
});

describe('hover (rules 1-4)', () => {
  it('marks only the grid item under the pointer as hovered', async () => {
    const { name } = await renderStudio();
    hoverOver(name);
    expect(marked('data-hovered')).toEqual([name]);
  });

  it('hovers the innermost item: a field in the nested Grid, not the Grid', async () => {
    const { city, delivery } = await renderStudio();
    hoverOver(city);
    expect(marked('data-hovered')).toEqual([city]);
    expect(delivery).not.toHaveAttribute('data-hovered');
  });

  it("counts the item's own box around its content as the item", async () => {
    const { name } = await renderStudio();
    hoverOver(name.closest('.grid-stack-item') as HTMLElement);
    expect(marked('data-hovered')).toEqual([name]);
  });

  it('clears hover when the pointer moves onto the canvas outside every item', async () => {
    const { name, centre } = await renderStudio();
    hoverOver(name);
    expect(marked('data-hovered')).toEqual([name]);
    hoverOver(centre);
    expect(marked('data-hovered')).toEqual([]);
  });

  // The root element's hover and selection (amending rule 1) are covered by studio-root-selection.test.tsx.

  it('keeps an element hovered while the pointer is over its actions popover', async () => {
    const { name } = await renderStudio();
    hoverOver(name);
    const menu = await screen.findByRole('dialog', { name: 'Element actions' });
    hoverOver(within(menu).getByRole('button', { name: 'Copy' }));
    expect(marked('data-hovered')).toEqual([name]);
    expect(actionMenus()).toHaveLength(1);
  });

  it('recolours a hovered border to the ring colour and a selected one to solid ring', async () => {
    const { container } = await renderStudio();
    const classes = STUDIO_GRID_CLASS.split(' ');
    expect(classes).toEqual(
      expect.arrayContaining([HOVERED_BORDER, SELECTED_BORDER, SELECTED_SOLID]),
    );
    expect(classes).not.toContain(
      '[&>.grid-stack-item>.grid-stack-item-content:has(>[data-hovered])]:border-solid',
    );
    expect(container.querySelector('.grid-stack')).toHaveClass(
      HOVERED_BORDER,
      SELECTED_BORDER,
      SELECTED_SOLID,
    );
  });
});

describe('selection (rules 5-8)', () => {
  it('selects the pressed item and moves the selection to the next item pressed', async () => {
    const { name, city } = await renderStudio();
    press(name);
    expect(marked('data-selected')).toEqual([name]);
    press(city);
    expect(marked('data-selected')).toEqual([city]);
  });

  it('keeps hover and selection independent', async () => {
    const { name, city } = await renderStudio();
    press(name);
    hoverOver(city);
    expect(marked('data-selected')).toEqual([name]);
    expect(marked('data-hovered')).toEqual([city]);
  });

  it('deselects when the canvas outside every item is pressed', async () => {
    const { name, centre } = await renderStudio();
    press(name);
    expect(marked('data-selected')).toEqual([name]);
    press(centre);
    expect(marked('data-selected')).toEqual([]);
  });

  // Doc 186 rule 7 amends rule 7: Escape selects the parent — here the root.
  it('moves the selection from a root child to the root on Escape', async () => {
    const { container, name } = await renderStudio();
    press(name);
    expect(marked('data-selected')).toEqual([name]);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(marked('data-selected')).toEqual([]);
    expect(
      container.querySelector('[data-slot="studio-element"][data-element-type="Form"]'),
    ).toHaveAttribute('data-selected');
  });

  it('keeps the selection when its actions popover or something outside the canvas is pressed', async () => {
    const { name, slot } = await renderStudio();
    press(name);
    const menu = await screen.findByRole('dialog', { name: 'Element actions' });
    press(within(menu).getByRole('button', { name: 'Delete' }));
    press(slot('form-studio-header'));
    expect(marked('data-selected')).toEqual([name]);
  });
});

describe('actions popover (rules 9-14)', () => {
  it('shows no actions popover until an element is hovered', async () => {
    const { name } = await renderStudio();
    expect(actionMenus()).toHaveLength(0);
    hoverOver(name);
    expect(await screen.findByRole('dialog', { name: 'Element actions' })).toBeInTheDocument();
  });

  it('offers Copy and a red Delete in a joined button group', async () => {
    const { name } = await renderStudio();
    hoverOver(name);
    const menu = await screen.findByRole('dialog', { name: 'Element actions' });
    const group = within(menu).getByRole('group');
    expect(group).toHaveAttribute('data-slot', 'button-group');
    expect(group).toHaveAttribute('data-variant', 'joined');

    const [copy, remove, ...rest] = within(group).getAllByRole('button');
    expect(rest).toHaveLength(0);
    expect(copy).toHaveAccessibleName('Copy');
    expect(remove).toHaveAccessibleName('Delete');
    expect(copy?.querySelector('svg path')).toHaveAttribute('d', mdiContentCopy);
    expect(remove?.querySelector('svg path')).toHaveAttribute('d', mdiDeleteOutline);
    expect(remove).toHaveClass('text-destructive');
    expect(copy).not.toHaveClass('text-destructive');
  });

  it('shows one popover each for a hovered and a different selected element', async () => {
    const { name, city } = await renderStudio();
    hoverOver(name);
    press(city);
    await waitFor(() => expect(actionMenus()).toHaveLength(2));
  });

  it('hides the popover as soon as its element is unhovered', async () => {
    const { name, centre } = await renderStudio();
    hoverOver(name);
    await screen.findByRole('dialog', { name: 'Element actions' });
    hoverOver(centre);
    await waitFor(() => expect(actionMenus()).toHaveLength(0));
  });

  it('hides the popover when its element is deselected', async () => {
    const { name } = await renderStudio();
    press(name);
    await screen.findByRole('dialog', { name: 'Element actions' });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(actionMenus()).toHaveLength(0));
  });

  it.each([
    ['dragstart', 'dragstop'],
    ['resizestart', 'resizestop'],
  ])('hides every popover from %s until %s', async (start, stop) => {
    const { container, name } = await renderStudio();
    press(name);
    await screen.findByRole('dialog', { name: 'Element actions' });
    const handlers = gestureHandlers(container);
    const box = name.closest('.grid-stack-item') as HTMLElement;

    act(() => handlers[start]?.(new Event(start), box));
    await waitFor(() => expect(actionMenus()).toHaveLength(0));

    act(() => handlers[stop]?.(new Event(stop), box));
    expect(await screen.findByRole('dialog', { name: 'Element actions' })).toBeInTheDocument();
  });

  it('clears hover and selection when preview starts and shows no popovers there', async () => {
    const { name, city } = await renderStudio();
    hoverOver(city);
    press(name);
    await waitFor(() => expect(actionMenus()).toHaveLength(2));

    fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
    await waitFor(() => expect(actionMenus()).toHaveLength(0));

    fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
    await screen.findByRole('textbox', { name: 'Name' });
    expect(marked('data-hovered')).toEqual([]);
    expect(marked('data-selected')).toEqual([]);
    expect(actionMenus()).toHaveLength(0);
  });
});
