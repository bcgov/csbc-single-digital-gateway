import { describe, expect, it } from 'vitest';
import { applyRecord, buildRecord, displayId } from '@/components/form-builder/dnd';
import {
  allKeys,
  createField,
  parseModel,
  serializeModel,
  type ContainerNode,
  type ControlNode,
  type DisplayNode,
  type FormModel,
} from '@/components/form-builder/model';

const ctrl = (key: string): ControlNode => ({ ...createField('text'), key, label: key });

const model = (fields: FormModel['fields']): FormModel => ({
  title: '',
  description: '',
  fields,
});

describe('form-builder display fields', () => {
  describe('createField', () => {
    it('creates a heading display node with a stable id and default level 2', () => {
      const node = createField('heading') as DisplayNode;
      expect(node.kind).toBe('display');
      expect(node.displayType).toBe('heading');
      expect(node.level).toBe(2);
      expect(typeof node.id).toBe('string');
      expect(node.id.length).toBeGreaterThan(0);
    });

    it('creates paragraph and richtext display nodes (no schema key, no required)', () => {
      const para = createField('paragraph') as DisplayNode;
      const rich = createField('richtextdisplay') as DisplayNode;
      expect(para.kind).toBe('display');
      expect(para.displayType).toBe('paragraph');
      expect(rich.kind).toBe('display');
      expect(rich.displayType).toBe('richtext');
      // Display nodes never carry a schema key.
      expect((para as unknown as { key?: string }).key).toBeUndefined();
    });

    it('gives each created display node a distinct id', () => {
      const a = createField('heading') as DisplayNode;
      const b = createField('heading') as DisplayNode;
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('serializeModel', () => {
    it('emits a Label element for a heading and adds NO schema property', () => {
      const node: DisplayNode = {
        kind: 'display',
        displayType: 'heading',
        id: 'h1',
        text: 'Your details',
        level: 3,
      };
      const def = serializeModel(model([node]));
      const el = (def.uischema.elements as Record<string, unknown>[])[0];
      expect(el).toMatchObject({
        type: 'Label',
        text: 'Your details',
        options: { format: 'heading', level: 3 },
        i: 'h1',
      });
      expect(def.schema.properties).toEqual({});
      expect(def.schema.required).toEqual([]);
    });

    it('emits a Label with format=richtext carrying the Lexical content, empty text', () => {
      const content = { root: { children: [] } };
      const node: DisplayNode = {
        kind: 'display',
        displayType: 'richtext',
        id: 'r1',
        text: '',
        content,
      };
      const el = (serializeModel(model([node])).uischema.elements as Record<string, unknown>[])[0];
      expect(el).toMatchObject({ type: 'Label', options: { format: 'richtext', content } });
    });
  });

  describe('allKeys', () => {
    it('skips display nodes (they have no key)', () => {
      const m = model([ctrl('name'), createField('heading'), ctrl('email')]);
      expect(allKeys(m).toSorted()).toEqual(['email', 'name']);
    });
  });

  describe('round-trip (parseModel ∘ serializeModel)', () => {
    it('round-trips a mixed model with a display node inside a container', () => {
      const heading: DisplayNode = {
        kind: 'display',
        displayType: 'heading',
        id: 'h1',
        text: 'Section',
        level: 2,
      };
      const para: DisplayNode = {
        kind: 'display',
        displayType: 'paragraph',
        id: 'p1',
        text: 'Please answer below.',
      };
      const group: ContainerNode = {
        kind: 'container',
        layout: 'group',
        label: 'Group A',
        children: [para, ctrl('name')],
      };
      const original = model([heading, group]);
      const round = parseModel(serializeModel(original));
      expect(round).toEqual(original);
    });
  });

  describe('dnd record (buildRecord / applyRecord)', () => {
    it('addresses display nodes by displayId and round-trips them', () => {
      const heading = createField('heading') as DisplayNode;
      const m = model([heading, ctrl('name')]);
      const record = buildRecord(m);
      expect(record.root).toContain(displayId(heading.id));
      expect(applyRecord(m, record)).toEqual(m);
    });
  });
});
