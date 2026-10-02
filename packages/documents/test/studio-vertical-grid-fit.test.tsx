import { act } from '@testing-library/react';
import { GridStack, type GridItemHTMLElement } from 'gridstack';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderStudioRenderers, studioHeading } from './render-studio-renderers';

// Doc 243 rule 15. Found by hand with a layout TWO levels deep: a move into the inner layout remounts it (its ids
// changed) but not the layout around it (its ids did not), which grew through its ResizeObserver — with gridstack's
// animation on, so the change rippled up the page as an animated relayout.

/** Every ResizeObserver callback the studio grids register, so a test can report a content resize. */
const observed: ResizeObserverCallback[] = [];
const original = globalThis.ResizeObserver;
/** Waits `n` animation frames, one after another. */
const frames = (n: number): Promise<void> =>
  n === 0
    ? Promise.resolve()
    : new Promise<void>((resolve) => requestAnimationFrame(() => resolve())).then(() =>
        frames(n - 1),
      );
const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!;

afterEach(() => {
  globalThis.ResizeObserver = original;
  observed.length = 0;
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight);
  vi.restoreAllMocks();
});

describe('studio grid fit to content (doc 243 rule 15)', () => {
  it('resizes an item to its content with animation off, then turns animation back on', async () => {
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        observed.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    let height = 36;
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => height,
    });
    const { container } = renderStudioRenderers({
      id: 'form',
      type: 'Form',
      elements: [{ id: 'outer', type: 'VerticalLayout', elements: [studioHeading('a', 'A')] }],
    });
    // Let the grids' init frame turn their animation on.
    await act(async () => {
      await frames(2);
    });
    const root = container.querySelector('[data-slot="studio-vertical-layout"]') as HTMLElement & {
      gridstack: GridStack;
    };
    expect(root).toHaveClass('grid-stack-animate');

    const animatedAtUpdate: boolean[] = [];
    vi.spyOn(GridStack.prototype, 'update').mockImplementation(function (this: GridStack) {
      animatedAtUpdate.push(this.el.classList.contains('grid-stack-animate'));
      return this;
    });
    // The outer layout's content grew (a field moved into it): every observer reports.
    height = 80;
    act(() => {
      for (const callback of observed) callback([], {} as ResizeObserver);
    });
    expect(animatedAtUpdate.length).toBeGreaterThan(0);
    expect(animatedAtUpdate.every((animated) => !animated)).toBe(true);

    await act(async () => {
      await frames(2);
    });
    expect(root).toHaveClass('grid-stack-animate');
    const item = root.querySelector<GridItemHTMLElement>(':scope > [gs-id="outer"]');
    expect(item).not.toBeNull();
  });

  // Found by hand (doc 236 bug B3): a palette insert remounts the grid with the NEW item one row tall; fitting it moves
  // the items below, and a single frame's wait could add the animation class before the corrected layout was painted —
  // everything below the new item slid down into place. Two frames: the final positions paint without animation first.
  it('turns animation on only after two frames, so a new grid paints its fitted layout first', async () => {
    const { container } = renderStudioRenderers({
      id: 'form',
      type: 'Form',
      elements: [studioHeading('a', 'A')],
    });
    const root = container.querySelector('[data-slot="studio-vertical-layout"]')!;
    await act(async () => {
      await frames(1);
    });
    expect(root).not.toHaveClass('grid-stack-animate');
    await act(async () => {
      await frames(1);
    });
    expect(root).toHaveClass('grid-stack-animate');
  });
});
