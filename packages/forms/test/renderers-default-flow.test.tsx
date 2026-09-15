import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers-default';

// Doc 195 rule 19 — Flow and Stage in fillable forms (renderers/default).

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

describe('renderers/default Flow and Stage (rule 19)', () => {
  it('renders a Flow root as role="status" "Flows can\'t be filled in yet." with no ReactFlow', () => {
    const { container } = renderDefault(FLOW);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent("Flows can't be filled in yet.");
    expect(status).toHaveAttribute('data-slot', 'flow-unsupported');
    expect(status).toHaveClass('text-sm', 'text-muted-foreground');
    expect(container.querySelector('.react-flow')).toBeNull();
    expect(screen.queryByText('One')).toBeNull();
  });

  it('renders a Stage as "A Stage can only be placed in a Flow."', () => {
    renderDefault({ type: 'VerticalLayout', elements: [FLOW.elements[0]] });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('A Stage can only be placed in a Flow.');
    expect(alert).toHaveAttribute('data-slot', 'stage-placement-error');
    expect(screen.queryByText('One')).toBeNull();
  });

  it('holds 6 layout entries, exactly one matching Flow and one matching Stage', () => {
    expect(defaults.layoutRenderers).toHaveLength(6);
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
