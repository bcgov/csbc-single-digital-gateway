import { describe, expect, it } from 'vitest';
import { arrayOptions, shownRowCount } from '../src/renderers/ui/array-options';

const schema = (extra: Record<string, unknown> = {}) => ({
  type: 'array',
  items: { type: 'object', properties: {} },
  ...extra,
});
const control = (options?: Record<string, unknown>) => ({ type: 'Control', options });

describe('arrayOptions (doc 266 rule 1)', () => {
  it('defaults every option', () => {
    expect(arrayOptions(schema(), control())).toEqual({
      minRows: 0,
      maxRows: undefined,
      addRows: true,
      deleteRows: true,
      addLabel: 'Add row',
      pageSize: 10,
    });
    expect(arrayOptions(undefined, undefined)).toEqual(arrayOptions(schema(), control()));
  });

  it('reads valid values', () => {
    expect(
      arrayOptions(
        schema({ minItems: 2, maxItems: 5 }),
        control({ addRows: false, deleteRows: false, addLabel: '  Add member ', pageSize: 25 }),
      ),
    ).toEqual({
      minRows: 2,
      maxRows: 5,
      addRows: false,
      deleteRows: false,
      addLabel: 'Add member',
      pageSize: 25,
    });
  });

  it('turns wrong-typed or contradictory values into defaults', () => {
    const options = arrayOptions(
      schema({ minItems: -1, maxItems: 0 }),
      control({ addRows: 'no', deleteRows: 0, addLabel: '   ', pageSize: 500 }),
    );
    expect(options).toMatchObject({
      minRows: 0,
      maxRows: undefined,
      addRows: true,
      deleteRows: true,
      addLabel: 'Add row',
      pageSize: 10,
    });
    // A maximum below the minimum is no limit.
    expect(arrayOptions(schema({ minItems: 3, maxItems: 2 }), control()).maxRows).toBeUndefined();
    expect(arrayOptions(schema({ minItems: 1.5 }), control({ pageSize: 2.5 }))).toMatchObject({
      minRows: 0,
      pageSize: 10,
    });
  });

  it('shows at least one row and at least the minimum', () => {
    const none = arrayOptions(schema(), control());
    expect(shownRowCount(0, none)).toBe(1);
    expect(shownRowCount(4, none)).toBe(4);
    const three = arrayOptions(schema({ minItems: 3 }), control());
    expect(shownRowCount(1, three)).toBe(3);
  });
});
