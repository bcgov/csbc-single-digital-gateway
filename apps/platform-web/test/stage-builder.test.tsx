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
  it('renders the canvas toolbar without crashing', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /add stage/i })).toBeInTheDocument();
  });
});
