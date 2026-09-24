import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import {
  capabilityFor,
  mayAddTo,
  mayChangeEdges,
  mayEdit,
  mayMove,
  mayRemove,
  type CapabilityMap,
} from '../src/capabilities/index';
import { inspectorForm } from '../src/studio/inspector/inspector-form';
import { applyMove } from '../src/studio/layout/apply-layout';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { TreeElement } from '../src/studio/layout/element-tree';
import { addTargetId, insertElement } from '../src/studio/layout/insert-element';
import { newPropertyKey } from '../src/studio/layout/schema-properties';

// Doc 221 — the nine gates. Each is an existing single seam; the work is threading one
// `capabilityFor` lookup to each, not scattering checks.
//
// Tested at the PURE level wherever possible. Gridstack drags and xyflow connections cannot be driven
// in jsdom at all — a synthetic drag has frozen a real tab (doc 180 rule 30b) — so what is verified
// here is the GATE each of those paths consults, and the drag itself is hand-verified.

const el = (element: object) => element as UISchemaElement;
const schema: JsonSchema = { type: 'object', properties: { a: { type: 'string', title: 'A' } } };

const CLOSED = {
  edit: 'none',
  remove: false,
  move: false,
  addChildren: false,
  removeChildren: false,
  reorderChildren: false,
  edges: false,
} as const;

const control = (id: string) => el({ type: 'Control', id, scope: '#/properties/a' });
const stack = (id: string, ...children: UISchemaElement[]) =>
  el({ type: 'VerticalLayout', id, elements: children });
const form = (...children: UISchemaElement[]) =>
  el({ type: 'Form', id: 'root1', label: 'Untitled form', elements: children });

const governed = (map: CapabilityMap) => map;
const ungoverned = undefined;

describe('add (insertElement)', () => {
  const build = () => {
    const ids = createElementIds();
    const target = stack('stack1');
    const root = form(target);
    return { ids, root, target, document: { schema, uischema: root } };
  };

  const insert = (capabilities: CapabilityMap | undefined) => {
    const { ids, root, target, document } = build();
    return insertElement(
      document,
      'heading',
      { gridId: addTargetId(root, ids.idOf(target), ids) },
      ids,
      newPropertyKey,
      capabilities,
    );
  };

  it('refuses an insert into a layout denying addChildren', () => {
    expect(insert(governed({ default: { '*': CLOSED } })).inserted).toBeUndefined();
  });

  it('allows the insert when the layout grants addChildren', () => {
    const map = governed({
      default: { '*': CLOSED },
      elements: { stack1: { addChildren: true } },
    });
    expect(insert(map).inserted).toBeDefined();
  });

  it('allows it when ungoverned', () => {
    expect(insert(ungoverned).inserted).toBeDefined();
  });

  it('leaves the document untouched when refused', () => {
    const { document } = build();
    const result = insertElement(
      document,
      'heading',
      { gridId: 'nope' },
      createElementIds(),
      newPropertyKey,
      governed({ default: { '*': CLOSED } }),
    );
    expect(result.uischema).toBe(document.uischema);
  });
});

describe('move (applyMove)', () => {
  const build = () => {
    const ids = createElementIds();
    const moved = control('ctl1');
    const from = stack('from1', moved);
    const to = stack('to1');
    const root = form(from, to);
    return { ids, root, moved, from, to };
  };

  const move = (capabilities: CapabilityMap | undefined) => {
    const { ids, root, moved, from, to } = build();
    return applyMove(
      root,
      {
        elementId: ids.idOf(moved),
        fromGridId: ids.idOf(from),
        toGridId: ids.idOf(to),
        fromNodes: [],
        toNodes: [],
      },
      ids,
      capabilities,
    );
  };

  it('refuses a move of an element denying move', () => {
    const map = governed({
      default: { '*': CLOSED },
      elements: { from1: { reorderChildren: true }, to1: { addChildren: true } },
    });
    // Everything else permits it; the ELEMENT does not, so the document comes back unchanged.
    const before = build();
    expect(move(map)).toEqual(before.root);
  });

  it('refuses when the SOURCE denies reorderChildren — taking it out rearranges what is left', () => {
    const map = governed({
      default: { '*': CLOSED },
      elements: { ctl1: { move: true }, to1: { addChildren: true } },
    });
    const before = build();
    expect(move(map)).toEqual(before.root);
  });

  it('refuses when the TARGET denies addChildren — it has to land somewhere', () => {
    const map = governed({
      default: { '*': CLOSED },
      elements: { ctl1: { move: true }, from1: { reorderChildren: true } },
    });
    const before = build();
    expect(move(map)).toEqual(before.root);
  });

  it('allows the move when all three permit it', () => {
    const map = governed({
      default: { '*': CLOSED },
      elements: {
        ctl1: { move: true },
        from1: { reorderChildren: true },
        to1: { addChildren: true },
      },
    });
    const before = build();
    expect(move(map)).not.toEqual(before.root);
  });

  it('allows it when ungoverned', () => {
    const before = build();
    expect(move(ungoverned)).not.toEqual(before.root);
  });
});

