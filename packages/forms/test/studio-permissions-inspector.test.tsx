import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CapabilityMap } from '../src/capabilities/capability-types';
import { inspectorContext } from '../src/studio/inspector/inspector-context';
import { inspectorForm } from '../src/studio/inspector/inspector-form';
import { applyPermissions, isPermissionKey } from '../src/studio/inspector/permission-fields';
import { createElementIds } from '../src/studio/layout/element-ids';
import { useStudioDocument } from '../src/studio/use-studio-document';

// Doc 220 — the Permissions inspector section. The FIRST inspector fields that write somewhere other
// than the selected element: they write the capability MAP.
//
// The section appears when the seeded document carries a `capabilities` half — no new prop (the
// package's "presence enables it" idiom), and an empty `{}` covers a template with no map yet.

const el = (element: object) => element as UISchemaElement;
const schema: JsonSchema = { type: 'object', properties: { a: { type: 'string', title: 'A' } } };

const control = () => el({ type: 'Control', id: 'ctl1', scope: '#/properties/a' });
const section = () => el({ type: 'Section', id: 'sec1', label: 'S', elements: [control()] });
const docWith = (...elements: UISchemaElement[]) =>
  el({ type: 'Form', id: 'root1', label: 'Untitled form', elements });

/** The labels of the groups inside the Permissions section, or `null` when there is no section. */
function permissionGroups(uischema: UISchemaElement): string[] | null {
  const groups = (uischema as { elements?: { label?: string; elements?: unknown[] }[] }).elements;
  const permissions = groups?.find((group) => group.label === 'Permissions');
  if (!permissions) return null;
  return (permissions.elements as { label?: string }[]).map((group) => group.label ?? '');
}

/** The permission field keys offered under one group label. */
function keysIn(uischema: UISchemaElement, groupLabel: string): string[] {
  const groups = (uischema as { elements?: { label?: string; elements?: unknown[] }[] }).elements;
  const permissions = groups?.find((group) => group.label === 'Permissions');
  const group = (
    permissions?.elements as { label?: string; elements?: unknown[] }[] | undefined
  )?.find((entry) => entry.label === groupLabel);
  return ((group?.elements ?? []) as { scope?: string }[]).map(
    (entry) => entry.scope?.replace('#/properties/', '') ?? '',
  );
}

const buildForm = (element: UISchemaElement, capabilities?: CapabilityMap) => {
  const ids = createElementIds();
  const uischema = docWith(element);
  const document = { schema, uischema };
  const form = inspectorForm(document, ids.idOf(element), ids, capabilities);
  return { ids, document, form: form! };
};

describe('showing the section', () => {
  it('shows Permissions when the seeded document carries a capabilities half', () => {
    const { form } = buildForm(control(), { default: {} });
    expect(permissionGroups(form.uischema)).toEqual(['This element']);
  });

  it('shows it for an EMPTY {} map — the template that has no map yet', () => {
    const { form } = buildForm(control(), {});
    expect(permissionGroups(form.uischema)).toEqual(['This element']);
  });

  it('does NOT show it when the document carries no capabilities half at all', () => {
    const { form } = buildForm(control(), undefined);
    expect(permissionGroups(form.uischema)).toBeNull();
  });
});

describe('the two labelled groups', () => {
  it('shows "This element" with edit / remove / move for a Control', () => {
    const { form } = buildForm(control(), {});
    expect(keysIn(form.uischema, 'This element')).toEqual([
      'perm_edit',
      'perm_editFields',
      'perm_remove',
      'perm_move',
    ]);
  });

  it('shows "Its contents" with the children verbs for a layout', () => {
    const { form } = buildForm(section(), {});
    expect(permissionGroups(form.uischema)).toEqual(['This element', 'Its contents']);
    expect(keysIn(form.uischema, 'Its contents')).toEqual([
      'perm_addChildren',
      'perm_removeChildren',
      'perm_reorderChildren',
    ]);
  });

  it('does NOT show the contents group for an element that cannot hold children (rule 9)', () => {
    const { form } = buildForm(control(), {});
    expect(permissionGroups(form.uischema)).toEqual(['This element']);
    expect(keysIn(form.uischema, 'Its contents')).toEqual([]);
  });

  it('offers edges only on a Flow', () => {
    const flow = el({ type: 'Flow', id: 'flow1', label: 'F', elements: [] });
    const ids = createElementIds();
    const form = inspectorForm({ schema, uischema: flow }, ids.idOf(flow), ids, {})!;
    expect(keysIn(form.uischema, 'Its contents')).toContain('perm_edges');
    expect(keysIn(buildForm(section(), {}).form.uischema, 'Its contents')).not.toContain(
      'perm_edges',
    );
  });

  it('shows every permission as GRANTED by default, so an author takes things away', () => {
    const { form } = buildForm(section(), {});
    expect(form.data['perm_edit']).toBe('all');
    expect(form.data['perm_remove']).toBe(true);
    expect(form.data['perm_addChildren']).toBe(true);
  });

  it('reveals the field picker through a RULE, not by dropping the control (doc 204 rule 9c)', () => {
    const { form } = buildForm(control(), {});
    const picker = (
      (
        form.uischema as { elements: { label?: string; elements: { elements: unknown[] }[] }[] }
      ).elements.find((group) => group.label === 'Permissions')!.elements[0]!.elements as {
        scope?: string;
        rule?: { effect?: string };
      }[]
    ).find((entry) => entry.scope?.endsWith('perm_editFields'));
    expect(picker?.rule?.effect).toBe('SHOW');
  });
});

