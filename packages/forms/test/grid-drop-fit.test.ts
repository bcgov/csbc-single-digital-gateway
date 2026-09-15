import { describe, expect, it } from 'vitest';
import { DRAG_IN_MAX_COLUMNS, fitDropIn } from '../src/renderers/gridstack/grid-drop-fit';

// Doc 189 rule 21d — a palette item dropped into a Grid fits the free run on its row, up to 6 columns.

const item = (x: number, w: number, y = 0, h = 5) => ({ x, y, w, h });

describe('fitDropIn (rule 21d)', () => {
  it('lands at most 6 columns wide', () => {
    expect(DRAG_IN_MAX_COLUMNS).toBe(6);
  });

  it.each([
    [7, { x: 7, w: 5 }],
    [8, { x: 8, w: 4 }],
    [9, { x: 9, w: 3 }],
    [6, { x: 6, w: 6 }],
    [3, { x: 6, w: 6 }],
  ])('fits beside a preceding item %i columns wide', (width, fit) => {
    expect(fitDropIn({ x: 11, y: 0 }, [item(0, width)], 12)).toEqual(fit);
  });

  it('stays at the pointer on an empty row, inside the grid', () => {
    expect(fitDropIn({ x: 3, y: 0 }, [], 12)).toEqual({ x: 3, w: 6 });
    expect(fitDropIn({ x: 10, y: 0 }, [], 12)).toEqual({ x: 6, w: 6 });
  });

  it('fits between two items, and moves off a preceding item to its end', () => {
    expect(fitDropIn({ x: 4, y: 0 }, [item(0, 3), item(9, 3)], 12)).toEqual({ x: 3, w: 6 });
    expect(fitDropIn({ x: 5, y: 0 }, [item(0, 4), item(8, 4)], 12)).toEqual({ x: 4, w: 4 });
    expect(fitDropIn({ x: 2, y: 0 }, [item(0, 7)], 12)).toEqual({ x: 7, w: 5 });
  });

  it('counts only the items spanning the drop’s top line', () => {
    expect(fitDropIn({ x: 11, y: 6 }, [item(0, 7, 0, 5)], 12)).toEqual({ x: 6, w: 6 });
    expect(fitDropIn({ x: 11, y: 3 }, [item(0, 7, 0, 5)], 12)).toEqual({ x: 7, w: 5 });
  });

  it('with no free run is 6 wide at its x, so gridstack makes room below', () => {
    expect(fitDropIn({ x: 4, y: 0 }, [item(0, 12)], 12)).toEqual({ x: 4, w: 6 });
    expect(fitDropIn({ x: 9, y: 0 }, [item(0, 12)], 12)).toEqual({ x: 6, w: 6 });
  });

  it('never exceeds a narrow grid', () => {
    expect(fitDropIn({ x: 2, y: 0 }, [], 4)).toEqual({ x: 0, w: 4 });
  });
});