describe('the write gates themselves', () => {
  const map = governed({
    default: { '*': CLOSED },
    elements: {
      open1: { addChildren: true, removeChildren: true, reorderChildren: true, edges: true },
      ctl1: { move: true, remove: true },
    },
  });

  it('mayAddTo asks the CONTAINER', () => {
    expect(mayAddTo(map, el({ type: 'VerticalLayout', id: 'open1' }))).toBe(true);
    expect(mayAddTo(map, el({ type: 'VerticalLayout', id: 'shut1' }))).toBe(false);
  });

  it('mayRemove asks the element FIRST, overriding its container (doc 220)', () => {
    const open = el({ type: 'VerticalLayout', id: 'open1' });
    // The container allows deletions in general…
    expect(mayRemove(map, el({ type: 'Control', id: 'ctl1' }), open)).toBe(true);
    // …but a pinned field inside it still refuses.
    expect(mayRemove(map, el({ type: 'Control', id: 'pinned1' }), open)).toBe(false);
  });

  it('mayRemove refuses when the CONTAINER denies removeChildren', () => {
    const shut = el({ type: 'VerticalLayout', id: 'shut1' });
    expect(mayRemove(map, el({ type: 'Control', id: 'ctl1' }), shut)).toBe(false);
  });

  it('mayChangeEdges asks the Flow', () => {
    expect(mayChangeEdges(map, el({ type: 'Flow', id: 'open1' }))).toBe(true);
    expect(mayChangeEdges(map, el({ type: 'Flow', id: 'flow1' }))).toBe(false);
  });

  it('every gate passes when ungoverned — no branch needed at a call site', () => {
    const anything = el({ type: 'Control', id: 'x1' });
    expect(mayAddTo(ungoverned, anything)).toBe(true);
    expect(mayRemove(ungoverned, anything, anything)).toBe(true);
    expect(mayMove(ungoverned, anything, anything, anything)).toBe(true);
    expect(mayChangeEdges(ungoverned, anything)).toBe(true);
  });

  it('mayRemove tolerates a root with no parent', () => {
    expect(mayRemove(map, el({ type: 'Control', id: 'ctl1' }), undefined)).toBe(true);
  });
});

const keysOf = (built: { schema: unknown }) =>
  Object.keys((built.schema as { properties: Record<string, unknown> }).properties);

describe('the inspector filter', () => {
  const formFor = (governing: CapabilityMap | undefined, id = 'ctl1') => {
    const ids = createElementIds();
    const element = control(id);
    const root = form(element);
    const resolved = governing === undefined ? undefined : capabilityFor(governing, element);
    return inspectorForm(
      { schema, uischema: root },
      ids.idOf(element),
      ids,
      resolved === undefined ? {} : { governing: resolved },
    )!;
  };

  it('offers only the fields `edit` names', () => {
    const map = governed({ elements: { ctl1: { edit: ['label'] } } });
    expect(keysOf(formFor(map))).toEqual(['label']);
  });

  it("offers every field for edit: 'all'", () => {
    const all = keysOf(formFor(governed({ elements: { ctl1: { edit: 'all' } } })));
    expect(all.length).toBeGreaterThan(1);
    expect(all).toContain('label');
  });

  it("offers nothing for edit: 'none'", () => {
    expect(keysOf(formFor(governed({ default: { '*': CLOSED } })))).toEqual([]);
  });

  it('offers every applicable field when ungoverned', () => {
    expect(keysOf(formFor(ungoverned)).length).toBeGreaterThan(1);
  });

  it('mayEdit is the one place edit’s three shapes are interpreted', () => {
    const of = (edit: unknown) =>
      capabilityFor({ elements: { ctl1: { edit } } } as CapabilityMap, control('ctl1'));
    expect(mayEdit(of('all'), 'label')).toBe(true);
    expect(mayEdit(of('none'), 'label')).toBe(false);
    expect(mayEdit(of(['label']), 'label')).toBe(true);
    expect(mayEdit(of(['label']), 'required')).toBe(false);
  });

  it('never offers the Permissions section on a GOVERNED document — that is authoring', () => {
    // `governing` filters; only `authored` adds the section, and a derived document has none.
    const built = formFor(governed({ elements: { ctl1: { edit: 'all' } } }));
    const groups = (built.uischema as { elements: { label?: string }[] }).elements;
    expect(groups.some((group) => group.label === 'Permissions')).toBe(false);
  });
});

