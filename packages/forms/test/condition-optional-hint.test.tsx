import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  decisionFieldHint,
  optionalDecisionFields,
  type CriterionField,
} from '../src/renderers/xyflow/criteria';
import { FormStudio } from '../src/studio';
import type { Clause } from '../src/types/elements';
import { useXyflowJsdom } from './xyflow-jsdom';

// Doc 199 rule 34 — a Condition card hints when a field it decides on may be left blank, which silently follows
// Otherwise.

useXyflowJsdom();

const fields: CriterionField[] = [
  { key: 'kind', label: 'Applying as', kind: 'choice', options: [] },
  { key: 'notes', label: 'Notes', kind: 'text' },
  { key: 'inspect', label: 'Needs inspection', kind: 'boolean' },
];
const criterion = (field: string, operator: Clause['operator'], id = `c-${field}-${operator}`) =>
  ({ id, field, operator, value: 'x' }) as Clause;

describe('optionalDecisionFields', () => {
  it('lists an optional field once, however many criteria name it', () => {
    const listed = optionalDecisionFields(
      [criterion('kind', 'equals', 'a'), criterion('kind', 'equals', 'b')],
      fields,
      new Set(),
    );
    expect(listed.map((field) => field.key)).toEqual(['kind']);
  });

  it('skips a required field', () => {
    expect(
      optionalDecisionFields([criterion('kind', 'equals')], fields, new Set(['kind'])),
    ).toEqual([]);
  });

  it('skips a boolean — an unticked box is the "no" answer', () => {
    expect(optionalDecisionFields([criterion('inspect', 'isTrue')], fields, new Set())).toEqual([]);
  });

  it.each(['isEmpty', 'isNotEmpty'] as const)(
    'skips a field whose criteria test for blank with %s — blank is handled on purpose',
    (operator) => {
      expect(
        optionalDecisionFields(
          [criterion('notes', 'equals'), criterion('notes', operator)],
          fields,
          new Set(),
        ),
      ).toEqual([]);
    },
  );

  it('skips a field the Condition cannot resolve (criterionProblems reports it)', () => {
    expect(optionalDecisionFields([criterion('gone', 'equals')], fields, new Set())).toEqual([]);
  });
});

const flow = (schemaRequired: string[]) => {
  const schema: JsonSchema = {
    type: 'object',
    properties: {
      kind: {
        type: 'string',
        title: 'Applying as',
        oneOf: [
          { const: 'person', title: 'A person' },
          { const: 'biz', title: 'A business' },
        ],
      },
    },
    required: schemaRequired,
  };
  const uischema = {
    type: 'Flow',
    options: {
      edges: [
        { id: 'e1', source: 's1', target: 'c1' },
        { id: 'e2', source: 'c1', target: 's2' },
      ],
    },
    elements: [
      {
        type: 'Stage',
        label: 'Applicant',
        options: { id: 's1' },
        elements: [
          {
            type: 'Form',
            options: { id: 'f1' },
            elements: [{ type: 'Control', scope: '#/properties/kind', label: 'Applying as' }],
          },
        ],
      },
      {
        type: 'Condition',
        label: 'Type',
        options: {
          id: 'c1',
          rows: [
            {
              id: 'k1',
              label: 'Condition 1',
              match: 'all',
              clauses: [{ id: 'k1-clause', field: 'kind', operator: 'equals', value: 'biz' }],
            },
          ],
        },
      },
      {
        type: 'Stage',
        label: 'Review',
        options: { id: 's2' },
        elements: [{ type: 'Form', options: { id: 'f2' }, elements: [] }],
      },
    ],
  } as unknown as UISchemaElement;
  return render(<FormStudio schema={schema} uischema={uischema} />);
};

const hints = () => [...document.querySelectorAll('[data-slot="condition-optional-field-hint"]')];

describe('the Condition card hint', () => {
  it('shows on the card when the decided field is optional', async () => {
    flow([]);
    await waitFor(() => expect(hints()).toHaveLength(1));
    // An icon in the criterion row (so the card never grows), named by the whole hint.
    expect(hints()[0]).toHaveAttribute('aria-label', decisionFieldHint('Applying as'));
    expect(hints()[0]?.closest('[data-slot="condition-criterion-row"]')).not.toBeNull();
    expect(
      screen.getByRole('button', {
        name: 'Applying as is optional. Leaving it blank follows Otherwise.',
      }),
    ).toBeInTheDocument();
  });

  it('is absent once the field is required', async () => {
    flow(['kind']);
    // Guard: the card has rendered its criterion row, so the absence is real.
    await waitFor(() =>
      expect(document.querySelector('[data-slot="condition-criterion-row"]')).not.toBeNull(),
    );
    expect(hints()).toHaveLength(0);
  });
});
