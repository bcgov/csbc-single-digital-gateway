import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VersionPicker } from '@/components/console/services/version-picker';
import type { ServiceVersion } from '@/lib/services';

const mockVersions: ServiceVersion[] = [
  {
    id: 'v-1',
    documentId: 'doc-1',
    version: 1,
    status: 'published',
    data: {},
    createdAt: '2026-07-15T00:00:00Z',
    publishedAt: '2026-07-15T00:00:00Z',
    archivedAt: null,
  },
  {
    id: 'v-2',
    documentId: 'doc-1',
    version: 2,
    status: 'draft',
    data: {},
    createdAt: '2026-07-15T01:00:00Z',
    publishedAt: null,
    archivedAt: null,
  },
];

describe('VersionPicker', () => {
  it('renders the selected version in the trigger button', () => {
    render(<VersionPicker versions={mockVersions} selectedId="v-1" onSelect={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /version v1/i });
    expect(trigger).toBeInTheDocument();
  });

  it('renders all versions in reversed order inside dropdown', async () => {
    const user = userEvent.setup();
    render(<VersionPicker versions={mockVersions} selectedId="v-1" onSelect={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /version v1/i });
    await user.click(trigger);

    const items = await screen.findAllByRole('menuitem');
    expect(items).toHaveLength(2);
    // toReversed() on [v1, v2] yields [v2, v1]
    expect(items[0]).toHaveTextContent('v2');
    expect(items[0]).toHaveTextContent('draft');
    expect(items[1]).toHaveTextContent('v1');
    expect(items[1]).toHaveTextContent('published');
  });

  it('highlights the selected version in the dropdown menu', async () => {
    const user = userEvent.setup();
    render(<VersionPicker versions={mockVersions} selectedId="v-1" onSelect={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /version v1/i });
    await user.click(trigger);

    const activeItem = await screen.findByRole('menuitem', { name: /v1/i });
    const inactiveItem = await screen.findByRole('menuitem', { name: /v2/i });

    expect(activeItem).toHaveClass('font-semibold');
    expect(inactiveItem).not.toHaveClass('font-semibold');
  });

  it('calls onSelect when a version item is clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(<VersionPicker versions={mockVersions} selectedId="v-1" onSelect={handleSelect} />);

    const trigger = screen.getByRole('button', { name: /version v1/i });
    await user.click(trigger);

    const option = await screen.findByRole('menuitem', { name: /v2/i });
    await user.click(option);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith('v-2');
  });
});
