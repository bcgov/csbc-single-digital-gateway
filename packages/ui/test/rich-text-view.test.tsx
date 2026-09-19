import { render, screen, waitFor } from '@testing-library/react';
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

  it('renders nothing (does not crash) for an empty `{}` value with no root', () => {
    const { container } = render(<RichTextView value={{} as never} />);
    expect(container).toBeEmptyDOMElement();
  });
});

// Doc 207: the view must FOLLOW its `value` prop. `LexicalComposer` reads `initialConfig` only on first
// mount, so the view used to freeze at whatever it was first given — invisible in every existing consumer
// (each loads content once) and broken the moment content is edited live beside it.

const textState = (text: string) =>
  ({
    root: {
      children: [
        {
          children: [
            { detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 },
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
  }) as never;

describe('RichTextView value updates', () => {
  it('re-renders when the value changes after mount', async () => {
    const { rerender } = render(<RichTextView value={textState('First')} />);
    expect(screen.getByText('First')).toBeInTheDocument();

    rerender(<RichTextView value={textState('Second')} />);
    await waitFor(() => expect(screen.getByText('Second')).toBeInTheDocument());
    expect(screen.queryByText('First')).toBeNull();
  });

  it('keeps rendering the same content when given an equal-but-new object', async () => {
    const { rerender } = render(<RichTextView value={textState('Same')} />);
    rerender(<RichTextView value={textState('Same')} />);
    await waitFor(() => expect(screen.getByText('Same')).toBeInTheDocument());
  });
});
