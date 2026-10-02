import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderStudioRenderers, studioHeading } from './render-studio-renderers';

const PAGE = {
  id: 'root',
  type: 'Form',
  elements: [
    studioHeading('h1', 'Welcome'),
    { id: 'c1', type: 'Control', scope: '#/properties/age' },
    { id: 's1', type: 'Separator' },
  ],
};
const SCHEMA = { type: 'object', properties: { age: { type: 'integer', title: 'Your age' } } };
const wrapper = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`[data-slot="studio-element"][data-element-id="${id}"]`)!;
const actionsOf = (el: HTMLElement) =>
  el.querySelector<HTMLElement>(':scope > [data-slot="studio-element-actions"]');

describe('studio element actions (doc 242 rules 1-3)', () => {
  it('gives every wrapped element a Delete action below its bottom-right, named after the element', () => {
    const { container } = renderStudioRenderers(PAGE, { schema: SCHEMA, removable: true });

    expect(
      within(actionsOf(wrapper(container, 'h1'))!).getByRole('button', { name: 'Delete Welcome' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Your age' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Separator' })).toBeInTheDocument();
    expect(actionsOf(wrapper(container, 'h1'))).toHaveClass('absolute', 'top-full', 'right-0');
  });

  it('asks the host to remove the element without selecting it', () => {
    const { container, remove } = renderStudioRenderers(PAGE, { schema: SCHEMA, removable: true });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Your age' }));

    expect(remove).toHaveBeenCalledWith('c1', 'Your age');
    expect(wrapper(container, 'c1')).not.toHaveAttribute('data-selected');
  });

  it('shows no actions when the host cannot remove, or the page is view-only', () => {
    const { container, unmount } = renderStudioRenderers(PAGE, { schema: SCHEMA });
    expect(actionsOf(wrapper(container, 'h1'))).toBeNull();
    unmount();

    renderStudioRenderers(PAGE, { schema: SCHEMA, editable: false });
    expect(screen.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();
  });
});

describe('studio element Copy (doc 254 rule 6)', () => {
  it('offers Copy before Delete when the host can copy, and asks the host to copy that element', () => {
    const { copy } = renderStudioRenderers(PAGE, {
      schema: SCHEMA,
      removable: true,
      copyable: true,
    });
    const row = screen.getByRole('button', { name: 'Copy Your age' }).closest('[role="group"]')!;
    expect(
      within(row as HTMLElement)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Copy Your age', 'Delete Your age']);

    fireEvent.click(screen.getByRole('button', { name: 'Copy Your age' }));
    expect(copy).toHaveBeenCalledWith('c1');
  });

  it('offers no Copy when the host cannot copy', () => {
    renderStudioRenderers(PAGE, { schema: SCHEMA, removable: true });
    expect(screen.queryByRole('button', { name: /^Copy / })).toBeNull();
  });
});
