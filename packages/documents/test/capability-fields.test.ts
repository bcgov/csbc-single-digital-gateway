import { describe, expect, it } from 'vitest';
import { applyCapabilities, capabilityForm } from '../src/studio/capabilities/capability-fields';
import type { CapabilityMap } from '../src/studio/capabilities/capability-types';
import type { DocumentContent } from '../src/studio/document-types';
import { inspectorTarget, type InspectorTarget } from '../src/studio/inspector/inspector-target';
import { control, form, funnel } from './funnel-fixtures';

const layout = { id: 'L', type: 'VerticalLayout', elements: [control('b')] };
const content: DocumentContent = {
  schema: {
    type: 'object',
    properties: { a: { type: 'string', title: 'A' }, b: { type: 'string', title: 'B' } },
  },
  variants: { default: form('F', 'Page', [control('a'), layout, { id: 's', type: 'Separator' }]) },
};
const target = (id: string | null, c: DocumentContent = content): InspectorTarget =>
  inspectorTarget(c, { pageSelectedId: id, focusedId: 'F', formId: 'F' })!;

const keys = (view: ReturnType<typeof capabilityForm>) =>
  Object.keys(view.schema['properties'] as object);
const groups = (view: ReturnType<typeof capabilityForm>) =>
  (view.uischema['elements'] as { label: string }[]).map((g) => g.label);
const values = (t: InspectorTarget, map?: CapabilityMap) => capabilityForm(t, map).data;

describe('capabilityForm (doc 258 rules 3-5)', () => {
  it('a field: This element only, with the granted defaults', () => {
    const view = capabilityForm(target('c-a'), undefined);
    expect(groups(view)).toEqual(['This element']);
    expect(keys(view)).toEqual(['edit', 'editFields', 'remove', 'move']);
    expect(view.data).toEqual({ edit: 'all', editFields: [], remove: true, move: true });
  });

  it('offers the element’s own inspector fields as Which settings', () => {
    const view = capabilityForm(target('c-a'), undefined);
    const props = view.schema['properties'] as Record<
      string,
      { items?: { oneOf: { const: string; title: string }[] } }
    >;
    const choices = props['editFields']!.items!.oneOf;
    expect(choices.map((c) => c.title)).toContain('Label');
    expect(choices.map((c) => c.const)).toContain('required');
  });

  it('a layout adds Its contents; no connections outside a Funnel', () => {
    const view = capabilityForm(target('L'), undefined);
    expect(groups(view)).toEqual(['This element', 'Its contents']);
    expect(keys(view)).toEqual([
      'edit',
      'editFields',
      'remove',
      'move',
      'cascade',
      'addChildren',
      'removeChildren',
      'reorderChildren',
    ]);
    expect(view.data['cascade']).toBe('descendants');
    expect(view.schema['required']).toEqual(['edit', 'cascade']);
  });

  it('the root never offers delete or move', () => {
    const view = capabilityForm(target(null), undefined);
    expect(keys(view)).not.toContain('remove');
    expect(keys(view)).not.toContain('move');
    expect(keys(view)).toContain('addChildren');
  });

  it('a Funnel root offers Can change connections', () => {
    const fun: DocumentContent = {
      ...content,
      variants: { default: funnel([form('F', 'Page')], []) },
    };
    const view = capabilityForm(
      inspectorTarget(fun, { pageSelectedId: null, focusedId: null, formId: null })!,
      undefined,
    );
    expect(keys(view)).toContain('edges');
  });

  it('a Separator has no editable settings: no edit / editFields', () => {
    expect(keys(capabilityForm(target('s'), undefined))).toEqual(['remove', 'move']);
  });

  it('reads the authored entry', () => {
    const map: CapabilityMap = { elements: { 'c-a': { edit: ['label'], remove: false } } };
    expect(capabilityForm(target('c-a'), map).data).toEqual({
      edit: 'some',
      editFields: ['label'],
      remove: false,
      move: true,
    });
  });
});

describe('applyCapabilities (doc 258 rules 6-8)', () => {
  it('returns the same map when nothing changed, and never writes an empty entry', () => {
    const map: CapabilityMap = { elements: {} };
    expect(applyCapabilities(map, target('c-a'), values(target('c-a'), map))).toBe(map);
    expect(applyCapabilities(undefined, target('c-a'), values(target('c-a')))).toBeUndefined();
  });

  it('writes the target entry: switches, Specific settings, None, Everything', () => {
    const t = target('c-a');
    let map = applyCapabilities(undefined, t, { ...values(t), remove: false });
    expect(map).toEqual({ elements: { 'c-a': { remove: false } } });
    map = applyCapabilities(map, t, { ...values(t, map), edit: 'some' });
    expect(map?.elements?.['c-a']).toEqual({ remove: false, edit: [] });
    map = applyCapabilities(map, t, { ...values(t, map), editFields: ['label'] });
    expect(map?.elements?.['c-a']?.edit).toEqual(['label']);
    const same = applyCapabilities(map, t, { ...values(t, map), editFields: ['label'] });
    expect(same).toBe(map);
    map = applyCapabilities(map, t, { ...values(t, map), edit: 'none' });
    expect(map?.elements?.['c-a']?.edit).toBe('none');
    map = applyCapabilities(map, t, { ...values(t, map), edit: 'all' });
    expect(map?.elements?.['c-a']?.edit).toBe('all');
  });

  it('cascades a CHANGED contents toggle with the scope from the same pass', () => {
    const t = target(null);
    const map = applyCapabilities(undefined, t, {
      ...values(t),
      cascade: 'children',
      removeChildren: false,
    });
    expect(map?.elements).toEqual({
      F: { cascade: 'children', removeChildren: false },
      'c-a': { remove: false },
      L: { remove: false },
      s: { remove: false },
    });
  });

  it('changing only the scope rewrites nothing below', () => {
    const t = target(null);
    const map = applyCapabilities(undefined, t, { ...values(t), cascade: 'self' });
    expect(map).toEqual({ elements: { F: { cascade: 'self' } } });
  });
});
