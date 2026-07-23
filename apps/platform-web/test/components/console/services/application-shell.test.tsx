import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationShell } from '@/components/console/services/application-shell';
import { useSetPageChrome } from '@/lib/page-chrome';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, params, children, ...props }: any) => {
    let href = to;
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        href = href.replace(`$${key}`, String(val));
      });
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock('@/lib/page-chrome', () => ({
  useSetPageChrome: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  mockNavigate.mockClear();
});

describe('ApplicationShell', () => {
  it('registers page chrome details on mount', () => {
    render(
      <ApplicationShell
        slug="riverton"
        serviceId="srv-123"
        serviceTitle="Municipal Parking"
        label="Parking Form"
        status="published"
        readOnly={false}
      >
        <div>Content</div>
      </ApplicationShell>,
    );

    expect(useSetPageChrome).toHaveBeenCalledTimes(1);
    expect(useSetPageChrome).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Parking Form',
        description: 'Application method of Municipal Parking',
        breadcrumb: expect.any(Object),
      }),
    );

    // Extract and render the breadcrumb element to verify its content
    const callArgs = vi.mocked(useSetPageChrome).mock.calls[0]![0];
    render(callArgs.breadcrumb);

    const servicesLink = screen.getByRole('link', { name: 'Services' });
    expect(servicesLink).toBeInTheDocument();
    expect(servicesLink.getAttribute('href')).toBe('/app/riverton/services');

    const serviceTitleLink = screen.getByRole('link', { name: 'Municipal Parking' });
    expect(serviceTitleLink).toBeInTheDocument();
    expect(serviceTitleLink.getAttribute('href')).toBe('/app/riverton/services/srv-123');

    expect(screen.getByText('Parking Form')).toBeInTheDocument();
  });

  it('renders content directly without frame when readOnly is false', () => {
    const { container } = render(
      <ApplicationShell
        slug="riverton"
        serviceId="srv-123"
        serviceTitle="Municipal Parking"
        label="Parking Form"
        readOnly={false}
      >
        <div data-testid="child-content">Builder Content</div>
      </ApplicationShell>,
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();

    // Negative margins are applied to bleed edge-to-edge
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('-m-6');
    expect(wrapper).toHaveClass('h-[calc(100%+3rem)]');
  });

  it('renders read-only layout with back button, badge, and hint when readOnly is true', () => {
    render(
      <ApplicationShell
        slug="riverton"
        serviceId="srv-123"
        serviceTitle="Municipal Parking"
        label="Parking Form"
        status="published"
        readOnly={true}
      >
        <div data-testid="child-content">Preview Content</div>
      </ApplicationShell>,
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This form is published and can’t be changed. Add a new service version to make changes.',
      ),
    ).toBeInTheDocument();
  });

  it('navigates back to service details when Back button is clicked in read-only mode', async () => {
    const user = userEvent.setup();
    render(
      <ApplicationShell
        slug="riverton"
        serviceId="srv-123"
        serviceTitle="Municipal Parking"
        label="Parking Form"
        status="archived"
        readOnly={true}
      >
        <div>Content</div>
      </ApplicationShell>,
    );

    const backButton = screen.getByRole('button', { name: /back/i });
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/$slug/services/$id',
      params: {
        slug: 'riverton',
        id: 'srv-123',
      },
    });
  });

  it('defaults readOnly to false when not provided', () => {
    const { container } = render(
      <ApplicationShell
        slug="riverton"
        serviceId="srv-123"
        serviceTitle="Municipal Parking"
        label="Parking Form"
      >
        <div data-testid="default-child">Content</div>
      </ApplicationShell>,
    );

    expect(screen.getByTestId('default-child')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('-m-6');
    expect(wrapper).toHaveClass('h-[calc(100%+3rem)]');
  });

  it('renders correctly in read-only mode when status is undefined', () => {
    render(
      <ApplicationShell
        slug="riverton"
        serviceId="srv-123"
        serviceTitle="Municipal Parking"
        label="Parking Form"
        readOnly={true}
      >
        <div>Content</div>
      </ApplicationShell>,
    );

    expect(
      screen.getByText(
        'This form is not editable and can’t be changed. Add a new service version to make changes.',
      ),
    ).toBeInTheDocument();

    expect(screen.queryByText('published')).not.toBeInTheDocument();
    expect(screen.queryByText('archived')).not.toBeInTheDocument();
  });
});
