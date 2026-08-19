import { describe, expect, it } from 'vitest';
import { serializeModel, parseModel } from '@/components/form-builder/model-codec';
import type {
  ContainerNode,
  ControlNode,
  FormDefinition,
  FormModel,
} from '@/components/form-builder/model';

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
          // Feature 155: every parsed number carries a numberType (defaults decimal).
          numberType: 'decimal',
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

  it('round-trips a grid container with its column count (feature 169)', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'container',
          layout: 'grid',
          columns: 4,
          children: [
            {
              kind: 'control',
              fieldType: 'text',
              key: 'a',
              label: 'A',
              required: false,
              options: {},
            },
          ],
        },
      ],
    };

    const definition = serializeModel(original);
    const els = (definition.uischema as any).elements;
    expect(els[0].type).toBe('GridLayout');
    expect(els[0].options).toEqual({ columns: 4 });
    // No Section title for grid — matches Horizontal's title-less behavior.
    expect(els[0].label).toBeUndefined();

    const parsed = parseModel(definition);
    expect(parsed).toEqual(original);
  });

  it('clamps an out-of-range or missing GridLayout columns to 2–6 on parse (feature 169)', () => {
    const tooMany = parseModel({
      schema: { type: 'object', properties: {} },
      uischema: {
        type: 'VerticalLayout',
        elements: [{ type: 'GridLayout', options: { columns: 99 }, elements: [] }],
      },
    } as any);
    expect((tooMany.fields[0] as any).columns).toBe(6);

    const tooFew = parseModel({
      schema: { type: 'object', properties: {} },
      uischema: {
        type: 'VerticalLayout',
        elements: [{ type: 'GridLayout', options: { columns: 0 }, elements: [] }],
      },
    } as any);
    expect((tooFew.fields[0] as any).columns).toBe(2);

    const missing = parseModel({
      schema: { type: 'object', properties: {} },
      uischema: {
        type: 'VerticalLayout',
        elements: [{ type: 'GridLayout', elements: [] }],
      },
    } as any);
    expect((missing.fields[0] as any).columns).toBe(2);
  });

  it('round-trips the choice family (select single/multi, radio, checkbox group) — feature 156 Step 2', () => {
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
          multiple: false,
          combobox: false,
          enumOptions: [
            { value: 'opt1', label: 'Option 1' },
            { value: 'opt2', label: 'Option 2' },
          ],
        },
        {
          kind: 'control',
          fieldType: 'select',
          key: 'multi_sel',
          label: 'Multi dropdown',
          required: true,
          options: {},
          multiple: true,
          combobox: false,
          enumOptions: [{ value: 'a', label: 'A' }],
        },
        {
          kind: 'control',
          fieldType: 'radio',
          key: 'rad_field',
          label: 'Radio Options',
          required: false,
          options: {},
          enumOptions: [{ value: 'yes', label: 'Yes' }],
        },
        {
          kind: 'control',
          fieldType: 'checkboxes',
          key: 'multi_field',
          label: 'Checkboxes list',
          required: false,
          options: {},
          enumOptions: [{ value: 'm1', label: 'M1' }],
        },
      ],
    };

    const definition = serializeModel(original);

    // Values AND labels now live in the schema (feature 167: oneOf/const/title) — the uischema
    // options carry only presentation (`display`); no `format`, `choices`, or `multiple` flag.
    const props = definition.schema.properties as any;
    expect(props.sel_field.oneOf).toEqual([
      { const: 'opt1', title: 'Option 1' },
      { const: 'opt2', title: 'Option 2' },
    ]);
    expect(props.multi_sel.type).toBe('array');
    expect(props.multi_sel.items.oneOf).toEqual([{ const: 'a', title: 'A' }]);
    expect(props.multi_sel.minItems).toBe(1); // required multi → ≥1
    expect(props.rad_field.oneOf).toEqual([{ const: 'yes', title: 'Yes' }]);
    expect(props.multi_field.type).toBe('array');
    expect(props.multi_field.items.oneOf).toEqual([{ const: 'm1', title: 'M1' }]);

    const els = (definition.uischema as any).elements;
    expect(els[0].options).toEqual({ display: 'select' });
    expect(els[1].options).toEqual({ display: 'select' });
    expect(els[2].options).toEqual({ display: 'radio' });
    expect(els[3].options).toEqual({ display: 'checkboxes' });

    const parsed = parseModel(definition);
    expect(parsed).toEqual(original);
  });

  it("round-trips the Select field's opt-in combobox flag (feature 168)", () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'select',
          key: 'combo_field',
          label: 'Combo Field',
          required: false,
          options: {},
          multiple: false,
          combobox: true,
          enumOptions: [{ value: 'a', label: 'A' }],
        },
        {
          kind: 'control',
          fieldType: 'select',
          key: 'plain_field',
          label: 'Plain Field',
          required: false,
          options: {},
          multiple: false,
          enumOptions: [{ value: 'a', label: 'A' }],
        },
      ],
    };

    const definition = serializeModel(original);
    const els = (definition.uischema as any).elements;
    // combobox: true is emitted explicitly; unset/false is omitted, not serialized as `combobox: false`.
    expect(els[0].options).toEqual({ display: 'select', combobox: true });
    expect(els[1].options).toEqual({ display: 'select' });

    const parsed = parseModel(definition);
    expect((parsed.fields[0] as any).combobox).toBe(true);
    expect((parsed.fields[1] as any).combobox).toBe(false);
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

  it('round-trips boolean (as checkbox and as toggle), date, multiline text and richtext control nodes', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'boolean',
          key: 'agree_terms',
          label: 'I agree',
          required: true,
          options: {},
          renderAs: 'checkbox',
        },
        {
          // Feature 156: a boolean displayed as a toggle — emits `options.toggle` for the Switch renderer.
          kind: 'control',
          fieldType: 'boolean',
          key: 'enable_notifications',
          label: 'Notifications',
          required: false,
          options: {},
          renderAs: 'toggle',
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
          // Feature 158: multiline is now the Text field with `multiline: true` (→ options.multi).
          kind: 'control',
          fieldType: 'text',
          key: 'user_bio',
          label: 'Bio',
          required: false,
          options: {},
          multiline: true,
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

  it('round-trips a date range field (feature 157) — object start/end + options.format:daterange', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'daterange',
          key: 'trip',
          label: 'Trip dates',
          required: true,
          options: {},
        },
      ],
    };

    const definition = serializeModel(original);
    const prop = (definition.schema.properties as any).trip;
    expect(prop.type).toBe('object');
    expect(prop.properties.start).toEqual({ type: 'string', format: 'date' });
    expect(prop.properties.end).toEqual({ type: 'string', format: 'date' });
    expect(prop.required).toEqual(['start', 'end']); // required range → both endpoints
    expect(definition.schema.required as string[]).toContain('trip'); // parent-level key presence
    expect((definition.uischema as any).elements[0].options.format).toBe('daterange');

    expect(parseModel(definition)).toEqual(original);
  });

  it('round-trips a time field (feature 157) — string pattern + options.format:time', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'time',
          key: 'start_at',
          label: 'Start time',
          required: false,
          options: {},
        },
      ],
    };

    const definition = serializeModel(original);
    const prop = (definition.schema.properties as any).start_at;
    expect(prop.type).toBe('string');
    expect(prop.pattern).toBe('^([01]\\d|2[0-3]):[0-5]\\d$');
    expect(prop.format).toBeUndefined(); // NOT format:'time' (ajv-formats requires seconds)
    expect((definition.uischema as any).elements[0].options.format).toBe('time');

    expect(parseModel(definition)).toEqual(original);
  });

  it('round-trips a datetime field (feature 157) — string pattern + options.format:datetime', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'datetime',
          key: 'when',
          label: 'When',
          required: false,
          options: {},
        },
      ],
    };

    const definition = serializeModel(original);
    const prop = (definition.schema.properties as any).when;
    expect(prop.type).toBe('string');
    expect(prop.pattern).toBe('^\\d{4}-\\d{2}-\\d{2}T([01]\\d|2[0-3]):[0-5]\\d$');
    expect(prop.format).toBeUndefined(); // NOT format:'date-time' (ajv-formats requires an offset)
    expect((definition.uischema as any).elements[0].options.format).toBe('datetime');

    expect(parseModel(definition)).toEqual(original);
  });

  it('round-trips a text field with placeholder, maxLength and multiline (feature 158)', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'text',
          key: 'bio',
          label: 'Bio',
          required: false,
          options: {},
          placeholder: 'Tell us about yourself',
          multiline: true,
          maxLength: 280,
        },
      ],
    };

    const definition = serializeModel(original);
    const prop = (definition.schema.properties as any).bio;
    const opts = (definition.uischema as any).elements[0].options;
    expect(prop).toEqual({ type: 'string', maxLength: 280, title: 'Bio' });
    expect(opts).toEqual({ multi: true, placeholder: 'Tell us about yourself' });

    expect(parseModel(definition)).toEqual(original);
  });

  it('round-trips a single-line text mask; multiline drops it (feature 158)', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'text',
          key: 'phone',
          label: 'Phone',
          required: false,
          options: {},
          mask: '(999) 999-9999',
        },
      ],
    };
    const definition = serializeModel(original);
    expect((definition.uischema as any).elements[0].options.mask).toBe('(999) 999-9999');
    expect(parseModel(definition)).toEqual(original);

    // A mask on a multiline node is dropped (masks are single-line only).
    const multi = serializeModel({
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'text',
          key: 'x',
          label: 'X',
          required: false,
          options: {},
          multiline: true,
          mask: '999',
        },
      ],
    });
    expect((multi.uischema as any).elements[0].options.mask).toBeUndefined();
    expect((multi.uischema as any).elements[0].options.multi).toBe(true);
  });

  it('serializes an empty label as `label: false` so the field renders blank, not its key (feature 159)', () => {
    const definition = serializeModel({
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'text',
          key: 'V1StGXR8',
          label: '',
          required: false,
          options: {},
        },
      ],
    });
    expect((definition.uischema as any).elements[0].label).toBe(false);
    expect((definition.schema.properties as any).V1StGXR8.title).toBeUndefined();
    // Round-trips back to an empty label.
    expect((parseModel(definition).fields[0] as any).label).toBe('');
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
            // Feature 155: a slider is identified by options.slider, not by having min+max.
            options: { slider: true },
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

  it('covers parsing branches for integer, boolean without toggle, a choice control, missing schema/uischema fields, and HorizontalLayout', () => {
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
            scope: '#/properties/choice_field',
            options: { display: 'radio' },
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
          choice_field: { type: 'string', oneOf: [{ const: 'a', title: 'A' }] },
        },
      },
    };

    const parsed = parseModel(customDef as any);

    expect((parsed.fields[0] as any).fieldType).toBe('number');
    expect((parsed.fields[0] as any).label).toBe('');
    expect((parsed.fields[1] as any).fieldType).toBe('boolean');
    // Feature 156: a boolean without `options.toggle` parses back with the checkbox display affordance.
    expect((parsed.fields[1] as any).renderAs).toBe('checkbox');
    expect((parsed.fields[2] as any).fieldType).toBe('radio');
    expect((parsed.fields[2] as any).enumOptions).toEqual([{ value: 'a', label: 'A' }]);
    expect(parsed.fields[3]!.kind).toBe('container');
    expect((parsed.fields[3] as any).layout).toBe('horizontal');
    expect((parsed.fields[3] as any).label).toBe('Horizontal Section');
  });

  it('covers prop description, choice controls with no authored options, and container without elements', () => {
    const customDef = {
      schema: {
        type: 'object',
        properties: {
          desc_field: {
            type: 'string',
            description: 'Helpful field description',
          },
          empty_checkboxes: { type: 'array', items: { type: 'string', oneOf: [] } },
          empty_select: { type: 'string', oneOf: [] },
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
            scope: '#/properties/empty_checkboxes',
            options: { display: 'checkboxes' },
          },
          {
            type: 'Control',
            scope: '#/properties/empty_select',
            options: { display: 'select' },
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
    // Choice fields with an empty schema.oneOf recover an empty list (never throw).
    expect((parsed.fields[1] as any).fieldType).toBe('checkboxes');
    expect((parsed.fields[1] as any).enumOptions).toEqual([]);
    expect((parsed.fields[2] as any).fieldType).toBe('select');
    expect((parsed.fields[2] as any).enumOptions).toEqual([]);
    expect((parsed.fields[2] as any).multiple).toBe(false);
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
            // Feature 155: mark it a slider so null min/max fall back to the slider defaults (0/100).
            options: { slider: true },
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

  it('covers propertySchema slider/choice enum fallbacks, malformed choices, and missing schema properties', () => {
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
    // A choice field with no authored options serializes an empty schema.oneOf; uischema options
    // carry only presentation (`display`) — no `choices`/`format`/`multiple`.
    expect((serialized.schema.properties as any).select_no_enum.oneOf).toEqual([]);
    expect((serialized.uischema as any).elements[1].options).toEqual({ display: 'select' });

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

    const defWithMalformedChoices = {
      schema: {
        type: 'object',
        properties: {
          choice_bad: {
            type: 'string',
            oneOf: [null, 'str', { const: 'x' }, { const: 'y', title: '' }],
          },
        },
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/choice_bad',
            options: { display: 'select' },
          },
        ],
      },
    };

    const parsedProps = parseModel(defWithMissingProps as any);
    expect(parsedProps.fields).toHaveLength(3);
    expect((parsedProps.fields[0] as any).children).toEqual([]);
    expect((parsedProps.fields[1] as any).children).toEqual([]);
    expect((parsedProps.fields[2] as any).key).toBe('missing_props_key');

    // choicesFromSchema drops non-objects and falls back label→value (missing or empty title).
    const parsedBad = parseModel(defWithMalformedChoices as any);
    expect((parsedBad.fields[0] as any).enumOptions).toEqual([
      { value: 'x', label: 'x' },
      { value: 'y', label: 'y' },
    ]);
  });

  // ── Feature 155: number type (integer/decimal) + min/max bounds ────────────────────────────────

  it('serializes a decimal number field with min and max (no options.slider)', () => {
    const model: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'number',
          key: 'amount',
          label: 'Amount',
          required: false,
          options: {},
          numberType: 'decimal',
          min: 0,
          max: 100,
        },
      ],
    };

    const def = serializeModel(model);
    const prop = (def.schema.properties as any).amount;
    expect(prop.type).toBe('number');
    expect(prop.minimum).toBe(0);
    expect(prop.maximum).toBe(100);
    // A plain number must NOT carry the slider marker, or it round-trips as a slider.
    expect((def.uischema as any).elements[0].options).toBeUndefined();
  });

  it('serializes an integer number field as type integer', () => {
    const model: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'number',
          key: 'quantity',
          label: 'Quantity',
          required: false,
          options: {},
          numberType: 'integer',
          min: 1,
        },
      ],
    };

    const def = serializeModel(model);
    const prop = (def.schema.properties as any).quantity;
    expect(prop.type).toBe('integer');
    expect(prop.minimum).toBe(1);
    expect(prop.maximum).toBeUndefined();
  });

  it('round-trips a number field with numberType and min/max', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'number',
          key: 'score',
          label: 'Score',
          required: false,
          options: {},
          numberType: 'integer',
          min: 0,
          max: 10,
        },
      ],
    };

    const parsed = parseModel(serializeModel(original));
    expect(parsed).toEqual(original);
  });

  it('parses a numeric control as number (not slider) when options.slider is absent, even with min+max', () => {
    const def = {
      schema: {
        type: 'object',
        properties: {
          legacy: { type: 'number', minimum: 5, maximum: 25 },
        },
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [{ type: 'Control', scope: '#/properties/legacy' }],
      },
    };

    const parsed = parseModel(def as any);
    const node = parsed.fields[0] as any;
    expect(node.fieldType).toBe('number');
    expect(node.numberType).toBe('decimal');
    expect(node.min).toBe(5);
    expect(node.max).toBe(25);
  });

  it('serializes a slider with options.slider = true and parses it back as a slider', () => {
    const model: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'slider',
          key: 'level',
          label: 'Level',
          required: false,
          options: {},
          min: 0,
          max: 100,
          step: 5,
        },
      ],
    };

    const def = serializeModel(model);
    expect((def.uischema as any).elements[0].options.slider).toBe(true);

    const parsed = parseModel(def);
    expect((parsed.fields[0] as any).fieldType).toBe('slider');
    // The slider marker is a synthesized flag — it must not leak into the node's user options.
    expect((parsed.fields[0] as any).options).toEqual({});
  });

  it('defaults numberType to decimal when the schema type is number without a slider marker', () => {
    const def = {
      schema: { type: 'object', properties: { plain: { type: 'number' } } },
      uischema: {
        type: 'VerticalLayout',
        elements: [{ type: 'Control', scope: '#/properties/plain' }],
      },
    };
    const parsed = parseModel(def as any);
    const node = parsed.fields[0] as any;
    expect(node.fieldType).toBe('number');
    expect(node.numberType).toBe('decimal');
    expect(node.min).toBeUndefined();
    expect(node.max).toBeUndefined();
  });

  // ── Feature 155: decimal-places limit ──────────────────────────────────────────────────────────

  it('serializes options.decimals for a decimal number field', () => {
    const model: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'number',
          key: 'price',
          label: 'Price',
          required: false,
          options: {},
          numberType: 'decimal',
          decimalPlaces: 2,
        },
      ],
    };
    const def = serializeModel(model);
    expect((def.uischema as any).elements[0].options.decimals).toBe(2);
    // Decimals is an entry constraint, not a schema keyword — schema stays a plain number.
    expect((def.schema.properties as any).price.multipleOf).toBeUndefined();
  });

  it('does not serialize options.decimals for an integer number field', () => {
    const model: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'number',
          key: 'count',
          label: 'Count',
          required: false,
          options: {},
          numberType: 'integer',
          decimalPlaces: 2,
        },
      ],
    };
    const def = serializeModel(model);
    expect((def.uischema as any).elements[0].options).toBeUndefined();
  });

  it('round-trips a decimal number field with decimalPlaces', () => {
    const original: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          fieldType: 'number',
          key: 'amount',
          label: 'Amount',
          required: false,
          options: {},
          numberType: 'decimal',
          min: 0,
          decimalPlaces: 3,
        },
      ],
    };
    expect(parseModel(serializeModel(original))).toEqual(original);
  });

  it('leaves decimalPlaces unset for a decimal number with no decimals option (unbounded precision)', () => {
    const def = {
      schema: { type: 'object', properties: { x: { type: 'number' } } },
      uischema: {
        type: 'VerticalLayout',
        elements: [{ type: 'Control', scope: '#/properties/x' }],
      },
    };
    const node = parseModel(def as any).fields[0] as any;
    expect(node.numberType).toBe('decimal');
    expect(node.decimalPlaces).toBeUndefined();
  });
});

