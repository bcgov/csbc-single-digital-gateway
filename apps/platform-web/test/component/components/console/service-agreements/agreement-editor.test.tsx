import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgreementEditor } from '@/components/console/service-agreements/agreement-editor';

// Monaco can't run in jsdom — proxy it with a plain textarea, as the templates admin suite does.
vi.mock('@monaco-editor/react', () => ({
  default: ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange?: (v: string) => void;
    options?: { readOnly?: boolean };
  }) => (
    <textarea
      aria-label="content"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={options?.readOnly}
    />
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
});

/**
 * Feature 217: the editor was a controlled `<JsonForms>` over the Service Agreement TYPE's
 * definition, editing the version's filled `data`. An agreement is authored now — its version
 * carries one `content` — and the JSONForms renderers are gone, so this is the Monaco JSON editor.
 */
describe('AgreementEditor Component Test Suite', () => {
  const content = JSON.stringify(
    { schema: { type: 'object', properties: {} }, uischema: { type: 'Form', elements: [] } },
    null,
    2,
  );

  it('renders the content JSON and reports edits when not readonly', async () => {
    const onChange = vi.fn();
    render(<AgreementEditor value={content} onChange={onChange} readonly={false} />);

    const editor = screen.getByLabelText('content');
    expect(editor).toHaveValue(content);
    expect(editor).not.toHaveAttribute('readonly');

    await userEvent.type(editor, '!');

    expect(onChange).toHaveBeenCalled();
  });

  it('is read-only when the selected version is not a draft', () => {
    render(<AgreementEditor value={content} onChange={vi.fn()} readonly />);

    expect(screen.getByLabelText('content')).toHaveAttribute('readonly');
  });
});
