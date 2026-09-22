import { LAYOUT_GAPS } from '../../../renderers/gridstack/layout-gap';
import { SECTION_INSETS, SECTION_VARIANTS } from '../../../renderers/gridstack/section-options';
import { deepFreeze } from './deep-freeze';
import { FLOW_DEFINITIONS } from './flow-metaschema';

// The Form Studio uischema metaschema (doc 191 rule 13). Per-type keys live in `if`/`then` branches on `type`, so
// completion offers `text` only inside a Heading, `scope` only inside a Control, and so on.

const ELEMENTS = {
  description: 'The child elements, in order.',
  type: 'array',
  items: { $ref: '#/definitions/element' },
} as const;

// Doc 194 rule 12: a row's children are any element but a Separator, which would take one of its columns.
// Doc 212 rule 5: nor a Section — it sits in vertical contexts only, and the metaschema restates the runtime rule
// so the code editor refuses what a drag would refuse.
const ROW_ELEMENTS = {
  description:
    'The child elements, in order. A Separator is not allowed in a row: set options.dividers instead. A Section is not allowed in a row either.',
  type: 'array',
  items: {
    allOf: [
      { $ref: '#/definitions/element' },
      { not: { properties: { type: { const: 'Separator' } }, required: ['type'] } },
      { not: { properties: { type: { const: 'Section' } }, required: ['type'] } },
    ],
  },
} as const;

/**
 * Doc 212 rules 4-5: a Grid's cells take any element but a Section, for the same reason a row does — a Section is
 * a vertical division of a page, and the runtime gate (`allowedInLayout`) refuses it in both. Stated separately
 * from `ROW_ELEMENTS` so a row keeps its own Separator wording.
 */
