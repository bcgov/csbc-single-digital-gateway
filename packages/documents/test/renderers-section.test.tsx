import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers/default/index';

const SCHEMA = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' }, ok: { type: 'boolean', title: 'OK' } },
};
const NAME = { type: 'Control', scope: '#/properties/name' };

const section = (overrides: Record<string, unknown> = {}, elements: unknown[] = [NAME]) => ({
  type: 'Section',
  id: 'S',
  label: 'About you',
  options: { description: 'Who\nyou are' },
  elements,
  ...overrides,
});

function renderPage(elements: unknown[], data: Record<string, unknown> = {}) {
  return render(
    <JsonForms
      schema={SCHEMA}
      uischema={{ type: 'Form', elements } as never}
      data={data}
      renderers={defaults.renderers}
      cells={defaults.cells}
    />,
  );
}

const slotOf = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe('Section — default renderer (doc 278 rules 1-11)', () => {
  it('draws an h2 heading with the host class, the description, then its children', () => {
    const { container } = renderPage([section()]);
    const heading = screen.getByRole('heading', { level: 2, name: 'About you' });
    expect(heading).toHaveAttribute('data-slot', 'section-heading');
    expect(heading).toHaveClass('section-heading');
    const description = slotOf(container, 'section-description')!;
    expect(description).toHaveTextContent('Who you are');
    expect(description).toHaveClass('whitespace-pre-line');
    expect(slotOf(container, 'section')).toContainElement(
      screen.getByRole('textbox', { name: 'Name' }),
    );
    // Rule 2: the body is the ordinary vertical layout.
    expect(slotOf(container, 'section')!.querySelector('[data-slot="vertical-layout"]')).not.toBe(
      null,
    );
  });

  it('skips the header with neither a title nor a description, and the heading without a title', () => {
    const bare = renderPage([section({ label: ' ', options: {} })]);
    expect(slotOf(bare.container, 'section-title')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    bare.unmount();
    const described = renderPage([section({ label: undefined })]);
    expect(slotOf(described.container, 'section-heading')).toBeNull();
    expect(slotOf(described.container, 'section-description')).toHaveTextContent('Who');
  });

  it('nests: one heading level deeper per enclosing Section, through plain layouts', () => {
    const inner = section({ id: 'I', label: 'Inner', options: {} });
    const middle = { type: 'VerticalLayout', elements: [inner] };
    renderPage([section({ options: {} }, [middle])]);
    expect(screen.getByRole('heading', { level: 2, name: 'About you' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Inner' })).toBeInTheDocument();
  });

  it('caps the heading at h6', () => {
    let node: Record<string, unknown> = section({ label: 'Deepest', options: {} });
    for (let i = 0; i < 6; i += 1) node = section({ label: `L${i}`, options: {} }, [node]);
    renderPage([node]);
    expect(screen.getByRole('heading', { name: 'Deepest' }).tagName).toBe('H6');
  });

  it('plain draws no box; container boxes the body only, padded by its inset', () => {
    const plain = renderPage([section({ options: { inset: 'xl' } })]);
    expect(slotOf(plain.container, 'section')).toHaveAttribute('data-variant', 'plain');
    expect(slotOf(plain.container, 'section-body')).toBeNull();
    plain.unmount();
    const boxed = renderPage([section({ options: { variant: 'container', inset: 'lg' } })]);
    const body = slotOf(boxed.container, 'section-body')!;
    expect(body).toHaveClass('rounded-md', 'border', 'bg-gray-20', 'p-6');
    expect(body).not.toContainElement(slotOf(boxed.container, 'section-title'));
    expect(body).toContainElement(screen.getByRole('textbox', { name: 'Name' }));
    boxed.unmount();
    const fallback = renderPage([section({ options: { variant: 'container', inset: 'huge' } })]);
    expect(slotOf(fallback.container, 'section-body')).toHaveClass('p-4');
  });

  it('spaces the header and body by the authored gap', () => {
    const { container } = renderPage([section({ options: { gap: 'lg' } })]);
    expect(slotOf(container, 'section')).toHaveClass('gap-6');
    expect(slotOf(slotOf(container, 'section')!, 'vertical-layout')).toHaveAttribute(
      'data-gap',
      'lg',
    );
  });

  it('a rule that hides the Section hides its title too', () => {
    const hidden = section({
      rule: {
        effect: 'HIDE',
        condition: { scope: '#/properties/ok', schema: { const: true } },
      },
    });
    const shown = renderPage([hidden], { ok: false });
    expect(screen.getByRole('heading', { name: 'About you' })).toBeInTheDocument();
    shown.unmount();
    const { container } = renderPage([hidden], { ok: true });
    expect(slotOf(container, 'section')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'About you' })).toBeNull();
  });
});
