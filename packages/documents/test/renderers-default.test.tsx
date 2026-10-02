import { JsonForms } from '@jsonforms/react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import * as ui from '../src/renderers/ui/index';

const heading = (id: string, text: string) => ({ id, type: 'Heading', options: { text } });

function renderLayout(uischema: Record<string, unknown>) {
  return render(
    <JsonForms
      schema={{ type: 'object' }}
      uischema={uischema as never}
      data={{}}
      renderers={defaults.renderers}
      cells={defaults.cells}
    />,
  );
}

describe('renderers/default (doc 236)', () => {
  it("spreads every ui category — its controls are exactly ui's boolean controls", () => {
    expect(defaults.controlRenderers).toEqual(ui.controlRenderers);
    for (const key of [
      'cells',
      'contentRenderers',
      'controlRenderers',
      'layoutRenderers',
    ] as const) {
      for (const entry of ui[key]) expect(defaults[key], key).toContain(entry);
    }
    // VerticalLayout and Form (doc 236 rule 39).
    expect(defaults.layoutRenderers.length).toBe(ui.layoutRenderers.length + 2);
  });

  it('renders a VerticalLayout as a one-column grid with children in elements order', () => {
    const { container } = renderLayout({
      type: 'VerticalLayout',
      elements: [heading('a', 'First'), heading('b', 'Second')],
    });
    const layout = container.querySelector('[data-slot="vertical-layout"]');
    expect(layout).toHaveClass('grid', 'grid-cols-1');
    const texts = [...layout!.querySelectorAll('[data-slot="heading-element"]')].map(
      (h) => h.textContent,
    );
    expect(texts).toEqual(['First', 'Second']);
  });

  it('maps options.gap sm/md/lg to gap-2/gap-4/gap-6 and anything else to md', () => {
    const cases: [unknown, string, string][] = [
      ['sm', 'sm', 'gap-2'],
      ['md', 'md', 'gap-4'],
      ['lg', 'lg', 'gap-6'],
      ['xl', 'md', 'gap-4'],
      [undefined, 'md', 'gap-4'],
    ];
    for (const [gap, name, cls] of cases) {
      const { container, unmount } = renderLayout({
        type: 'VerticalLayout',
        elements: [],
        options: gap === undefined ? {} : { gap },
      });
      const layout = container.querySelector('[data-slot="vertical-layout"]');
      expect(layout).toHaveAttribute('data-gap', name);
      expect(layout).toHaveClass(cls);
      unmount();
    }
  });

  it('renders an empty layout as an empty grid', () => {
    const { container } = renderLayout({ type: 'VerticalLayout', elements: [] });
    const layout = container.querySelector('[data-slot="vertical-layout"]');
    expect(layout).not.toBeNull();
    expect(layout!.childElementCount).toBe(0);
  });

  it('never ties two entries at the top rank for Heading or VerticalLayout', () => {
    const ctx = { rootSchema: {}, config: {} };
    for (const type of ['Heading', 'VerticalLayout']) {
      const ranks = defaults.renderers
        .map((r) => r.tester({ type } as never, {}, ctx as never))
        .toSorted((a, b) => b - a);
      expect(ranks[0], type).toBeGreaterThan(0);
      expect(ranks[0], type).not.toBe(ranks[1]);
    }
  });

  describe('Form (rules 39-44)', () => {
    it('renders a titled section with its elements laid out like a VerticalLayout', () => {
      const { container } = renderLayout({
        id: 'f1',
        type: 'Form',
        label: 'Eligibility',
        elements: [heading('a', 'First'), heading('b', 'Second')],
        options: { gap: 'sm' },
      });
      const form = container.querySelector('[data-slot="form"]')!;
      expect(form.tagName).toBe('SECTION');
      expect(form).toHaveAttribute('aria-label', 'Eligibility');
      const title = form.querySelector('[data-slot="form-title"]')!;
      expect(title.tagName).toBe('H1');
      expect(title).toHaveTextContent('Eligibility');
      expect(title).toHaveClass('text-h1', 'font-semibold');
      // A 2px BC Gov gold rule under the title (doc 236 rule 41b).
      expect(title).toHaveClass('border-b-2', 'border-bcgov-gold', 'pb-2');
      const body = form.querySelector('[data-slot="vertical-layout"]')!;
      expect(body).toHaveAttribute('data-gap', 'sm');
      expect(
        [...body.querySelectorAll('[data-slot="heading-element"]')].map((h) => h.textContent),
      ).toEqual(['First', 'Second']);
    });

    it('draws no title (and no aria-label) when the label is absent, blank or not a string', () => {
      for (const label of [undefined, '  ', 42]) {
        const { container, unmount } = renderLayout({
          type: 'Form',
          elements: [heading('a', 'Only')],
          ...(label !== undefined && { label }),
        });
        const form = container.querySelector('[data-slot="form"]')!;
        expect(form.querySelector('[data-slot="form-title"]')).toBeNull();
        expect(form).not.toHaveAttribute('aria-label');
        expect(form).toHaveTextContent('Only');
        unmount();
      }
    });

    it('renders just the title for a Form with no elements, and nothing when hidden', () => {
      const empty = renderLayout({ type: 'Form', label: 'Empty', elements: [] });
      expect(empty.container.querySelector('[data-slot="form"]')).toHaveTextContent('Empty');
      expect(
        empty.container.querySelector('[data-slot="vertical-layout"]')!.childElementCount,
      ).toBe(0);
      empty.unmount();
      const rule = { effect: 'HIDE', condition: { scope: '#', schema: {} } };
      const hidden = renderLayout({ type: 'Form', label: 'Hidden', elements: [], rule });
      expect(hidden.container.querySelector('[data-slot="form"]')).toBeNull();
    });

    it('ranks the Form renderer 1 with no tie', () => {
      const ctx = { rootSchema: {}, config: {} };
      const ranks = defaults.renderers
        .map((r) => r.tester({ type: 'Form' } as never, {}, ctx as never))
        .toSorted((a, b) => b - a);
      expect(ranks[0]).toBe(1);
      expect(ranks[1]).toBeLessThan(1);
    });
  });
});
