import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import * as defaults from '../src/renderers-default';
import { PLAIN_CONFIG } from '../src/renderers/ui/control-presentation';

// Doc 216 rules 21-23 — the Tabs as a citizen meets it: a STATIC strip over a live panel while filling, and no
// strip at all on a review page. Both through the real renderers/default registry, because rule 21's "static" is
// the ABSENCE of a `TabsEditor` provider, not a mode flag a test could pass.

const schema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' }, city: { type: 'string', title: 'City' } },
};

const el = (element: object) => element as UISchemaElement;
const control = (property: string) => ({ type: 'Control', scope: `#/properties/${property}` });
const tab = (label: string | undefined, elements: object[]) => ({
  type: 'Tab',
  ...(label === undefined ? {} : { label }),
  elements: [{ type: 'TabContent', elements }],
});
const tabs = (children: object[], options?: object) => ({
  type: 'Tabs',
  ...(options ? { options } : {}),
  elements: children,
});
const formRoot = (elements: object[]) => el({ type: 'Form', elements });

/** Both tabs hold a field, so "which panel is open" is observable as which field is on the page. */
const twoTabs = (options?: object) =>
  formRoot([
    tabs([tab('Personal', [control('name')]), tab('Address', [control('city')])], options),
  ]);

function renderFill(
  uischema: object,
  options: { data?: Record<string, unknown>; config?: unknown; onChange?: () => void } = {},
) {
  const onChange = options.onChange;
  return render(
    <JsonForms
      schema={schema}
      uischema={el(uischema)}
      data={options.data ?? {}}
      renderers={[
        ...defaults.controlRenderers,
        ...defaults.displayRenderers,
        ...defaults.layoutRenderers,
      ]}
      cells={defaults.cells}
      {...(options.config === undefined ? {} : { config: options.config })}
      {...(onChange ? { onChange } : {})}
      validationMode="NoValidation"
    />,
  );
}

const blocks = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('[data-slot="tab-block"]'),
];

describe('fillable presentation (rule 21)', () => {
  it('renders no add, delete or reorder affordance without a TabsEditor provider', () => {
    const { container } = renderFill(twoTabs());

    // Rule 14: the fillable strip is the strip with no editor above it — no `+`, and no native drag to reorder.
    expect(container.querySelector('[data-slot="tab-strip-add"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add tab' })).toBeNull();
    expect(container.querySelector('[data-slot="tab-strip"]')).toBeInTheDocument();
    for (const trigger of screen.getAllByRole('tab')) {
      expect(trigger).toHaveAttribute('draggable', 'false');
    }
    // A tab is deleted through the studio's element delete (rule 18), so the strip itself carries no control
    // beyond its triggers.
    expect(
      [...container.querySelectorAll('[data-slot="tab-strip"] button')].map((button) =>
        button.getAttribute('role'),
      ),
    ).toEqual(['tab', 'tab']);
  });

  it('opens the first Tab by default', () => {
    renderFill(twoTabs());

    const [first, second] = screen.getAllByRole('tab');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(second).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.queryByLabelText('City')).toBeNull();
  });

  it('switches panels when another trigger is activated', async () => {
    const user = userEvent.setup();
    renderFill(twoTabs());

    await user.click(screen.getByRole('tab', { name: 'Address' }));

    expect(screen.getByRole('tab', { name: 'Address' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Personal' })).toHaveAttribute('aria-selected', 'false');
    // Rule 21: the open tab is the renderer's own state here — there is no selection to derive it from.
    expect(screen.getByLabelText('City')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).toBeNull();
  });

  it('keeps fields inside the open panel editable', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFill(twoTabs(), { onChange });

    await user.type(screen.getByLabelText('Name'), 'Ada');

    // Rule 21: the panel is an ordinary part of the form — the strip being static changes nothing below it, so
    // the answer reaches JSONForms' core and is not just DOM state. `<JsonForms>` debounces its emit by 10ms.
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ data: { name: 'Ada' } })),
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Ada');
  });
});

