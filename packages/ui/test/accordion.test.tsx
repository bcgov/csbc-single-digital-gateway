import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

function renderAccordion(defaultValue?: string[]) {
  return render(
    <Accordion defaultValue={defaultValue}>
      <AccordionItem value="one">
        <AccordionTrigger>First section</AccordionTrigger>
        <AccordionContent>First body</AccordionContent>
      </AccordionItem>
      <AccordionItem value="two">
        <AccordionTrigger>Second section</AccordionTrigger>
        <AccordionContent>Second body</AccordionContent>
      </AccordionItem>
    </Accordion>,
  );
}

describe('Accordion', () => {
  it('renders triggers as collapsed buttons by default', () => {
    renderAccordion();
    const trigger = screen.getByRole('button', { name: /First section/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('marks an item open when provided via defaultValue', () => {
    renderAccordion(['one']);
    const trigger = screen.getByRole('button', { name: /First section/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('First body')).toBeInTheDocument();
  });

  it('expands a panel when its trigger is clicked', async () => {
    const user = userEvent.setup();
    renderAccordion();
    const trigger = screen.getByRole('button', { name: /First section/ });

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panelId = trigger.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId as string);
    expect(panel).not.toBeNull();
    expect(within(panel as HTMLElement).getByText('First body')).toBeInTheDocument();
  });

  it('collapses an open panel when its trigger is clicked again', async () => {
    const user = userEvent.setup();
    renderAccordion(['one']);
    const trigger = screen.getByRole('button', { name: /First section/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('applies the root slot wrapper class', () => {
    const { container } = renderAccordion();
    const root = container.querySelector('[data-slot="accordion"]');
    expect(root).not.toBeNull();
    expect(root).toHaveClass('rounded-md');
  });
});
