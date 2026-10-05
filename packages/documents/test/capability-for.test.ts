import { describe, expect, it } from 'vitest';
import {
  capabilityFor,
  mayAddTo,
  mayChangeEdges,
  mayEdit,
  mayMove,
  mayRemove,
} from '../src/studio/capabilities/capability-for';
import { FULLY_GRANTED, type CapabilityMap } from '../src/studio/capabilities/capability-types';
import { control, form, funnel } from './funnel-fixtures';

const name = control('name');
const page = form('F', 'Page', [name]);

describe('capabilityFor (doc 258 data model)', () => {
  it('is fully granted with no map, no entry, or an element without an id', () => {
    expect(capabilityFor(undefined, name)).toEqual(FULLY_GRANTED);
    expect(capabilityFor({ elements: { other: { remove: false } } }, name)).toEqual(FULLY_GRANTED);
    expect(capabilityFor({ elements: { '': { remove: false } } }, { type: 'Control' })).toEqual(
      FULLY_GRANTED,
    );
  });

  it('resolves granted → * → type → element, each overriding only what it states', () => {
    const map: CapabilityMap = {
      default: { '*': { move: false }, Control: { edit: 'none' } },
      elements: { 'c-name': { edit: ['label'], remove: false, cascade: 'self' } },
    };
    expect(capabilityFor(map, name)).toEqual({
      ...FULLY_GRANTED,
      move: false,
      edit: ['label'],
      remove: false,
    });
  });

  it('ignores null values and never resolves cascade', () => {
    const map = {
      elements: { 'c-name': { remove: null, cascade: 'self' } },
    } as unknown as CapabilityMap;
    expect(capabilityFor(map, name)).toEqual(FULLY_GRANTED);
  });

  it('mayEdit reads all / none / a list', () => {
    expect(mayEdit({ ...FULLY_GRANTED, edit: 'all' }, 'label')).toBe(true);
    expect(mayEdit({ ...FULLY_GRANTED, edit: 'none' }, 'label')).toBe(false);
    expect(mayEdit({ ...FULLY_GRANTED, edit: ['label'] }, 'label')).toBe(true);
    expect(mayEdit({ ...FULLY_GRANTED, edit: ['label'] }, 'required')).toBe(false);
  });
});

describe('gates', () => {
  const map: CapabilityMap = {
    elements: {
      F: { addChildren: false, removeChildren: false, reorderChildren: false },
      'c-name': { remove: true, move: true },
      fun: { edges: false },
    },
  };
  it('mayAddTo / mayRemove / mayMove / mayChangeEdges', () => {
    expect(mayAddTo(map, page)).toBe(false);
    expect(mayAddTo(undefined, page)).toBe(true);
    expect(mayRemove(map, name, page)).toBe(false);
    expect(mayRemove({ elements: { 'c-name': { remove: false } } }, name, page)).toBe(false);
    expect(mayRemove(undefined, name, page)).toBe(true);
    expect(mayMove(map, name, page, page)).toBe(false);
    expect(mayMove({ elements: { 'c-name': { move: false } } }, name, page, page)).toBe(false);
    expect(mayMove(undefined, name, page, page)).toBe(true);
    expect(mayChangeEdges(map, funnel([page], []))).toBe(false);
    expect(mayChangeEdges(undefined, funnel([page], []))).toBe(true);
  });
});
