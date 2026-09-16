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
      'A branching node of a Flow (doc 199): each criterion owns one output, and an answer matching none takes the default path. Allowed only in a Flow, and it holds no elements.',
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
        required: ['id', 'criteria'],
        properties: {
          id: nonEmptyString('The id edges use to connect this condition. Unique in the Flow.'),
          criteria: {
            description:
              'The branches, in order. Each owns one output, addressed by an edge sourceHandle.',
            type: 'array',
            items: {
              description: 'One branch: a field, an operator and the value to compare it with.',
              type: 'object',
              required: ['id', 'field', 'operator'],
              properties: {
                id: nonEmptyString(
                  'The criterion id, unique in this condition. An edge names it as its sourceHandle.',
                ),
                field: nonEmptyString(
                  'The schema property key this criterion tests. It must be answerable before this condition.',
                ),
                operator: {
                  description:
                    "What the criterion tests. Which operators a field may use follows its kind: text takes contains, numbers take the comparisons, and booleans take only isTrue and isFalse. The operators ending in 'Empty', isTrue and isFalse take no value.",
                  enum: [
                    'equals',
                    'notEquals',
                    'contains',
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
                    'The value to compare with, of the field’s own type. Absent for an operator that needs none.',
                  type: ['string', 'number', 'boolean'],
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
        'The id of the criterion this edge leaves by, when it leaves a Condition. An edge with no sourceHandle is the default path.',
      ),
    },
  },
} as const;
