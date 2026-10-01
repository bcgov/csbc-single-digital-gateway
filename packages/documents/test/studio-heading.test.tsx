import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderStudioRenderers, studioHeading } from './render-studio-renderers';

const page = (heading: Record<string, unknown>) => ({
  id: 'root',
  type: 'VerticalLayout',
  elements: [heading],
});

function startEditing(text: string | undefined = 'Apply now') {
  const view = renderStudioRenderers(page(studioHeading('h1', text, { level: 3 })));
  const heading = () => view.container.querySelector<HTMLElement>('[data-slot="heading-element"]')!;
  fireEvent.click(heading()); // selects and edits
  return { ...view, heading };
}

describe('Studio Heading inline editing (doc 236)', () => {
  it('shows a muted Heading placeholder when empty', () => {
    const { container } = renderStudioRenderers(page(studioHeading('h1')));
    const heading = container.querySelector('[data-slot="heading-element"]')!;
    expect(heading).toHaveTextContent('Heading');
    expect(heading).toHaveAttribute('data-placeholder', '');
    expect(heading).toHaveClass('text-placeholder');
  });

  it('shows a text cursor when editable', () => {
    const editable = renderStudioRenderers(page(studioHeading('h1', 'Apply now')));
    expect(editable.container.querySelector('[data-slot="heading-element"]')).toHaveClass(
      'cursor-text',
    );
    editable.unmount();
    const viewOnly = renderStudioRenderers(page(studioHeading('h1', 'Apply now')), {
      editable: false,
    });
    expect(viewOnly.container.querySelector('[data-slot="heading-element"]')).not.toHaveClass(
      'cursor-text',
    );
  });

  it('selects and starts editing on a single click, with the caret at the end when no point resolves', () => {
    const { container } = renderStudioRenderers(
      page(studioHeading('h1', 'Apply now', { level: 3 })),
    );
    const heading = () => container.querySelector<HTMLElement>('[data-slot="heading-element"]')!;
    fireEvent.click(heading());
    expect(container.querySelector('[data-element-id="h1"]')).toHaveAttribute('data-selected', '');
    expect(heading()).toHaveAttribute('contenteditable', 'plaintext-only');
    const selection = window.getSelection()!;
    expect(selection.isCollapsed).toBe(true);
    expect(selection.anchorNode !== null && heading().contains(selection.anchorNode)).toBe(true);
    expect(heading()).toHaveAttribute('data-editing', '');
    expect(heading().tagName).toBe('H3');
    expect(heading()).toHaveTextContent('Apply now');
    expect(document.activeElement).toBe(heading());
  });

  it('commits trimmed text on Enter through update(id, { options: { text } })', () => {
    const { heading, update } = startEditing();
    heading().textContent = '  Check eligibility  ';
    fireEvent.keyDown(heading(), { key: 'Enter' });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith('h1', { options: { text: 'Check eligibility' } });
    expect(heading()).not.toHaveAttribute('contenteditable');
  });

  it('commits on blur and writes nothing when the text is unchanged', () => {
    const changed = startEditing();
    changed.heading().textContent = 'New';
    fireEvent.blur(changed.heading());
    expect(changed.update).toHaveBeenCalledWith('h1', { options: { text: 'New' } });
    changed.unmount();

    const same = startEditing();
    fireEvent.blur(same.heading());
    expect(same.update).not.toHaveBeenCalled();
    expect(same.heading()).not.toHaveAttribute('contenteditable');
  });

  it('removes the text key when committed empty', () => {
    const { heading, update } = startEditing();
    heading().textContent = '   ';
    fireEvent.keyDown(heading(), { key: 'Enter' });
    expect(update).toHaveBeenCalledWith('h1', { options: { text: undefined } });
  });

  it('restores the stored text on Escape without writing', () => {
    const { heading, update } = startEditing();
    heading().textContent = 'Discarded';
    fireEvent.keyDown(heading(), { key: 'Escape' });
    expect(update).not.toHaveBeenCalled();
    expect(heading()).not.toHaveAttribute('contenteditable');
    expect(heading()).toHaveTextContent('Apply now');
  });

  it('does not start editing when the press became a drag', () => {
    const { container } = renderStudioRenderers(page(studioHeading('h1', 'Apply now')));
    const heading = container.querySelector<HTMLElement>('[data-slot="heading-element"]')!;
    fireEvent.pointerDown(heading, { clientX: 10, clientY: 10 });
    fireEvent.click(heading, { clientX: 10, clientY: 60 });
    expect(heading).not.toHaveAttribute('contenteditable');
    expect(container.querySelector('[data-slot="heading-element"]')).toHaveTextContent('Apply now');
  });

  it('never enters editing without a provider', () => {
    const { container } = renderStudioRenderers(page(studioHeading('h1', 'Apply now')), {
      editable: false,
    });
    const heading = container.querySelector('[data-slot="heading-element"]')!;
    fireEvent.click(heading);
    fireEvent.click(heading);
    expect(heading).not.toHaveAttribute('contenteditable');
    expect(heading).toHaveTextContent('Apply now');
  });
});
