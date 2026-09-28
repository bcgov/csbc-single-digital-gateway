import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CapabilityMap } from '../src/capabilities/index';
import { CapabilityProvider } from '../src/renderers/studio/studio-capabilities';
import { FormStudio } from '../src/studio';
import { RICH_CONTENT_PLACEHOLDER } from '../src/renderers/gridstack/element-placeholders';
import { richText } from './rich-text-fixtures';

// Doc 223 — editing a value in place on the canvas.
//
// The mechanism, not the surfaces: one `InlineText` serves the Title, a Section heading and a
// Heading's text, so what is worth pinning is the CONTRACT — when it appears, that the draft is
// local, that exactly one write happens and it goes through the inspector's own field.
//
// Focus is NOT asserted here. It is driven by a real press (`onPointerUp` on the input), and doc 184
// records that react-resizable-panels blocks pointer focus in jsdom — so focus is a browser check,
// and it found two separate failures there that jsdom would have reported as passing.

const schema: JsonSchema = { type: 'object', properties: {} };

const uischema = {
  type: 'Form',
  id: 'root1',
  label: 'Original title',
  elements: [{ type: 'Heading', id: 'h1', text: 'A heading' }],
} as unknown as UISchemaElement;

const CLOSED = {
  edit: 'none',
  remove: false,
  move: false,
  addChildren: false,
  removeChildren: false,
  reorderChildren: false,
  edges: false,
} as const;

function renderStudio(capabilities?: CapabilityMap) {
  const studio = <FormStudio schema={schema} uischema={uischema} />;
  return render(
    capabilities === undefined ? (
      studio
    ) : (
      <CapabilityProvider value={capabilities}>{studio}</CapabilityProvider>
    ),
  );
}

const titleText = () => document.querySelector('[data-slot="form-title"]');
const affordance = () => document.querySelector('[data-inline-editable]');
const input = () => document.querySelector<HTMLInputElement>('[data-slot="inline-text-input"]');
const selectTitle = () => {
  const target = titleText() ?? affordance();
  if (target) fireEvent.pointerDown(target);
};
/**
 * The Description's read view and its editor (doc 223 rule 7). Unwritten, it draws its placeholder —
 * which is a read view like any other, and the press that reaches it claims the field.
 */
const descriptionText = () =>
  document.querySelector('[data-slot="form-description"]') ??
  document.querySelector('[data-slot="form-description-placeholder"]');
const richEditor = () => document.querySelector('[data-slot="inline-rich-text-input"]');
const selectDescription = () => {
  const target = descriptionText();
  if (target) fireEvent.pointerDown(target);
};

/** The inspector's own Title field — the other end of the one write path. */
const inspectorTitle = () =>
  document.querySelector<HTMLInputElement>('[data-studio-inspector] input');

describe('when the title becomes editable', () => {
  it('shows the affordance before it is selected, and no editor', () => {
    renderStudio();
    expect(affordance()).not.toBeNull();
    expect(input()).toBeNull();
  });

  it('opens the editor once the owning element is selected', async () => {
    renderStudio();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());
    expect(input()?.value).toBe('Original title');
  });

  it('offers nothing at all when a governing template freezes the field', () => {
    // The same read view a citizen sees: no affordance, no editor, no wrapper.
    renderStudio({ default: { '*': CLOSED } });
    expect(affordance()).toBeNull();
    expect(input()).toBeNull();
    expect(titleText()).not.toBeNull();
  });

  it('offers it when the template names that field key', async () => {
    renderStudio({ default: { '*': CLOSED }, elements: { root1: { edit: ['label'] } } });
    expect(affordance()).not.toBeNull();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());
  });
});

describe('the draft is local until it is committed', () => {
  it('does NOT write on every keystroke', async () => {
    // Doc 207 rule 25: a live editor writing per keystroke, against a view that re-seeds on value
    // change, fights itself and re-renders the canvas on every pass. The inspector reading the OLD
    // value while typing is the observable proof that only the draft moved.
    renderStudio();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());

    fireEvent.change(input() as HTMLInputElement, { target: { value: 'Half typ' } });

    expect(input()?.value).toBe('Half typ');
    expect(inspectorTitle()?.value).toBe('Original title');
  });

  it('commits on Enter, through the inspector field', async () => {
    renderStudio();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());

    fireEvent.change(input() as HTMLInputElement, { target: { value: 'Committed' } });
    fireEvent.keyDown(input() as HTMLInputElement, { key: 'Enter' });

    await waitFor(() => expect(inspectorTitle()?.value).toBe('Committed'));
  });

  it('commits on blur, so clicking away keeps the edit', async () => {
    renderStudio();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());

    fireEvent.change(input() as HTMLInputElement, { target: { value: 'Blurred' } });
    fireEvent.blur(input() as HTMLInputElement);

    await waitFor(() => expect(inspectorTitle()?.value).toBe('Blurred'));
  });

  it('reverts on Escape and writes nothing', async () => {
    renderStudio();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());

    fireEvent.change(input() as HTMLInputElement, { target: { value: 'Discard me' } });
    fireEvent.keyDown(input() as HTMLInputElement, { key: 'Escape' });

    await waitFor(() => expect(input()?.value).toBe('Original title'));
    expect(inspectorTitle()?.value).toBe('Original title');
  });
});

