import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';
import { renderSeededStudio } from './render-studio';

const GREETING = 'Hello, FormStudio!';

/** A one-Heading Grid uischema — a distinct object on every call. */
// A studio document's root must be a Form (doc 192 rule 6).
const gridWith = (text: string) =>
  ({
    type: 'Form',
    elements: [{ type: 'Heading', text, options: { level: 1 } }],
  }) as UISchemaElement;

/** The layout is expressed in Tailwind utilities, so the classes ARE the contract here. */
function renderStudio() {
  const { container } = renderSeededStudio();
  const root = container.querySelector('[data-slot="form-studio"]');
  const header = container.querySelector('[data-slot="form-studio-header"]');
  const content = container.querySelector('[data-slot="form-studio-content"]');
  const footer = container.querySelector('[data-slot="form-studio-footer"]');
  return { root, header, content, footer };
}

describe('FormStudio', () => {
  it('renders the greeting Hello, FormStudio!', async () => {
    renderSeededStudio();
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

  // Doc 181 rule 3 supersedes doc 180 rule 19: scrolling and padding move to the centre panel.
  it('hosts the resizable workspace instead of scrolling or centring itself', () => {
    const { content } = renderStudio();
    expect(content?.firstElementChild).toHaveAttribute('data-slot', 'resizable-panel-group');
    expect(content).not.toHaveClass('overflow-auto');
    expect(content).not.toHaveClass('p-4');
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

  // Doc 180 rules 16-17b — grid children are framed by their grid item, the root layout by its frame.
  // Doc 182 rule 24c, amended by doc 192 rule 8 — the sample's root is a Form.
  it('renders the sample Heading in a studio grid item inside the framed root Form', async () => {
    const { content } = renderStudio();
    const heading = await screen.findByRole('heading', { level: 1, name: GREETING });
    const item = heading.closest('[data-element-type="Heading"]');
    const gridFrame = item?.parentElement?.closest('[data-element-type="Form"]');
    expect(item).toHaveAttribute('data-slot', 'studio-grid-item');
    expect(item?.closest('.grid-stack-item-content')).not.toBeNull();
    expect(gridFrame).toHaveAttribute('data-slot', 'studio-element');
    expect(content).toContainElement(gridFrame as HTMLElement);
  });

  // Doc 180 rule 17c — sample fields render disabled and inert in the studio.
  it('renders the sample fields disabled inside inert, pointer-events-none content', async () => {
    const { content } = renderStudio();
    await screen.findByRole('textbox', { name: 'Name' });
    // Base UI's NumberField also renders an aria-hidden <input type="number"> for native form
    // submission; only the four visible fields count.
    const inputs = Array.from(
      content?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        '[data-slot="studio-grid-item"] input:not([aria-hidden="true"]), [data-slot="studio-grid-item"] textarea',
      ) ?? [],
    );
    // name, about, quantity, budget, team size + email, phone and best time in the Contact layouts +
    // city, postal code and province in the nested Delivery grid. Base UI's radio, checkbox and switch
    // hidden inputs are aria-hidden (doc 188 rule 33).
    expect(inputs).toHaveLength(11);
    for (const input of inputs) {
      expect(input).toBeDisabled();
      const wrapper = input.closest('[data-slot="studio-content"]');
      expect(wrapper).toHaveAttribute('inert');
      expect(wrapper).toHaveClass('pointer-events-none');
    }
  });

  // Doc 188 rules 32-33 — the sample shows every choice and boolean control, disabled on the canvas.
  it('renders the sample choice and boolean controls disabled', async () => {
    renderStudio();
    await screen.findByRole('textbox', { name: 'Name' });
    expect(screen.getByRole('combobox', { name: 'Team size' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Province' })).toBeDisabled();

    const contact = screen.getByRole('radiogroup', { name: 'Preferred contact method' });
    const radios = within(contact).getAllByRole('radio');
    expect(radios.map((radio) => radio.closest('[data-slot="field"]')?.textContent)).toEqual([
      'Email',
      'Phone',
      'Mail',
    ]);
    for (const radio of radios) expect(radio).toHaveAttribute('data-disabled');

    expect(screen.getByRole('checkbox', { name: 'Email me product news' })).toHaveAttribute(
      'data-disabled',
    );
    expect(screen.getByRole('switch', { name: 'Text me delivery updates' })).toHaveAttribute(
      'data-disabled',
    );
  });

  it('renders the sample root Form as a draggable one-column grid (not grid-stack-static)', async () => {
    const { content } = renderStudio();
    await screen.findByRole('heading', { level: 1, name: GREETING });
    const grid = content?.querySelector('.grid-stack');
    expect(grid).not.toBeNull();
    expect(grid).toHaveClass('gs-1');
    expect(grid).not.toHaveClass('grid-stack-static');
  });

  // Doc 182 rule 24 — the sample also shows the Input, Textarea and NumberInput controls.
  it('renders the sample name Input, about Textarea and quantity/budget NumberInputs in framed Controls', async () => {
    const { content } = renderStudio();
    const name = await screen.findByRole('textbox', { name: 'Name' });
    const about = screen.getByRole('textbox', { name: 'About' });
    const quantity = screen.getByRole('textbox', { name: 'Quantity' });
    const budget = screen.getByRole('textbox', { name: 'Budget' });

    expect(name).toHaveAttribute('data-slot', 'input');
    expect(about.tagName).toBe('TEXTAREA');
    expect(quantity).toHaveAttribute('data-slot', 'number-input-input');
    expect(budget).toHaveAttribute('data-slot', 'number-input-input');
    for (const control of [name, about, quantity, budget]) {
      expect(content).toContainElement(control);
      expect(control.closest('[data-element-type="Control"]')).not.toBeNull();
    }
    // The Heading stays first in the sample.
    expect(screen.getByRole('heading', { level: 1, name: GREETING })).toBeInTheDocument();
  });

  // Doc 183 rules 1-2 — optional seed props; a new object resets the studio.
  it('renders a schema and uischema passed as props instead of the sample', async () => {
    const schema: JsonSchema = { type: 'object', properties: {} };
    const uischema = {
      type: 'Form',
      elements: [{ type: 'Heading', text: 'Custom form', options: { level: 1 } }],
    } as UISchemaElement;
    render(<FormStudio schema={schema} uischema={uischema} />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Custom form' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(GREETING)).toBeNull();
  });

  it('resets to a new uischema object passed after mount', async () => {
    const { rerender } = render(<FormStudio uischema={gridWith('First')} />);
    await screen.findByRole('heading', { name: 'First' });

    rerender(<FormStudio uischema={gridWith('Second')} />);

    expect(await screen.findByRole('heading', { name: 'Second' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'First' })).toBeNull();
  });

  it('renders with no props supplied', () => {
    const { root } = renderStudio();
    expect(root).toBeInTheDocument();
  });
});
