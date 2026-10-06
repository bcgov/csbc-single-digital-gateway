import { describe, expect, it } from 'vitest';
import {
  ROOT_GROUP,
  applyRecord,
  buildRecord,
  containerId,
  controlId,
  groupId,
} from '@/components/form-builder/dnd';
import { type FormModel } from '@/components/form-builder/model';
import { ctrl, container, rootKeys, childKeys } from '../support/testHelpers';

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
