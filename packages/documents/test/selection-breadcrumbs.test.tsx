import { mdiHome } from '@mdi/js';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectionBreadcrumbs } from '../src/studio/selection-breadcrumbs';
import type { PathSegment } from '../src/studio/selection-path';

const seg = (id: string, kind: PathSegment['kind'], label = id): PathSegment => ({
  id,
  label,
  kind,
});

function renderPath(segments: PathSegment[]) {
  const onSelect = vi.fn();
  render(<SelectionBreadcrumbs segments={segments} onSelect={onSelect} />);
  return {
    user: userEvent.setup(),
    onSelect,
    nav: screen.getByRole('navigation', { name: 'Selection path' }),
  };
}

describe('SelectionBreadcrumbs', () => {
  it('shows a short path whole: earlier Forms select, the root clears, a Condition is plain text', async () => {
    const { user, onSelect, nav } = renderPath([
      seg('fun', 'funnel', 'Funnel'),
      seg('A', 'form'),
      seg('c1', 'condition', 'Eligible? (Yes)'),
      seg('B', 'form'),
    ]);

    expect(
      within(nav)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Funnel', 'A', 'Eligible? (Yes)', 'B']);
    expect(within(nav).queryByRole('button', { name: 'Eligible? (Yes)' })).not.toBeInTheDocument();
    expect(within(nav).getByText('Eligible? (Yes)').closest('li')?.querySelector('svg')).toBeNull();
    expect(within(nav).getByText('B')).toHaveAttribute('aria-current', 'page');

    await user.click(within(nav).getByRole('button', { name: 'A' }));
    await user.click(within(nav).getByRole('button', { name: 'Funnel' }));
    expect(onSelect.mock.calls).toEqual([['A', 'form'], [null]]);
  });

  it('draws the root crumb as a home icon that keeps the root label as its name', () => {
    const { nav } = renderPath([seg('fun', 'funnel', 'Funnel'), seg('A', 'form')]);

    const root = within(nav).getByRole('button', { name: 'Funnel' });
    expect(root.querySelector('svg path')).toHaveAttribute('d', mdiHome);
    expect(within(nav).getByText('A').querySelector('svg')).toBeNull();
  });

  it('collapses a long path to root › ⋯ › parent › current, listing the hidden crumbs in a menu', async () => {
    const { user, onSelect, nav } = renderPath([
      seg('fun', 'funnel', 'Funnel'),
      seg('A', 'form'),
      seg('c1', 'condition', 'Eligible? (Yes)'),
      seg('X', 'form'),
      seg('Y', 'form'),
    ]);

    expect(
      within(nav)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Funnel', expect.any(String), 'X', 'Y']);
    await user.click(within(nav).getByRole('button', { name: 'Show hidden path' }));
    const menu = await screen.findByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['A', 'Eligible? (Yes)']);
    expect(items[1]).toHaveAttribute('aria-disabled', 'true');

    await user.click(items[0]!);
    expect(onSelect).toHaveBeenCalledWith('A', 'form');
  });
});

describe('the page path (breadcrumbs into the focused page)', () => {
  it('extends the flow path down to the selected page element, naming each element', async () => {
    const { withPagePath } = await import('../src/studio/selection-path');
    const ITEM = '#/properties/people/items/properties';
    const form = {
      id: 'F',
      type: 'Form',
      label: 'Page',
      elements: [
        {
          id: 'r',
          type: 'Control',
          scope: '#/properties/people',
          options: { component: 'record' },
          elements: [
            {
              id: 'L',
              type: 'VerticalLayout',
              elements: [{ id: 'f', type: 'Control', scope: `${ITEM}/first` }],
            },
          ],
        },
      ],
    };
    const schema = {
      type: 'object',
      properties: {
        people: {
          type: 'array',
          title: 'People',
          items: { type: 'object', properties: { first: { type: 'string', title: 'First name' } } },
        },
      },
    };
    const flow = [{ id: 'F', label: 'Page', kind: 'form' as const }];
    expect(withPagePath(flow, form, schema, 'F', 'f')).toEqual([
      ...flow,
      { id: 'r', label: 'People', kind: 'element' },
      { id: 'L', label: 'Vertical layout', kind: 'element' },
      { id: 'f', label: 'First name', kind: 'element' },
    ]);
    // Nothing selected, a stale id, or a path not ending at the focused page: the flow path alone.
    expect(withPagePath(flow, form, schema, 'F', null)).toBe(flow);
    expect(withPagePath(flow, form, schema, 'F', 'gone')).toBe(flow);
    expect(withPagePath(flow, form, schema, 'X', 'f')).toBe(flow);
  });

  it('selects an element crumb by id and kind', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SelectionBreadcrumbs
        segments={[
          { id: 'F', label: 'Page', kind: 'form' },
          { id: 'r', label: 'People', kind: 'element' },
          { id: 'f', label: 'First name', kind: 'element' },
        ]}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'People' }));
    expect(onSelect).toHaveBeenLastCalledWith('r', 'element');
    expect(screen.getByText('First name')).toHaveAttribute('aria-current', 'page');
  });
});