// ── Feature 171: accordion group field ──────────────────────────────────────────────────────────

const accordionNode = (overrides: Partial<ControlNode> = {}): ControlNode => ({
  kind: 'control',
  fieldType: 'accordiongroup',
  key: 'faq',
  label: 'Frequently asked questions',
  required: false,
  options: {},
  itemLabel: 'item',
  defaultOpen: 'none',
  ...overrides,
});

const modelWith = (node: ControlNode): FormModel => ({
  title: '',
  description: '',
  fields: [node],
});

const propOf = (definition: FormDefinition): Record<string, unknown> =>
  (definition.schema.properties as Record<string, Record<string, unknown>>).faq as Record<
    string,
    unknown
  >;

const elementOf = (definition: FormDefinition): Record<string, unknown> =>
  (definition.uischema.elements as Record<string, unknown>[])[0] as Record<string, unknown>;

const optionsOf = (definition: FormDefinition): Record<string, unknown> =>
  (elementOf(definition).options ?? {}) as Record<string, unknown>;

describe('Accordion group codec (feature 171)', () => {
  it('serializes an array property whose items carry id, title and an object description', () => {
    const prop = propOf(serializeModel(modelWith(accordionNode())));
    expect(prop.type).toBe('array');
    expect(prop.items).toEqual({
      type: 'object',
      required: ['title', 'description'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string', pattern: '\\S' },
        description: { type: 'object' },
      },
    });
  });

  it('emits per-item completeness even when the field itself is optional', () => {
    // Rule 13: "required" on the FIELD governs how many items; items.required governs what an item
    // must contain. An optional group may be empty, but any item in it must be filled in.
    const optional = propOf(serializeModel(modelWith(accordionNode({ required: false }))));
    const required = propOf(serializeModel(modelWith(accordionNode({ required: true }))));
    for (const prop of [optional, required]) {
      expect((prop.items as Record<string, unknown>).required).toEqual(['title', 'description']);
    }
    expect(optional.minItems).toBeUndefined();
    expect(required.minItems).toBe(1);
  });

  it('requires a non-whitespace character in the item title', () => {
    // `required` alone passes on the '' the control writes on add; minLength: 1 would pass ' '.
    const items = propOf(serializeModel(modelWith(accordionNode()))).items as Record<
      string,
      unknown
    >;
    const properties = items.properties as Record<string, Record<string, unknown> | undefined>;
    expect(properties.title?.pattern).toBe('\\S');
  });

  it('emits options.format = "accordion-group" on the uischema element', () => {
    expect(optionsOf(serializeModel(modelWith(accordionNode()))).format).toBe('accordion-group');
  });

  it('emits options.itemLabel only when the author set a noun', () => {
    expect(optionsOf(serializeModel(modelWith(accordionNode()))).itemLabel).toBeUndefined();
    expect(
      optionsOf(serializeModel(modelWith(accordionNode({ itemLabel: 'question' })))).itemLabel,
    ).toBe('question');
  });

  it('emits options.defaultOpen only when it is not "none"', () => {
    expect(optionsOf(serializeModel(modelWith(accordionNode()))).defaultOpen).toBeUndefined();
    expect(
      optionsOf(serializeModel(modelWith(accordionNode({ defaultOpen: 'first' })))).defaultOpen,
    ).toBe('first');
  });

  it('emits minItems: 1 when the field is required', () => {
    const definition = serializeModel(modelWith(accordionNode({ required: true })));
    expect(propOf(definition).minItems).toBe(1);
    expect(definition.schema.required).toContain('faq');
  });

  it('omits minItems when the field is not required', () => {
    expect(propOf(serializeModel(modelWith(accordionNode()))).minItems).toBeUndefined();
  });

  it('does not read minItems back into the model on parse (it is derived from required)', () => {
    const definition = serializeModel(modelWith(accordionNode({ required: true })));
    const node = parseModel(definition).fields[0] as ControlNode;
    expect(node.required).toBe(true);
    expect(node.options).toEqual({});
    expect(node.options).not.toHaveProperty('minItems');
  });

  it('infers the accordiongroup field type from options.format, not the schema shape', () => {
    // The branch must sit EARLY (beside richtext/daterange) — an array otherwise falls through
    // isChoiceProp and lands on `text`.
    const definition = {
      schema: { type: 'object', properties: { faq: { type: 'array' } }, required: [] },
      uischema: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/faq',
            options: { format: 'accordion-group' },
          },
        ],
      },
    } as unknown as FormDefinition;
    const node = parseModel(definition).fields[0] as ControlNode;
    expect(node.fieldType).toBe('accordiongroup');
  });

  it('drops itemLabel and defaultOpen from the parsed node.options', () => {
    // parseControl's drop-list runs for ALL field types (memory `address-readonly-locks`) —
    // a synthesized option left in leaks into node.options and breaks the round-trip.
    const definition = serializeModel(
      modelWith(accordionNode({ itemLabel: 'question', defaultOpen: 'all' })),
    );
    const node = parseModel(definition).fields[0] as ControlNode;
    expect(node.options).toEqual({});
    expect(node.itemLabel).toBe('question');
    expect(node.defaultOpen).toBe('all');
  });

  it('defaults itemLabel and defaultOpen to definite values when the options are absent', () => {
    const definition = serializeModel(modelWith(accordionNode()));
    const node = parseModel(definition).fields[0] as ControlNode;
    expect(node.itemLabel).toBe('item');
    expect(node.defaultOpen).toBe('none');
  });

  it('round-trips an accordion group node unchanged through serialize → parse', () => {
    const original = accordionNode({
      required: true,
      itemLabel: 'question',
      defaultOpen: 'first',
      description: 'Add one per question',
    });
    const node = parseModel(serializeModel(modelWith(original))).fields[0] as ControlNode;
    expect(node).toEqual(original);
  });
});

