import { fireEvent, render } from '@testing-library/react';
import { JsonForms } from '@jsonforms/react';
import { describe, expect, it, vi } from 'vitest';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider } from '../src/renderers/studio/index';
import { studioHeading } from './render-studio-renderers';

// Doc 238 rule 16b: the provider still owns the page selection, and reports every change to its host.
describe('StudioEditorProvider onSelectionChange (doc 238 rule 16b)', () => {
  it('reports each selection, and leaves the selection its own', () => {
    const onSelectionChange = vi.fn<(id: string | null) => void>();
    const { container } = render(
      <StudioEditorProvider
        update={() => {}}
        insert={() => {}}
        onSelectionChange={onSelectionChange}
      >
        <JsonForms
          schema={{ type: 'object' }}
          uischema={
            {
              id: 'form',
              type: 'Form',
              elements: [studioHeading('a', 'A'), studioHeading('b', 'B')],
            } as never
          }
          data={{}}
          renderers={studio.renderers}
          cells={studio.cells}
        />
      </StudioEditorProvider>,
    );
    fireEvent.click(container.querySelector('[data-element-id="b"]')!);
    expect(onSelectionChange).toHaveBeenLastCalledWith('b');
    expect(container.querySelector('[data-element-id="b"]')).toHaveAttribute('data-selected');
    fireEvent.click(container.querySelector('[data-element-id="a"]')!);
    expect(onSelectionChange).toHaveBeenLastCalledWith('a');
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
  });
});
