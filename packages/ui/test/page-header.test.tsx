import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageBody, PageHeader } from '@ui/layout/page-header';

/**
 * Feature 176 — `PageHeader`/`PageBody` promoted from platform-web to `@repo/ui`.
 *
 * The behavioural contract is inherited from feature 162 (see
 * `apps/platform-web/test/component/components/console/page-header.test.tsx`, which must keep
 * passing unchanged through the console's thin re-export). What is NEW here is that the console
 * bleed and the bcgov-gold divider became OPT-IN, so a form pane can use the header without
 * dragging console chrome in.
 */

describe('@repo/ui PageHeader — inherited contract', () => {
  it('renders the title as a heading and the description on the second line', () => {
    render(<PageHeader title="Services" description="Manage your services" />);

    expect(screen.getByRole('heading', { name: 'Services' })).toBeInTheDocument();
    expect(screen.getByText('Manage your services')).toBeInTheDocument();
  });

  it('omits the description line when none is provided', () => {
    const { container } = render(<PageHeader title="Overview" />);

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders the extra items on the right of the title row', () => {
    render(
      <PageHeader
        title="Services"
        extra={[
          <button key="new" type="button">
            New
          </button>,
          <button key="import" type="button">
            Import
          </button>,
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
  });

  it('scales the title through the size knob', () => {
    render(<PageHeader title="Big" size="lg" />);

    expect(screen.getByRole('heading', { name: 'Big' })).toHaveClass('text-2xl');
  });

  it('spans the full width when fluid, and a centred column otherwise', () => {
    const contained = render(<PageHeader title="Contained" />);
    expect(contained.container.querySelector('.max-w-6xl')).toBeInTheDocument();

    const wide = render(<PageHeader title="Wide" fluid />);
    expect(wide.container.querySelector('.max-w-6xl')).toBeNull();
  });
});

describe('@repo/ui PageHeader — opt-in console chrome', () => {
  it('renders NO bcgov-gold divider by default', () => {
    const { container } = render(<PageHeader title="Plain" />);
    const outer = container.firstChild as HTMLElement;

    expect(outer).not.toHaveClass('border-bcgov-gold');
    expect(outer.className).not.toContain('border-b-2');
  });

  it('renders NO negative-margin bleed by default (safe inside a form pane)', () => {
    const { container } = render(<PageHeader title="Plain" />);
    const outer = container.firstChild as HTMLElement;

    expect(outer.className).not.toContain('-mx-6');
    expect(outer.className).not.toContain('-mt-6');
  });

  it('renders the bcgov-gold divider and the horizontal bleed when the console chrome is opted in', () => {
    const { container } = render(<PageHeader title="Banner" variant="banner" />);
    const outer = container.firstChild as HTMLElement;

    expect(outer).toHaveClass('border-bcgov-gold');
    // Horizontal bleed only — the banner deliberately does NOT pull up past the shell's top padding.
    expect(outer.className).toContain('-mx-6');
    expect(outer.className).not.toContain('-mt-6');
  });
});

describe('@repo/ui PageBody', () => {
  it('re-applies the shared content column so a body lines up with its header', () => {
    const { container } = render(
      <PageBody>
        <p>Body</p>
      </PageBody>,
    );

    // The outer div bleeds past the shell padding; the inner one restores the header's column.
    expect((container.firstChild as HTMLElement).className).toContain('-mx-6');
    expect(container.querySelector('.max-w-6xl')).toBeInTheDocument();
  });

  it('passes through a className for the body layout', () => {
    const { container } = render(
      <PageBody className="flex flex-col gap-4">
        <p>Body</p>
      </PageBody>,
    );

    const column = container.querySelector('.max-w-6xl') as HTMLElement;
    expect(column).toHaveClass('flex', 'flex-col', 'gap-4');
  });
});
