import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers-default';
import { FormRunner } from '../src/runner/form-runner';

// Doc 184 rule 17b — fillable layouts query the `fill-page` CONTAINER, declared once at the outermost fillable root.
// jsdom evaluates no container queries, so these assert the structure the queries rely on: exactly one container,
// and it encloses everything that queries it. What the queries DO at a given width is verified in a browser.

const schema: JsonSchema = { type: 'object', properties: { name: { type: 'string' } } };
const el = (element: object) => element as UISchemaElement;

const FORM = el({
  type: 'Form',
  label: 'Contact',
  elements: [
    { type: 'HorizontalLayout', elements: [{ type: 'Control', scope: '#/properties/name' }] },
  ],
});
const FLOW = el({
  type: 'Flow',
  options: { edges: [{ id: 'e1', source: 's1', target: 's2' }] },
  elements: [
    { type: 'Stage', label: 'One', options: { id: 's1' }, elements: [FORM] },
    { type: 'Stage', label: 'Two', options: { id: 's2' }, elements: [FORM] },
  ],
});

const renderers = [
  ...defaults.controlRenderers,
  ...defaults.displayRenderers,
  ...defaults.layoutRenderers,
];
const renderBare = (uischema: UISchemaElement) =>
  render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={{}}
      renderers={renderers}
      cells={defaults.cells}
    />,
  );
const renderRunner = (uischema: UISchemaElement) =>
  render(<FormRunner schema={schema} uischema={uischema} data={{}} onChange={() => {}} />);

const pages = (container: HTMLElement) => [
  ...container.querySelectorAll('[data-slot="fill-page"]'),
];

/** The single container, asserted to be the only one and to enclose every element that queries it. */
function onlyPage(container: HTMLElement) {
  const found = pages(container);
  expect(found).toHaveLength(1);
  const page = found[0] as HTMLElement;
  expect(page).toHaveClass('@container/fill-page');
  const queriers = [...container.querySelectorAll('[class*="/fill-page:"]')];
  // Guard: proves the enclosure check below is not vacuously true over an empty list.
  expect(queriers.length).toBeGreaterThan(0);
  for (const querier of queriers) expect(page.contains(querier)).toBe(true);
  return page;
}

describe('the fill-page container (doc 184 rule 17b)', () => {
  it('a bare Form declares it, enclosing both the title and the layout', async () => {
    const { container } = renderBare(FORM);
    await act(async () => {});
    const page = onlyPage(container);
    expect(page.querySelector('[data-slot="form-title"]')).not.toBeNull();
  });

  it('a bare Flow declares it once — the Form inside it does not declare another', async () => {
    const { container } = renderBare(FLOW);
    await act(async () => {});
    const page = onlyPage(container);
    expect(page.querySelector('[data-slot="runner-sidebar"]')).not.toBeNull();
  });

  it.each([
    ['Form', FORM],
    ['Flow', FLOW],
  ])(
    'the runner declares it around a %s, so its rail and the content share one page',
    async (_, root) => {
      const { container } = renderRunner(root);
      await act(async () => {});
      const page = onlyPage(container);
      // The runner is INSIDE its own container, so the rail's query measures the whole runner.
      expect(page.firstElementChild).toHaveAttribute('data-slot', 'form-runner');
      expect(page).toHaveClass('h-full', 'min-h-0');
    },
  );
});
