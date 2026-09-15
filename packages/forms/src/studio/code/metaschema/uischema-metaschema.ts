import { LAYOUT_GAPS } from '../../../renderers/gridstack/layout-gap';
import { deepFreeze } from './deep-freeze';

// The Form Studio uischema metaschema (doc 191 rule 13). Per-type keys live in `if`/`then` branches on `type`, so
// completion offers `text` only inside a Heading, `scope` only inside a Control, and so on.

const ELEMENTS = {
  description: 'The child elements, in order.',
  type: 'array',
  items: { $ref: '#/definitions/element' },
} as const;

// Doc 194 rule 12: a row's children are any element but a Separator, which would take one of its columns.
const ROW_ELEMENTS = {
  description:
    'The child elements, in order. A Separator is not allowed in a row: set options.dividers instead.',
  type: 'array',
  items: {
    allOf: [
      { $ref: '#/definitions/element' },
      { not: { properties: { type: { const: 'Separator' } }, required: ['type'] } },
    ],
  },
} as const;

const positiveNumber = (description: string) =>
  ({ description, type: 'number', exclusiveMinimum: 0 }) as const;

// Doc 193 rule 16: the same gap scale the renderers and the inspector read.
const GAP = {
  description:
    "Space between this layout's children: none 0, xs 0.25rem, sm 0.5rem, md 1rem (default), lg 1.5rem, xl 2rem.",
  enum: LAYOUT_GAPS,
} as const;

const whenType = <T extends object>(type: string, then: T) =>
  ({
    // No description here: Monaco shows hover text from every `if` it evaluates, matching or not, so a description on
    // the condition would label every element's "type" with the first branch's text.
    if: { properties: { type: { const: type } }, required: ['type'] },
    // eslint-disable-next-line unicorn/no-thenable -- the JSON Schema draft-07 `then` keyword; never awaited
    then,
  }) as const;

const HEADING = whenType('Heading', {
  required: ['text'],
  properties: {
    text: { description: 'The heading text. Empty text renders nothing.', type: 'string' },
    options: {
      description: 'Heading options.',
      type: 'object',
      properties: {
        level: {
          description: 'The element: 1 renders <h1> … 6 renders <h6>.',
          type: 'integer',
          minimum: 1,
          maximum: 6,
        },
        size: {
          description: 'The visual size, independent of level: 1 largest … 6 smallest.',
          type: 'integer',
          minimum: 1,
          maximum: 6,
        },
      },
    },
  },
});

const GRID = whenType('Grid', {
  required: ['elements'],
  properties: {
    elements: ELEMENTS,
    options: {
      description: 'Grid options. Children are placed with options.gridItem.',
      type: 'object',
      properties: {
        column: { description: 'The number of columns.', type: 'integer', minimum: 1, maximum: 12 },
        cellHeight: {
          description: 'The height of one row, e.g. "1rem" or 16.',
          type: ['number', 'string'],
        },
        gap: GAP,
        float: { description: 'Let items float up into empty rows.', type: 'boolean' },
        minRow: { description: 'The fewest rows the grid shows.', type: 'integer', minimum: 0 },
        maxRow: {
          description: 'The most rows the grid may grow to (0 = unlimited).',
          type: 'integer',
          minimum: 0,
        },
      },
    },
  },
});

const VERTICAL_LAYOUT = whenType('VerticalLayout', {
  required: ['elements'],
  properties: {
    elements: ELEMENTS,
    options: { description: 'Column options.', type: 'object', properties: { gap: GAP } },
  },
});

const HORIZONTAL_LAYOUT = whenType('HorizontalLayout', {
  required: ['elements'],
  properties: {
    elements: ROW_ELEMENTS,
    options: {
      description: 'Row options. A child sets its width with options.gridItem.w.',
      type: 'object',
      properties: {
        columns: {
          description: 'The number of columns in the row.',
          type: 'integer',
          minimum: 2,
          maximum: 6,
        },
        gap: GAP,
        dividers: {
          description:
            'Draw a vertical rule between the children (not on narrow screens, where they stack).',
          type: 'boolean',
        },
      },
    },
  },
});

