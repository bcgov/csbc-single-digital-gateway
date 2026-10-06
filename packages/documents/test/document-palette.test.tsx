import { fireEvent, render, screen, within } from '@testing-library/react';
import { GridStack } from 'gridstack';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FoldsProvider } from '../src/studio/foldable-section';
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
      'Basic fields',
      'Record fields',
    ]);
    // Each group's heading is its fold button (doc 252 rule 10); the items follow it.
    expect(within(groups[2]!).getAllByRole('button')[0]).toHaveAttribute('aria-expanded', 'true');
    expect(
      [...groups[2]!.querySelectorAll('[data-palette-item]')].map((b) => b.textContent),
    ).toEqual([
      'Checkbox',
      'Switch',
      'Text',
      'Text area',
      'Rich text',
      'Number',
      'Select',
      'Radio group',
      'Multi-select',
      'Checkbox group',
    ]);
    // Doc 271 rule 18: the object-array presentations in their own section.
    expect(
      [...groups[3]!.querySelectorAll('[data-palette-item]')].map((b) => b.textContent),
    ).toEqual(['Data table', 'Record']);
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
      'Basic fields',
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
    expect(itemNamed('Horizontal layout')).toHaveFocus();
    fireEvent.keyDown(itemNamed('Horizontal layout'), { key: 'ArrowDown' });
    expect(itemNamed('Grid')).toHaveFocus();
    fireEvent.keyDown(itemNamed('Grid'), { key: 'ArrowDown' });
    expect(itemNamed('Tabs')).toHaveFocus();
    fireEvent.keyDown(itemNamed('Tabs'), { key: 'ArrowDown' });
    expect(itemNamed('Heading')).toHaveFocus();
    // Across groups, in list order, stopping at the last.
    fireEvent.keyDown(itemNamed('Heading'), { key: 'ArrowDown' });
    expect(itemNamed('Separator')).toHaveFocus();
    fireEvent.keyDown(itemNamed('Separator'), { key: 'ArrowDown' });
    expect(itemNamed('Rich content')).toHaveFocus();
    fireEvent.keyDown(itemNamed('Rich content'), { key: 'ArrowDown' });
    expect(itemNamed('Table')).toHaveFocus();
    fireEvent.keyDown(itemNamed('Table'), { key: 'ArrowDown' });
    expect(itemNamed('Checkbox')).toHaveFocus();
    const fields = [
      'Checkbox',
      'Switch',
      'Text',
      'Text area',
      'Rich text',
      'Number',
      'Select',
      'Radio group',
      'Multi-select',
      'Checkbox group',
      'Data table',
      'Record',
    ];
    for (const name of fields) fireEvent.keyDown(itemNamed(name), { key: 'ArrowDown' });
    expect(itemNamed('Record')).toHaveFocus();
    fireEvent.keyDown(itemNamed('Record'), { key: 'ArrowUp' });
    expect(itemNamed('Data table')).toHaveFocus();
    for (const name of [
      'Data table',
      'Checkbox group',
      'Multi-select',
      'Radio group',
      'Select',
      'Number',
      'Rich text',
      'Text area',
      'Text',
      'Switch',
      'Checkbox',
      'Table',
      'Rich content',
      'Separator',
      'Heading',
      'Tabs',
      'Grid',
      'Horizontal layout',
      'Vertical layout',
    ]) {
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

function Folding() {
  return (
    <FoldsProvider>
      <Harness />
    </FoldsProvider>
  );
}

const groupHeading = (name: string) =>
  within(screen.getByRole('region', { name })).getAllByRole('button')[0]!;

describe('foldable palette groups (doc 252 rule 10)', () => {
  it('folds a group to its heading, keeping its items mounted for gridstack but out of reach', () => {
    render(<Folding />);
    const content = groupHeading('Content');
    expect(content).toHaveClass('w-full', 'justify-between');
    expect(content.lastElementChild?.tagName).toBe('svg');

    fireEvent.click(content);
    expect(content).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Heading' })).toBeNull();
    // Still mounted (gridstack made them draggable once), only hidden.
    expect(
      document.querySelector('[data-palette-item="heading"]')?.closest('[hidden]'),
    ).not.toBeNull();

    // ↓ from the last Layout item (Grid, doc 260) skips the folded Content group.
    search().focus();
    fireEvent.keyDown(search(), { key: 'ArrowDown' });
    fireEvent.keyDown(itemNamed('Vertical layout'), { key: 'ArrowDown' });
    fireEvent.keyDown(itemNamed('Horizontal layout'), { key: 'ArrowDown' });
    fireEvent.keyDown(itemNamed('Grid'), { key: 'ArrowDown' });
    fireEvent.keyDown(itemNamed('Tabs'), { key: 'ArrowDown' });
    expect(itemNamed('Checkbox')).toHaveFocus();

    fireEvent.click(content);
    expect(itemNamed('Heading')).toBeInTheDocument();
  });

  it('shows every matching group open while searching, then restores the folds', () => {
    render(<Folding />);
    fireEvent.click(groupHeading('Basic fields'));
    fireEvent.change(search(), { target: { value: 'text' } });
    expect(groupHeading('Basic fields')).toHaveAttribute('aria-expanded', 'true');
    expect(groupHeading('Basic fields')).toBeDisabled();
    expect(itemNamed('Text area')).toBeInTheDocument();

    fireEvent.change(search(), { target: { value: '' } });
    expect(groupHeading('Basic fields')).toHaveAttribute('aria-expanded', 'false');
  });
});
