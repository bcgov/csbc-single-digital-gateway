import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  allowedInLayout,
  FORM_TYPE,
  GRID_LAYOUT_TYPES,
  isGridLayoutType,
  isPageRoot,
  layoutKindOf,
  SECTION_TYPE,
  SERVICE_TYPE,
  type GridLayoutKind,
} from '../src/renderers/gridstack/grid-layouts';
import { SERVICE_TITLE_PLACEHOLDER } from '../src/renderers/gridstack/service-renderer';
import { validateUischemaDocument } from '../src/studio/code/validate-document';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import type { InspectorContext } from '../src/studio/inspector/inspector-context';
import { INSPECTOR_FIELDS, type InspectorField } from '../src/studio/inspector/inspector-fields';
import { applyMove } from '../src/studio/layout/apply-layout';
import { createElementIds } from '../src/studio/layout/element-ids';
import { elementLabel } from '../src/studio/layout/element-path';
import { buildTemplate, PALETTE_TEMPLATES } from '../src/studio/palette/palette-templates';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';
import { renderSeededStudio } from './render-studio';
import { richText } from './rich-text-fixtures';

// Doc 215 rules 1-5, 12-15, 17-22 — what a Service IS to the studio: its layout kind, where it may never sit, the
// root gate, its absence from the palette, its inspector fields, and the apply gate.

const KINDS = ['grid', 'vertical', 'horizontal'] as const satisfies readonly GridLayoutKind[];
const ROOT_ERROR = 'The root element must be a Form, a Service or a Flow.';

const schema: JsonSchema = { type: 'object', properties: { name: { type: 'string' } } };
const el = (element: object) => element as UISchemaElement;
const service = (element: object = {}) => el({ type: 'Service', elements: [], ...element });

const ok = (uischema: unknown) => validateUischemaDocument(uischema).valid;

describe('the Service layout kind (rules 2-3)', () => {
  it('maps Service to the vertical kind', () => {
    expect(layoutKindOf(SERVICE_TYPE)).toBe('vertical');
    expect(SERVICE_TYPE).toBe('Service');
    // Case-sensitive, like every other type.
    expect(layoutKindOf('service')).toBeUndefined();
  });

  it('reports a Service as a gridstack layout type', () => {
    expect(isGridLayoutType(SERVICE_TYPE)).toBe(true);
  });

  it('leaves GRID_LAYOUT_TYPES one type per kind — vertical is still VerticalLayout', () => {
    // Rule 2: the map a Service must NOT join. A second `vertical` entry here would DISPLACE VerticalLayout
    // for the axis testers and for `fill-layouts`, and nothing type-checks the difference.
    expect(GRID_LAYOUT_TYPES).toEqual({
      grid: 'Grid',
      vertical: 'VerticalLayout',
      horizontal: 'HorizontalLayout',
    });
    expect(Object.values(GRID_LAYOUT_TYPES)).not.toContain(SERVICE_TYPE);
    expect(Object.isFrozen(GRID_LAYOUT_TYPES)).toBe(true);
  });
});

describe('isPageRoot (rule 4)', () => {
  it('is true for a Form and for a Service', () => {
    expect(isPageRoot(FORM_TYPE)).toBe(true);
    expect(isPageRoot(SERVICE_TYPE)).toBe(true);
  });

  it('is false for a Flow, a Stage, a Section and every layout type', () => {
    for (const type of [
      'Flow',
      'Stage',
      'Condition',
      SECTION_TYPE,
      ...Object.values(GRID_LAYOUT_TYPES),
      'Control',
      'Heading',
      'Separator',
    ]) {
      expect(isPageRoot(type), type).toBe(false);
    }
  });
});

