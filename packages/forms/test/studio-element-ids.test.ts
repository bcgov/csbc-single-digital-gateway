import { describe, expect, it } from 'vitest';
import { createElementIds } from '../src/studio/layout/element-ids';

// Doc 183 rules 5-6 — studio-only element ids, carried across immutable updates.

describe('createElementIds', () => {
  it('gives the same object the same id and different objects different ids', () => {
    const ids = createElementIds();
    const a = {};
    const b = {};

    expect(ids.idOf(a)).toBe('el-1');
    expect(ids.idOf(a)).toBe('el-1');
    expect(ids.idOf(b)).toBe('el-2');
  });

  it('carries an id from an element to its replacement, keeping it on the original too', () => {
    const ids = createElementIds();
    const original = {};
    const replacement = {};
    const id = ids.idOf(original);

    ids.carry(original, replacement);

    expect(ids.idOf(replacement)).toBe(id);
    expect(ids.idOf(original)).toBe(id);
  });

  it('assigns the original an id first when carrying from an element it has not seen', () => {
    const ids = createElementIds();
    const original = {};
    const replacement = {};

    ids.carry(original, replacement);

    expect(ids.idOf(replacement)).toBe('el-1');
    expect(ids.idOf(original)).toBe('el-1');
  });

  it('forgets every id and restarts the counter when cleared', () => {
    const ids = createElementIds();
    const a = {};
    const b = {};
    ids.idOf(a);

    ids.clear();

    expect(ids.idOf(b)).toBe('el-1');
    expect(ids.idOf(a)).toBe('el-2');
  });

  it('never writes the id onto the element', () => {
    const ids = createElementIds();
    const element = { type: 'Heading' };
    ids.idOf(element);
    expect(element).toStrictEqual({ type: 'Heading' });
  });
});
