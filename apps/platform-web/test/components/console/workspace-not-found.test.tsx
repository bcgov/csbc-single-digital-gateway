import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceNotFound } from '@/components/console/workspace-not-found';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: any) => {
    return (
      <a href={to} {...props}>
        {children}
      </a>
    );
  },
}));

describe('WorkspaceNotFound', () => {
  it('renders title, description, and link back to your workspaces', () => {
    render(<WorkspaceNotFound />);

    // Verify empty state display title and description
    expect(screen.getByText('Workspace not found')).toBeInTheDocument();
    expect(
      screen.getByText('It may have been deleted, or you don’t have access to it.'),
    ).toBeInTheDocument();

    // Verify back button points to /app
    const backLink = screen.getByRole('link', { name: 'Back to your workspaces' });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/app');
  });
});
