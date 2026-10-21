import { DDManager } from 'gridstack/dist/dd-manager';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { holdOverTabStrip, releaseTabStrip } from '../src/renderers/studio/tab-strip-hold';

const $ = (id: string) => document.getElementById(id)!;
const LEAVE = '_mouseLeave';

/** A studio Tabs with a strip and a tab grid, plus a page area outside it. */
function dom() {
  document.body.innerHTML = `
    <div data-slot="page">
      <div data-slot="studio-tabs">
        <div data-slot="tab-strip"><button id="trigger">Tab 2</button></div>
        <div id="gap"></div>
        <div id="grid"><div id="inside"></div></div>
      </div>
      <div id="outside"></div>
      <div data-slot="studio-tabs"><div data-slot="tab-strip"><button id="other"></button></div></div>
    </div>`;
  return {
    grid: $('grid'),
    trigger: $('trigger'),
    gap: $('gap'),
    inside: $('inside'),
    outside: $('outside'),
    other: $('other'),
  };
}

const leaveTo = (relatedTarget: Element | null) => new MouseEvent('mouseleave', { relatedTarget });

afterEach(() => {
  delete (DDManager as { dragElement?: unknown }).dragElement;
  delete (DDManager as { dropElement?: unknown }).dropElement;
});

describe('tab strip hold (doc 272 rule 6b)', () => {
  it("skips a grid's leave anywhere inside its own Tabs — the gap too — and nowhere else", () => {
    const { grid, trigger, gap, outside, other } = dom();
    const leave = vi.fn();
    const droppable = { el: grid, [LEAVE]: leave };
    holdOverTabStrip(droppable);
    holdOverTabStrip(droppable); // once only
    droppable[LEAVE](leaveTo(trigger));
    // The gap between the panel and the strip, crossed first on the way up (found by hand).
    droppable[LEAVE](leaveTo(gap));
    expect(leave).not.toHaveBeenCalled();
    droppable[LEAVE](leaveTo(outside));
    droppable[LEAVE](leaveTo(other));
    expect(leave).toHaveBeenCalledTimes(2);
    // An enter elsewhere always cleans up the old grid.
    droppable[LEAVE](leaveTo(trigger), true);
    expect(leave).toHaveBeenCalledTimes(3);
  });

  it('sends the held leave once the pointer leaves the Tabs, unless back into the grid', () => {
    const { grid, inside, outside } = dom();
    const leave = vi.fn();
    Object.assign(DDManager, { dragElement: {}, dropElement: { el: grid, [LEAVE]: leave } });
    releaseTabStrip(leaveTo(inside));
    expect(leave).not.toHaveBeenCalled();
    releaseTabStrip(leaveTo(outside));
    expect(leave).toHaveBeenCalledTimes(1);
    delete (DDManager as { dragElement?: unknown }).dragElement;
    releaseTabStrip(leaveTo(outside));
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it("holds a card slot's drag anywhere inside its own Card — the gap between the slots too (doc 273 B1)", () => {
    document.body.innerHTML = `
      <div data-slot="page">
        <div data-slot="studio-card">
          <div id="content"></div>
          <div id="between"></div>
          <div id="footer"></div>
        </div>
        <div id="below"></div>
      </div>`;
    const leave = vi.fn();
    const droppable = { el: $('footer'), [LEAVE]: leave };
    holdOverTabStrip(droppable);
    droppable[LEAVE](leaveTo($('between')));
    expect(leave).not.toHaveBeenCalled();
    droppable[LEAVE](leaveTo($('below')));
    expect(leave).toHaveBeenCalledTimes(1);
  });
});