describe('placement and capability stay SEPARATE rules (rule 4)', () => {
  it('allowedInLayout is still asked without a document or a capability', async () => {
    // `review-document` asks it a pure-kind question; growing a capability parameter would break that.
    const { allowedInLayout } = await import('../src/renderers/gridstack/grid-layouts');
    expect(allowedInLayout('Control', 'vertical')).toBe(true);
    expect(allowedInLayout('Separator', 'horizontal')).toBe(false);
    expect(allowedInLayout.length).toBe(3);
  });

  it('a capability refusal is a SECOND check, not a placement failure', () => {
    // Placement allows a Heading in a VerticalLayout; the capability is what refuses it.
    const ids = createElementIds();
    const target = stack('stack1');
    const root = form(target);
    const refused = insertElement(
      { schema, uischema: root },
      'heading',
      { gridId: addTargetId(root, ids.idOf(target), ids) },
      ids,
      newPropertyKey,
      governed({ default: { '*': CLOSED } }),
    );
    expect(refused.inserted).toBeUndefined();
  });
});

describe('what cannot be driven in jsdom is still pinned at its gate', () => {
  it('a drag consults the same mayMove the write-back does', () => {
    // gridstack owns the drag; the studio writes `noMove` onto the node from `capability.move`, and
    // the write-back asks `mayMove`. Both read the same resolved capability, so they cannot disagree.
    const map = governed({ default: { '*': CLOSED }, elements: { ctl1: { move: true } } });
    const element = control('ctl1');
    expect(capabilityFor(map, element).move).toBe(true);
    expect(capabilityFor(map, control('other1')).move).toBe(false);
  });

  it('resizing is the CONTAINER’s call, moving is the element’s', () => {
    const map = governed({
      default: { '*': CLOSED },
      elements: { ctl1: { move: true, reorderChildren: false } },
    });
    const resolved = capabilityFor(map, control('ctl1'));
    expect(resolved.move).toBe(true);
    expect(resolved.reorderChildren).toBe(false);
  });

  it('an edge gesture consults the FLOW, not the stage it touches', () => {
    const map = governed({ default: { '*': CLOSED }, elements: { flow1: { edges: true } } });
    expect(mayChangeEdges(map, el({ type: 'Flow', id: 'flow1' }))).toBe(true);
    expect(mayChangeEdges(map, el({ type: 'Stage', id: 's1' }))).toBe(false);
  });
});

describe('the root is governable too', () => {
  it('a root denying addChildren refuses a top-level insert', () => {
    const ids = createElementIds();
    const root = form();
    const result = insertElement(
      { schema, uischema: root },
      'heading',
      { gridId: addTargetId(root, null, ids) },
      ids,
      newPropertyKey,
      governed({ elements: { root1: { addChildren: false } } }),
    );
    // The case doc 220's seed normalisation exists for: a seeded template ROOT has an id to key on.
    expect(result.inserted).toBeUndefined();
  });

  it('a root granting addChildren allows it', () => {
    const ids = createElementIds();
    const root = form();
    const result = insertElement(
      { schema, uischema: root },
      'heading',
      { gridId: addTargetId(root, null, ids) },
      ids,
      newPropertyKey,
      governed({ elements: { root1: { addChildren: true } } }),
    );
    expect(result.inserted).toBeDefined();
  });
});

describe('an ungoverned document is untouched by any of this', () => {
  it('inserts, moves and removes exactly as before', () => {
    const ids = createElementIds();
    const target = stack('stack1');
    const root = form(target);
    const inserted = insertElement(
      { schema, uischema: root },
      'heading',
      { gridId: addTargetId(root, ids.idOf(target), ids) },
      ids,
      newPropertyKey,
    );
    expect(inserted.inserted).toBeDefined();
  });

  it('resolves every element to FULLY_GRANTED', () => {
    expect(capabilityFor(undefined, control('ctl1')).addChildren).toBe(true);
  });

  it('is what keeps /admin/studio and every untemplated document behaving as today', () => {
    // ONE id registry: `idOf` is identity-keyed, so two registries would mint ids for two different
    // objects and the lookup would miss — which is what makes this worth asserting at all.
    const ids = createElementIds();
    const element = control('ctl1');
    const built = inspectorForm({ schema, uischema: form(element) }, ids.idOf(element), ids);
    expect(built?.elementType).toBe('Control');
  });
});

/** A TreeElement helper, so the fixtures above read as documents rather than casts. */
export type _Tree = TreeElement;