const heading = () => document.querySelector('[data-element-type="Heading"]') as HTMLElement;

describe('leaving the editor commits', () => {
  // FOUND BY HAND. Blur alone is not enough, and the gap is the COMMON case: clicking away on the
  // canvas deselects the element, which unmounts the editor, and React does not deliver `onBlur` for
  // an element being removed. The author typed, clicked elsewhere, and silently lost the edit.

  it('keeps the edit when selection moves to another element', async () => {
    renderStudio();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());

    fireEvent.change(input() as HTMLInputElement, { target: { value: 'Survived' } });
    // No blur: selection simply moves, exactly as a press on another element does.
    fireEvent.pointerDown(heading());

    await waitFor(() => expect(titleText()?.textContent).toBe('Survived'));
  });

  it('writes nothing when the editor is left untouched', async () => {
    renderStudio();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());

    fireEvent.pointerDown(heading());

    await waitFor(() => expect(input()).toBeNull());
    expect(titleText()?.textContent).toBe('Original title');
  });
});

describe('the read view outside the studio', () => {
  it('adds no wrapper element when nothing is editable', () => {
    // These renderers are shared with the citizen's form, so the DOM has to stay identical there —
    // and a wrapper would reparent the heading for anything reading `firstElementChild`.
    renderStudio({ default: { '*': CLOSED } });
    // Doc 223 rule 11: the studio title wraps each value in an AREA that carries the dimming, so the
    // contract is about the EDITOR adding nothing — inside that area the heading is still first, with
    // no affordance span reparenting it.
    const area = document.querySelector('[data-slot="form-title-block"]')?.firstElementChild;
    expect(area?.firstElementChild).toHaveAttribute('data-slot', 'form-title');
    expect(area?.querySelector('[data-inline-editable]')).toBeNull();
  });
});

describe('a press picks WHICH field it edits', () => {
  // Doc 223 rule 7, bug 6. A root Form owns two editable values, and `active` used to key on the
  // ELEMENT — so selecting the Form to rename it replaced its description with an editor too.
  // Nothing in jsdom was wrong before: these same tests asserted the TITLE's editor appeared, and
  // it did. What was missing was an assertion about the other field.

  it('opens the title alone when the title is pressed', async () => {
    renderStudio();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());
    expect(richEditor()).toBeNull();
  });

  it('opens the description alone when the description is pressed', async () => {
    renderStudio();
    selectDescription();
    await waitFor(() => expect(richEditor()).not.toBeNull());
    expect(input()).toBeNull();
  });

  it('moves the editor from one field to the other', async () => {
    renderStudio();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());

    // The claim is taken on the READ VIEW's pointerdown — the same press that selects the element.
    // It arrives BEFORE the title input's blur, which is why `release` has to be conditional: an
    // unconditional one would wipe the claim that was just made and leave nothing open.
    selectDescription();
    await waitFor(() => expect(richEditor()).not.toBeNull());
    expect(input()).toBeNull();
  });

  it('closes the editor when the selection leaves the element', async () => {
    renderStudio();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());

    fireEvent.pointerDown(heading());

    await waitFor(() => expect(input()).toBeNull());
    expect(richEditor()).toBeNull();
  });
});

describe('a field that owns its element opens on selection (rule 9)', () => {
  // A `RichContent` block holds a single editable value, so there is nothing to disambiguate.
  // Requiring a press on the content would mean an element reached from the breadcrumbs, or one just
  // inserted from the palette, sat selected with its editor shut — a second gesture bought by a rule
  // with no defect behind it.

  const withRichContent = {
    type: 'Form',
    id: 'root1',
    label: 'Original title',
    elements: [{ type: 'RichContent', id: 'rc1', content: richText('Some guidance') }],
  } as unknown as UISchemaElement;

  it('opens without a press on the content itself', async () => {
    render(<FormStudio schema={schema} uischema={withRichContent} />);
    // The FRAME, not the text: this is the selection arriving from somewhere other than the value.
    fireEvent.pointerDown(
      document.querySelector('[data-element-type="RichContent"]') as HTMLElement,
    );
    await waitFor(() => expect(richEditor()).not.toBeNull());
  });
});

