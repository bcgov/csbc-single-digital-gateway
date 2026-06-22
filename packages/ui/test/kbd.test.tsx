import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

describe('Kbd', () => {
  it('renders a kbd element with its children and slot attribute', () => {
    render(<Kbd>Esc</Kbd>);
    const kbd = screen.getByText('Esc');
    expect(kbd.tagName).toBe('KBD');
    expect(kbd).toHaveAttribute('data-slot', 'kbd');
  });

  it('merges a custom className with the base classes', () => {
    render(<Kbd className="custom-marker">K</Kbd>);
    const kbd = screen.getByText('K');
    expect(kbd.className).toContain('custom-marker');
    expect(kbd.className).toContain('bg-muted');
  });

  it('groups multiple keys with KbdGroup', () => {
    const { container } = render(
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );
    const group = container.querySelector('[data-slot="kbd-group"]');
    expect(group).not.toBeNull();
    expect(within(group as HTMLElement).getByText('Ctrl')).toBeInTheDocument();
    expect(within(group as HTMLElement).getByText('K')).toBeInTheDocument();
  });
});
