import { describe, expect, it, vi } from 'vitest';
import {
  fitViewport,
  ease,
  zoomToBounds,
  zoomToViewport,
  type Zoomable,
} from '../src/studio/canvas-zoom';

const camera = (): Zoomable & { [K in keyof Zoomable]: ReturnType<typeof vi.fn> } => ({
  fitBounds: vi.fn(() => Promise.resolve(true)),
  getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
  setViewport: vi.fn(() => Promise.resolve(true)),
});

describe('canvas zoom', () => {
  it('returns the camera to a remembered viewport on the shared motion', () => {
    const instance = camera();

    zoomToViewport(instance, { x: 120, y: -40, zoom: 1.5 });

    expect(instance.setViewport).toHaveBeenCalledWith(
      { x: 120, y: -40, zoom: 1.5 },
      { duration: 300, ease, interpolate: 'linear' },
    );
  });

  it('fits bounds on the same motion, with padding', () => {
    const instance = camera();
    const bounds = { x: 0, y: 0, width: 768, height: 994 };

    zoomToBounds(instance, bounds, 0.05);

    expect(instance.fitBounds).toHaveBeenCalledWith(bounds, {
      padding: 0.05,
      duration: 300,
      ease,
      interpolate: 'linear',
    });
  });

  it('does nothing before the canvas has an instance', () => {
    expect(() => zoomToViewport(null, { x: 0, y: 0, zoom: 1 })).not.toThrow();
  });

  it('re-fits a page to a resized canvas — shrinking, growing and centring it on both axes (doc 241 rule 5)', () => {
    const page = { x: 0, y: 0, width: 768, height: 994 };
    const narrow = fitViewport(page, 600, 2000, 0);
    const wide = fitViewport(page, 1200, 2000, 0);

    expect(narrow.zoom).toBeCloseTo(600 / 768);
    expect(wide.zoom).toBeCloseTo(1200 / 768);
    expect(narrow.x).toBeCloseTo(0); // the page fills the width exactly
    expect(narrow.y).toBeCloseTo((2000 - 994 * narrow.zoom) / 2);
  });
});
