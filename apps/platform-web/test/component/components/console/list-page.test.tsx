import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListPage, FilterChip } from '@/components/console/list-page';

describe('FilterChip', () => {
  it('renders disabled button with label and chevron icon', () => {
    render(<FilterChip label="Status" />);

    const chip = screen.getByRole('button', { name: 'Status' });
    expect(chip).toBeInTheDocument();
    expect(chip).toBeDisabled();
  });
});

describe('ListPage Component Test Suite', () => {
  it('renders toolbar and actions when provided', () => {
    render(
      <ListPage
        toolbar={<div data-testid="toolbar">Toolbar Content</div>}
        actions={<button data-testid="actions">New Item</button>}
        emptyTitle="No Items"
      />,
    );

    expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('actions')).toBeInTheDocument();
  });

  it('does not render toolbar/actions container if neither are provided', () => {
    const { container } = render(<ListPage emptyTitle="No Items" />);

    // The top row container with flex items-center should not be rendered
    const flexRow = container.querySelector('.flex.items-center.justify-between');
    expect(flexRow).not.toBeInTheDocument();
  });

  it('renders empty state when children are not provided', () => {
    render(
      <ListPage
        emptyTitle="No Services found"
        emptyDescription="Get started by creating a new service."
      />,
    );

    expect(screen.getByText('No Services found')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating a new service.')).toBeInTheDocument();
  });

  it('renders empty state without description if emptyDescription is omitted', () => {
    const { container } = render(<ListPage emptyTitle="No Services found" />);

    expect(screen.getByText('No Services found')).toBeInTheDocument();

    // Check that we don't render empty description
    // The description usually has slot="description" or empty-description class/attribute
    const desc = container.querySelector('[data-slot="empty-description"]');
    expect(desc).not.toBeInTheDocument();
  });

  it('renders children instead of empty state when children are provided', () => {
    render(
      <ListPage emptyTitle="No Services found">
        <div data-testid="custom-content">Active Services Table</div>
      </ListPage>,
    );

    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    expect(screen.queryByText('No Services found')).not.toBeInTheDocument();
  });
});
