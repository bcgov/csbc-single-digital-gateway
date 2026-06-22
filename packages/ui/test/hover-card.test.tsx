import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

function Example() {
  return (
    <HoverCard>
      <HoverCardTrigger>@sidmclaughlin</HoverCardTrigger>
      <HoverCardContent>Profile preview content</HoverCardContent>
    </HoverCard>
  );
}

describe('HoverCard', () => {
  it('renders the trigger with its data-slot', () => {
    render(<Example />);
    const trigger = screen.getByText('@sidmclaughlin');
    expect(trigger).toHaveAttribute('data-slot', 'hover-card-trigger');
  });

  it('keeps the content hidden until the trigger is hovered', () => {
    render(<Example />);
    expect(screen.queryByText('Profile preview content')).not.toBeInTheDocument();
  });

  it('reveals the portalled content when the trigger is hovered', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.hover(screen.getByText('@sidmclaughlin'));
    const content = await screen.findByText('Profile preview content');
    expect(content).toHaveAttribute('data-slot', 'hover-card-content');
  });

  it('supports controlled open state', async () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>trigger</HoverCardTrigger>
        <HoverCardContent>controlled content</HoverCardContent>
      </HoverCard>,
    );
    const content = await screen.findByText('controlled content');
    expect(content).toHaveAttribute('data-slot', 'hover-card-content');
  });
});