describe('plain presentation (rules 22-23)', () => {
  const answers = { name: 'Ada Lovelace', city: 'Victoria' };

  it('renders no tablist at all under PLAIN_CONFIG', () => {
    // Rule 22: the tab chrome is DROPPED even though this element authored `component: 'tabs'` — plain is `list`
    // FORCED (rule 29), because a review page that hid most of a submission behind clicks defeats doc 214.
    const { container } = renderFill(twoTabs({ component: 'tabs' }), {
      data: answers,
      config: PLAIN_CONFIG,
    });

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByRole('tabpanel')).toBeNull();
    expect(
      container.querySelector('[data-slot="tabs"][data-component="list"]'),
    ).toBeInTheDocument();
  });

  it('stacks every Tab in elements order, all answers visible at once', () => {
    const { container } = renderFill(twoTabs({ component: 'tabs' }), {
      data: answers,
      config: PLAIN_CONFIG,
    });

    expect(blocks(container)).toHaveLength(2);
    expect(blocks(container).map((block) => block.textContent)).toEqual([
      expect.stringContaining('Ada Lovelace'),
      expect.stringContaining('Victoria'),
    ]);
    // Order is `elements` order, the rule every layout in this package follows: placement is derived, not authored.
    expect(container.textContent?.indexOf('Ada Lovelace')).toBeLessThan(
      container.textContent?.indexOf('Victoria') ?? -1,
    );
  });

  it('heads each block with the Tab label, and heads an unlabelled Tab with nothing', () => {
    const { container } = renderFill(
      formRoot([tabs([tab('Personal', [control('name')]), tab(undefined, [control('city')])])]),
      { data: answers, config: PLAIN_CONFIG },
    );

    const headings = container.querySelectorAll('[data-slot="tab-heading"]');
    expect([...headings].map((node) => node.textContent)).toEqual(['Personal']);
    // A Form's title is `h1` (doc 201), so a top-level block heads at the next level down (doc 212's machinery).
    expect(headings[0]?.tagName).toBe('H2');
    expect(blocks(container)[1]?.querySelector('[data-slot="tab-heading"]')).toBeNull();
    expect(blocks(container)[1]).toHaveTextContent('Victoria');
  });

  it('leaves the answers to the controls — no plain text invented by the layout', () => {
    const { container } = renderFill(twoTabs(), { data: answers, config: PLAIN_CONFIG });

    // Rule 23: the layout renders the CHROME. Every answer on the page is a control's own plain field, so the
    // Tabs cannot drift from doc 211/214's formatting by rendering a second version of it.
    const [first] = blocks(container);
    const values = [...(first?.querySelectorAll('[data-slot="plain-field-value"]') ?? [])];
    expect(values.map((node) => node.textContent)).toEqual(['Ada Lovelace']);
    expect(screen.getAllByText('Ada Lovelace')).toHaveLength(1);
    // The block itself contributes only its heading and the dispatched panel.
    expect(first?.children).toHaveLength(2);
  });
});

describe('purity gate (doc 193)', () => {
  it('renderers/default imports no gridstack and no @xyflow/react through the new modules', () => {
    // `renderers-default.test.ts` and `renderers-default-flow.test.tsx` pin the files IN `renderers/default`; the
    // Tabs modules they now reach sit in `renderers/gridstack`, so their purity is a new thing to pin. Same
    // technique — read the source and refuse the import — rather than a second mechanism.
    const directory = resolve(import.meta.dirname, '../src/renderers/gridstack');
    const modules = ['tabs-renderer.tsx', 'tab-strip.tsx', 'tabs-options.ts', 'tabs-editor.ts'];

    const fill = readFileSync(
      resolve(import.meta.dirname, '../src/renderers/default/fill-layouts.tsx'),
      'utf8',
    );
    expect(fill).toMatch(/from ['"]\.\.\/gridstack\/tabs-renderer['"]/);

    for (const file of modules) {
      const source = readFileSync(resolve(directory, file), 'utf8');
      expect(source, file).not.toMatch(/from ['"]gridstack['"]/);
      expect(source, file).not.toMatch(/from ['"]@xyflow\//);
      expect(source, file).not.toMatch(
        /from ['"]\.\/(create-grid-renderers|grid-renderer|grid-element|index)['"]/,
      );
    }
  });
});
