import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServiceConsolePage } from '@/components/console/services/service-console-page';

describe('ServiceConsolePage Component Test Suite', () => {
  it('renders default coming soon text and title when children and extra are omitted', () => {
    render(<ServiceConsolePage title="Service Overview" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Service Overview' })).toBeInTheDocument();
    expect(screen.getByText('This section is coming soon.')).toBeInTheDocument();
  });

  it('renders custom children when provided', () => {
    render(
      <ServiceConsolePage title="Custom Section">
        <div data-testid="custom-content">Active Service Details</div>
      </ServiceConsolePage>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Custom Section' })).toBeInTheDocument();
    expect(screen.getByTestId('custom-content')).toHaveTextContent('Active Service Details');
    expect(screen.queryByText('This section is coming soon.')).not.toBeInTheDocument();
  });

  it('renders extra items in the page header when extra prop is provided', () => {
    render(
      <ServiceConsolePage
        title="Versioned Service"
        extra={[
          <button key="btn-1" type="button">
            Version Picker
          </button>,
        ]}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Versioned Service' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Version Picker' })).toBeInTheDocument();
    expect(screen.getByText('This section is coming soon.')).toBeInTheDocument();
  });

  it('renders both custom children and extra items when both are provided', () => {
    render(
      <ServiceConsolePage
        title="Full Service Page"
        extra={[
          <button key="btn-action" type="button">
            Action Button
          </button>,
        ]}
      >
        <p>Main content body</p>
      </ServiceConsolePage>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Full Service Page' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    expect(screen.getByText('Main content body')).toBeInTheDocument();
  });
});
