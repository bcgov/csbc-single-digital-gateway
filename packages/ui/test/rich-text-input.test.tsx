import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RichTextInput } from '@ui/inputs/rich-text-input';

const hello = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Hello world',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
} as never;

describe('RichTextInput', () => {
  it('renders an editable surface with a formatting toolbar', () => {
    render(<RichTextInput id="about" />);
    expect(screen.getByRole('toolbar', { name: /formatting/i })).toBeInTheDocument();
    for (const label of [
      'Bold',
      'Italic',
      'Underline',
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Bullet list',
      'Numbered list',
      'Link',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(document.querySelector('[contenteditable="true"]')).toBeTruthy();
  });

  it('initializes from a SerializedEditorState value', () => {
    render(<RichTextInput value={hello} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('is not editable when disabled', () => {
    render(<RichTextInput value={hello} disabled />);
    expect(document.querySelector('[contenteditable="false"]')).toBeTruthy();
  });

  it('does not crash on an empty `{}` value (no root) — renders an empty editor', () => {
    render(<RichTextInput value={{} as never} />);
    expect(document.querySelector('[contenteditable="true"]')).toBeTruthy();
  });

  it('dispatches a formatting command without crashing', async () => {
    const user = userEvent.setup();
    render(<RichTextInput />);
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(screen.getByRole('toolbar', { name: /formatting/i })).toBeInTheDocument();
  });
});
