import type { DocumentContent, Uischema } from '../src/studio/document-types';

export const ITEM = '#/properties/people/items/properties';

/** A Form with a page field `name` (layout P) and a record over `people` whose item form `L` holds `first`. */
export function recordContent(
  extra: { variants?: Record<string, Uischema>; rule?: Record<string, unknown> } = {},
): DocumentContent {
  return {
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        people: {
          type: 'array',
          title: 'People',
          items: {
            type: 'object',
            properties: { first: { type: 'string', title: 'First' } },
            required: ['first'],
          },
        },
      },
      required: ['name'],
    },
    variants: {
      default: {
        id: 'F',
        type: 'Form',
        elements: [
          { id: 'n', type: 'Control', scope: '#/properties/name' },
          {
            id: 'r',
            type: 'Control',
            scope: '#/properties/people',
            options: { component: 'record' },
            elements: [
              {
                id: 'L',
                type: 'VerticalLayout',
                elements: [{ id: 'f', type: 'Control', scope: `${ITEM}/first` }],
              },
            ],
          },
          { id: 'P', type: 'VerticalLayout', elements: [] },
          ...(extra.rule === undefined
            ? []
            : [{ id: 'h', type: 'Heading', options: { text: 'x' }, rule: extra.rule }]),
        ],
      },
      ...extra.variants,
    },
  } as DocumentContent;
}

export const props = (c: DocumentContent) =>
  c.schema['properties'] as Record<string, Record<string, unknown>>;
export const items = (c: DocumentContent) =>
  props(c)['people']!['items'] as Record<string, unknown>;
export const itemProps = (c: DocumentContent) => items(c)['properties'] as Record<string, unknown>;