describe('writing', () => {
  const ctxFor = (element: UISchemaElement) => {
    const ids = createElementIds();
    const document = { schema, uischema: docWith(element) };
    return { ids, document, ctx: inspectorContext(document, ids.idOf(element), ids)! };
  };

  it('writes to the capability map, keyed by the element’s authored id', () => {
    const { ctx } = ctxFor(control());
    const next = applyPermissions({}, ctx, { perm_remove: false });
    expect(next.elements?.['ctl1']).toEqual({ remove: false });
  });

  it('leaves the ELEMENT untouched — a permission is not an element setting (rule 8)', () => {
    const element = control();
    const { ctx } = ctxFor(element);
    applyPermissions({}, ctx, { perm_remove: false });
    expect(element).toEqual({ type: 'Control', id: 'ctl1', scope: '#/properties/a' });
  });

  it('returns the SAME map when nothing changed (rule 7)', () => {
    const { ctx } = ctxFor(control());
    const before: CapabilityMap = {};
    // Every value equals what the map already reads, so nothing is written.
    expect(applyPermissions(before, ctx, { perm_remove: true, perm_move: true })).toBe(before);
  });

  it('ignores an element with no authored id — nothing could resolve the entry', () => {
    const { ctx } = ctxFor(el({ type: 'Control', scope: '#/properties/a' }));
    const before: CapabilityMap = {};
    expect(applyPermissions(before, ctx, { perm_remove: false })).toBe(before);
  });

  it('keeps other elements’ entries when writing one', () => {
    const { ctx } = ctxFor(control());
    const before: CapabilityMap = { elements: { other1: { remove: false } } };
    const next = applyPermissions(before, ctx, { perm_remove: false });
    expect(next.elements?.['other1']).toEqual({ remove: false });
    expect(next.elements?.['ctl1']).toEqual({ remove: false });
  });

  it("writes edit: 'none' and an explicit field list", () => {
    const { ctx } = ctxFor(control());
    expect(applyPermissions({}, ctx, { perm_edit: 'none' }).elements?.['ctl1']).toEqual({
      edit: 'none',
    });
    const some = applyPermissions({}, ctx, { perm_editFields: ['label'] });
    expect(some.elements?.['ctl1']).toEqual({ edit: ['label'] });
  });

  it('splits permission keys from element keys by prefix, unambiguously', () => {
    expect(isPermissionKey('perm_remove')).toBe(true);
    expect(isPermissionKey('label')).toBe(false);
    expect(isPermissionKey('removeChildren')).toBe(false);
  });
});

// Rule 6 / the 219 lesson: an optional third key on the type every pure edit returns is dropped
// silently, with no type error. These pin that it survives real editing.
describe('capabilities survive the edit pipeline', () => {
  const seeded = (capabilities: CapabilityMap) => {
    const uischema = docWith(section());
    return renderHook(() => useStudioDocument({ schema, uischema, capabilities }));
  };

  it('keeps the map when an unrelated element edit runs', () => {
    const map: CapabilityMap = { elements: { sec1: { remove: false } } };
    const { result } = seeded(map);
    const target = (result.current.uischema as { elements: UISchemaElement[] }).elements[0]!;
    act(() => result.current.updateElement(result.current.ids.idOf(target), { label: 'Renamed' }));
    expect(result.current.capabilities?.elements?.['sec1']).toEqual({ remove: false });
  });

  it('keeps the map when an element is deleted', () => {
    const map: CapabilityMap = { elements: { sec1: { remove: false } } };
    const { result } = seeded(map);
    const target = (result.current.uischema as { elements: UISchemaElement[] }).elements[0]!;
    act(() => result.current.remove(result.current.ids.idOf(target)));
    expect(result.current.capabilities?.elements?.['sec1']).toEqual({ remove: false });
  });

  it('keeps the map across a code-panel replaceDocument', () => {
    const map: CapabilityMap = { elements: { sec1: { remove: false } } };
    const { result } = seeded(map);
    const next = JSON.parse(JSON.stringify(result.current.uischema)) as UISchemaElement;
    (next as { label?: string }).label = 'Changed';
    act(() => result.current.replaceDocument({ uischema: next }));
    expect(result.current.capabilities?.elements?.['sec1']).toEqual({ remove: false });
  });

  it('a document seeded with NO map still has none after editing', () => {
    const uischema = docWith(section());
    const { result } = renderHook(() => useStudioDocument({ schema, uischema }));
    const target = (result.current.uischema as { elements: UISchemaElement[] }).elements[0]!;
    act(() => result.current.updateElement(result.current.ids.idOf(target), { label: 'Renamed' }));
    expect(result.current.capabilities).toBeUndefined();
  });
});
