import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';

/** The layout is expressed in Tailwind utilities, so the classes ARE the contract here. */
function renderStudio() {
  const { container } = render(<FormStudio />);
  const root = container.querySelector('[data-slot="form-studio"]');
  const header = container.querySelector('[data-slot="form-studio-header"]');
  const content = container.querySelector('[data-slot="form-studio-content"]');
  const footer = container.querySelector('[data-slot="form-studio-footer"]');
  return { root, header, content, footer };
}

describe('FormStudio', () => {
  it('renders the greeting Hello, FormStudio!', () => {
    render(<FormStudio />);
    expect(screen.getByText('Hello, FormStudio!')).toBeInTheDocument();
  });

  it('stacks header, content and footer top-down filling the container height', () => {
    const { root, header, content, footer } = renderStudio();
    expect(root).toHaveClass('flex', 'h-full', 'flex-col');
    // Document order is the visual order in a column flex container.
    expect(Array.from(root?.children ?? [])).toEqual([header, content, footer]);
  });

  it('gives the header a fixed 36px height that neither grows nor shrinks', () => {
    const { header } = renderStudio();
    expect(header?.tagName).toBe('HEADER');
    expect(header).toHaveClass('h-9', 'shrink-0', 'grow-0');
  });

  it('gives the footer a fixed 36px height that neither grows nor shrinks', () => {
    const { footer } = renderStudio();
    expect(footer?.tagName).toBe('FOOTER');
    expect(footer).toHaveClass('h-9', 'shrink-0', 'grow-0');
  });

  it('lets the content area flex to fill the space between header and footer', () => {
    const { content } = renderStudio();
    // min-h-0 defeats the default `min-height: auto` on a flex child, so overflowing content
    // scrolls inside the area instead of pushing the footer off-screen.
    expect(content).toHaveClass('flex-1', 'min-h-0');
  });

  it('centres the content vertically and horizontally', () => {
    const { content } = renderStudio();
    expect(content).toHaveClass('flex', 'items-center', 'justify-center');
    expect(content).toHaveTextContent('Hello, FormStudio!');
  });

  it('renders with no props supplied', () => {
    const { root } = renderStudio();
    expect(root).toBeInTheDocument();
  });
});
