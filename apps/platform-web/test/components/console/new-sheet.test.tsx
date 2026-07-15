import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NewSheet } from '@/components/console/new-sheet';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, children, ...props }: any) => {
    // Mock Link to render as a native anchor tag with populated path
    const href = to.replace('$slug', params?.slug ?? '');
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

describe('NewSheet', () => {
  it('renders disabled trigger when slug is undefined', () => {
    render(<NewSheet slug={undefined} />);

    const triggerBtn = screen.getByRole('button', { name: 'New' });
    expect(triggerBtn).toBeInTheDocument();
    expect(triggerBtn).toBeDisabled();
  });

  it('renders enabled trigger when slug is provided', () => {
    render(<NewSheet slug="riverton" />);

    const triggerBtn = screen.getByRole('button', { name: 'New' });
    expect(triggerBtn).toBeInTheDocument();
    expect(triggerBtn).not.toBeDisabled();
  });

  it('opens sheet with Service option card linking to services page when clicked', async () => {
    const user = userEvent.setup();
    render(<NewSheet slug="riverton" />);

    const triggerBtn = screen.getByRole('button', { name: 'New' });
    await user.click(triggerBtn);

    // Verify sheet header and details
    expect(await screen.findByRole('heading', { name: 'Create new' })).toBeInTheDocument();
    expect(screen.getByText('What would you like to add to this workspace?')).toBeInTheDocument();

    // Verify Service option card title and description
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(
      screen.getByText(
        'A service-type document that groups related applications citizens interact with.',
      ),
    ).toBeInTheDocument();

    // Verify the Link targets the correct path
    const serviceLink = screen.getByRole('link', { name: /service/i });
    expect(serviceLink).toBeInTheDocument();
    expect(serviceLink).toHaveAttribute('href', '/app/riverton/services');
  });
});