const CONTROL = whenType('Control', {
  required: ['scope'],
  properties: {
    scope: {
      description: 'The schema property this field binds to: "#/properties/<key>".',
      type: 'string',
      pattern: '^#/properties/[^/]+$',
    },
    options: {
      description: 'Field options.',
      type: 'object',
      properties: {
        component: {
          description:
            'The control to render: "input" or "textarea" for strings, "number" for numbers, "combobox" or ' +
            '"radio-group" for oneOf choices, "checkbox" or "switch" for booleans.',
          enum: ['input', 'textarea', 'number', 'combobox', 'radio-group', 'checkbox', 'switch'],
        },
        placeholder: { description: 'Placeholder text.', type: 'string', minLength: 1 },
        orientation: {
          description: 'Put the label beside the input instead of above it.',
          const: 'horizontal',
        },
        size: { description: 'The switch size.', enum: ['sm', 'default'] },
        step: positiveNumber('The number input step. Wins over the schema multipleOf.'),
        smallStep: positiveNumber('The step with Alt held.'),
        largeStep: positiveNumber('The step with Shift held.'),
        allowWheelScrub: {
          description: 'Change the number with the mouse wheel.',
          type: 'boolean',
        },
        snapOnStep: { description: 'Snap typed numbers to the step.', type: 'boolean' },
        readonly: { description: 'Show the value without allowing changes.', type: 'boolean' },
        locale: {
          description: 'The number format locale, e.g. "en-CA".',
          type: 'string',
          minLength: 1,
        },
        format: {
          description:
            'Intl.NumberFormat options, e.g. { "style": "currency", "currency": "CAD" }.',
          type: 'object',
        },
      },
    },
  },
});

const intAtLeast = (minimum: number, description: string) =>
  ({ description, type: 'integer', minimum }) as const;
const flag = (description: string) => ({ description, type: 'boolean' }) as const;

export const UISCHEMA_METASCHEMA = deepFreeze({
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Form Studio uischema',
  description: 'The layout of a Form Studio form.',
  allOf: [{ $ref: '#/definitions/form' }],
  definitions: {
    // Doc 192 rule 11: the root is always a Form, and `element` never lists one, so a nested Form is a problem.
    form: {
      description:
        'The root of a studio form. It renders like a VerticalLayout and is allowed only here.',
      type: 'object',
      required: ['type', 'elements'],
      properties: {
        type: { description: 'Always "Form" — the root element of a studio form.', const: 'Form' },
        elements: ELEMENTS,
        label: { description: 'A name for the form, shown in the element path.', type: 'string' },
        rule: { $ref: '#/definitions/rule' },
        options: { description: 'Form options.', type: 'object', properties: { gap: GAP } },
      },
    },
    element: {
      description: 'A uischema element.',
      type: 'object',
      required: ['type'],
      properties: {
        type: {
          description: 'The element kind.',
          enum: ['Grid', 'VerticalLayout', 'HorizontalLayout', 'Control', 'Heading', 'Separator'],
        },
        label: {
          description:
            'A name for the element; on a Control it replaces the schema title, and false hides it.',
          type: ['string', 'boolean'],
        },
        rule: { $ref: '#/definitions/rule' },
        options: {
          description: 'Element options.',
          type: 'object',
          properties: { gridItem: { $ref: '#/definitions/gridItem' } },
        },
      },
      allOf: [HEADING, GRID, VERTICAL_LAYOUT, HORIZONTAL_LAYOUT, CONTROL],
    },
    gridItem: {
      description:
        'Placement inside the parent. A Grid reads every key; a HorizontalLayout reads only w; a VerticalLayout none.',
      type: 'object',
      properties: {
        x: intAtLeast(0, 'The column the item starts at.'),
        y: intAtLeast(0, 'The row the item starts at.'),
        w: intAtLeast(1, 'The width in columns.'),
        h: intAtLeast(1, 'The height in rows.'),
        minW: intAtLeast(1, 'The narrowest the item may be resized to.'),
        maxW: intAtLeast(1, 'The widest the item may be resized to.'),
        minH: intAtLeast(1, 'The shortest the item may be resized to.'),
        maxH: intAtLeast(1, 'The tallest the item may be resized to.'),
        noMove: flag('Prevent dragging the item.'),
        noResize: flag('Prevent resizing the item.'),
        locked: flag('Keep other items from moving this one.'),
      },
    },
    rule: {
      description: 'Show, hide, enable or disable the element when a condition holds.',
      type: 'object',
      required: ['effect', 'condition'],
      properties: {
        effect: {
          description: 'What happens when the condition holds.',
          enum: ['HIDE', 'SHOW', 'ENABLE', 'DISABLE'],
        },
        condition: {
          description:
            'The condition, e.g. { "scope": "#/properties/<key>", "schema": { "const": true } }.',
          type: 'object',
        },
      },
    },
  },
} as const);
