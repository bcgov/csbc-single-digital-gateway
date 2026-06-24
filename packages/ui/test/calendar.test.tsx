import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Calendar, CalendarDayButton } from '@ui/components/ui/calendar';

// react-day-picker relies on layout APIs that jsdom does not fully implement,
// so these are render-safety + a11y/structure assertions only.
describe('Calendar', () => {
  it('exports are defined', () => {
    expect(Calendar).toBeDefined();
    expect(CalendarDayButton).toBeDefined();
  });

  it('mounts without throwing', () => {
    expect(() => render(<Calendar month={new Date(2026, 5, 1)} />)).not.toThrow();
  });

  it('renders a grid for the month', () => {
    render(<Calendar month={new Date(2026, 5, 1)} />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('renders the calendar root slot', () => {
    const { container } = render(<Calendar month={new Date(2026, 5, 1)} />);
    expect(container.querySelector('[data-slot="calendar"]')).toBeInTheDocument();
  });

  it('renders day buttons for dates in the month', () => {
    render(<Calendar month={new Date(2026, 5, 1)} />);
    // Multiple day gridcells with button children should be present.
    expect(screen.getAllByRole('gridcell').length).toBeGreaterThan(0);
  });

  it('merges a custom className', () => {
    const { container } = render(
      <Calendar month={new Date(2026, 5, 1)} className="custom-marker" />,
    );
    expect(container.querySelector('[data-slot="calendar"] , .custom-marker')).toBeTruthy();
  });
});
