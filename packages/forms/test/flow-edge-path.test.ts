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
    // Rule 33c clamps the synthesised corner to the source, so two coincident ends stay a zero-length path
    // instead of hooking 120px backwards and finding a midpoint out there.
    expect(routeMidpoint({ x: 7, y: 9 }, { x: 7, y: 9 }, [])).toEqual({ x: 7, y: 9 });
  });
});

describe('the approach corner (rule 33c)', () => {
  it('turns every unrouted edge at the same distance before its target', () => {
    // EDGE_APPROACH is 120: the corner sits in the strip ELK reserves clear of nodes.
    const [path] = routedPath({ x: 0, y: 0 }, { x: 500, y: 100 }, []);
    expect(path).toBe('M 0,0 L 0,0 L 380,0 L 380,100 L 500,100');
  });

  it('draws a straight line when the two ends share a row', () => {
    // The synthesised turn is zero-length, so nothing changes for an edge that was already straight.
    const [path] = routedPath({ x: 0, y: 50 }, { x: 500, y: 50 }, []);
    expect(path).toBe('M 0,50 L 0,50 L 380,50 L 380,50 L 500,50');
  });

  it('clamps the corner to the source rather than hooking backwards', () => {
    // Closer together than the gutter — which xyflow handle positions can be, even though ELK's node boxes
    // are a whole layer apart.
    const [path] = routedPath({ x: 0, y: 0 }, { x: 40, y: 100 }, []);
    expect(path).toBe('M 0,0 L 0,0 L 0,0 L 0,100 L 40,100');
  });

  it('leaves an edge ELK actually routed alone', () => {
    const [path] = routedPath({ x: 0, y: 0 }, { x: 500, y: 100 }, [{ x: 200, y: 60 }]);
    expect(path).toBe('M 0,0 L 0,60 L 200,60 L 200,100 L 500,100');
  });
});
