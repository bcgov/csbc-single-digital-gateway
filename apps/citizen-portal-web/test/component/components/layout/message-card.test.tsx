import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MessageCard } from '@/components/layout/message-card';

describe('MessageCard', () => {
  it("carries the page's h1 by default", () => {
    render(<MessageCard title="Service not available" />);
    expect(
      screen.getByRole('heading', { name: 'Service not available', level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders an h2 when a banner above already owns the h1', () => {
    render(<MessageCard title="Application submitted" headingLevel={2} />);
    expect(
      screen.getByRole('heading', { name: 'Application submitted', level: 2 }),
    ).toBeInTheDocument();
  });

  it('renders no heading without a title, plus its message and actions', () => {
    render(
      <MessageCard actions={<button type="button">Retry</button>}>
        <p>Nothing here yet.</p>
      </MessageCard>,
    );
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
