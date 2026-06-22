import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

function renderPagination() {
  return render(
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#prev" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#1">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#2" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#next" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>,
  );
}

describe('Pagination', () => {
  it('renders a labelled navigation landmark', () => {
    renderPagination();
    const nav = screen.getByRole('navigation', { name: 'pagination' });
    expect(nav).toHaveAttribute('data-slot', 'pagination');
  });

  it('renders page links as anchors with hrefs', () => {
    renderPagination();
    // The Button wrapper renders an <a> but exposes role="button".
    const link = screen.getByRole('button', { name: '1' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '#1');
    expect(link).toHaveAttribute('data-slot', 'pagination-link');
  });

  it('marks the active link with aria-current and data-active', () => {
    renderPagination();
    const active = screen.getByRole('button', { name: '2' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active).toHaveAttribute('data-active', 'true');
  });

  it('labels previous and next controls for assistive tech', () => {
    renderPagination();
    expect(screen.getByRole('button', { name: 'Go to previous page' })).toHaveAttribute(
      'href',
      '#prev',
    );
    expect(screen.getByRole('button', { name: 'Go to next page' })).toHaveAttribute(
      'href',
      '#next',
    );
  });

  it('renders an aria-hidden ellipsis with screen-reader text', () => {
    const { container } = renderPagination();
    const ellipsis = container.querySelector('[data-slot="pagination-ellipsis"]');
    expect(ellipsis).not.toBeNull();
    expect(ellipsis).toHaveAttribute('aria-hidden');
    expect(within(ellipsis as HTMLElement).getByText('More pages')).toBeInTheDocument();
  });
});
