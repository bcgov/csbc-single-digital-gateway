import { describe, expect, it } from 'vitest';
import {
  accordionDefaultOpen,
  accordionDescription,
  accordionItems,
  accordionTitle,
  itemName,
  moveItem,
  newAccordionItem,
  openItemIds,
} from '../src/renderers/ui/accordion-model';
import { richText } from './rich-text-fixtures';

const group = (options: unknown, label?: unknown) => ({
  type: 'AccordionGroup',
  ...(label !== undefined && { label }),
  options,
});

describe('accordion model (doc 279 rules 1-3)', () => {
  it('reads items, never throwing: bad entries dropped, ids backfilled, titles and content sanitised', () => {
    const items = accordionItems(
      group({
        items: [
          { id: 'a', title: 'Who can apply?', content: richText('Anyone') },
          'junk',
          null,
          { title: 7, content: { not: 'lexical' } },
          { id: '  ', title: 'Blank id' },
        ],
      }),
    );
    expect(items.map((i) => [i.id, i.title])).toEqual([
      ['a', 'Who can apply?'],
      ['#3', ''],
      ['#4', 'Blank id'],
    ]);
    expect(items[0]!.content).toEqual(richText('Anyone'));
    expect(items[1]!.content).toBeUndefined();
    expect(accordionItems(group({ items: 'nope' }))).toEqual([]);
    expect(accordionItems(group(undefined))).toEqual([]);
    expect(accordionItems(null)).toEqual([]);
  });

  it('names an item by its trimmed title, else Item <n>', () => {
    expect(itemName({ id: 'a', title: '  FAQ ', content: undefined }, 0)).toBe('FAQ');
    expect(itemName({ id: 'a', title: '   ', content: undefined }, 2)).toBe('Item 3');
  });

  it('reads the title (trimmed, non-blank) and the rich description', () => {
    expect(accordionTitle(group({}, '  Questions '))).toBe('Questions');
    expect(accordionTitle(group({}, ' '))).toBeUndefined();
    expect(accordionDescription(group({ description: richText('More') }))).toEqual(
      richText('More'),
    );
    expect(accordionDescription(group({ description: 'plain' }))).toBeUndefined();
  });

  it('reads the initial open mode and the ids it opens', () => {
    expect(accordionDefaultOpen({ defaultOpen: 'first' })).toBe('first');
    expect(accordionDefaultOpen({ defaultOpen: 'all' })).toBe('all');
    expect(accordionDefaultOpen({ defaultOpen: 'specific' })).toBe('none');
    expect(accordionDefaultOpen(undefined)).toBe('none');
    const items = [
      { id: 'a', title: '', content: undefined },
      { id: 'b', title: '', content: undefined },
    ];
    expect(openItemIds(items, 'none')).toEqual([]);
    expect(openItemIds(items, 'first')).toEqual(['a']);
    expect(openItemIds(items, 'all')).toEqual(['a', 'b']);
    expect(openItemIds([], 'first')).toEqual([]);
  });

  it('makes a fresh empty item with no content key', () => {
    const a = newAccordionItem();
    const b = newAccordionItem();
    expect(a).toEqual({ id: expect.stringMatching(/^.{8}$/), title: '' });
    expect('content' in a).toBe(false);
    expect(a.id).not.toBe(b.id);
  });

  it('moves an item by one, returning the same array when out of range', () => {
    const list = ['a', 'b', 'c'];
    expect(moveItem(list, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(list, 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 2, 1)).toBe(list);
  });
});
