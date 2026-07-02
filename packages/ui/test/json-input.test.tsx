import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Monaco does not run in jsdom, so stand it in with a plain textarea that
// surfaces the same value/onChange contract the component relies on.
vi.mock('@monaco-editor/react', () => ({
  default: ({
    defaultValue,
    onChange,
  }: {
    defaultValue?: string;
    onChange?: (v: string | undefined) => void;
  }) => (
    <textarea
      aria-label="json"
      defaultValue={defaultValue}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

import { JsonInput } from '@ui/inputs/json-input';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('JsonInput', () => {
  it('seeds the editor from the value object', () => {
    render(<JsonInput value={{ hello: 'world' }} onChange={() => {}} />);
    expect(screen.getByLabelText('json')).toHaveValue('{\n  "hello": "world"\n}');
  });

  it('emits the parsed object for valid JSON', () => {
    const onChange = vi.fn();
    render(<JsonInput value={undefined} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('json'), { target: { value: '{"a":1}' } });
    expect(onChange).toHaveBeenLastCalledWith({ a: 1 });
  });

  it('emits undefined when cleared to empty', () => {
    const onChange = vi.fn();
    render(<JsonInput value={undefined} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('json'), { target: { value: '   ' } });
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('ignores invalid or non-object JSON (no propagation)', () => {
    const onChange = vi.fn();
    render(<JsonInput value={undefined} onChange={onChange} />);
    // A bare array is valid JSON but not a Record — must not propagate.
    fireEvent.change(screen.getByLabelText('json'), { target: { value: '[1,2]' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
