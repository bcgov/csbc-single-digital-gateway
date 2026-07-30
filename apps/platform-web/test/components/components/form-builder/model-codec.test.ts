import { describe, expect, it } from 'vitest';
import { serializeModel, parseModel } from '@/components/form-builder/model-codec';
import type { FormModel } from '@/components/form-builder/model';

describe('Model Codec Component Test Suite', () => {
  it('successfully round-trips form title, description and basic control nodes', () => {
    const original: FormModel = {
      title: 'Sign Up',
      description: 'Create your account.',
      fields: [
        {
          kind: 'control',
          fieldType: 'text',
          key: 'user_name',
          label: 'Username',
          required: true,
          options: {},
        },
        {
          kind: 'control',
          fieldType: 'number',
          key: 'user_age',
          label: 'Age',
          required: false,
          options: {},
        },
      ],
    };

    const definition = serializeModel(original);

    // Verify serialized schema structure
    expect(definition.schema.title).toBe('Sign Up');
    expect(definition.schema.description).toBe('Create your account.');
    expect(definition.schema.properties).toHaveProperty('user_name');
    expect(definition.schema.required).toContain('user_name');
    expect(definition.schema.required).not.toContain('user_age');

    // Parse back
    const parsed = parseModel(definition);
    expect(parsed).toEqual(original);
  });

  it('round-trips display fields (heading, paragraph, richtext) with correct alignments & metadata', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'display',
          displayType: 'heading',
          id: 'heading-id-1',
          text: 'Main Title text',
          level: 3,
        },
        {
          kind: 'display',
          displayType: 'paragraph',
          id: 'paragraph-id-2',
          text: 'Center aligned guidance info',
          align: 'center',
        },
        {
          kind: 'display',
          displayType: 'richtext',
          id: 'rich-id-3',
          text: '',
          content: { root: { children: [{ text: 'rich markup' }] } },
        },
      ],
    };

    const definition = serializeModel(original);

    // Verify element formats and attributes in uischema
    const elements = (definition.uischema as any).elements;
    expect(elements).toHaveLength(3);
    expect(elements[0]).toEqual({
      type: 'Label',
      text: 'Main Title text',
      i: 'heading-id-1',
      options: { format: 'heading', level: 3 },
    });
    expect(elements[1]).toEqual({
      type: 'Label',
      text: 'Center aligned guidance info',
      i: 'paragraph-id-2',
      options: { format: 'paragraph', align: 'center' },
    });
    expect(elements[2]).toEqual({
      type: 'Label',
      text: '',
      i: 'rich-id-3',
      options: {
        format: 'richtext',
        content: { root: { children: [{ text: 'rich markup' }] } },
      },
    });

    const parsed = parseModel(definition);
    expect(parsed).toEqual(original);
  });

  it('round-trips layouts (group & horizontal containers) with nested children', () => {
    const original: FormModel = {
      title: 'Survey',
      description: '',
      fields: [
        {
          kind: 'container',
          layout: 'group',
          label: 'Contact Info',
          children: [
            {
              kind: 'control',
              fieldType: 'text',
              key: 'email',
              label: 'Email',
              required: true,
              options: {},
            },
          ],
        },
        {
          kind: 'container',
          layout: 'horizontal',
          children: [
            {
              kind: 'control',
              fieldType: 'text',
              key: 'first_name',
              label: 'First Name',
              required: false,
              options: {},
            },
            {
              kind: 'control',
              fieldType: 'text',
              key: 'last_name',
              label: 'Last Name',
              required: false,
              options: {},
            },
          ],
        },
      ],
    };

    const definition = serializeModel(original);

    // Verify layout structures in UI schema
    const elements = (definition.uischema as any).elements;
    expect(elements).toHaveLength(2);
    expect(elements[0].type).toBe('Group');
    expect(elements[0].label).toBe('Contact Info');
    expect(elements[1].type).toBe('HorizontalLayout');

    const parsed = parseModel(definition);
    expect(parsed).toEqual(original);
  });

  it('round-trips enum selection control types (select, radio, oneof, multiselect)', () => {
    const original: FormModel = {
      title: 'Selection Form',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'select',
          key: 'sel_field',
          label: 'Dropdown',
          required: false,
          options: {},
          enumOptions: [
            { value: 'opt1', label: 'opt1' },
            { value: 'opt2', label: 'opt2' },
          ],
        },
        {
          kind: 'control',
          fieldType: 'radio',
          key: 'rad_field',
          label: 'Radio Options',
          required: false,
          options: {},
          enumOptions: [{ value: 'yes', label: 'yes' }],
        },
        {
          kind: 'control',
          fieldType: 'oneof',
          key: 'oneof_field',
          label: 'Labeled choices',
          required: false,
          options: {},
          enumOptions: [{ value: 'v1', label: 'Label 1' }],
        },
        {
          kind: 'control',
          fieldType: 'multiselect',
          key: 'multi_field',
          label: 'Checkboxes list',
          required: false,
          options: {},
          enumOptions: [{ value: 'm1', label: 'm1' }],
        },
      ],
    };

    const definition = serializeModel(original);

    // Check enum mappings in properties schema
    const props = definition.schema.properties as any;
    expect(props.sel_field.enum).toEqual(['opt1', 'opt2']);
    expect(props.rad_field.enum).toEqual(['yes']);
    expect(props.oneof_field.oneOf).toEqual([{ const: 'v1', title: 'Label 1' }]);
    expect(props.multi_field.type).toBe('array');
    expect(props.multi_field.items.enum).toEqual(['m1']);

    const parsed = parseModel(definition);
    expect(parsed).toEqual(original);
  });

  it('round-trips slider control fields with ranges', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'slider',
          key: 'rating_scale',
          label: 'Scale Selector',
          required: false,
          options: {},
          min: 10,
          max: 50,
          step: 5,
        },
      ],
    };

    const definition = serializeModel(original);

    const props = definition.schema.properties as any;
    expect(props.rating_scale.minimum).toBe(10);
    expect(props.rating_scale.maximum).toBe(50);
    expect((definition.uischema as any).elements[0].options.step).toBe(5);

    const parsed = parseModel(definition);
    expect(parsed).toEqual(original);
  });

  it('handles parsing safely when UI schemas and scopes contain invalid references', () => {
    // Missing properties schema, invalid element types, invalid scopes
    const brokenDefinition = {
      schema: {
        type: 'object',
        title: 'Broken Form',
        properties: {}, // no properties
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [
          { type: 'Control', scope: '#/invalid/scope' }, // invalid scope key
          { type: 'Control', scope: '#/properties/non_existent' }, // key has no properties schema entry
          { type: 'Label' }, // missing format options, non-display Label
        ],
      },
    };

    const parsed = parseModel(brokenDefinition as any);

    expect(parsed.title).toBe('Broken Form');
    expect(parsed.fields).toHaveLength(1);
    expect((parsed.fields[0] as any).key).toBe('non_existent');
    expect((parsed.fields[0] as any).fieldType).toBe('text');
  });

  it('round-trips checkbox, toggle, date, multiline and richtext control nodes', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'checkbox',
          key: 'agree_terms',
          label: 'I agree',
          required: true,
          options: {},
        },
        {
          kind: 'control',
          fieldType: 'toggle',
          key: 'enable_notifications',
          label: 'Notifications',
          required: false,
          options: {},
        },
        {
          kind: 'control',
          fieldType: 'date',
          key: 'birth_date',
          label: 'Birth Date',
          required: false,
          options: {},
        },
        {
          kind: 'control',
          fieldType: 'multiline',
          key: 'user_bio',
          label: 'Bio',
          required: false,
          options: {},
        },
        {
          kind: 'control',
          fieldType: 'richtext',
          key: 'formatted_content',
          label: 'Rich Text',
          required: false,
          options: {},
        },
      ],
    };

    const definition = serializeModel(original);

    const elements = (definition.uischema as any).elements;
    expect((definition.schema as any).properties.agree_terms.type).toBe('boolean');
    expect((definition.schema as any).properties.enable_notifications.type).toBe('boolean');
    expect(elements[1].options.toggle).toBe(true);
    expect((definition.schema as any).properties.birth_date.format).toBe('date');
    expect(elements[3].options.multi).toBe(true);
    expect(elements[4].options.format).toBe('richtext');

    const parsed = parseModel(definition);
    expect(parsed).toEqual(original);
  });

  it('handles default values and fallbacks during serialization', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'display',
          displayType: 'heading',
          id: 'h-def',
          text: 'Default level',
        },
        {
          kind: 'display',
          displayType: 'paragraph',
          id: 'p-def',
          text: 'Left align',
          align: 'left',
        },
        {
          kind: 'display',
          displayType: 'richtext',
          id: 'r-def',
          text: '',
        },
      ],
    };

    const definition = serializeModel(original);
    const elements = (definition.uischema as any).elements;

    expect(elements[0].options.level).toBe(2);
    expect(elements[1].options.align).toBeUndefined();
    expect(elements[2].options.content).toBeNull();

    const parsed = parseModel(definition);
    expect(parsed.fields[1]).toEqual({
      kind: 'display',
      displayType: 'paragraph',
      id: 'p-def',
      text: 'Left align',
    });
  });

  it('handles defaults and fallbacks during parsing', () => {
    const customDefWithSlider = {
      schema: {
        type: 'object',
        properties: {
          slider_default: {
            type: 'number',
            minimum: 10,
            maximum: 20,
          },
          titled_field: {
            type: 'string',
            title: 'Schema Title',
          },
          untitled_field: {
            type: 'string',
          },
        },
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/slider_default',
          },
          {
            type: 'Control',
            scope: '#/properties/titled_field',
          },
          {
            type: 'Control',
            scope: '#/properties/untitled_field',
          },
          {
            type: 'Label',
            options: {
              format: 'heading',
            },
          },
          {
            type: 'Label',
            options: {
              format: 'paragraph',
              align: 'left',
            },
          },
        ],
      },
    };

    const parsed = parseModel(customDefWithSlider as any);

    expect(parsed.fields[0]).toEqual({
      kind: 'control',
      fieldType: 'slider',
      key: 'slider_default',
      label: '',
      required: false,
      options: {},
      min: 10,
      max: 20,
      step: 1,
    });

    expect((parsed.fields[1] as any).label).toBe('Schema Title');
    expect((parsed.fields[2] as any).label).toBe('');

    expect((parsed.fields[3] as any).level).toBe(2);
    expect((parsed.fields[3] as any).id).toBeTypeOf('string');
    expect((parsed.fields[3] as any).id).not.toBe('');

    expect((parsed.fields[4] as any).align).toBeUndefined();
  });

  it('round-trips control nodes with description', () => {
    const original: FormModel = {
      title: 'Sign Up',
      description: 'Create your account.',
      fields: [
        {
          kind: 'control',
          fieldType: 'text',
          key: 'user_name',
          label: 'Username',
          required: true,
          options: {},
          description: 'Please enter your unique username.',
        },
      ],
    };

    const definition = serializeModel(original);
    expect((definition.schema.properties as any).user_name).toHaveProperty(
      'description',
      'Please enter your unique username.',
    );

    const parsed = parseModel(definition);
    expect(parsed).toEqual(original);
  });

  it('covers all remaining edge cases and branches during serialization and parsing', () => {
    const model: FormModel = {
      title: '',
      description: 'Some description',
      fields: [
        {
          kind: 'control',
          fieldType: 'number',
          key: 'num_field',
          label: '',
          required: false,
          options: {},
        },
        {
          kind: 'control',
          fieldType: 'slider',
          key: 'slider_no_step',
          label: 'Slider No Step',
          required: false,
          options: {},
          min: 0,
          max: 10,
        },
        {
          kind: 'container',
          layout: 'group',
          children: [
            {
              kind: 'display',
              displayType: 'paragraph',
              id: 'p-right',
              text: 'Right aligned',
              align: 'right',
            },
          ],
        },
        {
          kind: 'control',
          fieldType: 'richtext',
          key: 'rich_control',
          label: 'Rich Control',
          required: false,
          options: {},
        },
      ],
    };

    const serialized = serializeModel(model);
    expect(serialized.schema.description).toBe('Some description');
    expect(serialized.schema.title).toBeUndefined();
    expect((serialized.schema.properties as any).num_field.title).toBeUndefined();
    expect((serialized.schema.properties as any).num_field.type).toBe('number');
    expect((serialized.uischema as any).elements[0].options).toBeUndefined();
    expect((serialized.uischema as any).elements[2].type).toBe('Group');
    expect((serialized.uischema as any).elements[2].label).toBeUndefined();
    expect((serialized.uischema as any).elements[2].elements[0].options.align).toBe('right');
    expect((serialized.uischema as any).elements[3].options.format).toBe('richtext');

    const parsed = parseModel(serialized);
    expect(parsed.description).toBe('Some description');
    expect(parsed.fields[0]!.kind).toBe('control');
  });

  it('covers parsing branches for integer, boolean without toggle, oneOf without const/title, missing schema/uischema fields, and HorizontalLayout', () => {
    const customDef = {
      uischema: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/int_field',
          },
          {
            type: 'Control',
            scope: '#/properties/bool_field',
            options: { toggle: false },
          },
          {
            type: 'Control',
            scope: '#/properties/oneof_partial',
          },
          {
            type: 'HorizontalLayout',
            label: 'Horizontal Section',
            elements: [
              {
                type: 'Label',
                text: 'Nested label',
                i: 'nested-label-id',
                options: { format: 'heading', level: 2 },
              },
            ],
          },
          {
            type: 'Control',
            scope: 123 as any,
          },
        ],
      },
      schema: {
        type: 'object',
        properties: {
          int_field: { type: 'integer' },
          bool_field: { type: 'boolean' },
          oneof_partial: {
            oneOf: [{ title: 'Only Title' }, { const: 'only_const' }],
          },
        },
      },
    };

    const parsed = parseModel(customDef as any);

    expect((parsed.fields[0] as any).fieldType).toBe('number');
    expect((parsed.fields[0] as any).label).toBe('');
    expect((parsed.fields[1] as any).fieldType).toBe('checkbox');
    expect((parsed.fields[2] as any).enumOptions).toEqual([
      { value: '', label: 'Only Title' },
      { value: 'only_const', label: 'only_const' },
    ]);
    expect(parsed.fields[3]!.kind).toBe('container');
    expect((parsed.fields[3] as any).layout).toBe('horizontal');
    expect((parsed.fields[3] as any).label).toBe('Horizontal Section');
  });

  it('covers prop description, array enum fallback, and container without elements', () => {
    const customDef = {
      schema: {
        type: 'object',
        properties: {
          desc_field: {
            type: 'string',
            description: 'Helpful field description',
          },
          array_no_enum: {
            type: 'array',
            items: {},
          },
          array_no_items: {
            type: 'array',
          },
        },
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/desc_field',
          },
          {
            type: 'Control',
            scope: '#/properties/array_no_enum',
          },
          {
            type: 'Control',
            scope: '#/properties/array_no_items',
          },
          {
            type: 'Group',
            label: 'Empty Group',
          },
        ],
      },
    };

    const parsed = parseModel(customDef as any);

    expect((parsed.fields[0] as any).description).toBe('Helpful field description');
    expect((parsed.fields[1] as any).enumOptions).toEqual([]);
    expect((parsed.fields[2] as any).enumOptions).toEqual([]);
    expect((parsed.fields[3] as any).children).toEqual([]);
  });

  it('covers slider null min/max fallbacks, missing properties schema, and HorizontalLayout without elements', () => {
    const customDef = {
      schema: {
        type: 'object',
        // properties undefined -> triggers line 224 ?? {}
        properties: {
          slider_nulls: {
            type: 'number',
            minimum: null,
            maximum: null,
          },
        },
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/slider_nulls',
          },
          {
            type: 'Control',
            scope: '#/properties/no_prop_entry',
          },
          {
            type: 'HorizontalLayout',
            // elements undefined -> triggers line 315 ?? []
          },
        ],
      },
    };

    const parsed = parseModel(customDef as any);

    expect((parsed.fields[0] as any).min).toBe(0);
    expect((parsed.fields[0] as any).max).toBe(100);
    expect((parsed.fields[1] as any).fieldType).toBe('text');
    expect((parsed.fields[2] as any).children).toEqual([]);
  });

  it('covers completely empty definition input', () => {
    const parsed = parseModel({} as any);
    expect(parsed.title).toBe('');
    expect(parsed.description).toBe('');
    expect(parsed.fields).toEqual([]);
  });

  it('covers propertySchema slider/oneof/enumOptions fallbacks, enumOptionsFromProp nullish const/title, and missing schema properties', () => {
    const modelWithNulls: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'slider',
          key: 'slider_null_bounds',
          label: 'Slider Bounds',
          required: false,
          options: {},
        },
        {
          kind: 'control',
          fieldType: 'oneof',
          key: 'oneof_no_enum',
          label: 'OneOf No Enum',
          required: false,
          options: {},
        },
        {
          kind: 'control',
          fieldType: 'select',
          key: 'select_no_enum',
          label: 'Select No Enum',
          required: false,
          options: {},
        },
      ],
    };

    const serialized = serializeModel(modelWithNulls);
    expect((serialized.schema.properties as any).slider_null_bounds.minimum).toBe(0);
    expect((serialized.schema.properties as any).slider_null_bounds.maximum).toBe(100);
    expect((serialized.schema.properties as any).oneof_no_enum.oneOf).toEqual([]);
    expect((serialized.schema.properties as any).select_no_enum.enum).toEqual([]);

    const defWithMissingProps = {
      schema: {
        type: 'object',
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Group',
          },
          {
            type: 'HorizontalLayout',
          },
          {
            type: 'UnknownContainerType',
          },
          {
            type: 'Control',
            scope: '#/properties/missing_props_key',
          },
        ],
      },
    };

    const defWithNullConstTitle = {
      schema: {
        type: 'object',
        properties: {
          oneof_null_const: {
            type: 'string',
            oneOf: [{}],
          },
        },
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/oneof_null_const',
          },
        ],
      },
    };

    const parsedProps = parseModel(defWithMissingProps as any);
    expect(parsedProps.fields).toHaveLength(3);
    expect((parsedProps.fields[0] as any).children).toEqual([]);
    expect((parsedProps.fields[1] as any).children).toEqual([]);
    expect((parsedProps.fields[2] as any).key).toBe('missing_props_key');

    const parsedOneOf = parseModel(defWithNullConstTitle as any);
    expect((parsedOneOf.fields[0] as any).enumOptions).toEqual([{ value: '', label: '' }]);
  });
});
