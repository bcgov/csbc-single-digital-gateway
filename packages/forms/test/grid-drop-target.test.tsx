import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import type { GridHTMLElement, GridStack } from 'gridstack';
import type { DDDraggable } from 'gridstack/dist/dd-draggable';
import { DDDroppable } from 'gridstack/dist/dd-droppable';
import { DDManager } from 'gridstack/dist/dd-manager';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { richText } from './rich-text-fixtures';
import { dropTargetFor, retargetDropTarget } from '../src/renderers/gridstack/grid-drop-target';
import {
  createGridRenderers,
  GridEditorProvider,
  type GridEditor,
} from '../src/renderers-gridstack';
import * as ui from '../src/renderers-ui';
import { FORM_TITLE_PLACEHOLDER } from '../src/renderers/gridstack/form-renderer';

// Doc 190 — nested grid drop gap: every grid's droppable listens on its own `.grid-stack`.

type DroppableHost = HTMLElement & { ddElement?: { ddDroppable?: DDDroppable } };

/** The droppable gridstack stored on `el`, with its `protected` listener target readable. */
const dropTargetOf = (el: Element | undefined) =>
  (el as DroppableHost | undefined)?.ddElement?.ddDroppable as
    | (DDDroppable & { eventEl: HTMLElement })
    | undefined;

/** A real gridstack droppable on `gridEl`, stored where gridstack keeps it. */
function droppableOn(gridEl: HTMLElement) {
  const droppable = new DDDroppable(gridEl, {});
  (gridEl as DroppableHost).ddElement = { ddDroppable: droppable };
  return droppable as DDDroppable & { eventEl: HTMLElement };
}

const gridOf = (el: HTMLElement) => ({ el }) as unknown as GridStack;

/** outer `.grid-stack` > `.grid-stack-item` > inner `.grid-stack`, attached to the document. */
function nestedDom() {
  const outer = document.createElement('div');
  outer.className = 'grid-stack';
  const item = document.createElement('div');
  item.className = 'grid-stack-item';
  const inner = document.createElement('div');
  inner.className = 'grid-stack';
  item.append(inner);
  outer.append(item);
  document.body.append(outer);
  return { outer, item, inner };
}

/** A drag in progress, as far as a droppable's enter/leave handlers read it. */
function startDrag() {
  const dragged = document.createElement('div');
  dragged.className = 'grid-stack-item';
  // eslint-disable-next-line no-underscore-dangle -- gridstack's own method name
  DDManager.dragElement = { el: dragged, _stopScrolling: () => {} } as unknown as DDDraggable;
}

const enter = (el: HTMLElement) => el.dispatchEvent(new MouseEvent('mouseenter'));
const leave = (el: HTMLElement) => el.dispatchEvent(new MouseEvent('mouseleave'));

afterEach(() => {
  delete DDManager.dragElement;
  delete DDManager.dropElement;
  document.body.replaceChildren();
});

describe('retargetDropTarget', () => {
  it('rule 1: moves an enabled droppable’s listeners from the enclosing item onto the grid element', () => {
    const { item, inner } = nestedDom();
    const droppable = droppableOn(inner);
    expect(droppable.eventEl).toBe(item);

    retargetDropTarget(gridOf(inner));
    startDrag();

    expect(droppable.eventEl).toBe(inner);
    expect(droppable.disabled).toBe(false);
    enter(item);
    expect(DDManager.dropElement).toBeUndefined();
    enter(inner);
    expect(DDManager.dropElement).toBe(droppable);
  });

  it('rule 2: changes nothing when the droppable already listens on the grid element', () => {
    const { inner } = nestedDom();
    const droppable = droppableOn(inner);
    retargetDropTarget(gridOf(inner));
    const disable = vi.spyOn(droppable, 'disable');
    const enable = vi.spyOn(droppable, 'enable');

    retargetDropTarget(gridOf(inner));

    expect(droppable.eventEl).toBe(inner);
    expect(disable).not.toHaveBeenCalled();
    expect(enable).not.toHaveBeenCalled();
  });

  it('rule 3: only retargets a disabled droppable, so a later enable() binds to the grid element', () => {
    const { item, inner } = nestedDom();
    const droppable = droppableOn(inner);
    droppable.disable();
    const enable = vi.spyOn(droppable, 'enable');

    retargetDropTarget(gridOf(inner));

    expect(droppable.eventEl).toBe(inner);
    expect(droppable.disabled).toBe(true);
    expect(enable).not.toHaveBeenCalled();

    droppable.enable();
    startDrag();
    enter(item);
    expect(DDManager.dropElement).toBeUndefined();
    enter(inner);
    expect(DDManager.dropElement).toBe(droppable);
  });

  it('rule 4: does nothing for an undefined grid or a grid without a droppable', () => {
    const { inner } = nestedDom();

    expect(() => retargetDropTarget(undefined)).not.toThrow();
    expect(() => retargetDropTarget(gridOf(inner))).not.toThrow();
    expect((inner as DroppableHost).ddElement).toBeUndefined();
  });

  it('rules 5-6: the gap belongs to the outer grid, and leaving a nested grid hands the drag back to it', () => {
    const { outer, item, inner } = nestedDom();
    const outerDrop = droppableOn(outer);
    const innerDrop = droppableOn(inner);
    startDrag();

    // Before: the pointer entering the nested item — outside the inner grid — is claimed by the inner grid.
    enter(outer);
    enter(item);
    expect(DDManager.dropElement).toBe(innerDrop);
    leave(item);
    expect(DDManager.dropElement).toBe(outerDrop);

    retargetDropTarget(gridOf(outer));
    retargetDropTarget(gridOf(inner));

    enter(item);
    expect(DDManager.dropElement).toBe(outerDrop);
    enter(inner);
    expect(DDManager.dropElement).toBe(innerDrop);
    leave(inner);
    expect(DDManager.dropElement).toBe(outerDrop);
  });
});

