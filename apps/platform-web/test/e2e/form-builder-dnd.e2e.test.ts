import { describe, expect, it } from 'vitest';
import {
  ROOT_GROUP,
  applyRecord,
  buildRecord,
  containerId,
  controlId,
  groupId,
} from '@/components/form-builder/dnd';
import {
  createField,
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

describe('Form Builder Dnd Integration Test Suite', () => {
  it('buildRecord maps root controls + container children into groups', () => {
    const model: FormModel = {
      title: '',
      description: '',
      fields: [ctrl('a'), container([ctrl('x'), ctrl('y')])],
    };
    expect(buildRecord(model)).toEqual({
      [ROOT_GROUP]: [controlId('a'), containerId(1)],
      [groupId(1)]: [controlId('x'), controlId('y')],
    });
  });

  it('applyRecord(buildRecord) is a round-trip', () => {
    const model: FormModel = {
      title: 'T',
      description: 'D',
      fields: [ctrl('a'), container([ctrl('x')]), ctrl('b')],
    };
    expect(applyRecord(model, buildRecord(model))).toEqual(model);
  });

  it('applyRecord reorders root from a moved record', () => {
    const model: FormModel = {
      title: '',
      description: '',
      fields: [ctrl('a'), ctrl('b'), ctrl('c')],
    };
    const moved = { [ROOT_GROUP]: [controlId('b'), controlId('a'), controlId('c')] };
    expect(rootKeys(applyRecord(model, moved))).toEqual(['b', 'a', 'c']);
  });

  it('applyRecord moves a control into a container group', () => {
    const model: FormModel = { title: '', description: '', fields: [ctrl('a'), container([])] };
    // 'a' removed from root, placed into the container's group.
    const moved = { [ROOT_GROUP]: [containerId(1)], [groupId(1)]: [controlId('a')] };
    const next = applyRecord(model, moved);
    expect(rootKeys(next)).toEqual(['GROUP']);
    expect(childKeys(next, 0)).toEqual(['a']);
  });
});
