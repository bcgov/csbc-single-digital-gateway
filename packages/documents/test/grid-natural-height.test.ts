import { describe, expect, it } from 'vitest';
import { measuredParts, naturalHeight } from '../src/renderers/studio/grid-natural-height';

/** jsdom has no layout: give an element the layout sizes a browser would. */
function sized<T extends HTMLElement>(el: T, sizes: { top?: number; height: number }): T {
  Object.defineProperty(el, 'offsetTop', { value: sizes.top ?? 0 });
  Object.defineProperty(el, 'offsetHeight', { value: sizes.height });
  return el;
}

/** A stretched studio element 120px tall (its cell) holding 40px of content, 16px bottom padding, and a badge. */
function stretchedElement() {
  const wrapper = sized(document.createElement('div'), { height: 120 });
  wrapper.setAttribute('data-slot', 'studio-element');
  wrapper.style.paddingBottom = '16px';
  const body = sized(document.createElement('div'), { top: 16, height: 40 });
  const badge = sized(document.createElement('span'), { top: 0, height: 200 });
  badge.style.position = 'absolute';
  wrapper.append(body, badge);
  return { wrapper, body, badge };
}

describe('Grid child natural height (doc 260 rule 9b)', () => {
  it('measures a stretched element by its in-flow content, never its stretched box or its badges', () => {
    const { wrapper } = stretchedElement();
    wrapper.style.paddingTop = '16px';
    expect(naturalHeight(wrapper)).toBe(16 + 40 + 16);
  });

  it('measures the content EXTENT, so centred content never grows its row (rule 32)', () => {
    const wrapper = sized(document.createElement('div'), { height: 200 });
    wrapper.setAttribute('data-slot', 'studio-element');
    // Centred in a 200px frame: 40px of content starting 80px down.
    wrapper.append(sized(document.createElement('div'), { top: 80, height: 40 }));
    expect(naturalHeight(wrapper)).toBe(40);
  });

  it('measures any other content child by its own height', () => {
    expect(naturalHeight(sized(document.createElement('div'), { height: 30 }))).toBe(30);
  });

  it('watches a stretched element and its in-flow content, which no longer resize it', () => {
    const { wrapper, body } = stretchedElement();
    expect(measuredParts(wrapper)).toEqual([wrapper, body]);
    const plain = document.createElement('div');
    expect(measuredParts(plain)).toEqual([plain]);
  });
});
