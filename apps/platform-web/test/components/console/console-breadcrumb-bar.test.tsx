import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConsoleBreadcrumbBar } from '@/components/console/console-breadcrumb-bar';
import { usePageChrome } from '@/lib/page-chrome';

vi.mock('@/lib/page-chrome', () => ({
  usePageChrome: vi.fn(),
}));

describe('ConsoleBreadcrumbBar', () => {
  it('renders nothing when chrome is null', () => {
    vi.mocked(usePageChrome).mockReturnValue(null);
    const { container } = render(<ConsoleBreadcrumbBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when breadcrumb is not defined', () => {
    vi.mocked(usePageChrome).mockReturnValue({
      title: 'Dashboard',
    });
    const { container } = render(<ConsoleBreadcrumbBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the breadcrumb when defined', () => {
    vi.mocked(usePageChrome).mockReturnValue({
      title: 'Service Detail',
      breadcrumb: <div data-testid="mock-crumb">Services &gt; Municipal Parking</div>,
    });
    render(<ConsoleBreadcrumbBar />);
    expect(screen.getByTestId('mock-crumb')).toBeInTheDocument();
    expect(screen.getByText('Services > Municipal Parking')).toBeInTheDocument();
  });
});
