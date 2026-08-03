import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeaderBanner } from '@/components/layout/page-header-banner';

describe('PageHeaderBanner', () => {
  it('renders its children inside a full-width bcgov-gold divider', () => {
    render(
      <PageHeaderBanner>
        <h1>My header</h1>
      </PageHeaderBanner>,
    );
    const heading = screen.getByRole('heading', { name: 'My header', level: 1 });
    const divider = document.querySelector('.border-bcgov-gold');
    expect(divider).not.toBeNull();
    expect(divider).toContainElement(heading);
  });

  it('renders an optional breadcrumb above the content, in DOM order', () => {
    render(
      <PageHeaderBanner breadcrumb={<nav aria-label="Breadcrumb">crumbs</nav>}>
        <h1>My header</h1>
      </PageHeaderBanner>,
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    const container = document.querySelector('.border-bcgov-gold > div');
    const children = container ? Array.from(container.children) : [];
    expect(children[0]?.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('renders no breadcrumb node when the prop is omitted', () => {
    render(
      <PageHeaderBanner>
        <h1>Only content</h1>
      </PageHeaderBanner>,
    );
    const container = document.querySelector('.border-bcgov-gold > div');
    // Only the single child (the heading) is present — no empty breadcrumb wrapper.
    expect(container?.children).toHaveLength(1);
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