describe('the description keeps its size when it becomes editable (rule 10b)', () => {
  // The placeholder is a bare `<p>`, and `@repo/ui` base styles size those at 16px — an explicit
  // size ON the element, which no container class can override (the trap CLAUDE.md records for `p`,
  // `li` and `dd`). So an unwritten description rendered a size LARGER than both the editor that
  // replaces it and the description that eventually replaces IT: the text shrank when the editor
  // opened, and again on the first character typed. Measured in the browser at 16px/24px against
  // the editor's 14px/20px; a written description was 14px/22.75px — three sizes for one value.

  it('draws the placeholder at the size RichTextView renders a real description', () => {
    renderStudio();
    const placeholder = document.querySelector('[data-slot="form-description-placeholder"]');
    expect(placeholder?.className).toContain('text-sm');
    expect(placeholder?.className).toContain('leading-relaxed');
  });

  it('hands the editor that same typography', async () => {
    renderStudio();
    selectDescription();
    await waitFor(() => expect(richEditor()).not.toBeNull());
    // `bare` sets no size of its own, so the wrapper's classes are what the editor renders at.
    expect(richEditor()?.className).toContain('text-sm');
    expect(richEditor()?.className).toContain('leading-relaxed');
  });
});

describe('an inline area draws at full strength when engaged (rule 11)', () => {
  // ENGAGED is hovered, or holding the editor's focus — the author's attention, and nothing else.
  // Both are pure CSS, so what is testable here is where the dimming SITS and which variants lift
  // it; the variants themselves were verified in the browser, since jsdom evaluates none of them
  // and doc 186 records a custom variant that silently matched nothing while its test passed.

  const areaOf = (slot: string) =>
    document.querySelector(`[data-slot="${slot}"]`)?.closest('.opacity-50');

  it('dims each area independently, not the block', () => {
    renderStudio();
    // On the BLOCK this could never be undone: an ancestor's opacity is not defeasible below it, so
    // no descendant could ever reach full strength.
    expect(document.querySelector('[data-slot="form-title-block"]')).not.toHaveClass('opacity-50');
    expect(areaOf('form-title')).not.toBeNull();
    expect(areaOf('form-description-placeholder')).not.toBeNull();
  });

  it('lifts an area for its OWN pointer and its OWN editor, and nothing else', () => {
    renderStudio();
    for (const slot of ['form-title', 'form-description-placeholder']) {
      const area = areaOf(slot);
      expect(area).toHaveClass('hover:opacity-100');
      expect(area).toHaveClass('focus-within:opacity-100');
    }
  });

  it('does not engage an area because its ELEMENT is selected', async () => {
    // The Form owns BOTH values, so an element-wide lift blackened the description when the title
    // was selected and vice versa — rule 7's complaint reappearing in the styling (user, 2026-09-28).
    renderStudio();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());
    const description = areaOf('form-description-placeholder');
    expect(description).toHaveClass('opacity-50');
    // Nothing keyed on selection may reach the styling at all.
    expect(document.querySelectorAll('[data-inline-selected]')).toHaveLength(0);
    expect(description?.className).not.toContain('data-inline-selected');
  });

  it('brings the description to full colour, since it rests muted', () => {
    renderStudio();
    const area = areaOf('form-description-placeholder');
    expect(area).toHaveClass('text-muted-foreground');
    expect(area).toHaveClass('hover:text-foreground');
    expect(area).toHaveClass('focus-within:text-foreground');
  });
});

describe('an empty Rich content block shows its placeholder on the canvas (doc 207 rule 37)', () => {
  // Before this it rendered literally nothing: an authored-but-unfilled block was invisible, reachable
  // only by its frame. Doc 223 bug 4 is the hazard — wrapping the old NOTHING in an affordance froze
  // the grid's measure loop — so this was re-verified by hand; real text settles the measure on the
  // first pass, an empty wrapper never did.

  const blockDoc = (options?: Record<string, unknown>) =>
    ({
      type: 'Form',
      id: 'root1',
      label: 'A form',
      elements: [{ type: 'RichContent', id: 'rc1', ...(options ? { options } : {}) }],
    }) as unknown as UISchemaElement;

  const placeholder = () => document.querySelector('[data-slot="inline-rich-text-placeholder"]');

  it('falls back to the built-in wording', () => {
    render(<FormStudio schema={schema} uischema={blockDoc()} />);
    expect(placeholder()?.textContent).toBe(RICH_CONTENT_PLACEHOLDER);
  });

  it('prefers the authored one', () => {
    render(<FormStudio schema={schema} uischema={blockDoc({ placeholder: 'Enter the terms' })} />);
    expect(placeholder()?.textContent).toBe('Enter the terms');
  });

  it('draws it at the size the block RENDERS at, not the canvas base', () => {
    // Doc 223 rule 10b, reintroduced by this very wrapper and caught in the browser: with no explicit
    // size the span took the canvas's 16px, a size larger than both the editor that opens on it and
    // the content that replaces it. It carries the caller's read-view typography instead.
    render(<FormStudio schema={schema} uischema={blockDoc()} />);
    expect(placeholder()).toHaveClass('text-sm');
    expect(placeholder()).toHaveClass('leading-relaxed');
  });

  it('opens the editor when pressed, like any other read view', async () => {
    render(<FormStudio schema={schema} uischema={blockDoc()} />);
    fireEvent.pointerDown(placeholder() as HTMLElement);
    await waitFor(() =>
      expect(document.querySelector('[data-slot="inline-rich-text-input"]')).not.toBeNull(),
    );
  });
});

