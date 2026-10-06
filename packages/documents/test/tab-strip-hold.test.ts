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
        <div id="grid"><div id="inside"></div></div>
      </div>
      <div id="outside"></div>
      <div data-slot="studio-tabs"><div data-slot="tab-strip"><button id="other"></button></div></div>
    </div>`;
  return {
    grid: $('grid'),
    trigger: $('trigger'),
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
  it("skips a grid's leave onto its own Tabs' strip, and nowhere else", () => {
    const { grid, trigger, outside, other } = dom();
    const leave = vi.fn();
    const droppable = { el: grid, [LEAVE]: leave };
    holdOverTabStrip(droppable);
    holdOverTabStrip(droppable); // once only
    droppable[LEAVE](leaveTo(trigger));
    expect(leave).not.toHaveBeenCalled();
    droppable[LEAVE](leaveTo(outside));
    droppable[LEAVE](leaveTo(other));
    expect(leave).toHaveBeenCalledTimes(2);
    // An enter elsewhere always cleans up the old grid.
    droppable[LEAVE](leaveTo(trigger), true);
    expect(leave).toHaveBeenCalledTimes(3);
  });

  it('sends the held leave once the pointer leaves the strip, unless back into the grid', () => {
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
});
