import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlowLayoutControls } from '../src/renderers/xyflow/flow-layout-controls';
import { LAYOUT_ALGORITHMS } from '../src/renderers/xyflow/flow-elk';

// Doc 198 rules 31-32 — the canvas's layout controls: which algorithm arranges the flow, and which way it runs.

function renderControls(overrides: Partial<Parameters<typeof FlowLayoutControls>[0]> = {}) {
  const onAlgorithmChange = vi.fn();
  const onDirectionChange = vi.fn();
  render(
    <FlowLayoutControls
      algorithm="layered"
      direction="vertical"
      onAlgorithmChange={onAlgorithmChange}
      onDirectionChange={onDirectionChange}
      {...overrides}
    />,
  );
  return { onAlgorithmChange, onDirectionChange };
}

const picker = () => screen.getByRole('combobox', { name: 'Layout algorithm' });

describe('the algorithm picker (rule 31)', () => {
  it('offers every algorithm, showing the one in use', () => {
    renderControls();
    expect([...picker().querySelectorAll('option')].map((option) => option.textContent)).toEqual(
      LAYOUT_ALGORITHMS.map(({ label }) => label),
    );
    expect(picker()).toHaveValue('layered');
  });

  it('reports a chosen algorithm', () => {
    const { onAlgorithmChange } = renderControls();
    fireEvent.change(picker(), { target: { value: 'mrtree' } });
    expect(onAlgorithmChange).toHaveBeenCalledWith('mrtree');
  });

  it('ignores a value that is not one of them', () => {
    const { onAlgorithmChange } = renderControls();
    fireEvent.change(picker(), { target: { value: 'nonsense' } });
    expect(onAlgorithmChange).not.toHaveBeenCalled();
  });
});

describe('the direction toggles (rule 32)', () => {
  it('shows which way the flow runs, and reports the other', () => {
    const { onDirectionChange } = renderControls();
    expect(screen.getByRole('button', { name: 'Vertical' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Horizontal' }));

    expect(onDirectionChange).toHaveBeenCalledWith('horizontal');
  });

  it('keeps the current direction when the pressed one is pressed again', () => {
    // Base UI reports an EMPTY set for that press; a canvas always runs one way or the other.
    const { onDirectionChange } = renderControls({ direction: 'horizontal' });
    fireEvent.click(screen.getByRole('button', { name: 'Horizontal' }));
    expect(onDirectionChange).not.toHaveBeenCalled();
  });

  it('keeps its presses off the canvas: they neither pan it nor select the Flow', () => {
    renderControls();
    const controls = document.querySelector('[data-slot="flow-layout-controls"]');
    // Doc 196 rule 13's opt-outs, plus the stopped pointerdown the studio's selection listens for.
    expect(controls).toHaveClass('nodrag', 'nopan');
    const pointerDown = new MouseEvent('pointerdown', { bubbles: true });
    const reached = vi.fn();
    document.addEventListener('pointerdown', reached);
    controls?.dispatchEvent(pointerDown);
    document.removeEventListener('pointerdown', reached);
    expect(reached).not.toHaveBeenCalled();
  });
});
