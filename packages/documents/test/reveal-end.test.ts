import { describe, expect, it, vi } from 'vitest';
import { revealTableEnd } from '../src/renderers/studio/reveal-end';

describe('revealTableEnd (doc 270)', () => {
  it('scrolls the enclosing table container to its right end after the edit renders', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });
    const container = document.createElement('div');
    container.dataset['slot'] = 'table-container';
    Object.defineProperty(container, 'scrollWidth', { value: 900 });
    const scrollTo = vi.fn();
    container.scrollTo = scrollTo as typeof container.scrollTo;
    const button = document.createElement('button');
    container.append(button);
    revealTableEnd(button);
    expect(scrollTo).not.toHaveBeenCalled();
    vi.advanceTimersToNextFrame();
    vi.advanceTimersToNextFrame();
    expect(scrollTo).toHaveBeenCalledWith({ left: 900 });
    vi.useRealTimers();
  });

  it('does nothing outside a table container', () => {
    expect(() => revealTableEnd(document.createElement('button'))).not.toThrow();
  });
});
