import { JsonForms } from '@jsonforms/react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as ui from '../src/renderers/ui/index';

const schema = { type: 'object', properties: { show: { type: 'boolean' } } };

function renderHeading(
  options: Record<string, unknown>,
  extra: Record<string, unknown> = {},
  data = {},
) {
  const uischema = { type: 'Heading', options, ...extra };
  return render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={ui.renderers}
      cells={ui.cells}
    />,
  );
}

describe('renderers/ui (doc 236)', () => {
  it('exports cells, contentRenderers, controlRenderers, layoutRenderers and renderers as arrays', () => {
    for (const key of [
      'cells',
      'contentRenderers',
      'controlRenderers',
      'layoutRenderers',
      'renderers',
    ] as const) {
      expect(Array.isArray(ui[key]), key).toBe(true);
    }
    // Heading and Separator (doc 240).
    expect(ui.contentRenderers).toHaveLength(2);
    // Checkbox, Switch (doc 237 rule 0), Input, Textarea (doc 239), the single choice (doc 244) and the
    // multiple choice (doc 245) live in ui; default and studio spread them.
    expect(ui.controlRenderers).toHaveLength(6);
    expect(ui.renderers).toEqual([
      ...ui.contentRenderers,
      ...ui.controlRenderers,
      ...ui.layoutRenderers,
    ]);
  });

  it('renders a Heading with options.text at level 2 by default and no size class', () => {
    const { container } = renderHeading({ text: 'Apply now' });
    const heading = container.querySelector('[data-slot="heading-element"]');
    expect(heading?.tagName).toBe('H2');
    expect(heading).toHaveTextContent('Apply now');
    expect(heading).not.toHaveAttribute('class');
  });

  it('renders the element and size from options.level and options.size', () => {
    const { container } = renderHeading({ text: 'Apply', level: 4, size: 1 });
    const heading = container.querySelector('[data-slot="heading-element"]');
    expect(heading?.tagName).toBe('H4');
    expect(heading).toHaveClass('text-h1');
    expect(heading).not.toHaveClass('text-h4');
  });

  it('treats a non-integer or out-of-range level or size as absent', () => {
    expect(ui.headingOptions({ text: 'x', level: 7, size: 2.5 })).toEqual({ text: 'x' });
    expect(ui.headingOptions({ text: 3, level: '2', size: 0 })).toEqual({});
    expect(ui.headingOptions(null)).toEqual({});
    const { container } = renderHeading({ text: 'Apply', level: 0, size: 'big' });
    const heading = container.querySelector('[data-slot="heading-element"]');
    expect(heading?.tagName).toBe('H2');
    expect(heading).not.toHaveAttribute('class');
  });

  it('renders nothing for a Heading with no or empty text', () => {
    expect(renderHeading({}).container.querySelector('h1,h2,h3,h4,h5,h6')).toBeNull();
    expect(renderHeading({ text: '  ' }).container.querySelector('h1,h2,h3,h4,h5,h6')).toBeNull();
  });

  it('renders nothing when hidden by a rule', () => {
    const rule = {
      effect: 'HIDE',
      condition: { scope: '#/properties/show', schema: { const: true } },
    };
    const hidden = renderHeading({ text: 'Apply' }, { rule }, { show: true });
    expect(hidden.container.querySelector('[data-slot="heading-element"]')).toBeNull();
    const shown = renderHeading({ text: 'Apply' }, { rule }, { show: false });
    expect(shown.container.querySelector('[data-slot="heading-element"]')).toHaveTextContent(
      'Apply',
    );
  });
});
