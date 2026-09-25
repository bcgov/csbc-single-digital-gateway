import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CapabilityMap } from '../src/capabilities/index';
import { CapabilityProvider } from '../src/renderers/studio/studio-capabilities';
import { FormStudio } from '../src/studio';

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
    const block = document.querySelector('[data-slot="form-title-block"]');
    expect(block?.firstElementChild).toHaveAttribute('data-slot', 'form-title');
  });
});