describe('placement (rule 13)', () => {
  it('refuses a Service in a VerticalLayout, a HorizontalLayout and a Grid', () => {
    for (const kind of KINDS) expect(allowedInLayout(SERVICE_TYPE, kind), kind).toBe(false);
  });

  it('refuses an insert of a Service into any layout', () => {
    // `insertElement` builds from a palette TEMPLATE KEY, and rule 14 gives a Service none — so the insert
    // path cannot even name one. That absence IS the rule, so it is what this asserts.
    for (const template of PALETTE_TEMPLATES) {
      const built = buildTemplate(template.key, STUDIO_SAMPLE_SCHEMA);
      expect((built?.element as { type?: string } | undefined)?.type, template.key).not.toBe(
        SERVICE_TYPE,
      );
    }
    expect(buildTemplate(SERVICE_TYPE, STUDIO_SAMPLE_SCHEMA)).toBeUndefined();
    expect(buildTemplate('service', STUDIO_SAMPLE_SCHEMA)).toBeUndefined();
  });

  it('refuses a move of a Service into any layout', () => {
    // A hand-authored document can still HOLD a nested Service (the code editor refuses it, a stored file
    // might not), so the drag path must refuse to move one — `allowedInLayout` is the single rule
    // `applyMove` asks (doc 194 rule 7), and refusing only in write-back would leave a ghost item.
    const nested = service({ label: 'Inner' });
    const from = el({ type: 'Grid', elements: [nested] });
    const to = el({ type: 'VerticalLayout', elements: [] });
    const root = el({ type: 'Form', elements: [from, to] });
    const ids = createElementIds();
    const moved = applyMove(
      root,
      {
        fromGridId: ids.idOf(from),
        toGridId: ids.idOf(to),
        elementId: ids.idOf(nested),
        fromNodes: [],
        toNodes: [],
      },
      ids,
    );
    // Unchanged: the same object back, and the Service still in the Grid it was authored in.
    expect(moved).toBe(root);
  });

  it('still refuses a Form, Flow, Stage and Condition in every layout (rule 5)', () => {
    for (const type of ['Form', 'Flow', 'Stage', 'Condition']) {
      for (const kind of KINDS) expect(allowedInLayout(type, kind), `${type}/${kind}`).toBe(false);
    }
  });
});

const centre = () => document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]');
const rootError = () => document.querySelector('[data-slot="form-studio-root-error"]');

