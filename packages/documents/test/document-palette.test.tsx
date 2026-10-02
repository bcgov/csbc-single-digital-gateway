import { fireEvent, render, screen, within } from '@testing-library/react';
import { GridStack } from 'gridstack';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PALETTE_ITEMS, type PaletteItem } from '../src/studio/palette-items';
import { PaletteList } from '../src/studio/palette-list';

function Harness({
  items = DEFAULT_PALETTE_ITEMS,
  onAppend = () => {},
}: {
  items?: PaletteItem[];
  onAppend?: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  return <PaletteList items={items} query={query} onQueryChange={setQuery} onAppend={onAppend} />;
}

const search = () => screen.getByRole('searchbox', { name: 'Search the palette' });
const itemIds = () =>
  [...document.querySelectorAll('[data-palette-item]')].map((el) =>
    el.getAttribute('data-palette-item'),
  );

const itemNamed = (name: string) => screen.getByRole('button', { name });

afterEach(() => vi.restoreAllMocks());

describe('PaletteList (doc 238 rules 5-10)', () => {
  it('groups items under headings, in order of first appearance', () => {
    render(<Harness />);
    const groups = screen.getAllByRole('region');
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual([
      'Layout',
      'Content',
      'Fields',
    ]);
    expect(
      within(groups[2]!)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Checkbox', 'Switch', 'Text', 'Text area']);
  });

  it('keeps the search input compact', () => {
    render(<Harness />);
    expect(search()).toHaveClass('h-7', 'text-xs');
  });

  it('draws each item as an icon and label, a focusable div[role=button] carrying its id', () => {
    render(<Harness />);
    const item = screen.getByRole('button', { name: 'Checkbox' });
    expect(item.tagName).toBe('DIV');
    expect(item).toHaveAttribute('tabindex', '0');
    expect(item).toHaveAttribute('data-palette-item', 'checkbox');
    expect(item).toHaveClass('cursor-grab');
    expect(item.querySelector('svg')).not.toBeNull();
  });

  it('filters by label or keyword, case-insensitively, hiding empty groups', () => {
    const items: PaletteItem[] = [
      ...DEFAULT_PALETTE_ITEMS,
      { ...DEFAULT_PALETTE_ITEMS[0]!, id: 'title', label: 'Title', keywords: ['banner'] },
    ];
    render(<Harness items={items} />);
    fireEvent.change(search(), { target: { value: '  SWI ' } });
    expect(itemIds()).toEqual(['switch']);
    expect(screen.getAllByRole('region').map((g) => g.getAttribute('aria-label'))).toEqual([
      'Fields',
    ]);
    fireEvent.change(search(), { target: { value: 'banner' } });
    expect(itemIds()).toEqual(['title']);
    fireEvent.change(search(), { target: { value: '  ' } });
    expect(itemIds()).toHaveLength(DEFAULT_PALETTE_ITEMS.length + 1);
  });

  it('says No matches when nothing matches', () => {
    render(<Harness />);
    fireEvent.change(search(), { target: { value: 'zzz' } });
    expect(itemIds()).toEqual([]);
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('appends an item on click, Enter or Space', () => {
    const onAppend = vi.fn();
    render(<Harness onAppend={onAppend} />);
    const item = screen.getByRole('button', { name: 'Switch' });
    fireEvent.click(item);
    fireEvent.keyDown(item, { key: 'Enter' });
    fireEvent.keyDown(item, { key: ' ' });
    fireEvent.keyDown(item, { key: 'a' });
    expect(onAppend.mock.calls).toEqual([['switch'], ['switch'], ['switch']]);
  });

  it('registers the rendered items as gridstack drag-in sources with a visible drop preview', () => {
    const setupDragIn = vi.spyOn(GridStack, 'setupDragIn');
    render(<Harness />);
    expect(setupDragIn).toHaveBeenCalled();
    const [elements, options, widgets] = setupDragIn.mock.calls.at(-1)!;
    expect((elements as HTMLElement[]).map((el) => el.getAttribute('data-palette-item'))).toEqual(
      itemIds(),
    );
    expect(options).toMatchObject({ appendTo: 'body', helper: 'clone' });
    // One widget per item: gridstack pairs them by index.
    expect(widgets).toEqual(itemIds().map(() => ({ w: 1, h: 10 })));
  });

  it('moves from the search into the items with ↓, through them with ↓ / ↑, and back to the search with ↑', () => {
    render(<Harness />);
    search().focus();
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    expect(itemNamed('Vertical layout')).toHaveFocus();
    fireEvent.keyDown(itemNamed('Vertical layout'), { key: 'ArrowDown' });
    expect(itemNamed('Heading')).toHaveFocus();
    // Across groups, in list order, stopping at the last.
    fireEvent.keyDown(itemNamed('Heading'), { key: 'ArrowDown' });
    expect(itemNamed('Separator')).toHaveFocus();
    fireEvent.keyDown(itemNamed('Separator'), { key: 'ArrowDown' });
    expect(itemNamed('Checkbox')).toHaveFocus();
    for (const name of ['Checkbox', 'Switch', 'Text', 'Text area']) {
      fireEvent.keyDown(itemNamed(name), { key: 'ArrowDown' });
    }
    expect(itemNamed('Text area')).toHaveFocus();
    fireEvent.keyDown(itemNamed('Text area'), { key: 'ArrowUp' });
    expect(itemNamed('Text')).toHaveFocus();
    for (const name of ['Text', 'Switch', 'Checkbox', 'Separator', 'Heading', 'Vertical layout']) {
      fireEvent.keyDown(itemNamed(name), { key: 'ArrowUp' });
    }
    expect(search()).toHaveFocus();
  });

  it('navigates the FILTERED items, and Enter appends the focused one', () => {
    const onAppend = vi.fn();
    render(<Harness onAppend={onAppend} />);
    fireEvent.change(search(), { target: { value: 'boolean' } });
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: 'Checkbox' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: 'Switch' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(onAppend).toHaveBeenCalledWith('switch');
  });

  it('does nothing on ↓ in the search when nothing matches', () => {
    render(<Harness />);
    fireEvent.change(search(), { target: { value: 'zzz' } });
    search().focus();
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    expect(search()).toHaveFocus();
  });
});
