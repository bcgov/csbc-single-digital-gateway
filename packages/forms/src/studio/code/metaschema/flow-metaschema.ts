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
        description: 'The Stages, in order. A Flow holds only Stages.',
        type: 'array',
        items: { $ref: '#/definitions/stage' },
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
  edge: {
    description: 'A connection from one Stage to another.',
    type: 'object',
    required: ['id', 'source', 'target'],
    properties: {
      id: nonEmptyString('The edge id, unique in the Flow.'),
      source: nonEmptyString('The id of the Stage the edge leaves.'),
      target: nonEmptyString('The id of the Stage the edge enters.'),
    },
  },
} as const;
