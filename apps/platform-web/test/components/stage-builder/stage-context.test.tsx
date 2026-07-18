import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StageBuilderContext, useStageBuilder } from '@/components/stage-builder/stage-context';
import type { StageBuilderApi } from '@/components/stage-builder/stage-context';

const originalError = console.error;
const suppressError = () => {
  console.error = () => {};
};
const restoreError = () => {
  console.error = originalError;
};

const TestConsumerThrow = () => {
  useStageBuilder();
  return null;
};

const TestConsumerSuccess = () => {
  const context = useStageBuilder();
  return <div data-testid="context-value">{context.def.name}</div>;
};

describe('useStageBuilder hook', () => {
  it('throws an error if used outside of StageBuilderContext.Provider', () => {
    suppressError();

    expect(() => render(<TestConsumerThrow />)).toThrow(
      'useStageBuilder must be used within a StageBuilder',
    );
    restoreError();
  });

  it('returns context value when used within StageBuilderContext.Provider', () => {
    const mockValue: StageBuilderApi = {
      def: { name: 'My Flow', description: '', stages: [], edges: [] },
      addPage: () => {},
      removePage: () => {},
      reorderPages: () => {},
      renameStage: () => {},
      removeStage: () => {},
      selectPage: () => {},
      addAfter: () => {},
      addBefore: () => {},
    };

    render(
      <StageBuilderContext.Provider value={mockValue}>
        <TestConsumerSuccess />
      </StageBuilderContext.Provider>,
    );

    expect(screen.getByTestId('context-value')).toHaveTextContent('My Flow');
  });
});
