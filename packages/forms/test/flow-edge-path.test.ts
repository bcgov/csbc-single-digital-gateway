import { describe, expect, it } from 'vitest';
import { isRouted, routedPath, routeMidpoint } from '../src/renderers/xyflow/flow-edge-path';

// Doc 198 rule 33 — the square path an edge takes along the route ELK gave it.

describe('isRouted', () => {
  it('is true only for an edge ELK bent around something', () => {
    // A straight edge comes back with no bend points: its two ends are all the component needs.
    expect(isRouted([])).toBe(false);
    expect(isRouted([{ x: 10, y: 20 }])).toBe(true);
  });
});

describe('routedPath', () => {
  it('turns square corners: down to the lane’s row, across into it, and on to the target', () => {
    const [path] = routedPath({ x: 100, y: 0 }, { x: 100, y: 600 }, [
      { x: 20, y: 200 },
      { x: 20, y: 400 },
    ]);
    expect(path).toBe('M 100,0 L 100,200 L 20,200 L 20,400 L 20,400 L 20,600 L 100,600');
  });

  it('ends at the target even when the lane returns to its column', () => {
    const [path] = routedPath({ x: 0, y: 0 }, { x: 50, y: 300 }, [
      { x: -80, y: 100 },
      { x: -80, y: 200 },
    ]);
    expect(path.endsWith('L 50,300')).toBe(true);
    expect(path.startsWith('M 0,0')).toBe(true);
  });
});

describe('routeMidpoint (rule 33b)', () => {
  it('sits halfway along the path by LENGTH, not on a bend point', () => {
    // The drawn path is 200 down, 80 across, 200 down, 200 down, 80 back = 760 long, so halfway is 380 — which
    // lands on the run down the lane, at y = 300, NOT on either bend point (200 and 400).
    const middle = routeMidpoint({ x: 100, y: 0 }, { x: 100, y: 600 }, [
      { x: 20, y: 200 },
      { x: 20, y: 400 },
    ]);
    expect(middle).toEqual({ x: 20, y: 300 });
  });

  it('is the centre of a straight run when there is nothing to bend around', () => {
    expect(routeMidpoint({ x: 0, y: 0 }, { x: 0, y: 400 }, [{ x: 0, y: 200 }])).toEqual({
      x: 0,
      y: 200,
    });
  });

  it('falls back to the source for a zero-length path rather than dividing by it', () => {
    expect(routeMidpoint({ x: 7, y: 9 }, { x: 7, y: 9 }, [])).toEqual({ x: 7, y: 9 });
  });
});
