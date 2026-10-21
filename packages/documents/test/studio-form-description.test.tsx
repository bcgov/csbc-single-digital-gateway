import { fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TOOLBAR_GAP } from '../src/renderers/studio/inline-rich-text';
import { renderStudioRenderers } from './render-studio-renderers';
import { editRichText, emptyRichText, richText } from './rich-text-fixtures';

const formWith = (description?: unknown) => ({
  id: 'f',
  type: 'Form',
  label: 'About you',
  ...(description !== undefined && { options: { description } }),
  elements: [],
});

const descriptionOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="form-description"]');

function startEditing(description?: unknown) {
  const view = renderStudioRenderers(formWith(description));
  fireEvent.click(descriptionOf(view.container)!);
  const surface = () =>
    descriptionOf(view.container)!.querySelector<HTMLElement>('[contenteditable="true"]');
  return { ...view, surface };
}

describe('studio Form description (doc 251 rules 3-6, 8)', () => {
  it('shows a grey Description placeholder under the title when there is none', () => {
    for (const description of [undefined, emptyRichText(), '  ']) {
      const { container, unmount } = renderStudioRenderers(formWith(description));
      const placeholder = descriptionOf(container)!;
      expect(placeholder).toHaveTextContent(/^Description$/);
      expect(placeholder).toHaveAttribute('data-placeholder', '');
      expect(placeholder.querySelector('.text-placeholder')).not.toBeNull();
      expect(placeholder.previousElementSibling).toHaveAttribute('data-slot', 'form-title');
      expect(placeholder).toHaveClass('cursor-text', 'pointer-events-auto');
      unmount();
    }
  });

  it('shows a rich or legacy description under the title', () => {
    const rich = renderStudioRenderers(formWith(richText('Who you are')));
    expect(descriptionOf(rich.container)).toHaveTextContent('Who you are');
    expect(descriptionOf(rich.container)).not.toHaveAttribute('data-placeholder');
    rich.unmount();
    const legacy = renderStudioRenderers(formWith('Legacy text'));
    expect(descriptionOf(legacy.container)).toHaveTextContent('Legacy text');
  });

  it('a click opens the editor with the toolbar, seeded with the description, legacy text included', async () => {
    const { container, surface } = startEditing('Legacy text');
    expect(descriptionOf(container)).toHaveAttribute('data-editing', '');
    expect(surface()).toHaveTextContent('Legacy text');
    expect(surface()).toHaveAccessibleName('Form description');
    expect(
      descriptionOf(container)!.querySelector('[data-slot="rich-text-toolbar"]'),
    ).not.toBeNull();
    // A bare editor has no inset: the toolbar keeps its distance from the text (rule 5b).
    expect(descriptionOf(container)).toHaveClass(TOOLBAR_GAP);
    await waitFor(() => expect(surface()).toHaveFocus());
  });

  it('writes options.description per change, removing it when the editor holds no text', async () => {
    const { update, surface } = startEditing();
    await waitFor(() => expect(surface()).toHaveFocus());
    editRichText(surface(), richText('Tell us who you are.'));
    await waitFor(() =>
      expect(JSON.stringify(update.mock.lastCall)).toContain('Tell us who you are.'),
    );
    expect(update.mock.lastCall?.[0]).toBe('f');
    editRichText(surface(), emptyRichText());
    await waitFor(() =>
      expect(update).toHaveBeenLastCalledWith('f', { options: { description: undefined } }),
    );
  });

  it('renders the description read-only without an editor provider', () => {
    // The placeholder stays, so a page opening into edit mode does not shift its content down (bug B1).
    const empty = renderStudioRenderers(formWith(), { editable: false });
    const placeholder = descriptionOf(empty.container)!;
    expect(placeholder).toHaveTextContent(/^Description$/);
    fireEvent.click(placeholder);
    expect(placeholder).not.toHaveAttribute('data-editing');
    expect(placeholder).not.toHaveClass('cursor-text');
    empty.unmount();
    const { container } = renderStudioRenderers(formWith(richText('Read me')), { editable: false });
    const description = descriptionOf(container)!;
    fireEvent.click(description);
    expect(description).toHaveTextContent('Read me');
    expect(description).not.toHaveAttribute('data-editing');
    expect(description).not.toHaveClass('cursor-text');
  });
});