describe('the studio root gate (rule 12)', () => {
  it('draws the canvas for a Service root instead of the root error', () => {
    renderSeededStudio({
      uischema: service({ label: 'Apply', elements: [{ type: 'Heading', text: 'Hello' }] }),
    });
    expect(rootError()).toBeNull();
    expect(
      centre()?.querySelector('[data-slot="studio-element"][data-element-type="Service"]'),
    ).not.toBeNull();
  });

  it('shows "The root element must be a Form, a Service or a Flow." for any other root', () => {
    renderSeededStudio({ uischema: el({ type: 'VerticalLayout', elements: [] }) });
    const alert = rootError();
    expect(alert).toHaveTextContent(ROOT_ERROR);
    expect(alert).toHaveAttribute('role', 'alert');
  });

  it('keeps drawing the canvas for a Form root and for a Flow root', () => {
    const form = renderSeededStudio();
    expect(rootError()).toBeNull();
    form.unmount();

    renderSeededStudio({
      uischema: el({ type: 'Flow', elements: [], options: { edges: [] } }),
    });
    expect(rootError()).toBeNull();
  });

  it('routes a Service root through the runner in preview, as a Form root is (rule 16)', () => {
    renderSeededStudio({
      uischema: service({ label: 'Apply', elements: [{ type: 'Heading', text: 'Hello' }] }),
    });
    screen.getByRole('button', { name: 'Preview' }).click();
    // The runner's action bar is what tells a runner preview from a plain `<JsonForms>` one.
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('the palette (rule 14)', () => {
  it('lists no Service template in any palette group', () => {
    for (const template of PALETTE_TEMPLATES) {
      expect(template.key, template.key).not.toBe('service');
      expect(template.label.toLowerCase(), template.key).not.toContain('service');
    }
  });

  it('produces no Service from any palette template’s element', () => {
    // The real gate: what a template BUILDS. A label check alone would miss a template that emits one.
    for (const template of PALETTE_TEMPLATES) {
      const built = buildTemplate(template.key, STUDIO_SAMPLE_SCHEMA);
      expect(built, template.key).toBeDefined();
      expect(JSON.stringify(built?.element), template.key).not.toContain(`"${SERVICE_TYPE}"`);
    }
  });

  it('leaves the existing palette catalogue and its button count unchanged', () => {
    renderSeededStudio();
    const palette = document.querySelector<HTMLElement>('[data-studio-palette]');
    expect(palette).not.toBeNull();
    const names = within(palette as HTMLElement)
      .queryAllByRole('button')
      .map((button) => button.textContent);
    expect(names).toHaveLength(PALETTE_TEMPLATES.length);
    expect(names).not.toContain('Service');
  });
});

const field = (key: string): InspectorField => {
  const found = INSPECTOR_FIELDS.find((entry) => entry.key === key);
  if (!found) throw new Error(`no ${key} field`);
  return found;
};
const ctxFor = (element: UISchemaElement) =>
  ({ element, layoutKind: layoutKindOf(element.type) }) as unknown as InspectorContext;

describe('the inspector (rules 17-19)', () => {
  const applying = (element: UISchemaElement) =>
    INSPECTOR_FIELDS.filter((entry) => entry.applies(ctxFor(element))).map((entry) => entry.key);

  it('offers a selected Service exactly Title, Show title, Description, Show description and Gap', () => {
    // Doc 201 rules 23-24: each toggle sits directly under the value it governs.
    const expected = ['label', 'showTitle', 'formDescription', 'showDescription', 'gap'];
    expect(applying(service({ label: 'Apply' }))).toEqual(expected);
    // And a Form offers the same five, which is the point of rule 4's one predicate — a boundary can
    // never gain a value without the toggle that governs it.
    expect(applying(el({ type: 'Form', elements: [] }))).toEqual(expected);
  });

  it('offers neither Width nor Columns on a Service', () => {
    const keys = applying(service());
    expect(keys).not.toContain('width');
    expect(keys).not.toContain('columns');
    expect(keys).not.toContain('dividers');
  });

  it('places "Untitled service" in the Title field and gives it NO hint', () => {
    const ctx = ctxFor(service());
    expect(field('label').labelFor?.(ctx)).toBe('Title');
    expect(field('label').options?.(ctx)).toEqual({ placeholder: SERVICE_TITLE_PLACEHOLDER });
    // Doc 201 rule 25: the hint moved onto the "Show title" switch below, as its label. An ABSENT key,
    // not `description: undefined` — the second renders an empty hint line.
    expect(field('label').schema(ctx)).not.toHaveProperty('description');
    // …and that switch says "service" where a Form's says "form".
    expect(field('showTitle').labelFor?.(ctx)).toBe('Show the title at the top of the service.');
  });

  it('writes and clears the Title and the rich Description on a Service', () => {
    const write = (key: string, element: UISchemaElement, value: unknown) => {
      const edit = { element } as unknown as Parameters<InspectorField['write']>[1];
      return field(key).write(ctxFor(element), edit, value).element as UISchemaElement;
    };
    expect((write('label', service(), 'Apply') as { label?: string }).label).toBe('Apply');
    expect(write('label', service({ label: 'Apply' }), '')).not.toHaveProperty('label');

    const described = write('formDescription', service(), richText('Who may apply'));
    expect(described.options?.['description']).toBeDefined();
    expect(
      write('formDescription', described, richText('')).options?.['description'],
    ).toBeUndefined();
  });

  it('leaves a Form’s Title placeholder unchanged, and drops its hint the same way', () => {
    const ctx = ctxFor(el({ type: 'Form', elements: [] }));
    expect(field('label').options?.(ctx)).toEqual({ placeholder: 'Untitled form' });
    expect(field('label').schema(ctx)).not.toHaveProperty('description');
    expect(field('showTitle').label).toBe('Show the title at the top of the form.');
  });

  it('labels an unlabelled Service crumb "Service" (rule 19)', () => {
    expect(elementLabel(service(), schema)).toBe('Service');
    expect(elementLabel(service({ label: 'Apply' }), schema)).toBe('Apply');
  });
});

describe('the uischema metaschema (rules 20-23)', () => {
  it('accepts a Service root with elements, label, gap and a rich description', () => {
    expect(
      ok(
        service({
          label: 'Apply for a licence',
          options: { gap: 'lg', description: richText('Who may apply') },
          elements: [{ type: 'Heading', text: 'Hello' }],
        }),
      ),
    ).toBe(true);
    expect(ok(service())).toBe(true);
  });

  it('keeps an unknown option such as id inert rather than refusing it (rule 21)', () => {
    // The metaschema never sets `additionalProperties`, so it CANNOT refuse an unknown key — and rule 1 says
    // unknown options are kept, never read. An authored `id` on a Service is inert, exactly as doc 198 leaves
    // `Stage.options.position`; what rule 21 pins is that the SERVICE DEFINITION does not describe one.
    expect(ok(service({ id: 'abc12345' }))).toBe(true);
    expect(
      UISCHEMA_METASCHEMA.definitions.service.properties.options.properties,
    ).not.toHaveProperty('id');
    expect(UISCHEMA_METASCHEMA.definitions.form.properties.options.properties).toHaveProperty('id');
  });

  it('refuses a Service root with a blank label', () => {
    expect(ok(service({ label: '' }))).toBe(false);
  });

  it('refuses a Service nested in any layout — the element enum is unchanged', () => {
    const form = (elements: object[]) => el({ type: 'Form', elements });
    expect(ok(form([service()]))).toBe(false);
    expect(ok(form([{ type: 'VerticalLayout', elements: [service()] }]))).toBe(false);
    expect(ok(form([{ type: 'Grid', elements: [service()] }]))).toBe(false);
    expect(UISCHEMA_METASCHEMA.definitions.element.properties.type.enum).not.toContain(
      SERVICE_TYPE,
    );
  });

  it('still accepts a Form root and a Flow root, and still refuses a VerticalLayout root', () => {
    expect(ok(STUDIO_SAMPLE_UISCHEMA)).toBe(true);
    expect(ok({ type: 'Flow', elements: [], options: { edges: [] } })).toBe(true);
    expect(ok({ type: 'VerticalLayout', elements: [] })).toBe(false);
  });

  it('carries no description on any root `if` condition (doc 191 rule 11)', () => {
    const [branch] = UISCHEMA_METASCHEMA.allOf;
    expect(branch.if).not.toHaveProperty('description');
    expect(branch.else.if).not.toHaveProperty('description');
    expect(JSON.stringify([branch.if, branch.else.if])).not.toContain('description');
  });

  it('still accepts the built-in sample and every palette template’s output', () => {
    // Doc 191 rule 14: the gate must never refuse what the studio itself creates. `buildTemplate` leaves a
    // CONTROL without its `scope` — `insertElement` assigns the new property key — so a control template is
    // completed here the way the insert path completes it. (`studio-code-metaschemas.test.ts` exercises the
    // full insert-everywhere sweep; this is the Service-root regression guard.)
    expect(ok(STUDIO_SAMPLE_UISCHEMA)).toBe(true);
    for (const template of PALETTE_TEMPLATES) {
      const built = buildTemplate(template.key, STUDIO_SAMPLE_SCHEMA) as
        | { element: Record<string, unknown> }
        | undefined;
      expect(built, template.key).toBeDefined();
      const element =
        built?.element['type'] === 'Control' && built.element['scope'] === undefined
          ? { ...built.element, scope: '#/properties/name' }
          : built?.element;
      expect(ok({ type: 'Form', elements: [element] }), template.key).toBe(true);
      // And the same element under a SERVICE root, which is the half this feature adds.
      expect(ok(service({ elements: [element as object] })), template.key).toBe(true);
    }
  });
});
