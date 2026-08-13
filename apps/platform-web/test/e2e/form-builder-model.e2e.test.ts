import { describe, expect, it } from 'vitest';
import {
  FIELD_TYPES,
  createField,
  fieldKeyFromLabel,
  insertField,
  moveField,
  parseModel,
  serializeModel,
  uniqueKey,
  type ContainerNode,
  type ControlNode,
  type FormModel,
} from '@/components/form-builder/model';

const ctrl = (key: string): ControlNode => ({ ...createField('text'), key, label: key });
const container = (children: ControlNode[] = []): ContainerNode => ({
  kind: 'container',
  layout: 'group',
  children,
});
const rootKeys = (m: FormModel) => m.fields.map((f) => (f.kind === 'control' ? f.key : 'GROUP'));
const childKeys = (m: FormModel, i: number) => {
  const f = m.fields[i];
  return f && f.kind === 'container'
    ? f.children.map((c) => (c.kind === 'control' ? c.key : ''))
    : [];
};

const EMPTY = {
  schema: { type: 'object', properties: {}, required: [] },
  uischema: { type: 'VerticalLayout', elements: [] },
};

describe('Form Builder Model Integration Test Suite', () => {
  describe('parseModel', () => {
    it('parses an empty template into an empty model', () => {
      const model = parseModel(EMPTY);
      expect(model.title).toBe('');
      expect(model.description).toBe('');
      expect(model.fields).toEqual([]);
    });

    it('reads form title/description from schema.title and schema.description', () => {
      const model = parseModel({
        schema: {
          type: 'object',
          title: 'Apply',
          description: 'Fill this in',
          properties: {},
          required: [],
        },
        uischema: { type: 'VerticalLayout', elements: [] },
      });
      expect(model.title).toBe('Apply');
      expect(model.description).toBe('Fill this in');
    });

    it('parses a control into a control field node with its key, label and required flag', () => {
      const model = parseModel({
        schema: {
          type: 'object',
          properties: { full_name: { type: 'string', title: 'Full name' } },
          required: ['full_name'],
        },
        uischema: {
          type: 'VerticalLayout',
          elements: [{ type: 'Control', scope: '#/properties/full_name', label: 'Full name' }],
        },
      });
      expect(model.fields).toHaveLength(1);
      const field = model.fields[0];
      expect(field).toMatchObject({
        kind: 'control',
        key: 'full_name',
        label: 'Full name',
        required: true,
      });
    });
  });

  describe('serializeModel', () => {
    it('writes form title/description to schema.title/schema.description', () => {
      const model: FormModel = { title: 'Apply', description: 'Desc', fields: [] };
      const { schema } = serializeModel(model);
      expect(schema).toMatchObject({ type: 'object', title: 'Apply', description: 'Desc' });
    });

    it('emits a string property + a Control for a text field', () => {
      const text = createField('text');
      text.key = 'email';
      text.label = 'Email';
      const { schema, uischema } = serializeModel({ title: '', description: '', fields: [text] });
      expect((schema.properties as Record<string, unknown>).email).toMatchObject({
        type: 'string',
      });
      expect(uischema.elements).toEqual([
        expect.objectContaining({ type: 'Control', scope: '#/properties/email' }),
      ]);
    });

    it('lists required fields in schema.required', () => {
      const a = { ...createField('text'), key: 'a', label: 'A', required: true };
      const b = { ...createField('text'), key: 'b', label: 'B', required: false };
      const { schema } = serializeModel({ title: '', description: '', fields: [a, b] });
      expect(schema.required).toEqual(['a']);
    });

    it('emits oneOf/const/title options for a select field', () => {
      const select = createField('select');
      select.key = 'colour';
      select.enumOptions = [
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' },
      ];
      const { schema } = serializeModel({ title: '', description: '', fields: [select] });
      expect(
        (schema.properties as Record<string, { oneOf?: { const: string; title: string }[] }>).colour
          ?.oneOf,
      ).toEqual([
        { const: 'red', title: 'Red' },
        { const: 'blue', title: 'Blue' },
      ]);
    });
  });

  describe('round-trip', () => {
    it('parse(serialize(model)) preserves a model with mixed field types', () => {
      const model: FormModel = {
        title: 'Survey',
        description: 'Tell us',
        fields: [
          { ...createField('text'), key: 'name', label: 'Name', required: true },
          { ...createField('number'), key: 'age', label: 'Age', required: false },
          { ...createField('boolean'), key: 'agree', label: 'Agree', required: true },
        ],
      };
      expect(parseModel(serializeModel(model))).toEqual(model);
    });
  });

  describe('key helpers', () => {
    it('derives a valid snake-ish key from a label', () => {
      expect(fieldKeyFromLabel('Full Name!')).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
      expect(fieldKeyFromLabel('Full Name')).toBe('full_name');
    });

    it('makes a key unique against existing keys', () => {
      expect(uniqueKey('email', ['email'])).not.toBe('email');
      expect(uniqueKey('email', [])).toBe('email');
    });
  });

  describe('FIELD_TYPES', () => {
    it('includes core, advanced, rich-text and layout entries', () => {
      const ids = FIELD_TYPES.map((t) => t.id);
      for (const id of ['text', 'number', 'boolean', 'select', 'date']) {
        expect(ids).toContain(id);
      }
      // Feature 158: Multiline folded into Text (single/multi-line toggle).
      expect(ids).not.toContain('multiline');
      for (const id of ['radio', 'checkboxes', 'slider', 'daterange', 'time', 'datetime']) {
        expect(ids).toContain(id);
      }
      // Feature 156 Step 1: the standalone Toggle field folded into Boolean's "Display as" option.
      expect(ids).not.toContain('toggle');
      // Feature 156 Step 2: Multi-select + One-of collapsed into Select (single/multi) + Checkbox group.
      expect(ids).not.toContain('multiselect');
      expect(ids).not.toContain('oneof');
      expect(ids).toContain('richtext');
      for (const id of ['group', 'horizontal', 'grid']) {
        expect(ids).toContain(id);
      }
    });
  });

  describe('insertField', () => {
    it('inserts a control at a root index', () => {
      const model: FormModel = { title: '', description: '', fields: [ctrl('a'), ctrl('b')] };
      const next = insertField(model, ctrl('c'), { container: null, index: 1 });
      expect(rootKeys(next)).toEqual(['a', 'c', 'b']);
    });

    it('inserts a control into a container at an index', () => {
      const model: FormModel = { title: '', description: '', fields: [container([ctrl('x')])] };
      const next = insertField(model, ctrl('y'), { container: 0, index: 0 });
      expect(childKeys(next, 0)).toEqual(['y', 'x']);
    });
  });

  describe('moveField', () => {
    it('reorders within root, adjusting the index for the removal', () => {
      const model: FormModel = {
        title: '',
        description: '',
        fields: [ctrl('a'), ctrl('b'), ctrl('c')],
      };
      const next = moveField(model, [0], { container: null, index: 2 });
      expect(rootKeys(next)).toEqual(['b', 'a', 'c']);
    });

    it('moves a root control into a container (target index re-based after removal)', () => {
      const model: FormModel = { title: '', description: '', fields: [ctrl('a'), container([])] };
      const next = moveField(model, [0], { container: 1, index: 0 });
      expect(rootKeys(next)).toEqual(['GROUP']);
      expect(childKeys(next, 0)).toEqual(['a']);
    });

    it('moves a child out of a container back to root', () => {
      const model: FormModel = {
        title: '',
        description: '',
        fields: [container([ctrl('x')]), ctrl('b')],
      };
      const next = moveField(model, [0, 0], { container: null, index: 2 });
      expect(rootKeys(next)).toEqual(['GROUP', 'b', 'x']);
      expect(childKeys(next, 0)).toEqual([]);
    });

    it('never nests a container inside another container (clamps to root)', () => {
      const model: FormModel = {
        title: '',
        description: '',
        fields: [container([]), container([])],
      };
      const next = moveField(model, [0], { container: 1, index: 0 });
      expect(next.fields).toHaveLength(2);
      expect(next.fields.every((f) => f.kind === 'container')).toBe(true);
      expect(next.fields.every((f) => f.kind === 'container' && f.children.length === 0)).toBe(
        true,
      );
    });
  });
});
