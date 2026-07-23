import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DefinitionEditor } from '@/components/admin/document-types/definition-editor';

// Mock Monaco Editor because it doesn't run in JSDOM.
// We capture options to assert that properties are passed down correctly.
let mockedOptions: any = null;
let mockedOnChange: any = null;
vi.mock('@monaco-editor/react', () => ({
  default: ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange?: (v: string | undefined) => void;
    options?: any;
  }) => {
    mockedOptions = options;
    mockedOnChange = onChange;
    return (
      <textarea
        aria-label="definition-textarea"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={options?.readOnly}
      />
    );
  },
}));

describe('DefinitionEditor', () => {
  it('renders the editor with the initial value and options', () => {
    render(<DefinitionEditor value='{"key": "value"}' readOnly={true} />);

    const textarea = screen.getByLabelText('definition-textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('{"key": "value"}');
    expect(textarea).toHaveAttribute('readonly');
    expect(mockedOptions).toEqual({
      readOnly: true,
      minimap: { enabled: false },
      fontSize: 13,
      scrollBeyondLastLine: false,
      tabSize: 2,
    });
  });

  it('defaults readOnly to false if not provided', () => {
    render(<DefinitionEditor value="" />);
    expect(mockedOptions.readOnly).toBe(false);
  });

  it('triggers onChange when value is changed', () => {
    const handleChange = vi.fn();
    render(<DefinitionEditor value="" onChange={handleChange} readOnly={false} />);

    const textarea = screen.getByLabelText('definition-textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).not.toHaveAttribute('readonly');

    fireEvent.change(textarea, { target: { value: '{"new": "value"}' } });
    expect(handleChange).toHaveBeenCalledWith('{"new": "value"}');
  });

  it('handles next being undefined in onChange', () => {
    const handleChange = vi.fn();
    render(<DefinitionEditor value="" onChange={handleChange} />);

    mockedOnChange(undefined);
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('does not crash if onChange is undefined', () => {
    render(<DefinitionEditor value="" />);
    expect(() => mockedOnChange('some-value')).not.toThrow();
  });
});
