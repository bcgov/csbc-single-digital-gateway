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

describe('RichTextInput bare (doc 223 rules 8-10)', () => {
  // For an editor that REPLACES rendered content in place. The field chrome is right in a form and
  // wrong on a canvas: it moved the Form Studio's inline Description down and right by the content's
  // inset, drew a border the canvas had deliberately not drawn, and reserved seven rem for a
  // one-line value (bugs 7-9).

  it('drops the border, the background and the rounding', () => {
    const { container } = render(<RichTextInput id="a" bare />);
    const root = container.querySelector('[data-slot="rich-text-input"]');
    expect(root?.className).not.toContain('border-input');
    expect(root?.className).not.toContain('rounded-md');
    expect(root?.className).toContain('bg-transparent');
  });

  it('drops the content inset, which a className override could not reach', () => {
    // The inset is on a DESCENDANT of the element `className` lands on — which is the whole reason
    // this is a prop rather than a caller's class.
    const { container } = render(<RichTextInput id="a" bare />);
    const content = container.querySelector('[data-slot="rich-text-content"]');
    expect(content?.className).not.toContain('px-3');
    expect(content?.className).not.toContain('py-2');
  });

  it('starts one line tall instead of the field floor', () => {
    const { container } = render(<RichTextInput id="a" bare />);
    const content = container.querySelector('[data-slot="rich-text-content"]');
    expect(content?.className).not.toContain('min-h-28');
  });

  it("sets no font size of its own, so it takes the container's", () => {
    // Doc 223 rule 10b. `text-sm` here is an explicit size on the element, which beats whatever the
    // editor is standing in for: it shrank a 16px description placeholder to 14px and tightened a
    // 14px one's leading from 22.75px to text-sm's 20px. The caller states the read view's
    // typography instead.
    const { container } = render(<RichTextInput id="a" bare />);
    const root = container.querySelector('[data-slot="rich-text-input"]');
    expect(root?.className).not.toContain('text-sm');
  });

  it('keeps the field chrome by default', () => {
    const { container } = render(<RichTextInput id="a" />);
    expect(container.querySelector('[data-slot="rich-text-input"]')?.className).toContain(
      'border-input',
    );
    expect(container.querySelector('[data-slot="rich-text-content"]')?.className).toContain('px-3');
    expect(container.querySelector('[data-slot="rich-text-input"]')?.className).toContain(
      'text-sm',
    );
  });
});

describe('RichTextInput placeholder overlays the content exactly', () => {
  // The placeholder is absolutely positioned OVER the editable surface, so the two must share one
  // inset. It used to carry its own `top-2 left-3`, hard-coded to this component's default padding —
  // so the Form Studio inspector, whose density repads the content to `px-2 py-1`, left the
  // placeholder 4px below and right of the text it stands in for (reported as a too-tall first line).

  const slots = (bare?: boolean) => {
    const { container } = render(<RichTextInput id="a" {...(bare ? { bare: true } : {})} />);
    return {
      content: container.querySelector('[data-slot="rich-text-content"]'),
      placeholder: container.querySelector('[data-slot="rich-text-placeholder"]'),
    };
  };

  it('gives the placeholder the same inset as the content', () => {
    const { content, placeholder } = slots();
    for (const cls of ['px-3', 'py-2']) {
      expect(content).toHaveClass(cls);
      expect(placeholder).toHaveClass(cls);
    }
  });

  it('gives it no inset when the content has none', () => {
    const { content, placeholder } = slots(true);
    expect(content?.className).not.toContain('px-3');
    expect(placeholder?.className).not.toContain('px-3');
  });

  it('names the placeholder with a slot, so a consumer repadding one can reach the other', () => {
    expect(slots().placeholder).not.toBeNull();
  });
});
