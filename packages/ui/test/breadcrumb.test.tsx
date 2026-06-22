import { render, screen, within } from '@testing-library/react';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

function renderBreadcrumb() {
  return render(
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Current</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>,
  );
}

describe('Breadcrumb', () => {
  it('renders a navigation landmark labelled "breadcrumb"', () => {
    renderBreadcrumb();
    const nav = screen.getByRole('navigation', { name: 'breadcrumb' });
    expect(nav).toBeInTheDocument();
  });

  it('renders an ordered list of items', () => {
    renderBreadcrumb();
    const nav = screen.getByRole('navigation', { name: 'breadcrumb' });
    const list = within(nav).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
  });

  it('renders a real anchor link for navigable crumbs', () => {
    renderBreadcrumb();
    const link = screen.getByRole('link', { name: 'Home' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/');
  });

  it('marks the current page with aria-current and aria-disabled', () => {
    renderBreadcrumb();
    const page = screen.getByText('Current');
    expect(page).toHaveAttribute('aria-current', 'page');
    expect(page).toHaveAttribute('aria-disabled', 'true');
    expect(page).toHaveAttribute('role', 'link');
  });

  it('renders separators as presentational and hidden from a11y tree', () => {
    const { container } = renderBreadcrumb();
    const separators = container.querySelectorAll('[data-slot="breadcrumb-separator"]');
    expect(separators.length).toBe(2);
    separators.forEach((sep) => {
      expect(sep).toHaveAttribute('aria-hidden', 'true');
      expect(sep).toHaveAttribute('role', 'presentation');
    });
  });

  it('exposes an accessible label on the ellipsis via sr-only text', () => {
    renderBreadcrumb();
    expect(screen.getByText('More')).toHaveClass('sr-only');
  });
});
