import { act, fireEvent, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DRAG_HOVER_MS, useDragHover } from '../src/renderers/studio/use-drag-hover';
import type { DocumentContent } from '../src/studio/document-types';
import { fieldsFor } from '../src/studio/inspector/inspector-form';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { renderStudioRenderers } from './render-studio-renderers';

const SCHEMA = { type: 'object', properties: { name: { type: 'string', title: 'Name' } } };
const PAGE = {
  id: 'F',
  type: 'Form',
  label: 'Page',
  elements: [
    {
      id: 'T',
      type: 'Tabs',
      elements: [
        {
          id: 'a',
          type: 'VerticalLayout',
          label: 'Person',
          elements: [{ id: 'f', type: 'Control', scope: '#/properties/name' }],
        },
        { id: 'b', type: 'VerticalLayout', label: 'Address', elements: [] },
      ],
    },
  ],
};

describe('Tabs — studio (doc 272 rules 4-8)', () => {
  it('draws the strip over every tab, only the active one live', () => {
    const { container } = renderStudioRenderers(PAGE, { schema: SCHEMA });
    const tabs = within(container.querySelector<HTMLElement>('[data-element-id="T"]')!);
    expect(tabs.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Person', 'Address']);
    expect(tabs.getByRole('tab', { name: 'Person' })).toHaveAttribute('aria-selected', 'true');
    // Every tab stays mounted (doc 272 rule 6b); the inactive one is inert and invisible.
    const panelOf = (id: string) =>
      container.querySelector(`[data-element-id="${id}"]`)!.closest('[role="tabpanel"]')!;
    expect(container.querySelector('[data-element-id="a"]')).toHaveAttribute(
      'data-element-type',
      'VerticalLayout',
    );
    expect(panelOf('a')).not.toHaveAttribute('inert');
    expect(panelOf('b')).toHaveAttribute('inert');
    expect(panelOf('b')).toHaveClass('invisible');
    fireEvent.click(tabs.getByRole('tab', { name: 'Address' }));
    expect(panelOf('b')).not.toHaveAttribute('inert');
    expect(panelOf('a')).toHaveAttribute('inert');
    // Selecting a tab selects its content layout, not the Tabs.
    expect(container.querySelector('[data-element-id="b"]')).toHaveAttribute('data-selected');
    expect(container.querySelector('[data-element-id="T"]')).not.toHaveAttribute('data-selected');
  });

  it('adds a tab through update and opens it', async () => {
    const user = userEvent.setup();
    const { update } = renderStudioRenderers(PAGE, { schema: SCHEMA });
    await user.click(screen.getByRole('button', { name: 'Add tab' }));
    const [id, patch] = update.mock.calls.at(-1)!;
    expect(id).toBe('T');
    expect(patch.elements).toHaveLength(3);
    expect(patch.elements![2]).toMatchObject({
      type: 'VerticalLayout',
      label: 'Tab 3',
      elements: [],
    });
  });

  it('renames the active tab from its menu, and deletes through the delete gate', async () => {
    const user = userEvent.setup();
    const { update, remove } = renderStudioRenderers(PAGE, { schema: SCHEMA, removable: true });
    await user.click(screen.getByRole('button', { name: 'Tab options for Person' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Rename…' }));
    const input = await screen.findByRole('textbox', { name: 'Tab name' });
    await user.clear(input);
    await user.type(input, 'Applicant{Enter}');
    expect(update).toHaveBeenLastCalledWith('a', { label: 'Applicant' });
    await user.click(screen.getByRole('button', { name: 'Tab options for Person' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
    expect(remove).toHaveBeenCalledWith('a', 'Person');
  });

  it('offers no Delete on the last tab', async () => {
    const user = userEvent.setup();
    const single = {
      ...PAGE,
      elements: [{ ...PAGE.elements[0]!, elements: [PAGE.elements[0]!.elements[0]!] }],
    };
    renderStudioRenderers(single, { schema: SCHEMA, removable: true });
    await user.click(screen.getByRole('button', { name: 'Tab options for Person' }));
    expect(await screen.findByRole('menuitem', { name: 'Rename…' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete…' })).not.toBeInTheDocument();
  });

  it('opens a tab after a drag rests on it for a second, never outside a drag or after leaving', () => {
    vi.useFakeTimers();
    const open = vi.fn();
    let dragging = true;
    const { result } = renderHook(() => useDragHover(open, () => dragging));
    act(() => result.current.onPointerEnter('b'));
    act(() => vi.advanceTimersByTime(DRAG_HOVER_MS - 1));
    expect(open).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(open).toHaveBeenCalledExactlyOnceWith('b');
    act(() => result.current.onPointerEnter('a'));
    act(() => result.current.onPointerLeave());
    act(() => vi.advanceTimersByTime(DRAG_HOVER_MS));
    expect(open).toHaveBeenCalledTimes(1);
    dragging = false;
    act(() => result.current.onPointerEnter('a'));
    act(() => vi.advanceTimersByTime(DRAG_HOVER_MS));
    expect(open).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('names Tabs in the inspector, gives a tab its label field, and offers a fresh palette item', () => {
    const content = { schema: SCHEMA, variants: { default: PAGE } } as DocumentContent;
    const at = (id: string) =>
      inspectorTarget(content, { pageSelectedId: id, focusedId: 'F', formId: 'F' })!;
    expect(at('T').kind).toBe('tabs');
    expect(fieldsFor(at('a')).map((f) => f.key)).toContain('tabLabel');
    expect(fieldsFor(at('T')).map((f) => f.key)).not.toContain('tabLabel');
    const item = DEFAULT_PALETTE_ITEMS.find((i) => i.id === 'tabs')!;
    expect(item).toMatchObject({ label: 'Tabs', group: 'Layout' });
    const created = item.create();
    expect(created.properties).toBeUndefined();
    expect(created.element).toMatchObject({
      type: 'Tabs',
      elements: [
        { type: 'VerticalLayout', label: 'Tab 1' },
        { type: 'VerticalLayout', label: 'Tab 2' },
      ],
    });
  });
});

describe('Tabs variant (doc 272 rule 9)', () => {
  it('offers Default / Line in the Tabs inspector and writes options.variant only for Line', async () => {
    const { applyInspector } = await import('../src/studio/inspector/apply-inspector');
    const { inspectorForm } = await import('../src/studio/inspector/inspector-form');
    const content = { schema: SCHEMA, variants: { default: PAGE } } as DocumentContent;
    const target = inspectorTarget(content, { pageSelectedId: 'T', focusedId: 'F', formId: 'F' })!;
    const data = inspectorForm(target).data;
    expect(data['tabsVariant']).toBe('default');
    const line = applyInspector(content, target, { ...data, tabsVariant: 'line' });
    const tabs = (line.variants['default'] as { elements: Record<string, unknown>[] }).elements[0]!;
    expect(tabs['options']).toEqual({ variant: 'line' });
    const lineTarget = inspectorTarget(line, { pageSelectedId: 'T', focusedId: 'F', formId: 'F' })!;
    const back = applyInspector(line, lineTarget, {
      ...inspectorForm(lineTarget).data,
      tabsVariant: 'default',
    });
    expect(
      (back.variants['default'] as { elements: Record<string, unknown>[] }).elements[0]!['options'],
    ).toEqual({});
  });

  it('draws the studio strip in the chosen variant', () => {
    const line = { ...PAGE, elements: [{ ...PAGE.elements[0]!, options: { variant: 'line' } }] };
    renderStudioRenderers(line, { schema: SCHEMA });
    expect(screen.getByRole('tablist', { name: 'Tabs' })).toHaveAttribute('data-variant', 'line');
  });
});

describe('a palette click with a Tabs selected (doc 272 rule 10)', () => {
  it('lands at the end of the tab the Tabs shows, else its first tab', async () => {
    const { appendTarget } = await import('../src/studio/palette-insert');
    const { setActiveTab } = await import('../src/renderers/studio/active-tabs');
    const form = { ...PAGE, elements: [{ ...PAGE.elements[0]!, id: 'T-click' }] };
    expect(appendTarget(form, 'T-click')).toEqual({ layoutId: 'a', index: Infinity });
    setActiveTab('T-click', 'b');
    expect(appendTarget(form, 'T-click')).toEqual({ layoutId: 'b', index: Infinity });
    // A stale record falls back to the first tab.
    setActiveTab('T-click', 'gone');
    expect(appendTarget(form, 'T-click')).toEqual({ layoutId: 'a', index: Infinity });
  });

  it('records the tab the studio Tabs shows', async () => {
    const { activeTabOf } = await import('../src/renderers/studio/active-tabs');
    renderStudioRenderers(PAGE, { schema: SCHEMA });
    expect(activeTabOf('T')).toBe('a');
    fireEvent.click(screen.getByRole('tab', { name: 'Address' }));
    expect(activeTabOf('T')).toBe('b');
  });
});

/** A mouseup released on the element `id`. */
const up = (id: string) =>
  document.getElementById(id)!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

describe('drag affordances on the strip (doc 272 rules 6c-6d)', () => {
  it('arms the tab a drag rests on, until it opens or the pointer leaves', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDragHover(vi.fn(), () => true));
    expect(result.current.armed).toBeNull();
    act(() => result.current.onPointerEnter('b'));
    expect(result.current.armed).toBe('b');
    act(() => result.current.onPointerLeave());
    expect(result.current.armed).toBeNull();
    act(() => result.current.onPointerEnter('b'));
    act(() => vi.advanceTimersByTime(DRAG_HOVER_MS));
    expect(result.current.armed).toBeNull();
    vi.useRealTimers();
  });

  it('lands a drag released on a tab at the end of that tab, else the shown tab', async () => {
    const { DDManager } = await import('gridstack/dist/dd-manager');
    const { useStripDrop } = await import('../src/renderers/studio/use-strip-drop');
    document.body.innerHTML =
      '<div id="strip"><button data-tab-id="b" id="b">B</button><span id="gap"></span></div><div id="away"></div>';
    const strip = { current: document.getElementById('strip') };
    const land = vi.fn();
    renderHook(() => useStripDrop(strip, () => 'a', land));
    const item = Object.assign(document.createElement('div'), { gridstackNode: { id: 'f' } });
    vi.useFakeTimers();
    Object.assign(DDManager, { dragElement: { dragging: true, el: item } });
    up('b');
    expect(land).not.toHaveBeenCalled(); // only after gridstack's own drop
    act(() => vi.advanceTimersByTime(0));
    expect(land).toHaveBeenLastCalledWith('b', { elementId: 'f' });
    up('gap');
    act(() => vi.advanceTimersByTime(0));
    expect(land).toHaveBeenLastCalledWith('a', { elementId: 'f' });
    up('away');
    act(() => vi.advanceTimersByTime(0));
    expect(land).toHaveBeenCalledTimes(2);
    const palette = document.createElement('div');
    palette.setAttribute('data-palette-item', 'text');
    Object.assign(DDManager, { dragElement: { dragging: true, el: palette } });
    up('b');
    act(() => vi.advanceTimersByTime(0));
    expect(land).toHaveBeenLastCalledWith('b', { itemId: 'text' });
    delete (DDManager as { dragElement?: unknown }).dragElement;
    up('b');
    act(() => vi.advanceTimersByTime(0));
    expect(land).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