// ── Feature 172: Section layout container ───────────────────────────────────────────────────────

const sectionNode = (overrides: Partial<ContainerNode> = {}): ContainerNode => ({
  kind: 'container',
  layout: 'section',
  children: [],
  ...overrides,
});

const withFields = (fields: FormModel['fields']): FormModel => ({
  title: '',
  description: '',
  fields,
});

const firstElement = (definition: FormDefinition): Record<string, unknown> =>
  (definition.uischema.elements as Record<string, unknown>[])[0] as Record<string, unknown>;

describe('Section layout codec (feature 172)', () => {
  it('serializes a section container to a "Section" uischema element', () => {
    const definition = serializeModel(withFields([sectionNode()]));
    expect(firstElement(definition).type).toBe('Section');
  });

  it('emits the label on the element (the future <legend>)', () => {
    const definition = serializeModel(withFields([sectionNode({ label: 'Applicant details' })]));
    expect(firstElement(definition).label).toBe('Applicant details');
  });

  it('omits the label when it is blank', () => {
    const definition = serializeModel(withFields([sectionNode({ label: '' })]));
    expect(firstElement(definition)).not.toHaveProperty('label');
  });

  it('emits options.description when the author set one', () => {
    const definition = serializeModel(
      withFields([sectionNode({ label: 'A', description: 'Tell us who you are.' })]),
    );
    expect(firstElement(definition).options).toEqual({ description: 'Tell us who you are.' });
  });

  it('omits options entirely when there is no description', () => {
    const definition = serializeModel(withFields([sectionNode({ label: 'A' })]));
    expect(firstElement(definition)).not.toHaveProperty('options');
  });

  it('does NOT emit options.description for a group container', () => {
    // Group's renderer reads options.description, but wiring its serialization is separate
    // in-flight work — Group's output must stay byte-identical (doc 172, rule 10).
    const definition = serializeModel(
      withFields([
        { kind: 'container', layout: 'group', label: 'G', description: 'ignored', children: [] },
      ]),
    );
    expect(firstElement(definition)).not.toHaveProperty('options');
    expect(firstElement(definition).label).toBe('G');
  });

  it('parses a "Section" element back into a section container', () => {
    const model = parseModel(serializeModel(withFields([sectionNode({ label: 'A' })])));
    const node = model.fields[0] as ContainerNode;
    expect(node.kind).toBe('container');
    expect(node.layout).toBe('section');
    expect(node.label).toBe('A');
  });

  it('recovers the description from options on parse', () => {
    const definition = serializeModel(
      withFields([sectionNode({ label: 'A', description: 'Sub-heading' })]),
    );
    const node = parseModel(definition).fields[0] as ContainerNode;
    expect(node.description).toBe('Sub-heading');
  });

  it('round-trips a section container with children unchanged', () => {
    const original = sectionNode({
      label: 'Applicant details',
      description: 'Tell us who you are.',
      children: [
        {
          kind: 'control',
          fieldType: 'text',
          key: 'first_name',
          label: 'First name',
          required: false,
          options: {},
        },
      ],
    });
    const node = parseModel(serializeModel(withFields([original]))).fields[0] as ContainerNode;
    expect(node).toEqual(original);
  });

  it('serializes controls nested in a section into schema.properties', () => {
    // A container contributes no schema of its own, but its children still must.
    const definition = serializeModel(
      withFields([
        sectionNode({
          children: [
            {
              kind: 'control',
              fieldType: 'text',
              key: 'first_name',
              label: 'First name',
              required: true,
              options: {},
            },
          ],
        }),
      ]),
    );
    expect(definition.schema.properties).toHaveProperty('first_name');
    expect(definition.schema.required).toContain('first_name');
  });
});
