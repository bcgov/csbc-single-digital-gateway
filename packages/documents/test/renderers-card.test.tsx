import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers/default/index';

const SCHEMA = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' }, ok: { type: 'boolean', title: 'OK' } },
};

const card = (overrides: Record<string, unknown> = {}, footer: unknown[] | null = []) => ({
  type: 'Card',
  id: 'C',
  label: 'Contact',
  options: { description: 'How to reach you' },
  elements: [
    {
      id: 'c',
      type: 'VerticalLayout',
      elements: [{ type: 'Control', scope: '#/properties/name' }],
    },
    ...(footer === null ? [] : [{ id: 'f', type: 'VerticalLayout', elements: footer }]),
  ],
  ...overrides,
});

function renderCard(element: Record<string, unknown>) {
  return render(
    <JsonForms
      schema={SCHEMA}
      uischema={{ type: 'Form', elements: [element] } as never}
      data={{}}
      renderers={defaults.renderers}
      cells={defaults.cells}
    />,
  );
}

const slotOf = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe('Card — default renderer (doc 273 rules 2-4)', () => {
  it('draws the title, description and the content layout', () => {
    const { container } = renderCard(card());
    expect(slotOf(container, 'card')).toBeInTheDocument();
    expect(slotOf(container, 'card-title')).toHaveTextContent('Contact');
    expect(slotOf(container, 'card-description')).toHaveTextContent('How to reach you');
    expect(slotOf(container, 'card-content')).toContainElement(
      screen.getByRole('textbox', { name: 'Name' }),
    );
  });

  it('skips the header with neither title nor description, and an empty or absent footer', () => {
    const { container } = renderCard(card({ label: ' ', options: {} }));
    expect(slotOf(container, 'card-header')).toBeNull();
    expect(slotOf(container, 'card-footer')).toBeNull();
    const absent = renderCard(card({}, null));
    expect(slotOf(absent.container, 'card-footer')).toBeNull();
    expect(slotOf(absent.container, 'card-content')).toBeInTheDocument();
  });

  it('draws a footer that holds elements, filling its width', () => {
    const { container } = renderCard(card({}, [{ type: 'Control', scope: '#/properties/ok' }]));
    const footer = slotOf(container, 'card-footer')!;
    expect(footer).toContainElement(screen.getByRole('checkbox', { name: 'OK' }));
    expect(footer.firstElementChild).toHaveClass('w-full');
  });

  it('passes the size to Card and the spacing as its gap; no gap class follows the size', () => {
    const sized = renderCard(card({ options: { size: 'sm', gap: 'lg' } }));
    const el = slotOf(sized.container, 'card')!;
    expect(el).toHaveAttribute('data-size', 'sm');
    expect(el).toHaveClass('gap-6');
    const plain = renderCard(card({ options: {} }));
    const plainCard = slotOf(plain.container, 'card')!;
    expect(plainCard).toHaveAttribute('data-size', 'default');
    expect(plainCard).not.toHaveClass('gap-2', 'gap-6');
  });

  it('renders nothing when hidden by a rule', () => {
    const { container } = render(
      <JsonForms
        schema={SCHEMA}
        uischema={
          {
            type: 'Form',
            elements: [
              card({
                label: 'Hidden',
                rule: { effect: 'HIDE', condition: { scope: '#', schema: {} } },
              }),
              card({ label: 'Shown' }),
            ],
          } as never
        }
        data={{}}
        renderers={defaults.renderers}
        cells={defaults.cells}
      />,
    );
    const cards = [...container.querySelectorAll('[data-slot="card"]')];
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('Shown');
  });
});
