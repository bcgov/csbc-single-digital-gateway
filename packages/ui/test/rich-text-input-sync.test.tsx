import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RichTextInput } from '@ui/inputs/rich-text-input';

// Doc 223 bug 14: a rich text editor follows a value changed ELSEWHERE — the inline canvas editor and the
// inspector's field edit the same content, and each must show what the other wrote.

const state = (text: string) =>
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

const content = () =>
  document.querySelector<HTMLElement>('[data-slot="rich-text-content"]') as HTMLElement;

describe('RichTextInput follows an external value (doc 223 bug 14)', () => {
  it('shows a new value handed to it while it is not focused', async () => {
    const { rerender } = render(<RichTextInput value={state('Hello world')} />);
    expect(content()).toHaveTextContent('Hello world');

    rerender(<RichTextInput value={state('Written elsewhere')} />);

    await waitFor(() => expect(content()).toHaveTextContent('Written elsewhere'));
  });

  it('never overwrites the editor the author is typing in', async () => {
    const { rerender } = render(<RichTextInput value={state('Hello world')} />);
    act(() => content().focus());
    expect(document.activeElement).toBe(content());

    rerender(<RichTextInput value={state('Written elsewhere')} />);

    // Give any pending Lexical update the chance to land before asserting nothing did.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(content()).toHaveTextContent('Hello world');
  });

  it('does not report a synced value as the author’s own change', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<RichTextInput value={state('Hello world')} onChange={onChange} />);

    rerender(<RichTextInput value={state('Written elsewhere')} onChange={onChange} />);

    await waitFor(() => expect(content()).toHaveTextContent('Written elsewhere'));
    // Echoing it back would make two editors bound to one value write to each other for ever.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('empties when the value is cleared elsewhere', async () => {
    const { rerender } = render(<RichTextInput value={state('Hello world')} />);

    rerender(<RichTextInput value={null} />);

    await waitFor(() => expect(content()).not.toHaveTextContent('Hello world'));
  });
});
