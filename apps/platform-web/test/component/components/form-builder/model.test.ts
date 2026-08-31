import { describe, expect, it } from 'vitest';
import {
  fieldKeyFromLabel,
  uniqueKey,
  createField,
  defaultFieldLabel,
  getNodeAt,
  insertField,
  moveField,
  newFieldKey,
  allKeys,
} from '@/components/form-builder/model';
import type { FormModel } from '@/components/form-builder/model';

describe('newFieldKey / defaultFieldLabel (feature 159)', () => {
  it('newFieldKey returns an 8-char nanoid', () => {
    const key = newFieldKey();
    expect(key).toHaveLength(8);
    expect(newFieldKey()).not.toBe(key); // unique
  });

  it('defaultFieldLabel numbers per field type', () => {
    const model: FormModel = {
      title: '',
      description: '',
      fields: [{ ...createField('text'), key: 'a' }],
    };
    expect(defaultFieldLabel(model, 'text')).toBe('Text 2'); // one Text exists → next is 2
    expect(defaultFieldLabel(model, 'number')).toBe('Number 1');
    expect(defaultFieldLabel(model, 'select')).toBe('Select 1');
  });
});

describe('Form Builder Model Component Test Suite', () => {
  describe('fieldKeyFromLabel', () => {
    it('slugifies labels to safe property keys', () => {
      expect(fieldKeyFromLabel('First Name')).toBe('first_name');
      expect(fieldKeyFromLabel('  First Name!!!  ')).toBe('first_name');
      expect(fieldKeyFromLabel('123 Numbers')).toBe('field_123_numbers');
      expect(fieldKeyFromLabel('')).toBe('field');
      expect(fieldKeyFromLabel('___Special___')).toBe('special');
    });
  });

  describe('uniqueKey', () => {
    it('returns key if unique, otherwise appends numeric suffix', () => {
      expect(uniqueKey('name', [])).toBe('name');
      expect(uniqueKey('name', ['other'])).toBe('name');
      expect(uniqueKey('name', ['name'])).toBe('name_2');
      expect(uniqueKey('name', ['name', 'name_2', 'name_3'])).toBe('name_4');
    });
  });

  describe('createField', () => {
    it('creates control node with defaults', () => {
      const node = createField('text');
      expect(node).toEqual({
        kind: 'control',
        key: '',
        fieldType: 'text',
        label: '',
        required: false,
        options: {},
      });
    });

    it('creates number field defaulting to decimal with min 0, no max, and 2 decimal places', () => {
      const node = createField('number');
      expect(node).toEqual({
        kind: 'control',
        key: '',
        fieldType: 'number',
        label: '',
        required: false,
        options: {},
        numberType: 'decimal',
        min: 0,
        decimalPlaces: 2,
      });
    });

    it('creates container layout with default empty children', () => {
      const node = createField('group');
      expect(node).toEqual({
        kind: 'container',
        layout: 'group',
        children: [],
      });
    });

    it('creates a grid container layout defaulting to 2 columns (feature 169)', () => {
      const node = createField('grid');
      expect(node).toEqual({
        kind: 'container',
        layout: 'grid',
        children: [],
        columns: 2,
      });
    });

    it('creates display node with format default value', () => {
      const node = createField('heading');
      expect(node.kind).toBe('display');
      if (node.kind === 'display') {
        expect(node.displayType).toBe('heading');
        expect(node.text).toBe('Heading');
        expect(node.level).toBe(2);
      }
    });
  });

  describe('getNodeAt', () => {
    const model: FormModel = {
      title: 'Form',
      description: 'Desc',
      fields: [
        {
          kind: 'control',
          key: 'username',
          label: 'User',
          fieldType: 'text',
          required: false,
          options: {},
        },
        {
          kind: 'container',
          layout: 'group',
          children: [
            {
              kind: 'control',
              key: 'email',
              label: 'Email',
              fieldType: 'text',
              required: false,
              options: {},
            },
          ],
        },
      ],
    };

    it('gets top-level and nested nodes correctly', () => {
      expect(getNodeAt(model, null)).toBeNull();
      expect(getNodeAt(model, [])).toBeNull();
      expect(getNodeAt(model, [0])).toEqual(model.fields[0]);
      expect(getNodeAt(model, [1, 0])).toEqual((model.fields[1] as any).children[0]);
      expect(getNodeAt(model, [99])).toBeNull();
      expect(getNodeAt(model, [0, 1])).toBeNull(); // control node cannot have children
    });
  });

  describe('insertField', () => {
    const initialModel: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          key: 'f1',
          label: 'F1',
          fieldType: 'text',
          required: false,
          options: {},
        },
        { kind: 'container', layout: 'group', children: [] },
      ],
    };

    it('inserts at top level root', () => {
      const newNode = createField('number');
      newNode.key = 'f2';

      const result = insertField(initialModel, newNode, { container: null, index: 1 });
      expect(result.fields).toHaveLength(3);
      expect(result.fields[1]?.kind).toBe('control');
      expect((result.fields[1] as any)?.key).toBe('f2');
    });

    it('inserts inside container', () => {
      const newNode = createField('number');
      newNode.key = 'f2';

      const result = insertField(initialModel, newNode, { container: 1, index: 0 });
      expect(result.fields).toHaveLength(2);
      const container = result.fields[1] as any;
      expect(container.children).toHaveLength(1);
      expect(container.children[0].key).toBe('f2');
    });
  });

  describe('moveField', () => {
    const initialModel: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          key: 'f1',
          label: 'F1',
          fieldType: 'text',
          required: false,
          options: {},
        },
        {
          kind: 'container',
          layout: 'group',
          children: [
            {
              kind: 'control',
              key: 'f2',
              label: 'F2',
              fieldType: 'text',
              required: false,
              options: {},
            },
          ],
        },
      ],
    };

    it('reorders top level fields', () => {
      const result = moveField(initialModel, [0], { container: null, index: 2 });
      expect(result.fields[0]?.kind).toBe('container');
      expect(result.fields[1]?.kind).toBe('control');
      expect((result.fields[1] as any)?.key).toBe('f1');
    });

    it('moves nested field out to root', () => {
      const result = moveField(initialModel, [1, 0], { container: null, index: 0 });
      expect(result.fields).toHaveLength(3);
      expect((result.fields[0] as any).key).toBe('f2');
      expect((result.fields[2] as any).children).toHaveLength(0);
    });

    it('moves root field into container', () => {
      const result = moveField(initialModel, [0], { container: 1, index: 0 });
      expect(result.fields).toHaveLength(1);
      const container = result.fields[0] as any;
      expect(container.children).toHaveLength(2);
      expect(container.children[0].key).toBe('f1');
      expect(container.children[1].key).toBe('f2');
    });
  });

  describe('allKeys', () => {
    it('returns flat array of all keys in control nodes, ignoring display nodes', () => {
      const model: FormModel = {
        title: '',
        description: '',
        fields: [
          {
            kind: 'control',
            key: 'f1',
            label: 'F1',
            fieldType: 'text',
            required: false,
            options: {},
          },
          { kind: 'display', id: 'd1', displayType: 'heading', text: '' },
          {
            kind: 'container',
            layout: 'group',
            children: [
              {
                kind: 'control',
                key: 'f2',
                label: 'F2',
                fieldType: 'text',
                required: false,
                options: {},
              },
              { kind: 'display', id: 'd2', displayType: 'paragraph', text: '' },
            ],
          },
        ],
      };

      expect(allKeys(model)).toEqual(['f1', 'f2']);
    });
  });

  describe('createField additional types', () => {
    it('creates paragraph display field', () => {
      const node = createField('paragraph');
      expect(node).toEqual({
        kind: 'display',
        displayType: 'paragraph',
        id: expect.any(String),
        text: 'Paragraph text',
      });
    });

    it('creates richtextdisplay display field', () => {
      const node = createField('richtextdisplay');
      expect(node).toEqual({
        kind: 'display',
        displayType: 'richtext',
        id: expect.any(String),
        text: '',
        content: null,
      });
    });

    it('creates a checkbox-group field with a user-friendly labelled option', () => {
      const node = createField('checkboxes');
      expect((node as any).enumOptions).toEqual([{ value: 'option_1', label: 'Option 1' }]);
    });

    it('creates a select field with a labelled option, defaulting to single choice', () => {
      const node = createField('select');
      expect((node as any).enumOptions).toEqual([{ value: 'option_1', label: 'Option 1' }]);
      expect((node as any).multiple).toBe(false);
    });

    it('creates slider field with range settings', () => {
      const node = createField('slider');
      expect(node).toEqual({
        kind: 'control',
        key: '',
        fieldType: 'slider',
        label: '',
        required: false,
        options: {},
        min: 0,
        max: 100,
        step: 1,
      });
    });
  });

  describe('insertField edge cases', () => {
    const initialModel: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          key: 'f1',
          label: 'F1',
          fieldType: 'text',
          required: false,
          options: {},
        },
      ],
    };

    it('inserts at root if target container is not a container node', () => {
      const newNode = createField('text');
      newNode.key = 'f2';
      const result = insertField(initialModel, newNode, { container: 0, index: 0 });
      expect(result.fields).toHaveLength(2);
      expect((result.fields[0] as any).key).toBe('f2');
    });

    it('inserts at root if inserting a container inside a container target', () => {
      const modelWithContainer: FormModel = {
        title: '',
        description: '',
        fields: [{ kind: 'container', layout: 'group', children: [] }],
      };
      const nestedContainer = createField('group');
      const result = insertField(modelWithContainer, nestedContainer, { container: 0, index: 0 });
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0]?.kind).toBe('container');
      expect(result.fields[1]?.kind).toBe('container');
    });
  });

  describe('moveField edge cases', () => {
    const initialModel: FormModel = {
      title: '',
      description: '',
      fields: [
        {
          kind: 'control',
          key: 'f1',
          label: 'F1',
          fieldType: 'text',
          required: false,
          options: {},
        },
        { kind: 'container', layout: 'group', children: [] },
      ],
    };

    it('returns unmodified model if path is invalid', () => {
      const result = moveField(initialModel, [999], { container: null, index: 0 });
      expect(result).toBe(initialModel);
    });

    it('moves container into another container but falls back to root', () => {
      const modelWithTwoContainers: FormModel = {
        title: '',
        description: '',
        fields: [
          { kind: 'container', layout: 'group', children: [], label: 'C1' },
          { kind: 'container', layout: 'group', children: [], label: 'C2' },
        ],
      };

      const result = moveField(modelWithTwoContainers, [0], { container: 1, index: 0 });
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0]?.kind).toBe('container');
      expect(result.fields[1]?.kind).toBe('container');
    });

    it('moves field into a non-container host but falls back to root', () => {
      const modelWithNonContainerTarget: FormModel = {
        title: '',
        description: '',
        fields: [
          {
            kind: 'control',
            key: 'f1',
            label: 'F1',
            fieldType: 'text',
            required: false,
            options: {},
          },
          {
            kind: 'control',
            key: 'f2',
            label: 'F2',
            fieldType: 'text',
            required: false,
            options: {},
          },
          { kind: 'container', layout: 'group', children: [] },
        ],
      };
      const result = moveField(modelWithNonContainerTarget, [0], { container: 1, index: 0 });
      expect(result.fields).toHaveLength(3);
      expect((result.fields[0] as any).key).toBe('f1');
    });

    it('does not modify model if moving nested field from a non-container parent', () => {
      const result = moveField(initialModel, [0, 1], { container: null, index: 0 });
      expect(result).toEqual(initialModel);
    });

    it('decrements index when moving a nested field to a later index in the same container', () => {
      const containerModel: FormModel = {
        title: '',
        description: '',
        fields: [
          {
            kind: 'container',
            layout: 'group',
            children: [
              {
                kind: 'control',
                key: 'child1',
                label: 'C1',
                fieldType: 'text',
                required: false,
                options: {},
              },
              {
                kind: 'control',
                key: 'child2',
                label: 'C2',
                fieldType: 'text',
                required: false,
                options: {},
              },
            ],
          },
        ],
      };
      const result = moveField(containerModel, [0, 0], { container: 0, index: 2 });
      const container = result.fields[0] as any;
      expect(container.children[0].key).toBe('child2');
      expect(container.children[1].key).toBe('child1');
    });
  });

  describe('getNodeAt additional edge cases', () => {
    it('returns null if child index does not exist in container', () => {
      const model: FormModel = {
        title: '',
        description: '',
        fields: [
          {
            kind: 'container',
            layout: 'group',
            children: [],
          },
        ],
      };
      expect(getNodeAt(model, [0, 99])).toBeNull();
    });

    it('covers host undefined branch in moveField when nested path parent is missing during clone', () => {
      let callCount = 0;
      const fieldsArray = [
        {
          kind: 'container',
          layout: 'group',
          children: [
            {
              kind: 'control',
              key: 'child1',
              label: 'C1',
              fieldType: 'text',
              required: false,
              options: {},
            },
          ],
        },
      ];

      const model = {
        title: '',
        description: '',
        get fields() {
          callCount++;
          if (callCount === 1) {
            return fieldsArray;
          } else {
            return [];
          }
        },
      };

      const result = moveField(model as any, [0, 0], { container: null, index: 0 });
      expect(result.fields).toHaveLength(1);
    });
  });
});
