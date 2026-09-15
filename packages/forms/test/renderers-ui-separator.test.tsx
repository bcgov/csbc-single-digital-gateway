import { NOT_APPLICABLE, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers-default';
import * as studio from '../src/renderers-studio';
import * as ui from '../src/renderers-ui';
import { NESTED_FORM_MESSAGE } from '../src/renderers/gridstack/form-renderer';

// Doc 194 rules 1-6 — the Separator display renderer and the parent layout kind.

const schema: JsonSchema = { type: 'object', properties: { hide: { type: 'boolean' } } };
const testerContext = { rootSchema: schema, config: {} };
const hiddenWhenSet = {
  effect: 'HIDE',
  condition: { scope: '#/properties/hide', schema: { const: true } },
};

const separator = (extra: object = {}) => ({ type: 'Separator', ...extra });
const heading = (text: string) => ({ type: 'Heading', text });
const layout = (type: string, ...elements: object[]) => ({ type, elements });

type Set = typeof defaults;

function renderWith(set: Set, uischema: object, data: object = {}) {
  return render(
    <JsonForms
      schema={schema}
      uischema={uischema as UISchemaElement}
      data={data}
      renderers={[...set.controlRenderers, ...set.displayRenderers, ...set.layoutRenderers]}
      cells={set.cells}
    />,
  );
}

async function renderStudio(uischema: object) {
  const view = renderWith(studio, uischema);
  await act(async () => {});
  return view;
}

const separatorEntry = () =>
  ui.displayRenderers.find(
    (entry) => entry.tester(separator() as UISchemaElement, schema, testerContext) > 0,
  );

describe('Separator renderer (doc 194)', () => {
  describe('set (rule 1)', () => {
    it('adds one Separator entry to renderers/ui displayRenderers, ranked 1, matching nothing else', () => {
      expect(ui.displayRenderers).toHaveLength(2);
      const tester = separatorEntry()?.tester;
      expect(tester?.(separator() as UISchemaElement, schema, testerContext)).toBe(1);
      expect(tester?.(heading('x') as UISchemaElement, schema, testerContext)).toBe(NOT_APPLICABLE);
      expect(tester?.({ type: 'Control' }, schema, testerContext)).toBe(NOT_APPLICABLE);
      expect(defaults.displayRenderers).toEqual(ui.displayRenderers);
    });
  });

  describe('rendering (rules 1-2)', () => {
    it('renders a semantic horizontal @repo/ui Separator in a Form', () => {
      renderWith(defaults, layout('Form', separator()));
      const rule = screen.getByRole('separator');
      expect(rule).toHaveAttribute('aria-orientation', 'horizontal');
      expect(rule).toHaveAttribute('data-slot', 'separator');
      expect(rule).toHaveClass('bg-border');
    });

    it.each(['VerticalLayout', 'Grid'])('renders in a %s', (type) => {
      renderWith(defaults, layout('Form', layout(type, heading('A'), separator())));
      expect(screen.getAllByRole('separator')).toHaveLength(1);
    });

    it('renders nothing when a rule hides it', () => {
      const { rerender } = renderWith(
        defaults,
        layout('Form', separator({ rule: hiddenWhenSet }), heading('A')),
        { hide: true },
      );
      expect(screen.queryByRole('separator')).toBeNull();
      rerender(
        <JsonForms
          schema={schema}
          uischema={layout('Form', separator({ rule: hiddenWhenSet })) as UISchemaElement}
          data={{ hide: false }}
          renderers={[...defaults.displayRenderers, ...defaults.layoutRenderers]}
          cells={defaults.cells}
        />,
      );
      expect(screen.getByRole('separator')).toBeInTheDocument();
    });
  });

  describe('in a row (rule 3)', () => {
    it('renders nothing in a fillable HorizontalLayout, and its item is empty', () => {
      const { container } = renderWith(
        defaults,
        layout('Form', layout('HorizontalLayout', heading('A'), separator())),
      );
      expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument();
      expect(screen.queryByRole('separator')).toBeNull();
      const row = container.querySelector('[data-layout-type="HorizontalLayout"]');
      const items = Array.from(row?.querySelectorAll(':scope > [data-slot="fill-item"]') ?? []);
      expect(items).toHaveLength(2);
      expect(items[1]?.innerHTML).toBe('');
    });

    it('keeps the studio slot for a Separator in a row but draws no rule there', async () => {
      const { container } = await renderStudio(
        layout(
          'Form',
          layout('HorizontalLayout', heading('A'), separator()),
          layout('VerticalLayout', separator()),
        ),
      );
      const row = container.querySelector('[data-element-type="HorizontalLayout"]');
      expect(row?.querySelector('[data-element-type="Separator"]')).not.toBeNull();
      expect(row?.querySelector('[role="separator"]')).toBeNull();
      expect(screen.getAllByRole('separator')).toHaveLength(1);
    });

    it('draws the rule in a studio Grid and VerticalLayout', async () => {
      await renderStudio(
        layout(
          'Form',
          layout('Grid', separator()),
          layout('VerticalLayout', heading('A'), separator()),
        ),
      );
      expect(screen.getAllByRole('separator')).toHaveLength(2);
    });
  });

  describe('parent layout kind (rule 6)', () => {
    it.each([
      ['fillable', defaults],
      ['studio', studio],
    ] as const)(
      'a %s Form nested in a HorizontalLayout still shows the nested error; the root does not',
      async (_name, set) => {
        renderWith(set, layout('Form', separator(), layout('HorizontalLayout', layout('Form'))));
        await act(async () => {});
        expect(screen.getAllByText(NESTED_FORM_MESSAGE)).toHaveLength(1);
        expect(screen.getAllByRole('separator')).toHaveLength(1);
      },
    );
  });

  describe('centred top-down (rule 4b)', () => {
    it('makes a fillable item holding a Separator a centring flex column', () => {
      renderWith(defaults, layout('Form', layout('Grid', separator())));
      const item = screen.getByRole('separator').parentElement;
      expect(item).toHaveAttribute('data-slot', 'fill-item');
      expect(item).toHaveClass(
        'has-[>[data-slot=separator]]:flex',
        'has-[>[data-slot=separator]]:flex-col',
        'has-[>[data-slot=separator]]:justify-center',
      );
    });

    it('centres a studio Separator item content with flex, leaving the measured child unstretched', () => {
      const css = readFileSync(resolve(import.meta.dirname, '../src/styles.css'), 'utf8');
      const selector = ".grid-stack-item-content:has(> [data-element-type='Separator'])";
      const start = css.indexOf(selector);
      expect(start).toBeGreaterThan(-1);
      const body = css.slice(css.indexOf('{', start), css.indexOf('}', start));
      expect(body).toContain('display: flex');
      expect(body).toContain('flex-direction: column');
      expect(body).toContain('justify-content: center');
      expect(body).not.toContain('height');
    });
  });
});
