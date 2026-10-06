import { describe, expect, it } from 'vitest';
import {
  cardDescription,
  cardGap,
  cardSize,
  cardSlots,
  cardTitle,
  newCardSlot,
} from '../src/renderers/ui/card-model';

const slot = (id: string, elements: unknown[] = []) => ({
  id,
  type: 'VerticalLayout',
  elements,
});

describe('card model (doc 273 rules 1, 3-4)', () => {
  it('takes the first VerticalLayout as content and the second as footer, ignoring anything else', () => {
    const card = {
      type: 'Card',
      elements: [{ id: 'h', type: 'Heading' }, slot('c'), 'junk', slot('f'), slot('extra')],
    };
    const { content, footer } = cardSlots(card);
    expect(content?.['id']).toBe('c');
    expect(footer?.['id']).toBe('f');
    expect(cardSlots({ type: 'Card', elements: [slot('c')] })).toEqual({ content: slot('c') });
    expect(cardSlots({ type: 'Card' })).toEqual({});
    expect(cardSlots(undefined)).toEqual({});
  });

  it('reads size as default unless sm, and gap only when a known one', () => {
    expect(cardSize({ options: { size: 'sm' } })).toBe('sm');
    expect(cardSize({ options: { size: 'lg' } })).toBe('default');
    expect(cardSize({})).toBe('default');
    expect(cardGap({ options: { gap: 'lg' } })).toBe('lg');
    expect(cardGap({ options: { gap: 'huge' } })).toBeUndefined();
    expect(cardGap({})).toBeUndefined();
  });

  it('reads a non-blank title and description, trimmed', () => {
    expect(cardTitle({ label: '  Contact  ' })).toBe('Contact');
    expect(cardTitle({ label: '   ' })).toBeUndefined();
    expect(cardTitle({ label: 3 })).toBeUndefined();
    expect(cardDescription({ options: { description: ' How to reach you ' } })).toBe(
      'How to reach you',
    );
    expect(cardDescription({ options: { description: { root: {} } } })).toBeUndefined();
  });

  it('builds a fresh empty slot every call', () => {
    const a = newCardSlot();
    const b = newCardSlot();
    expect(a).toMatchObject({ type: 'VerticalLayout', elements: [] });
    expect(a['id']).toMatch(/^[\w-]{8}$/);
    expect(a['id']).not.toBe(b['id']);
  });
});
