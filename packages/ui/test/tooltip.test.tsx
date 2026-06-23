import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ui/components/ui/tooltip';

function TestTooltip() {
  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Helpful hint</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

describe('Tooltip', () => {
  it('renders the trigger without showing the tooltip content initially', () => {
    render(<TestTooltip />);
    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    expect(screen.queryByText('Helpful hint')).not.toBeInTheDocument();
  });

  it('reveals the tooltip content on focus', async () => {
    const user = userEvent.setup();
    render(<TestTooltip />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Hover me' })).toHaveFocus();

    expect(await screen.findByText('Helpful hint')).toBeInTheDocument();
  });

  it('reveals the tooltip content on hover', async () => {
    const user = userEvent.setup();
    render(<TestTooltip />);

    await user.hover(screen.getByRole('button', { name: 'Hover me' }));

    expect(await screen.findByText('Helpful hint')).toBeInTheDocument();
  });
});
