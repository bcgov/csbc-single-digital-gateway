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
    expect(onSelect.mock.calls).toEqual([['A'], [null]]);
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
    expect(onSelect).toHaveBeenCalledWith('A');
  });
});
