import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers-default';

// Doc 195 rule 19 as AMENDED by doc 202 rules 40-43, 46 — Flow and Stage in fillable forms (renderers/default).
// A Flow is no longer "can't be filled in yet": the entry renders the runner's stage sidebar and content pane.

const schema: JsonSchema = { type: 'object', properties: {} };
const testerContext = { rootSchema: schema, config: {} };
const renderers = () => [
  ...defaults.controlRenderers,
  ...defaults.displayRenderers,
  ...defaults.layoutRenderers,
];

const renderDefault = (uischema: object) =>
  render(
    <JsonForms
      schema={schema}
      uischema={uischema as UISchemaElement}
      data={{}}
      renderers={renderers()}
      cells={defaults.cells}
    />,
  );

const FLOW = {
  type: 'Flow',
  options: { edges: [{ id: 'e1', source: 's1', target: 's2' }] },
  elements: [
    {
      type: 'Stage',
      label: 'One',
      options: { id: 's1' },
      elements: [{ type: 'Form', elements: [] }],
    },
    {
      type: 'Stage',
      label: 'Two',
      options: { id: 's2' },
      elements: [{ type: 'Form', elements: [] }],
    },
  ],
};

describe('renderers/default Flow and Stage (rule 19, amended by doc 202)', () => {
  it('renders a fillable Flow — sidebar and one Form — with no ReactFlow (doc 202 rules 40, 46)', () => {
    const { container } = renderDefault(FLOW);
    // The old "Flows can't be filled in yet." status is gone entirely (rule 46).
    expect(screen.queryByRole('status')).toBeNull();
    expect(container.querySelector('[data-slot="flow-unsupported"]')).toBeNull();
    // Rule 40: with no port it still renders a navigable flow, holding its own position.
    expect(container.querySelector('[data-slot="fill-flow"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="runner-sidebar"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="runner-flow-content"]')).not.toBeNull();
    // The stages are listed by name, and it is still plain CSS — never the canvas.
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(container.querySelector('.react-flow')).toBeNull();
  });

  it('renders a Stage as "A Stage can only be placed in a Flow."', () => {
    renderDefault({ type: 'VerticalLayout', elements: [FLOW.elements[0]] });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('A Stage can only be placed in a Flow.');
    expect(alert).toHaveAttribute('data-slot', 'stage-placement-error');
    expect(screen.queryByText('One')).toBeNull();
  });

  it('holds 10 layout entries, exactly one matching Flow and one matching Stage', () => {
    // 6 before doc 212's Section.
    // 7 until doc 215 added Service.
    expect(defaults.layoutRenderers).toHaveLength(10); // doc 216: +2 for Tabs and TabContentContent
    for (const type of ['Flow', 'Stage']) {
      const matching = renderers().filter(
        (entry) => entry.tester({ type }, schema, testerContext) > 0,
      );
      expect(matching, type).toHaveLength(1);
    }
  });

  it('imports neither @xyflow/react nor any non-pure renderers/xyflow module', () => {
    const directory = resolve(import.meta.dirname, '../src/renderers/default');
    const files = readdirSync(directory);
    expect(files).toContain('fill-flow.tsx');
    for (const file of files) {
      const source = readFileSync(resolve(directory, file), 'utf8');
      expect(source, file).not.toMatch(/from ['"]@xyflow\//);
      expect(source, file).not.toMatch(
        /from ['"][^'"]*xyflow\/(index|flow-renderer|stage-node|stage-renderer|flow-context|flow-nodes)['"]/,
      );
    }
    expect(readFileSync(resolve(directory, 'fill-flow.tsx'), 'utf8')).toMatch(
      /from ['"]\.\.\/xyflow\/flow-elements['"]/,
    );
  });
});
