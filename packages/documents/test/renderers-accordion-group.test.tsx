import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import * as ui from '../src/renderers/ui/index';
import { richText } from './rich-text-fixtures';

const ITEMS = [
  { id: 'a', title: 'Who can apply?', content: richText('Anyone over 19') },
  { id: 'b', title: '  ', content: richText('Second answer') },
];
const group = (options: Record<string, unknown> = {}, label: string | undefined = 'FAQ') => ({
  id: 'G',
  type: 'AccordionGroup',
  ...(label !== undefined && { label }),
  options: { description: richText('Read before you apply'), items: ITEMS, ...options },
});

function renderGroup(element: Record<string, unknown>) {
  return render(
    <JsonForms
      schema={{ type: 'object' }}
      uischema={{ type: 'Form', elements: [element] } as never}
      data={{}}
      renderers={defaults.renderers}
      cells={defaults.cells}
    />,
  );
}

describe('Accordion group — default renderer (doc 279 rules 4-6)', () => {
  it('is a ui content renderer the default set inherits', () => {
    expect(
      ui.contentRenderers.some(
        (e) => e.tester({ type: 'AccordionGroup' } as never, {}, {} as never) > 0,
      ),
    ).toBe(true);
  });

  it('draws the title, the rich description and one trigger per item, all collapsed by default', () => {
    const { container } = renderGroup(group());
    expect(screen.getByText('FAQ')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="accordion-description"]')).toHaveTextContent(
      'Read before you apply',
    );
    const triggers = screen.getAllByRole('button', { name: /Who can apply\?|Item 2/ });
    expect(triggers.map((t) => t.textContent)).toEqual(['Who can apply?', 'Item 2']);
    for (const trigger of triggers) expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens an item on click to show its rich content, and Expand all opens every item', async () => {
    const user = userEvent.setup();
    renderGroup(group());
    await user.click(screen.getByRole('button', { name: 'Who can apply?' }));
    expect(screen.getByRole('button', { name: 'Who can apply?' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Anyone over 19')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Expand all/ }));
    expect(screen.getByRole('button', { name: 'Item 2' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens the first item, or all of them, as authored', () => {
    const first = renderGroup(group({ defaultOpen: 'first' }));
    expect(screen.getByRole('button', { name: 'Who can apply?' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Item 2' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    first.unmount();
    renderGroup(group({ defaultOpen: 'all' }));
    expect(screen.getByRole('button', { name: 'Item 2' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders nothing with no items, no title and no description; a title alone still renders', () => {
    const { container } = renderGroup({ id: 'G', type: 'AccordionGroup', options: { items: [] } });
    expect(container.querySelector('[data-slot="accordion-group"]')).toBeNull();
    renderGroup({ id: 'H', type: 'AccordionGroup', label: 'Only a title', options: {} });
    expect(screen.getByText('Only a title')).toBeInTheDocument();
  });

  it('a rule that hides it renders nothing', () => {
    const renderWith = (ok: boolean) =>
      render(
        <JsonForms
          schema={{ type: 'object', properties: { ok: { type: 'boolean' } } }}
          uischema={
            {
              type: 'Form',
              elements: [
                {
                  ...group(),
                  rule: {
                    effect: 'HIDE',
                    condition: { scope: '#/properties/ok', schema: { const: true } },
                  },
                },
              ],
            } as never
          }
          data={{ ok }}
          renderers={defaults.renderers}
          cells={defaults.cells}
        />,
      );
    const shown = renderWith(false);
    expect(shown.container.querySelector('[data-slot="accordion-group"]')).not.toBeNull();
    shown.unmount();
    const { container } = renderWith(true);
    expect(container.querySelector('[data-slot="accordion-group"]')).toBeNull();
  });
});