const schema: JsonSchema = { type: 'object', properties: { hide: { type: 'boolean' } } };
const set = createGridRenderers({ gridOptions: { staticGrid: false } });

/** Widget ids from an element's `key`, so re-rendered element objects keep their grid items. */
const keyedEditor: GridEditor = {
  idOf: (element) => String((element as { key?: unknown }).key),
  onGesture: () => {},
};

function form(uischema: object, editor?: GridEditor, data: object = {}) {
  const jsonForms = (
    <JsonForms
      schema={schema}
      uischema={uischema as UISchemaElement}
      data={data}
      renderers={[...ui.displayRenderers, ...set.layoutRenderers]}
      cells={[]}
    />
  );
  return editor ? <GridEditorProvider value={editor}>{jsonForms}</GridEditorProvider> : jsonForms;
}

const settle = () => act(async () => {});
const roots = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<GridHTMLElement>('.grid-stack'));
const heading = (key: string) => ({ key, type: 'Heading', text: key });
const innerGridOf = (elements: object[]) => ({ key: 'inner', type: 'Grid', elements });
const outerGridOf = (elements: object[]) => ({
  key: 'outer',
  type: 'Grid',
  elements: [heading('sibling'), innerGridOf(elements)],
});

const layouts = {
  key: 'outer',
  type: 'Grid',
  elements: [
    {
      key: 'vertical',
      type: 'VerticalLayout',
      elements: [
        heading('in-vertical'),
        { key: 'deep', type: 'Grid', elements: [heading('deep-heading')] },
      ],
    },
    { key: 'row', type: 'HorizontalLayout', elements: [heading('in-row')] },
  ],
};

