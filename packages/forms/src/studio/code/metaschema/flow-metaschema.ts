// The Flow, Stage and edge definitions of the Form Studio uischema metaschema (doc 195 rule 17), kept apart from
// uischema-metaschema.ts so neither file passes 300 lines. They refer to `#/definitions/form` and `#/definitions/rule`,
// which uischema-metaschema.ts defines alongside them.

const nonEmptyString = (description: string) =>
  ({ description, type: 'string', minLength: 1 }) as const;

export const FLOW_DEFINITIONS = {
  flow: {
    description:
      'The root of a multi-stage form: its Stages are drawn as nodes, connected by options.edges.',
    type: 'object',
    required: ['type', 'elements'],
    properties: {
      type: { description: 'Always "Flow" — the root of a multi-stage form.', const: 'Flow' },
      elements: {
        description:
          'The nodes of the flow, in order. A Flow holds only Stages and Conditions (doc 199).',
        type: 'array',
        items: {
          oneOf: [{ $ref: '#/definitions/stage' }, { $ref: '#/definitions/condition' }],
        },
      },
      label: { description: 'A name for the flow, shown in the element path.', type: 'string' },
      rule: { $ref: '#/definitions/rule' },
      options: {
        description: 'Flow options.',
        type: 'object',
        properties: {
          edges: {
            description:
              'The connections between Stages, by Stage id. Self-loops, repeated edges and cycles are not allowed.',
            type: 'array',
            items: { $ref: '#/definitions/edge' },
          },
          startId: nonEmptyString(
            'The id of the Stage the flow starts at. The first stage is used when it is absent.',
          ),
          review: {
            description:
              'Show a read-only review of the answers before Submit. Absent or false goes straight to Submit.',
            type: 'boolean',
          },
        },
      },
    },
  },
  stage: {
    description: "One stage of a Flow, holding that stage's Forms. Allowed only in a Flow.",
    type: 'object',
    required: ['type', 'elements', 'options'],
    properties: {
      type: { description: 'Always "Stage" — one stage of a Flow.', const: 'Stage' },
      elements: {
        description: 'The Forms of this stage, in order. A Stage holds only Forms.',
        type: 'array',
        items: { $ref: '#/definitions/form' },
      },
      label: {
        description: 'A name for the stage, shown on its card and in the element path.',
        type: 'string',
      },
      rule: { $ref: '#/definitions/rule' },
      options: {
        description: 'Stage options.',
        type: 'object',
        required: ['id'],
        properties: {
          id: nonEmptyString('The id edges use to connect this stage. Unique in the Flow.'),
          position: {
            description: 'Where the stage sits on the canvas. Placed automatically when absent.',
            type: 'object',
            required: ['x', 'y'],
            properties: {
              x: { description: 'The horizontal position, in pixels.', type: 'number' },
              y: { description: 'The vertical position, in pixels.', type: 'number' },
            },
          },
        },
      },
    },
  },
  condition: {
    description:
      'A branching node of a Flow (doc 199): each row owns one output, and an answer matching none takes the Else path. Allowed only in a Flow, and it holds no elements.',
    type: 'object',
    required: ['type', 'options'],
    properties: {
      type: { description: 'Always "Condition" — a branching node of a Flow.', const: 'Condition' },
      label: {
        description: 'A name for the condition, shown on its card and in the element path.',
        type: 'string',
      },
      rule: { $ref: '#/definitions/rule' },
      options: {
        description: 'Condition options.',
        type: 'object',
        required: ['id', 'rows'],
        properties: {
          id: nonEmptyString('The id edges use to connect this condition. Unique in the Flow.'),
          rows: {
            description:
              'The branches, in evaluation order: the first row whose clauses are satisfied wins. Each owns one output, addressed by an edge sourceHandle.',
            type: 'array',
            items: {
              description:
                'One branch: a label, how its clauses are joined, and the clauses themselves.',
              type: 'object',
              required: ['id', 'label', 'match', 'clauses'],
              properties: {
                id: nonEmptyString(
                  'The row id, unique in this condition. An edge names it as its sourceHandle.',
                ),
                label: nonEmptyString('The branch name, shown on the card and on its edge.'),
                match: {
                  description:
                    'Whether every clause must hold (all) or any one of them (any). A row with no clauses is never taken.',
                  enum: ['all', 'any'],
                },
                clauses: {
                  description: 'The tests this branch makes, at least one.',
                  type: 'array',
                  minItems: 1,
                  items: {
                    description: 'One test: a field, an operator and the value to compare it with.',
                    type: 'object',
                    required: ['id', 'field', 'operator'],
                    properties: {
                      id: nonEmptyString('The clause id, unique in this row.'),
                      field: nonEmptyString(
                        'The schema property key this clause tests. It must be answerable before this condition.',
                      ),
                      operator: {
                        description:
                          "What the clause tests. Which operators a field may use follows its kind: text takes contains, startsWith and endsWith, numbers take the comparisons, choices take in and notIn, and booleans take only isTrue and isFalse. The operators ending in 'Empty', isTrue and isFalse take no value; in and notIn take a list.",
                        enum: [
                          'equals',
                          'notEquals',
                          'contains',
                          'startsWith',
                          'endsWith',
                          'in',
                          'notIn',
                          'gt',
                          'gte',
                          'lt',
                          'lte',
                          'isEmpty',
                          'isNotEmpty',
                          'isTrue',
                          'isFalse',
                        ],
                      },
                      value: {
                        description:
                          'The value to compare with, of the field’s own type — a list of option values for in and notIn. Absent for an operator that needs none.',
                        oneOf: [
                          { type: ['string', 'number', 'boolean'] },
                          { type: 'array', items: { type: 'string' } },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          position: {
            description:
              'Ignored (doc 198): a node’s place on the canvas is derived from the edges, never authored.',
            type: 'object',
            required: ['x', 'y'],
            properties: {
              x: { description: 'The horizontal position, in pixels.', type: 'number' },
              y: { description: 'The vertical position, in pixels.', type: 'number' },
            },
          },
        },
      },
    },
  },
  edge: {
    description: 'A connection from one node of the Flow to another.',
    type: 'object',
    required: ['id', 'source', 'target'],
    properties: {
      id: nonEmptyString('The edge id, unique in the Flow.'),
      source: nonEmptyString('The id of the node the edge leaves.'),
      target: nonEmptyString('The id of the node the edge enters.'),
      sourceHandle: nonEmptyString(
        'The id of the row this edge leaves by, when it leaves a Condition. An edge with no sourceHandle is the Else path.',
      ),
    },
  },
} as const;
