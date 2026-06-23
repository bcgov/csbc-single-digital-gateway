import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ui/components/ui/collapsible';

function renderCollapsible(defaultOpen = false) {
  return render(
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger>Toggle</CollapsibleTrigger>
      <CollapsibleContent>Hidden content</CollapsibleContent>
    </Collapsible>,
  );
}

describe('Collapsible', () => {
  it('renders an accessible trigger button', () => {
    renderCollapsible();
    expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument();
  });

  it('is collapsed by default', () => {
    renderCollapsible();
    expect(screen.getByRole('button', { name: 'Toggle' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('expands when the trigger is clicked', async () => {
    const user = userEvent.setup();
    renderCollapsible();
    const trigger = screen.getByRole('button', { name: 'Toggle' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Hidden content')).toBeVisible();
  });

  it('collapses again on a second click', async () => {
    const user = userEvent.setup();
    renderCollapsible(true);
    const trigger = screen.getByRole('button', { name: 'Toggle' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('assigns the correct data-slot attributes', () => {
    const { container } = renderCollapsible();
    expect(container.querySelector('[data-slot="collapsible"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="collapsible-trigger"]')).toBeInTheDocument();
  });
});