describe('the affordance is the cursor (doc 223 rule 12)', () => {
  it('shows a text caret over an editable value, and no underline', () => {
    renderStudio();
    for (const slot of ['inline-text', 'inline-rich-text']) {
      const affordance = document.querySelector(`[data-slot="${slot}"]`);
      expect(affordance).toHaveClass('cursor-text');
      expect(affordance?.className).not.toContain('underline');
    }
  });

  it('draws no focus ring on the open editor', async () => {
    // An inline editor is drawn WHERE ITS VALUE IS READ (rule 10), and a ring is a box — the one thing
    // the surrounding frame already provides. It also made one title block disagree with itself: the
    // description's bare editor draws no ring, so the title flashed blue and the description did not.
    renderStudio();
    selectTitle();
    await waitFor(() => expect(input()).not.toBeNull());
    expect(input()?.className).not.toContain('ring');
  });
});

describe('inline Rich content and the inspector follow each other (doc 223 bug 14)', () => {
  // Reported by the author: typing in the block on the canvas left the inspector's Content field
  // showing the old text, and typing in the inspector left the canvas showing the old text — for as
  // long as the block stayed selected, which (rule 9) is exactly while its inline editor is open.

  const withRichContent = {
    type: 'Form',
    id: 'root1',
    label: 'Original title',
    elements: [{ type: 'RichContent', id: 'rc1', content: richText('Some guidance') }],
  } as unknown as UISchemaElement;

  const CONTENT = '[data-slot="rich-text-content"]';
  const inlineContent = () =>
    document.querySelector<HTMLElement>(`[data-slot="inline-rich-text-input"] ${CONTENT}`);
  const inspectorContent = () =>
    document.querySelector<HTMLElement>(`[data-studio-inspector] ${CONTENT}`);

  /**
   * An edit as Lexical sees one. jsdom cannot type into a `contenteditable`, but a new editor state
   * set on the surface's own editor runs the same update and change listeners typing does.
   */
  const edit = (surface: HTMLElement | null, text: string) => {
    const editor = (surface as unknown as { __lexicalEditor?: LexicalLike } | null)
      ?.__lexicalEditor;
    if (!editor) throw new Error('no Lexical editor on that surface');
    act(() => editor.setEditorState(editor.parseEditorState(JSON.stringify(richText(text)))));
  };

  async function selectBlock() {
    render(<FormStudio schema={schema} uischema={withRichContent} />);
    fireEvent.pointerDown(
      document.querySelector('[data-element-type="RichContent"]') as HTMLElement,
    );
    await waitFor(() => expect(inlineContent()).not.toBeNull());
    await waitFor(() => expect(inspectorContent()).toHaveTextContent('Some guidance'));
  }

  it('shows an inline edit in the inspector while the block is still being edited', async () => {
    await selectBlock();

    edit(inlineContent(), 'Typed on the canvas');

    await waitFor(() => expect(inspectorContent()).toHaveTextContent('Typed on the canvas'));
    // Still the same live editor — the sync did not close it to get there.
    expect(inlineContent()).toHaveTextContent('Typed on the canvas');
  }, 15000);

  it('shows an inspector edit in the open inline editor', async () => {
    await selectBlock();
    // The author is typing IN the inspector, so focus is there — and the canvas editor, which focused
    // itself on selection (bug 10), no longer holds it. A focused editor is never overwritten.
    act(() => inspectorContent()?.focus());

    edit(inspectorContent(), 'Typed in the inspector');

    await waitFor(() => expect(inlineContent()).toHaveTextContent('Typed in the inspector'));
  }, 15000);
});

interface LexicalLike {
  parseEditorState: (json: string) => unknown;
  setEditorState: (state: unknown) => void;
}
