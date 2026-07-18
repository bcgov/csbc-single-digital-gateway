import { describe, expect, it } from 'vitest';
import { serializeModel, parseModel } from '@/components/form-builder/model-codec';
import type { FormModel } from '@/components/form-builder/model';

describe('model-codec serialization/parsing round-trip', () => {
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
    // Discards completely invalid formats, but falls back to text control for missing schema props
    expect(parsed.fields).toHaveLength(1);
    expect((parsed.fields[0] as any).key).toBe('non_existent');
    expect((parsed.fields[0] as any).fieldType).toBe('text');
  });
});
