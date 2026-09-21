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

// Doc 207 rules 11-16 — the toolbar, placeholder and height become configurable, and the toolbar's
// documented `aria-pressed` gap (rich-text-input.a11y.ts) is closed for the inline formats.

const ALL_BUTTONS = [
  'Bold',
  'Italic',
  'Underline',
  'Heading 1',
  'Heading 2',
  'Heading 3',
  'Bullet list',
  'Numbered list',
  'Link',
];

const buttonNames = () =>
  screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));

describe('RichTextInput toolbar configuration (rule 11)', () => {
  it('shows every feature when no toolbar is given', () => {
    render(<RichTextInput id="a" />);
    for (const label of ALL_BUTTONS)
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  });

  it('shows only the named features, in the toolbar’s own order', () => {
    render(<RichTextInput id="a" toolbar={['link', 'bold']} />);
    expect(buttonNames()).toEqual(['Bold', 'Link']);
  });

  it('renders a toolbar-less editor for an empty list, keeping the editable surface', () => {
    render(<RichTextInput id="a" toolbar={[]} />);
    expect(screen.queryByRole('toolbar')).toBeNull();
    expect(document.getElementById('a')).toBeInTheDocument();
  });

  it('groups the three headings under one feature name', () => {
    render(<RichTextInput id="a" toolbar={['heading']} />);
    expect(buttonNames()).toEqual(['Heading 1', 'Heading 2', 'Heading 3']);
  });

  it('draws no dangling separator when a whole group is hidden', () => {
    const { container } = render(<RichTextInput id="a" toolbar={['bold']} />);
    expect(container.querySelectorAll('[data-slot="rich-text-toolbar-separator"]')).toHaveLength(0);
  });
});

describe('RichTextInput placeholder and height (rules 12-13)', () => {
  it('shows the default placeholder when none is given', () => {
    render(<RichTextInput id="a" />);
    expect(screen.getByText('Write…')).toBeInTheDocument();
  });

  it('shows an authored placeholder instead', () => {
    render(<RichTextInput id="a" placeholder="Describe the situation" />);
    expect(screen.getByText('Describe the situation')).toBeInTheDocument();
    expect(screen.queryByText('Write…')).toBeNull();
  });

  it('hides the placeholder once there is content', () => {
    render(<RichTextInput id="a" value={hello} placeholder="Describe the situation" />);
    expect(screen.queryByText('Describe the situation')).toBeNull();
  });

  it('sets a minimum height from rows', () => {
    render(<RichTextInput id="a" rows={8} />);
    expect(document.getElementById('a')).toHaveStyle({ minHeight: '8lh' });
  });
});

describe('RichTextInput toolbar active state (rule 16)', () => {
  it('exposes aria-pressed on the inline format buttons', () => {
    render(<RichTextInput id="a" />);
    for (const label of ['Bold', 'Italic', 'Underline'])
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the attribute on every inline button while the editor is used', async () => {
    // VERIFY BY HAND: the pressed state TOGGLING cannot be driven here. `FORMAT_TEXT_COMMAND` needs a
    // Lexical range selection, and focusing a contenteditable in jsdom does not create one — the same
    // limitation as gridstack and xyflow drags. jsdom can only show that the attribute is wired and
    // stable; that it flips with the selection is checked in the browser.
    const user = userEvent.setup();
    render(<RichTextInput id="a" value={hello} />);
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    for (const label of ['Bold', 'Italic', 'Underline'])
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed');
  });

  it('leaves the block buttons without aria-pressed, which they do not track', () => {
    // Deliberate scope (rule 16): inline formats only. A heading/list button reporting a stale
    // pressed state would be worse than reporting none.
    render(<RichTextInput id="a" />);
    expect(screen.getByRole('button', { name: 'Heading 1' })).not.toHaveAttribute('aria-pressed');
  });
});

describe('RichTextInput guards (rule 4)', () => {
  it('starts empty for an object with no root rather than crashing', () => {
    expect(() => render(<RichTextInput id="a" value={{ nope: 1 } as never} />)).not.toThrow();
    expect(screen.getByText('Write…')).toBeInTheDocument();
  });

  it('starts empty for null', () => {
    expect(() => render(<RichTextInput id="a" value={null} />)).not.toThrow();
  });
});

describe('RichTextInput read-only (rule 14)', () => {
  it('renders no toolbar and a non-editable surface when disabled', () => {
    render(<RichTextInput id="a" value={hello} disabled />);
    expect(document.getElementById('a')).toHaveAttribute('contenteditable', 'false');
  });
});

describe('RichTextInput sizing hooks (doc 207)', () => {
  it('carries the data-slots the Form Studio inspector shrinks by', () => {
    // The inspector's compact density is a set of `[&_[data-slot=…]]` descendant variants; without these
    // hooks it could not reach the editor at all, and the editor stood out at 14px among 12px controls.
    const { container } = render(<RichTextInput id="a" />);
    for (const slot of ['rich-text-input', 'rich-text-toolbar', 'rich-text-content'])
      expect(container.querySelector(`[data-slot="${slot}"]`)).toBeInTheDocument();
  });

  it('sizes its paragraphs from the container too', () => {
    render(<RichTextInput id="a" value={hello} />);
    expect(screen.getByText('Hello world').closest('p')?.className).toContain(
      'text-[length:inherit]',
    );
  });
});
