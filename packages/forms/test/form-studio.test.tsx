import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';

const GREETING = 'Hello, FormStudio!';

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
  it('renders the greeting Hello, FormStudio!', async () => {
    render(<FormStudio />);
    // The greeting is a grid item now, rendered once gridstack has initialised — hence findBy.
    expect(await screen.findByText(GREETING)).toBeInTheDocument();
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

  // Doc 180 rule 19 supersedes doc 178 rule 5 (centred greeting).
  it('lets the content area scroll and pad instead of centring a string', () => {
    const { content } = renderStudio();
    expect(content).toHaveClass('overflow-auto', 'p-4');
    expect(content).not.toHaveClass('items-center');
    expect(content).not.toHaveClass('justify-center');
  });

  // Doc 180 rule 18 — FormStudio renders a built-in sample through renderers/studio.
  it("renders the sample Heading 'Hello, FormStudio!' as an <h1> through JSONForms", async () => {
    const { content } = renderStudio();
    const heading = await screen.findByRole('heading', { level: 1, name: GREETING });
    expect(heading.tagName).toBe('H1');
    expect(content).toContainElement(heading);
    expect(heading.closest('.grid-stack-item')).not.toBeNull();
  });

  it('renders the sample Heading inside a studio frame inside a framed Grid', async () => {
    const { content } = renderStudio();
    const heading = await screen.findByRole('heading', { level: 1, name: GREETING });
    const headingFrame = heading.closest('[data-element-type="Heading"]');
    const gridFrame = headingFrame?.parentElement?.closest('[data-element-type="Grid"]');
    expect(headingFrame).toHaveAttribute('data-slot', 'studio-element');
    expect(gridFrame).toHaveAttribute('data-slot', 'studio-element');
    expect(content).toContainElement(gridFrame as HTMLElement);
  });

  it('renders the sample Grid as draggable/resizable (not grid-stack-static)', async () => {
    const { content } = renderStudio();
    await screen.findByRole('heading', { level: 1, name: GREETING });
    const grid = content?.querySelector('.grid-stack');
    expect(grid).not.toBeNull();
    expect(grid).not.toHaveClass('grid-stack-static');
  });

  it('renders with no props supplied', () => {
    const { root } = renderStudio();
    expect(root).toBeInTheDocument();
  });
});