describe('Grid renderer drop targets (studio, editor port)', () => {
  it('rule 1: gives the outer grid and each nested Grid / VerticalLayout / HorizontalLayout its own element', async () => {
    const { container } = render(form(layouts, keyedEditor));
    await screen.findAllByRole('heading');
    await settle();

    const grids = roots(container);
    expect(grids).toHaveLength(4);
    expect(grids.filter((grid) => grid.parentElement?.closest('.grid-stack-item'))).toHaveLength(3);
    for (const grid of grids) expect(dropTargetOf(grid)?.eventEl).toBe(grid);
  });

  it('rule 2: keeps a nested drop target on its own element after an options update rebuilds the droppable', async () => {
    const view = render(form(outerGridOf([heading('one')]), keyedEditor));
    await screen.findAllByRole('heading');
    await settle();
    const innerGrid = roots(view.container)[1];

    // gridstack rebuilds the droppable (targeting the enclosing item again) when a grid's static state toggles.
    act(() => {
      innerGrid?.gridstack?.setStatic(true);
      innerGrid?.gridstack?.setStatic(false);
    });
    expect(dropTargetOf(innerGrid)?.eventEl).toBe(innerGrid?.closest('.grid-stack-item'));

    view.rerender(form(outerGridOf([heading('one'), heading('two')]), keyedEditor));
    await settle();

    expect(roots(view.container)[1]).toBe(innerGrid);
    expect(dropTargetOf(innerGrid)?.eventEl).toBe(innerGrid);
  });

  it('rule 2: retargets a freshly mounted grid after it becomes visible again', async () => {
    const uischema = {
      key: 'outer',
      type: 'Grid',
      elements: [
        heading('sibling'),
        {
          ...innerGridOf([heading('inner-heading')]),
          rule: {
            effect: 'HIDE',
            condition: { scope: '#/properties/hide', schema: { const: true } },
          },
        },
      ],
    };
    const view = render(form(uischema, keyedEditor, { hide: false }));
    await screen.findAllByRole('heading');
    await settle();

    view.rerender(form(uischema, keyedEditor, { hide: true }));
    await settle();
    expect(roots(view.container)).toHaveLength(1);

    view.rerender(form(uischema, keyedEditor, { hide: false }));
    await settle();
    const shown = roots(view.container)[1];
    expect(shown?.closest('.grid-stack-item')).not.toBeNull();
    expect(dropTargetOf(shown)?.eventEl).toBe(shown);
  });

  it('rule 4: leaves grids without an editor with no droppable', async () => {
    const { container } = render(form(layouts));
    await screen.findAllByRole('heading');
    await settle();

    const grids = roots(container);
    expect(grids).toHaveLength(4);
    for (const grid of grids) expect(dropTargetOf(grid)).toBeUndefined();
  });
});

const zoneOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="form-drop-zone"]');

describe("a root Form's drop zone (doc 201 rule 21)", () => {
  it('claims the title and description as drop space for the Form’s own grid', async () => {
    const { container } = render(
      form(
        {
          key: 'root',
          type: 'Form',
          label: 'Permit',
          options: { description: richText('Tell us about the work.') },
          elements: [heading('one')],
        },
        keyedEditor,
      ),
    );
    await screen.findAllByRole('heading');
    await settle();

    const zone = zoneOf(container);
    const grid = roots(container)[0];
    // The zone holds the title, the description and the grid, and the grid listens on it.
    expect(zone?.querySelector('[data-slot="form-title"]')).not.toBeNull();
    expect(zone?.querySelector('[data-slot="form-description"]')).not.toBeNull();
    expect(zone?.contains(grid as Node)).toBe(true);
    expect(dropTargetOf(grid)?.eventEl).toBe(zone);

    // A drag over the title is a drag over the grid, so gridstack keeps placing (at row 0, which it clamps to).
    startDrag();
    enter(zone as HTMLElement);
    expect(DDManager.dropElement).toBe(dropTargetOf(grid));
  });

  it('leaves a grid NESTED in the Form listening on itself, so the zone is the root grid’s alone', async () => {
    const { container } = render(
      form(
        {
          key: 'root',
          type: 'Form',
          label: 'Permit',
          elements: [innerGridOf([heading('deep')])],
        },
        keyedEditor,
      ),
    );
    await screen.findAllByRole('heading');
    await settle();

    const [rootGrid, nested] = roots(container);
    expect(dropTargetOf(rootGrid)?.eventEl).toBe(zoneOf(container));
    expect(dropTargetOf(nested)?.eventEl).toBe(nested);
  });

  it('renders the zone around an untitled Form too, so its placeholder is drop space', async () => {
    const { container } = render(
      form({ key: 'root', type: 'Form', elements: [heading('one')] }, keyedEditor),
    );
    await screen.findAllByRole('heading');
    await settle();

    expect(zoneOf(container)).toHaveTextContent(FORM_TITLE_PLACEHOLDER);
  });
});

describe('dropTargetFor', () => {
  it('returns the zone for a Form grid and the grid itself for anything else', () => {
    const zone = document.createElement('div');
    zone.dataset['slot'] = 'form-drop-zone';
    const grid = document.createElement('div');
    zone.append(grid);

    expect(dropTargetFor(grid, 'Form')).toBe(zone);
    expect(dropTargetFor(grid, 'VerticalLayout')).toBe(grid);
    expect(dropTargetFor(grid, 'Grid')).toBe(grid);
  });

  it('falls back to the grid when no zone is above it, and passes an absent grid through', () => {
    const loose = document.createElement('div');
    expect(dropTargetFor(loose, 'Form')).toBe(loose);
    expect(dropTargetFor(undefined, 'Form')).toBeUndefined();
  });
});
