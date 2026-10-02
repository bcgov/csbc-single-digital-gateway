import type { UISchemaElement } from '@jsonforms/core';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { elementName } from '../src/renderers/studio/element-actions';
import * as studio from '../src/renderers/studio/index';
import { DRAG_CANCEL } from '../src/renderers/studio/use-vertical-grid';
import * as ui from '../src/renderers/ui/index';
import { renderStudioRenderers } from './render-studio-renderers';
import { editRichText, emptyRichText, richText } from './rich-text-fixtures';

const block = (content?: object) => ({
  id: 'rc1',
  type: 'RichContent',
  ...(content !== undefined && { options: { content } }),
});
const page = (element: Record<string, unknown>) => ({
  id: 'root',
  type: 'VerticalLayout',
  elements: [element],
});

function startEditing(content: object | undefined = richText('Before you apply')) {
  const view = renderStudioRenderers(page(block(content)));
  const richContent = () =>
    view.container.querySelector<HTMLElement>('[data-slot="rich-content"]')!;
  fireEvent.click(richContent());
  const surface = () => richContent().querySelector<HTMLElement>('[contenteditable="true"]');
  return { ...view, richContent, surface };
}

describe('studio Rich content (doc 250 rules 7-14)', () => {
  it('outranks the ui Rich content and is wrapped by a selectable StudioElement', () => {
    const element = { type: 'RichContent' } as UISchemaElement;
    const ranks = studio.contentRenderers
      .map((entry) => entry.tester(element, {}, { rootSchema: {}, config: {} } as never))
      .toSorted((a, b) => b - a);
    expect(ranks[0]).toBe(2);
    expect(ui.contentRenderers.map((e) => e.tester(element, {}, {} as never))).toContain(1);

    const { container } = renderStudioRenderers(page(block(richText('Hello'))));
    const frame = container.querySelector('[data-element-id="rc1"]')!;
    expect(frame.querySelector('[data-slot="rich-content"]')).toHaveTextContent('Hello');
    expect(frame.querySelector('[inert]')).toBeNull();
    fireEvent.click(frame);
    expect(frame).toHaveAttribute('data-selected');
  });

  it('shows the grey Rich content placeholder when empty', () => {
    for (const content of [undefined, emptyRichText()]) {
      const { container, unmount } = renderStudioRenderers(page(block(content)));
      const view = container.querySelector('[data-slot="rich-content"]')!;
      expect(view).toHaveAttribute('data-placeholder', '');
      expect(view).toHaveTextContent(/^Rich content$/);
      expect(view.querySelector('.text-placeholder')).not.toBeNull();
      expect(view).toHaveClass('cursor-text');
      unmount();
    }
  });

  it('a click selects the element and opens a bare editor with the toolbar, focused', async () => {
    const { container, richContent, surface } = startEditing();
    expect(container.querySelector('[data-element-id="rc1"]')).toHaveAttribute('data-selected');
    expect(richContent()).toHaveAttribute('data-editing', '');
    expect(surface()).toHaveTextContent('Before you apply');
    expect(richContent().querySelector('[data-slot="rich-text-toolbar"]')).not.toBeNull();
    await waitFor(() => expect(surface()).toHaveFocus());
  });

  it('a press that became a drag opens no editor', () => {
    const { container } = renderStudioRenderers(page(block(richText('Hi'))));
    const view = container.querySelector<HTMLElement>('[data-slot="rich-content"]')!;
    fireEvent.pointerDown(view, { clientX: 10, clientY: 10 });
    fireEvent.click(view, { clientX: 10, clientY: 40 });
    expect(view).not.toHaveAttribute('data-editing');
    expect(container.querySelector('[contenteditable="true"]')).toBeNull();
  });

  it('writes options.content per change, removing it when the editor holds no text', async () => {
    const { update, surface } = startEditing();
    await waitFor(() => expect(surface()).toHaveFocus());
    editRichText(surface(), richText('Before you apply, read this.'));
    await waitFor(() =>
      expect(update).toHaveBeenLastCalledWith('rc1', {
        options: { content: expect.objectContaining({ root: expect.anything() }) },
      }),
    );
    expect(JSON.stringify(update.mock.lastCall?.[1])).toContain('Before you apply, read this.');
    editRichText(surface(), emptyRichText());
    await waitFor(() =>
      expect(update).toHaveBeenLastCalledWith('rc1', { options: { content: undefined } }),
    );
  });

  it('Escape and focus leaving the element close the editor; a toolbar press does not', async () => {
    const { richContent, surface } = startEditing();
    await waitFor(() => expect(surface()).toHaveFocus());
    const bold = richContent().querySelector<HTMLElement>('button[aria-label="Bold"]')!;
    act(() => bold.focus());
    expect(richContent()).toHaveAttribute('data-editing', '');

    fireEvent.keyDown(surface()!, { key: 'Escape' });
    expect(richContent()).not.toHaveAttribute('data-editing');

    fireEvent.click(richContent());
    await waitFor(() => expect(surface()).toHaveFocus());
    act(() => surface()!.blur());
    expect(richContent()).not.toHaveAttribute('data-editing');
  });

  it('opens no editor without a StudioEditorProvider', () => {
    const { container } = renderStudioRenderers(page(block(richText('Hi'))), { editable: false });
    const view = container.querySelector<HTMLElement>('[data-slot="rich-content"]')!;
    fireEvent.click(view);
    expect(view).not.toHaveAttribute('data-editing');
    expect(view).not.toHaveClass('cursor-text');
    expect(view).toHaveTextContent('Hi');
  });

  it('the grid drag cancel ignores contenteditable=false but not an editing editor', () => {
    const readOnly = document.createElement('div');
    readOnly.setAttribute('contenteditable', 'false');
    const editing = document.createElement('div');
    editing.setAttribute('contenteditable', 'true');
    expect(readOnly.matches(DRAG_CANCEL)).toBe(false);
    expect(editing.matches(DRAG_CANCEL)).toBe(true);
    expect(document.createElement('button').matches(DRAG_CANCEL)).toBe(true);
  });

  it('is named Rich content for the delete gate', () => {
    expect(elementName({ type: 'RichContent' } as UISchemaElement, {})).toBe('Rich content');
  });
});
