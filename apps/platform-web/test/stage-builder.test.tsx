import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { StageBuilder } from '@/components/stage-builder/stage-builder';
import { emptyDefinition, type MultiStageDefinition } from '@/components/stage-builder/stage-model';

// @xyflow/react is jsdom-hostile (measures the DOM) — keep this to render-safety, not interactions.
function Harness() {
  const [value, setValue] = useState<MultiStageDefinition>(emptyDefinition());
  return <StageBuilder value={value} onChange={setValue} />;
}

describe('StageBuilder (render-safety)', () => {
  it('renders the canvas toolbar + form panel without crashing', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /add stage/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/form name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('renders a partial definition with no edges without crashing (regression)', () => {
    // A template-derived form stores `{ stages }` with no `edges` — must not throw on `edges.map`.
    const partial = {
      stages: [{ id: 's1', name: 'Stage 1', position: { x: 0, y: 0 }, pages: [] }],
    } as unknown as MultiStageDefinition;
    render(<StageBuilder value={partial} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /add stage/i })).toBeInTheDocument();
  });
});
