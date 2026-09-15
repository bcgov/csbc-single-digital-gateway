import { deepFreeze } from './deep-freeze';

/**
 * The studio profile of JSON Schema (doc 191 rule 12): the keywords the Form Studio's controls read, each with hover
 * docs. Unknown keywords stay allowed — they are neither suggested nor flagged. Registered with Monaco for completion
 * and markers, and compiled by the apply gate, so a marker-free schema pane is exactly an appliable one.
 */
export const SCHEMA_METASCHEMA = deepFreeze({
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Form Studio schema',
  description: 'The data schema of a Form Studio form: one property per field.',
  type: 'object',
  properties: {
    type: {
      description: 'Always "object" — a form stores its fields as the properties of one object.',
      const: 'object',
    },
    title: { description: 'A name for the form.', type: 'string' },
    description: { description: 'A longer explanation of the form.', type: 'string' },
    properties: {
      description:
        'The form fields, keyed by property name. A uischema Control binds to one with "scope": "#/properties/<key>".',
      type: 'object',
      additionalProperties: { $ref: '#/definitions/property' },
    },
    required: {
      description: 'Property names that must have a value before the form is valid.',
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true,
    },
  },
  definitions: {
    property: {
      description: 'A form field.',
      type: 'object',
      properties: {
        type: {
          description:
            'The kind of value. "string" renders a text input or textarea, "number" a number input, "boolean" a ' +
            'checkbox or switch; a "oneOf" list renders a combobox or radio group. "integer" is not rendered.',
          enum: ['string', 'number', 'boolean'],
        },
        title: { description: "The field's label.", type: 'string' },
        description: { description: 'Help text shown under the field.', type: 'string' },
        default: { description: 'The value the field starts with.' },
        maxLength: {
          description:
            'The most characters a string may have; shows an "n/max" counter under the field.',
          type: 'integer',
          minimum: 0,
        },
        minimum: { description: 'The smallest number allowed.', type: 'number' },
        maximum: { description: 'The largest number allowed.', type: 'number' },
        multipleOf: {
          description: 'Numbers must be a multiple of this; also the step of the number input.',
          type: 'number',
          exclusiveMinimum: 0,
        },
        oneOf: {
          description:
            'The choices of a choice field, in order. Each "const" must match the field "type".',
          type: 'array',
          minItems: 1,
          items: { $ref: '#/definitions/choice' },
        },
      },
    },
    choice: {
      description: 'One choice of a choice field.',
      type: 'object',
      required: ['const'],
      properties: {
        const: {
          description: 'The value stored when this choice is picked.',
          type: ['string', 'number'],
        },
        title: { description: 'The text shown for this choice.', type: 'string' },
      },
    },
  },
} as const);