const GRID_ELEMENTS = {
  description: 'The child elements, in order. A Section is not allowed in a grid.',
  type: 'array',
  items: {
    allOf: [
      { $ref: '#/definitions/element' },
      { not: { properties: { type: { const: 'Section' } }, required: ['type'] } },
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

// Doc 207 rules 17-20. `content` is a Lexical editor state: an object with a `root`. Described loosely on
// purpose — the node shapes are Lexical's to define, and pinning them here would refuse valid documents
// whenever Lexical adds a node type.
const RICH_CONTENT = whenType('RichContent', {
  properties: {
    content: {
      description: 'The rich content, as a Lexical editor state. Absent content renders nothing.',
      type: 'object',
      required: ['root'],
      properties: { root: { description: 'The editor state root node.', type: 'object' } },
    },
  },
});

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
    elements: GRID_ELEMENTS,
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

// Doc 212 rules 1-3, 13-16: a titled division inside a page. Its `elements` are a VerticalLayout's, because it IS
// one — the type only adds the heading, the description and the box.
const SECTION = whenType('Section', {
  required: ['elements'],
  properties: {
    elements: ELEMENTS,
    options: {
      description: 'Section options.',
      type: 'object',
      properties: {
        gap: GAP,
        variant: {
          description:
            'plain (default) draws no box; container draws a bordered, grey panel around the section.',
          enum: SECTION_VARIANTS,
        },
        inset: {
          description:
            "The container's padding: xs 0.25rem, sm 0.5rem, md 1rem, lg 1.5rem (default), xl 2rem. Read only when variant is container.",
          enum: SECTION_INSETS,
        },
        // Doc 207's shape, verbatim: rich content, never a plain string. Accepting both would let an author
        // save a description that renders nothing.
        description: {
          description:
            'A description shown under the section heading, as a Lexical editor state. Rich content, not plain text.',
          type: 'object',
          required: ['root'],
          properties: { root: { description: 'The editor state root node.', type: 'object' } },
        },
      },
    },
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
            '"radio-group" for oneOf choices, "checkbox" or "switch" for booleans, and "combobox" or ' +
            '"checkbox-group" for an array of choices.',
          enum: [
            'input',
            'textarea',
            'number',
            'combobox',
            'radio-group',
            'checkbox',
            'switch',
            'checkbox-group',
          ],
        },
        placeholder: { description: 'Placeholder text.', type: 'string', minLength: 1 },
        // Doc 204 rule 25: the Text field's mask and the Number field's precision. This block is what drives
        // Monaco's completion AND the apply gate, so an option missing here is an option with no hover text.
        mask: {
          description:
            'Format a text field as it is typed: "9" a digit, "a" a letter, "*" either, and "{n,m}" a ' +
            'repeat, e.g. "(999) 999-9999". Replaces maxLength — the pattern is the length rule.',
          type: 'string',
          minLength: 1,
        },
        maskUnmasked: {
          description:
            'Store the characters typed rather than the masked text, e.g. "2505550123" instead of ' +
            '"(250) 555-0123". Only read when a mask is set.',
          type: 'boolean',
        },
        decimals: {
          description:
            'How many digits follow the decimal point, shown and enforced on submit. Use a whole-number ' +
            'field (schema type "integer") for no decimals at all.',
          type: 'integer',
          minimum: 0,
          maximum: 10,
        },
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
  // Doc 195 rule 17, doc 215 rule 20: the root is a Flow, a Service or a Form — a CHAIN, each `else` asking the next
  // question. No description on any `if` (doc 191 rule 11): Monaco's hover shows text from every `if` it evaluates,
  // matching or not.
  allOf: [
    {
      if: { properties: { type: { const: 'Flow' } }, required: ['type'] },
      // eslint-disable-next-line unicorn/no-thenable -- the JSON Schema draft-07 `then` keyword; never awaited
      then: { $ref: '#/definitions/flow' },
      else: {
        if: { properties: { type: { const: 'Service' } }, required: ['type'] },
        // eslint-disable-next-line unicorn/no-thenable -- the JSON Schema draft-07 `then` keyword; never awaited
        then: { $ref: '#/definitions/service' },
        else: { $ref: '#/definitions/form' },
      },
    },
  ],
  definitions: {
    // Doc 192 rule 11, doc 195 rule 17: a Form is the root or in a Stage, and `element` never lists one, so a Form in
    // any other layout is a problem.
    form: {
      description:
        'A studio form: the root, or one of the forms in a Stage. It renders like a VerticalLayout.',
      type: 'object',
      // Doc 201 rule 15, RELAXED (user request 2026-09-18): a Form's title is optional. A Stage's Forms are born
      // untitled and read as "Untitled form" until named, so the apply gate cannot demand one without refusing
      // documents the studio itself creates. A label that IS written must still say something (`minLength`).
      required: ['type', 'elements'],
      properties: {
        type: { description: 'Always "Form" — a studio form.', const: 'Form' },
        elements: ELEMENTS,
        label: {
          description: "The form's title, shown at the top of the form and in the element path.",
          type: 'string',
          // Absent is fine; present-but-blank is not. An emptied Title removes the key (rule 14), so nothing the
          // inspector writes can trip this — it catches a hand-authored `"label": ""`, which would read as titled
          // in the JSON and untitled everywhere else.
          minLength: 1,
        },
        rule: { $ref: '#/definitions/rule' },
        options: {
          description: 'Form options.',
          type: 'object',
          // Doc 197 rule 6: optional, unlike a Stage's id — documents authored before deep linking stay valid.
          properties: {
            gap: GAP,
            /**
             * Doc 207 rules 30-32 (superseding doc 201 rule 20): rich content, not a string. The gate
             * refuses a plain string on purpose — accepting both would let an author save a description
             * that renders nothing, which is the one outcome worse than refusing it.
             */
            description: {
              description:
                'A description shown under the form title, as a Lexical editor state. Rich content, not plain text.',
              type: 'object',
              required: ['root'],
              properties: { root: { description: 'The editor state root node.', type: 'object' } },
            },
            id: {
              description:
                'The id that addresses this form in a link. Unique among the forms of this document.',
              type: 'string',
              minLength: 1,
            },
          },
        },
      },
    },
    /**
     * Doc 215 rules 21-22: a Service is the form definition with its own `type` and NO `options.id` — a Service is
     * never a Flow node, so nothing addresses one. `element` lists neither Form nor Service, so a Service anywhere
     * but the root is a problem.
     */
    service: {
      description: 'A service: the root of a service document. It renders like a VerticalLayout.',
      type: 'object',
      required: ['type', 'elements'],
      properties: {
        type: { description: 'Always "Service" — a service.', const: 'Service' },
        elements: ELEMENTS,
        label: {
          description: "The service's title, shown at the top of the page and in the element path.",
          // Absent is fine; present-but-blank is not — a `""` reads as titled in the JSON and untitled everywhere
          // else. An emptied Title removes the key, so nothing the inspector writes can trip this.
          type: 'string',
          minLength: 1,
        },
        rule: { $ref: '#/definitions/rule' },
        options: {
          description: 'Service options.',
          type: 'object',
          properties: {
            gap: GAP,
            description: {
              description:
                'A description shown under the service title, as a Lexical editor state. Rich content, not plain text.',
              type: 'object',
              required: ['root'],
              properties: { root: { description: 'The editor state root node.', type: 'object' } },
            },
          },
        },
      },
    },
    ...FLOW_DEFINITIONS,
    element: {
      description: 'A uischema element.',
      type: 'object',
      required: ['type'],
      properties: {
        type: {
          description: 'The element kind.',
          enum: [
            'Grid',
            'VerticalLayout',
            'HorizontalLayout',
            'Control',
            'Heading',
            'Separator',
            'RichContent',
            'Section',
          ],
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
      allOf: [HEADING, RICH_CONTENT, GRID, VERTICAL_LAYOUT, HORIZONTAL_LAYOUT, SECTION, CONTROL],
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
