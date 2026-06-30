import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RichTextView } from '@ui/inputs/rich-text-view';

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

describe('RichTextView', () => {
  it('renders the formatted content', () => {
    render(<RichTextView value={hello} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('is read-only — no editable surface and no toolbar', () => {
    render(<RichTextView value={hello} />);
    expect(document.querySelector('[contenteditable="true"]')).toBeNull();
    expect(document.querySelector('[contenteditable="false"]')).toBeTruthy();
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('renders nothing when value is null', () => {
    const { container } = render(<RichTextView value={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
