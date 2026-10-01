import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { NodeMarks } from '../src/studio/canvas-graph';
import { NodeFrame } from '../src/studio/node-parts';

const NONE: NodeMarks = { first: false, start: false, end: false, invalid: false, floating: false };

function frame(marks: Partial<NodeMarks>, selected = false) {
  const { container } = render(
    <NodeFrame marks={{ ...NONE, ...marks }} selected={selected} slot="frame" className="">
      body
    </NodeFrame>,
  );
  return container.querySelector<HTMLElement>('[data-slot="frame"]')!;
}

describe('NodeFrame', () => {
  it.each([
    [{}, 'border-border'],
    [{ start: true }, 'border-success-border'],
    [{ end: true }, 'border-foreground'],
    [{ start: true, invalid: true }, 'border-danger-border'],
    [{ invalid: true, floating: true }, 'border-warning-border'],
  ])('marks %o by the colour of an always-2px border', (marks, colour) => {
    const card = frame(marks);

    expect(card).toHaveClass('border-2', colour);
    expect(card.className).not.toMatch(/\boutline-/);
  });

  it('splits a start-and-end border with two half frames laid over a neutral border', () => {
    const card = frame({ start: true, end: true });
    const halves = card.querySelectorAll('span[aria-hidden]');

    expect(card).toHaveClass('border-2', 'border-border');
    expect(halves).toHaveLength(2);
    expect(halves[0]).toHaveClass('border-success-border', 'rounded-l-md');
    expect(halves[1]).toHaveClass('border-foreground', 'rounded-r-md');
  });

  it('shows the selection as an offset ring outside the border, leaving the mark colour alone', () => {
    const card = frame({ start: true }, true);

    expect(card).toHaveClass('border-success-border', 'ring-2', 'ring-ring', 'ring-offset-2');
    expect(frame({ start: true })).not.toHaveClass('ring-2');
  });

  it('grows to a fixed first screen, then opens to its content height, never shorter', () => {
    const { container } = render(
      <>
        <NodeFrame marks={NONE} page="growing" slot="growing" className="">
          page
        </NodeFrame>
        <NodeFrame marks={NONE} page="open" slot="open" className="">
          page
        </NodeFrame>
      </>,
    );

    expect(container.querySelector('[data-slot="growing"]')).toHaveClass('w-[768px]', 'h-[994px]');
    expect(container.querySelector('[data-slot="open"]')).toHaveClass('h-auto', 'min-h-[994px]');
    expect(container.querySelector('[data-slot="open"]')).toHaveClass(
      '[interpolate-size:allow-keywords]',
    );
  });
});
