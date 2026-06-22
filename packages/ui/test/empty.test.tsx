import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';

describe('Empty', () => {
  it('renders the full composed structure with title and description', () => {
    render(
      <Empty data-testid="empty">
        <EmptyHeader>
          <EmptyMedia />
          <EmptyTitle>No results found</EmptyTitle>
          <EmptyDescription>Try adjusting your search.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <button type="button">Reset</button>
        </EmptyContent>
      </Empty>,
    );

    const root = screen.getByTestId('empty');
    expect(root).toHaveAttribute('data-slot', 'empty');
    expect(within(root).getByText('No results found')).toBeInTheDocument();
    expect(within(root).getByText('Try adjusting your search.')).toBeInTheDocument();
    expect(within(root).getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('marks each sub-component with its data-slot', () => {
    render(
      <Empty>
        <EmptyHeader data-testid="header">
          <EmptyTitle data-testid="title">Title</EmptyTitle>
          <EmptyDescription data-testid="desc">Desc</EmptyDescription>
          <EmptyContent data-testid="content">Content</EmptyContent>
        </EmptyHeader>
      </Empty>,
    );

    expect(screen.getByTestId('header')).toHaveAttribute('data-slot', 'empty-header');
    expect(screen.getByTestId('title')).toHaveAttribute('data-slot', 'empty-title');
    expect(screen.getByTestId('desc')).toHaveAttribute('data-slot', 'empty-description');
    expect(screen.getByTestId('content')).toHaveAttribute('data-slot', 'empty-content');
  });

  it('applies the icon variant to EmptyMedia via data-variant', () => {
    render(<EmptyMedia data-testid="media" variant="icon" />);
    const media = screen.getByTestId('media');
    expect(media).toHaveAttribute('data-slot', 'empty-icon');
    expect(media).toHaveAttribute('data-variant', 'icon');
    expect(media.className).toContain('bg-muted');
  });

  it('defaults EmptyMedia to the default variant', () => {
    render(<EmptyMedia data-testid="media" />);
    expect(screen.getByTestId('media')).toHaveAttribute('data-variant', 'default');
  });

  it('merges a custom className onto the root', () => {
    render(<Empty data-testid="empty" className="custom-marker" />);
    expect(screen.getByTestId('empty').className).toContain('custom-marker');
  });
});
