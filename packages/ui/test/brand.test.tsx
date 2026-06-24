import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon } from '@ui/brand/icon';
import { Logo } from '@ui/brand/logo';

describe('Brand assets', () => {
  it('Logo renders an svg with the brand viewBox and forwards className/aria', () => {
    const { container } = render(<Logo className="h-8" aria-label="Single Digital Gateway" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 847.65 327.01');
    expect(svg).toHaveClass('h-8');
    expect(svg).toHaveAccessibleName('Single Digital Gateway');
  });

  it('Icon renders an svg, forwards props, and preserves its brand fills', () => {
    const { container } = render(<Icon className="size-6" aria-label="SDG icon" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('viewBox')).toContain('30');
    expect(svg).toHaveClass('size-6');
    // Multi-colour brand mark: at least one path keeps an explicit (non-currentColor) fill.
    expect(container.querySelector('path[style*="rgb"]')).toBeInTheDocument();
  });
});
