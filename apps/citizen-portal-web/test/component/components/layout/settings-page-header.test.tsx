import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SettingsPageHeader } from '@/components/layout/settings-page-header';

describe('SettingsPageHeader Component', () => {
  const dummyIcon = 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z';

  it('renders standard title, icon, subtitle, meta, and breadcrumb when provided', () => {
    render(
      <SettingsPageHeader
        icon={dummyIcon}
        title="Settings Title"
        subtitle="This is a settings subtitle"
        meta={<div data-testid="meta-element">Meta Info</div>}
        breadcrumb={<div data-testid="breadcrumb-element">Home &gt; Settings</div>}
      />,
    );

    // Title check
    expect(screen.getByRole('heading', { name: 'Settings Title', level: 1 })).toBeInTheDocument();

    // Subtitle check
    expect(screen.getByText('This is a settings subtitle')).toBeInTheDocument();

    // Meta check
    expect(screen.getByTestId('meta-element')).toHaveTextContent('Meta Info');

    // Breadcrumb check
    expect(screen.getByTestId('breadcrumb-element')).toHaveTextContent('Home > Settings');
  });

  it('omits subtitle, meta, and breadcrumb when not provided', () => {
    render(<SettingsPageHeader icon={dummyIcon} title="Settings Title Only" />);

    // Title check
    expect(
      screen.getByRole('heading', { name: 'Settings Title Only', level: 1 }),
    ).toBeInTheDocument();

    // Subtitle should not be in the document
    expect(screen.queryByText('This is a settings subtitle')).toBeNull();

    // Container should not have the meta or breadcrumb elements
    expect(screen.queryByTestId('meta-element')).toBeNull();
    expect(screen.queryByTestId('breadcrumb-element')).toBeNull();
  });
});
