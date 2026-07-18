import { describe, expect, it } from 'vitest';
import {
  fieldKeyFromLabel,
  uniqueKey,
  createField,
  getNodeAt,
  insertField,
  moveField,
  allKeys,
} from '@/components/form-builder/model';
import type { FormModel } from '@/components/form-builder/model';

describe('form-builder model helpers', () => {
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

    it('creates container layout with default empty children', () => {
      const node = createField('group');
      expect(node).toEqual({
        kind: 'container',
        layout: 'group',
        children: [],
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
});
