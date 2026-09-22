import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { Tabs } from '@repo/ui/tabs';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { allowedInLayout } from '../src/renderers/gridstack/grid-layouts';
import { TabStrip } from '../src/renderers/gridstack/tab-strip';
import type { TabsEditor, TabsGesture } from '../src/renderers/gridstack/tabs-editor';
import { INSPECTOR_FIELDS } from '../src/studio/inspector/inspector-fields';
import { LAYOUT_FIELDS } from '../src/studio/inspector/layout-fields';
import type { InspectorContext } from '../src/studio/inspector/inspector-context';
import type { InspectorField } from '../src/studio/inspector/inspector-fields';
import { TAB_FIELDS } from '../src/studio/inspector/tab-fields';
import { createElementIds } from '../src/studio/layout/element-ids';
import { addTargetId, insertElement } from '../src/studio/layout/insert-element';
import { removeElement } from '../src/studio/layout/remove-element';
import { PALETTE_TEMPLATES } from '../src/studio/palette/palette-templates';
import { openTabOnPath } from '../src/studio/use-tabs-document';
import { formFor, sections } from './inspector-fixtures';
import { renderSeededStudio } from './render-studio';
import { richText } from './rich-text-fixtures';

// Doc 216 rules 6-8, 14-20, 31, 33-34 — authoring a Tabs in the Form Studio.
//
// TEST TRAP (CLAUDE.md doc 187): the right panel renders the inspector even while closed, so canvas
// queries must be scoped to [data-slot="form-studio-center-panel"].
// TEST TRAP (CLAUDE.md doc 216 rules 19-20): jsdom drives no native HTML5 drag, so a reorder is exercised
// through the strip's own handlers with a hand-built DataTransfer; real drags are hand-verified.

/** Doc 184 rule 19: entering and leaving preview are two buttons, so one matcher finds whichever shows. */
const PREVIEW_BUTTON = /^(Preview|Exit preview)$/;

const schema: JsonSchema = {
  type: 'object',
  properties: {
    aaaaaaaa: { type: 'string', title: 'First field' },
    cccccccc: { type: 'string', title: 'Third field' },
  },
};

const el = (element: object) => element as UISchemaElement;
const control = (key: string) => ({ type: 'Control', scope: `#/properties/${key}` });
const tab = (label: string, elements: object[] = []) => ({
  type: 'Tab',
  label,
  elements: [{ type: 'TabContent', elements }],
});

/** A Form holding one Tabs of three tabs; the first and third hold a field. */
const tabsDocument = () =>
  el({
    type: 'Form',
    label: 'Untitled form',
    elements: [
      {
        type: 'Tabs',
        elements: [
          tab('Tab 1', [control('aaaaaaaa')]),
          tab('Tab 2'),
          tab('Tab 3', [control('cccccccc')]),
        ],
      },
    ],
  });

type Node = UISchemaElement & {
  elements?: Node[];
  label?: string;
  options?: Record<string, unknown>;
};

const childrenOf = (element: Node | undefined) => element?.elements ?? [];
/** Every element of `type` anywhere in the tree. */
const allOf = (element: Node, type: string): Node[] => [
  ...(element.type === type ? [element] : []),
  ...childrenOf(element).flatMap((child) => allOf(child, type)),
];

// ---------------------------------------------------------------------------------------------
// The studio, rendered on that document.

const centreOf = (container: HTMLElement) => {
  const centre = container.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]');
  if (!centre) throw new Error('no centre panel');
  return centre;
};

const itemOf = (element: Element) => {
  const item = element.closest<HTMLElement>('[data-slot="studio-grid-item"]');
  if (!item) throw new Error('not inside a studio grid item');
  return item;
};

/** Selection is a pointer press on the element's studio frame, released (doc 183, doc 187 rule 27). */
const select = (element: Element) => {
  fireEvent.pointerDown(element);
  fireEvent.pointerUp(document);
};

interface StudioView {
  readonly centre: HTMLElement;
  readonly saved: () => Node;
  readonly triggers: () => HTMLElement[];
  readonly openTab: () => string;
  readonly breadcrumbs: () => string;
}

/**
 * The studio on `uischema`, plus the readers every test below shares. `onSaveDocument` is how the WRITTEN
 * document is asserted (doc 200 rule 22): the canvas shows what renders, the save channel shows what is stored.
 */
async function studioOn(uischema: UISchemaElement = tabsDocument()): Promise<StudioView> {
  const documents: Node[] = [];
  const view = renderSeededStudio({
    schema,
    uischema,
    onSaveDocument: (document) => {
      documents.push(document.uischema as Node);
    },
  });
  const centre = centreOf(view.container);
  await screen.findByRole('button', { name: 'Add tab' });

  const triggers = () => within(centre).getAllByRole('tab');
  return {
    centre,
    saved: () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      const last = documents.at(-1);
      if (!last) throw new Error('nothing saved');
      return last;
    },
    triggers,
    openTab: () => {
      const open = triggers().find((trigger) => trigger.getAttribute('aria-selected') === 'true');
      return open?.textContent ?? '';
    },
    breadcrumbs: () =>
      document.querySelector<HTMLElement>('[data-studio-breadcrumbs]')?.textContent ?? '',
  };
}

/** The panel of the open tab — Base UI mounts only that one. */
const panelOf = (centre: HTMLElement) => {
  const panel = within(centre).getByRole('tabpanel');
  return panel;
};

// ---------------------------------------------------------------------------------------------
// The strip on its own, for the gestures jsdom cannot drive through the studio.

const stubEditor = (onGesture: (gesture: TabsGesture) => void): TabsEditor => ({
  idOf: () => 'el-tabs',
  onGesture,
  openTabId: () => undefined,
});

const STRIP_TABS = [
  { value: 'a', label: 'Tab 1' },
  { value: 'b', label: 'Tab 2' },
  { value: 'c', label: 'Tab 3' },
];

const renderStrip = (editor: TabsEditor | null, openValue = 'a') =>
  render(
    <Tabs value={openValue}>
      <TabStrip tabs={STRIP_TABS} editor={editor} tabsId="el-tabs" />
    </Tabs>,
  );

/**
 * A DataTransfer good enough for the strip's three handlers: jsdom builds none, and the drag carries exactly
 * one private type (rule 19). Written by `dragstart`, read by `dragover` / `drop`, so a reorder is exercised as
 * the round trip it really is rather than with the MIME type spelled out twice.
 */
function dataTransfer() {
  const store = new Map<string, string>();
  return {
    effectAllowed: 'none',
    dropEffect: 'none',
    get types() {
      return [...store.keys()];
    },
    setData: (type: string, value: string) => void store.set(type, value),
    getData: (type: string) => store.get(type) ?? '',
  };
}

describe('the TabsEditor port (rule 14)', () => {
  it('shows the + only when a TabsEditor provider is present', async () => {
    const { centre } = await studioOn();
    // The studio canvas provides one (StudioCanvas), so the strip is editable.
    expect(within(centre).getByRole('button', { name: 'Add tab' })).toBeInTheDocument();

    // Preview renders the same document with NO provider — the absence IS the static strip, never a mode flag.
    fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
    await waitFor(() => expect(within(centre).getAllByRole('tab')).toHaveLength(3));
    expect(within(centre).queryByRole('button', { name: 'Add tab' })).toBeNull();
  });

  it('makes the triggers draggable only under an editor', async () => {
    const { centre } = await studioOn();
    for (const trigger of within(centre).getAllByRole('tab'))
      expect(trigger).toHaveAttribute('draggable', 'true');

    fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
    await waitFor(() =>
      expect(within(centre).queryByRole('button', { name: 'Add tab' })).toBeNull(),
    );
    for (const trigger of within(centre).getAllByRole('tab'))
      expect(trigger).toHaveAttribute('draggable', 'false');
  });

  it('emits an add-tab gesture from the +, naming the Tabs it belongs to', () => {
    const onGesture = vi.fn<(gesture: TabsGesture) => void>();
    renderStrip(stubEditor(onGesture));

    fireEvent.click(screen.getByRole('button', { name: 'Add tab' }));

    expect(onGesture).toHaveBeenCalledExactlyOnceWith({ type: 'add-tab', tabsId: 'el-tabs' });
  });

  it('emits an open-tab gesture rather than holding the open tab itself', async () => {
    // Rule 17: under an editor the open tab is the STUDIO's answer, so a trigger press is a selection change.
    const { centre, breadcrumbs } = await studioOn();
    fireEvent.click(within(centre).getAllByRole('tab')[2] as HTMLElement);

    await waitFor(() => expect(breadcrumbs()).toContain('Tab 3'));
  });
});

describe('adding a tab (rules 15-16)', () => {
  it('appends a Tab with its TabContent in ONE edit', async () => {
    const { centre, saved } = await studioOn();
    fireEvent.click(within(centre).getByRole('button', { name: 'Add tab' }));
    await waitFor(() => expect(within(centre).getAllByRole('tab')).toHaveLength(4));

    const tabs = allOf(saved(), 'Tabs')[0];
    expect(childrenOf(tabs).map((child) => child.label)).toEqual([
      'Tab 1',
      'Tab 2',
      'Tab 3',
      'Tab 4',
    ]);
    // The pair arrives together: a trigger is never in the document without a panel behind it.
    const added = childrenOf(tabs)[3];
    expect(childrenOf(added).map((child) => child.type)).toEqual(['TabContent']);
    expect(childrenOf(childrenOf(added)[0])).toEqual([]);
  });

  it('pairs the new trigger with a rendered panel immediately', async () => {
    const { centre } = await studioOn();
    fireEvent.click(within(centre).getByRole('button', { name: 'Add tab' }));

    const added = await within(centre).findByRole('tab', { name: 'Tab 4' });
    // Base UI mounts only the ACTIVE panel, and the new tab is it — so the pair is visible at once.
    expect(panelOf(centre)).toHaveAttribute('aria-labelledby', added.id);
  });

  it('selects the new Tab, which is what opens it (rules 16-17)', async () => {
    const { centre, openTab, breadcrumbs } = await studioOn();
    fireEvent.click(within(centre).getByRole('button', { name: 'Add tab' }));

    await waitFor(() => expect(breadcrumbs()).toContain('Tab 4'));
    expect(openTab()).toBe('Tab 4');
  });

  it('numbers the new tab against its own strip', async () => {
    const { centre } = await studioOn();
    const add = within(centre).getByRole('button', { name: 'Add tab' });
    fireEvent.click(add);
    await within(centre).findByRole('tab', { name: 'Tab 4' });
    fireEvent.click(add);

    expect(await within(centre).findByRole('tab', { name: 'Tab 5' })).toBeInTheDocument();
  });
});

describe('the open tab is derived (rule 17)', () => {
  /** The ids of a fresh tree, so `openTabOnPath` is asked the same questions the studio asks it. */
  function pure() {
    const ids = createElementIds();
    const root = tabsDocument() as Node;
    const tabs = allOf(root, 'Tabs')[0] as Node;
    const tabElements = childrenOf(tabs);
    const third = tabElements[2] as Node;
    return {
      ids,
      root,
      tabsId: ids.idOf(tabs),
      tabIds: tabElements.map((element) => ids.idOf(element)),
      thirdField: allOf(third, 'Control')[0] as Node,
    };
  }

  it('returns the Tab on the path to the selected element', () => {
    const { ids, root, tabsId, tabIds, thirdField } = pure();

    expect(openTabOnPath(root, tabsId, ids.idOf(thirdField), ids)).toBe(tabIds[2]);
    // The Tab itself is on its own path.
    expect(openTabOnPath(root, tabsId, tabIds[0] as string, ids)).toBe(tabIds[0]);
  });

  it('returns undefined when the selection is elsewhere, leaving the fallback to the renderer', () => {
    const { ids, root, tabsId } = pure();

    expect(openTabOnPath(root, tabsId, null, ids)).toBeUndefined();
    // The selection IS the Tabs: there is no next element on the path, so no tab is forced open.
    expect(openTabOnPath(root, tabsId, tabsId, ids)).toBeUndefined();
    expect(openTabOnPath(root, tabsId, ids.idOf(root), ids)).toBeUndefined();
    expect(openTabOnPath(root, tabsId, 'el-nothing', ids)).toBeUndefined();
  });

  it('keeps the third tab open when a field inside it is selected — one answer for the whole subtree', () => {
    // BUG (reported, not worked around here): the STUDIO never acts on this answer for a selection-only
    // change — `TabsElement` is memoised by JSONForms on its uischema, so nothing re-renders the strip until
    // the document changes. The derivation itself is what rule 17 specifies, and it is right.
    const { ids, root, tabsId, tabIds, thirdField } = pure();
    const thirdPanel = allOf(root, 'TabContent')[2] as Node;

    for (const selected of [thirdField, thirdPanel])
      expect(openTabOnPath(root, tabsId, ids.idOf(selected), ids)).toBe(tabIds[2]);
  });

  it('opens the tab the selection lands in when the document changes under it', async () => {
    const { centre, openTab } = await studioOn();
    // Adding is a document edit, so the strip re-renders and shows the derivation at work: the new Tab is
    // selected, and it is therefore the open one — no second write, and nothing stored.
    fireEvent.click(within(centre).getByRole('button', { name: 'Add tab' }));

    await waitFor(() => expect(openTab()).toBe('Tab 4'));
    expect(within(centre).getAllByRole('tab')).toHaveLength(4);
  });

  it('authors no id on a Tab, and stores no open-tab option', async () => {
    const { centre, saved } = await studioOn();
    fireEvent.click(within(centre).getByRole('button', { name: 'Add tab' }));
    await within(centre).findByRole('tab', { name: 'Tab 4' });

    const written = saved();
    for (const element of allOf(written, 'Tab')) expect(element.options?.['id']).toBeUndefined();
    // Nothing on the Tabs remembers which tab was open either — the value is a per-mount studio id.
    const tabs = allOf(written, 'Tabs')[0] as Node;
    expect(Object.keys(tabs.options ?? {})).toEqual([]);
  });
});

describe('the panel is a drop target (rule 1)', () => {
  it('inserts a clicked palette element into the OPEN TabContent', async () => {
    const { centre, saved } = await studioOn();
    // Doc 189 rule 24: a clicked template lands beside the selection, which is the open Tab's own field —
    // so the layout it lands in is that tab's panel, exactly as a drop on it would be.
    select(itemOf(await within(centre).findByRole('textbox', { name: 'First field' })));

    const palette = document.querySelector<HTMLElement>('[data-studio-palette]');
    if (!palette) throw new Error('no palette');
    fireEvent.click(within(palette).getByRole('button', { name: 'Text' }));

    const added = await within(centre).findByRole('textbox', { name: 'Text 1*' });
    expect(panelOf(centre)).toContainElement(added);
    const panels = allOf(saved(), 'TabContent');
    expect(childrenOf(panels[0]).map((child) => child.type)).toEqual(['Control', 'Control']);
    // And nowhere else: the other panels are untouched.
    expect(childrenOf(panels[1])).toEqual([]);
    expect(childrenOf(panels[2])).toHaveLength(1);
  });

  it('refuses a Form and a Service in a panel, as in any other layout', () => {
    // A panel's kind is `vertical`, so the refusal has to come from the type itself (NEVER_IN_LAYOUT).
    const ancestors = ['Form', 'Tabs', 'Tab', 'TabContent'];
    expect(allowedInLayout('Form', 'vertical', ancestors)).toBe(false);
    expect(allowedInLayout('Service', 'vertical', ancestors)).toBe(false);
    // What a panel DOES take is everything a VerticalLayout takes.
    expect(allowedInLayout('Control', 'vertical', ancestors)).toBe(true);
    expect(allowedInLayout('Separator', 'vertical', ancestors)).toBe(true);
  });
});

describe('deleting a tab (rule 18)', () => {
  /** Rule 18: a Tab is removed by the EXISTING element delete — `tabs-edits.ts` exports nothing for it. */
  const removeTab = (index: number) => {
    const ids = createElementIds();
    const uischema = tabsDocument();
    const tabs = allOf(uischema as Node, 'Tabs')[0] as Node;
    const target = childrenOf(tabs)[index] as Node;
    const next = removeElement({ schema, uischema }, ids.idOf(target), ids);
    return { ids, uischema: next.uischema as Node };
  };

  it('takes the Tab and its panel out together, leaving its siblings', () => {
    const { uischema } = removeTab(1);

    const tabs = allOf(uischema, 'Tabs')[0] as Node;
    expect(childrenOf(tabs).map((child) => child.label)).toEqual(['Tab 1', 'Tab 3']);
    // The panel goes with its trigger, because it was never a sibling of it.
    expect(allOf(uischema, 'TabContent')).toHaveLength(2);
  });

  it('leaves a Tabs with no Tab rather than refusing the last delete', () => {
    let uischema = tabsDocument() as Node;
    for (let index = 2; index >= 0; index -= 1) {
      const ids = createElementIds();
      const tabs = allOf(uischema, 'Tabs')[0] as Node;
      const target = childrenOf(tabs)[index] as Node;
      uischema = removeElement({ schema, uischema }, ids.idOf(target), ids).uischema as Node;
    }

    const tabs = allOf(uischema, 'Tabs')[0] as Node;
    expect(tabs).toBeDefined();
    expect(childrenOf(tabs)).toEqual([]);
  });

  it('reclaims the data properties the deleted panel used', () => {
    const ids = createElementIds();
    const uischema = tabsDocument();
    const tabs = allOf(uischema as Node, 'Tabs')[0] as Node;
    const first = childrenOf(tabs)[0] as Node;
    const next = removeElement({ schema, uischema }, ids.idOf(first), ids);

    // The existing delete already walks the removed subtree, so a panel's fields go with it.
    expect(Object.keys(next.schema.properties ?? {})).toEqual(['cccccccc']);
  });

  it('needs no open-tab repair: the strip falls back to the first remaining tab', async () => {
    // Rule 17's payoff. The studio has no Delete affordance for a Tab (see the report), so the fallback is
    // exercised the way the renderer sees it: an open tab the derivation no longer answers for.
    const ids = createElementIds();
    const uischema = tabsDocument();
    const tabs = allOf(uischema as Node, 'Tabs')[0] as Node;
    const third = childrenOf(tabs)[2] as Node;
    const selectedId = ids.idOf(allOf(third, 'Control')[0] as Node);
    const tabsId = ids.idOf(tabs);
    expect(openTabOnPath(uischema, tabsId, selectedId, ids)).toBe(ids.idOf(third));

    const next = removeElement({ schema, uischema }, ids.idOf(third), ids).uischema;
    expect(openTabOnPath(next, tabsId, selectedId, ids)).toBeUndefined();
  });
});

describe('reordering tabs (rules 19-20)', () => {
  it('emits a reorder-tabs gesture from a trigger drag', () => {
    const onGesture = vi.fn<(gesture: TabsGesture) => void>();
    renderStrip(stubEditor(onGesture));
    const [first, , third] = screen.getAllByRole('tab');
    const transfer = dataTransfer();

    // The private MIME type is written by the drag and read back by the drop, so the round trip is the test.
    fireEvent.dragStart(third as HTMLElement, { dataTransfer: transfer });
    expect(transfer.types).toEqual(['application/x-sdg-tab-index']);
    fireEvent.drop(first as HTMLElement, { dataTransfer: transfer });

    expect(onGesture).toHaveBeenCalledExactlyOnceWith({
      type: 'reorder-tabs',
      tabsId: 'el-tabs',
      from: 2,
      to: 0,
    });
  });

  it('ignores a drop that is not one of ours, and a drop back on the same tab', () => {
    const onGesture = vi.fn<(gesture: TabsGesture) => void>();
    renderStrip(stubEditor(onGesture));
    const [first, , third] = screen.getAllByRole('tab');

    const foreign = dataTransfer();
    foreign.setData('text/plain', '2');
    fireEvent.drop(first as HTMLElement, { dataTransfer: foreign });

    const ours = dataTransfer();
    fireEvent.dragStart(third as HTMLElement, { dataTransfer: ours });
    fireEvent.drop(third as HTMLElement, { dataTransfer: ours });

    expect(onGesture).not.toHaveBeenCalled();
  });

  it('emits nothing at all without an editor — a static strip cannot reorder', () => {
    renderStrip(null);
    const triggers = screen.getAllByRole('tab');

    for (const trigger of triggers) expect(trigger).toHaveAttribute('draggable', 'false');
    expect(screen.queryByRole('button', { name: 'Add tab' })).toBeNull();
  });

  it('carries nodrag on the strip controls so a gridstack item does not claim the press', async () => {
    const { centre } = await studioOn();

    // Rule 20: a Tabs can sit inside a gridstack item, whose draggable would otherwise take the press.
    for (const trigger of within(centre).getAllByRole('tab')) {
      expect(trigger).toHaveClass('nodrag', 'pointer-events-auto');
    }
    // The `+` also sits on a Flow-less canvas that pans from any press, so it carries `nopan` too.
    expect(within(centre).getByRole('button', { name: 'Add tab' })).toHaveClass(
      'nodrag',
      'nopan',
      'pointer-events-auto',
    );
  });
});

/** Just enough context for a field's `applies`, `read` and `write`; these fields read nothing else. */
const ctxFor = (element: UISchemaElement) => ({ element }) as unknown as InspectorContext;

const field = (key: string): InspectorField => {
  const found = TAB_FIELDS.find((entry) => entry.key === key);
  if (!found) throw new Error(`no ${key} field`);
  return found;
};

describe('the inspector (rules 6-8, 34)', () => {
  const writeOn = (key: string, element: UISchemaElement, value: unknown) => {
    const edit = { element } as unknown as Parameters<InspectorField['write']>[1];
    return field(key).write(ctxFor(element), edit, value).element as Node;
  };

  /** The inspector form for the nth Tab, and for the Tabs itself, of a fresh document. */
  const formForNth = (type: 'Tab' | 'Tabs' | 'TabContent', index = 0) => {
    const uischema = tabsDocument();
    const target = allOf(uischema as Node, type)[index] as UISchemaElement;
    return formFor(target, uischema, schema).form;
  };

  it('writes NO Label or Gap field of its own — both key off the layout kind (rule 1)', () => {
    // Rule 1's payoff, and the whole reason a panel is registered as a second type of the `vertical` kind:
    // the generic fields already apply to it, so `TAB_FIELDS` holds only what is genuinely new.
    expect(INSPECTOR_FIELDS.find((entry) => entry.key === 'label')).toBeDefined();
    expect(TAB_FIELDS.map((entry) => entry.key)).not.toContain('label');
    expect(TAB_FIELDS.map((entry) => entry.key)).not.toContain('gap');

    // REPORTED, not worked around here: only the panel has a kind — `KIND_BY_TYPE` holds `TabContent`, not
    // `Tab` — so the generic Label does NOT reach the trigger, and a tab cannot be renamed in the inspector.
    const panelKeys = sections(formForNth('TabContent')).flatMap(([, keys]) => keys);
    expect(panelKeys).toContain('label');
  });

  it('shows a rich text Description for a Tab, stored at options.description', () => {
    // Doc 207 rule 31: the rich text property shape IS what dispatches the control.
    const descriptionSchema = field('tabDescription').schema(ctxFor(el(tab('Tab 1')))) as {
      type: string;
      required: string[];
    };
    expect(descriptionSchema.type).toBe('object');
    expect(descriptionSchema.required).toEqual(['root']);

    const value = richText('Tell us about this tab');
    expect(writeOn('tabDescription', el(tab('Tab 1')), value).options?.['description']).toBe(value);
    // Rules 6-8: authored and stored, and emptied back out rather than stored as an empty document.
    expect(
      writeOn('tabDescription', el({ ...tab('Tab 1'), options: { description: value } }), undefined)
        .options?.['description'],
    ).toBeUndefined();
    expect(field('tabDescription').applies(ctxFor(el({ type: 'Tabs', elements: [] })))).toBe(false);
  });

  it('keys that field tabDescription, never description (rule 7)', () => {
    // `description` is already a bound property's Description field; one key names one inspector value.
    expect(TAB_FIELDS.map((entry) => entry.key)).toContain('tabDescription');
    expect(TAB_FIELDS.map((entry) => entry.key)).not.toContain('description');
    expect(sections(formForNth('Tab')).flatMap(([, keys]) => keys)).toContain('tabDescription');
  });

  it('shows Gap for a selected TabContent, likewise with no new field', () => {
    const gap = LAYOUT_FIELDS.find((entry) => entry.key === 'gap');
    expect(gap).toBeDefined();
    expect(sections(formForNth('TabContent')).flatMap(([, keys]) => keys)).toContain('gap');
  });

  it('shows a Component picker of Tabs and List for a selected Tabs (rule 34)', () => {
    const component = TAB_FIELDS.find((entry) => entry.label === 'Component');
    if (!component) throw new Error('no Component field');
    expect(component.section).toBe('appearance');
    // Rule 34: it is the TABS's field, never a Tab's — and never `control-components.ts`, which is keyed by
    // the schema type a CONTROL binds to.
    expect(component.applies(ctxFor(el({ type: 'Tabs', elements: [] })))).toBe(true);
    expect(component.applies(ctxFor(el(tab('Tab 1'))))).toBe(false);

    const componentSchema = component.schema(ctxFor(el({ type: 'Tabs', elements: [] }))) as {
      oneOf: { const: string; title: string }[];
    };
    expect(componentSchema.oneOf).toEqual([
      { const: 'tabs', title: 'Tabs' },
      { const: 'list', title: 'List' },
    ]);
    expect(sections(formForNth('Tabs')).flatMap(([, keys]) => keys)).toContain(component.key);
  });

  it('writes options.component for list and REMOVES it for the default', () => {
    const component = TAB_FIELDS.find((entry) => entry.label === 'Component');
    if (!component) throw new Error('no Component field');
    const write = (element: UISchemaElement, value: string) => {
      const edit = { element } as unknown as Parameters<InspectorField['write']>[1];
      return component.write(ctxFor(element), edit, value).element as Node;
    };

    expect(write(el({ type: 'Tabs', elements: [] }), 'list').options?.['component']).toBe('list');
    // The default is indistinguishable from never having left it (the Gap and Variant fields' rule).
    expect(
      write(el({ type: 'Tabs', elements: [], options: { component: 'list' } }), 'tabs').options?.[
        'component'
      ],
    ).toBeUndefined();
  });

  it('reaches those fields from a Tab and a Tabs selected in the studio', async () => {
    const view = renderSeededStudio({ schema, uischema: tabsDocument() });
    const centre = centreOf(view.container);
    const inspector = view.container.querySelector<HTMLElement>('[data-studio-inspector]');
    if (!inspector) throw new Error('no inspector');
    const panel = within(inspector);

    // A Tab is selected by its trigger — the `open-tab` gesture IS a selection change (rule 17).
    fireEvent.click(await within(centre).findByRole('tab', { name: 'Tab 2' }));
    expect(await panel.findByText('Description')).toBeInTheDocument();
    // Rule 34: the Component picker belongs to the Tabs, not to a Tab.
    expect(panel.queryByRole('combobox', { name: 'Component' })).toBeNull();

    select(itemOf(within(centre).getByRole('tab', { name: 'Tab 1' })));
    expect(await panel.findByRole('combobox', { name: 'Component' })).toBeInTheDocument();
  });
});

const toggles = () => screen.queryByRole('group', { name: 'Tabs display' });
const asList = () => screen.getByRole('button', { name: 'Show as a list' });
const asTabs = () => screen.getByRole('button', { name: 'Show as tabs' });
const preview = () => fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));

describe('the preview Tabs / List override (rules 31, 33)', () => {
  it('is absent on the canvas — the override is a PREVIEW control, never an authoring one', async () => {
    await studioOn();
    expect(toggles()).toBeNull();
  });

  it('is absent when the previewed root holds no Tabs (rule 33)', async () => {
    // The built-in sample is a Form with no Tabs anywhere in it.
    renderSeededStudio();
    await screen.findByRole('textbox', { name: 'Name' });
    preview();

    await waitFor(() => expect(screen.getByRole('button', { name: /Exit preview/ })).toBeVisible());
    expect(toggles()).toBeNull();
  });

  it('appears in preview when it does, with NOTHING pressed (rule 31)', async () => {
    const { centre } = await studioOn();
    preview();

    await waitFor(() => expect(toggles()).not.toBeNull());
    // Starting on `tabs` would silently override an authored `list` the moment preview opened.
    expect(asTabs()).toHaveAttribute('aria-pressed', 'false');
    expect(asList()).toHaveAttribute('aria-pressed', 'false');
    // Named like the mode toggles beside it (`preview-mode-${id}`), so the header reads as one set.
    expect(asTabs()).toHaveAttribute('data-slot', 'preview-tabs-tabs');
    expect(asList()).toHaveAttribute('data-slot', 'preview-tabs-list');
    expect(within(centre).getAllByRole('tab')).toHaveLength(3);
  });

  it('forces the other shape without touching the document, and clears when pressed again', async () => {
    const { centre, saved } = await studioOn();
    preview();
    await waitFor(() => expect(toggles()).not.toBeNull());

    fireEvent.click(asList());
    await waitFor(() => expect(within(centre).queryAllByRole('tab')).toHaveLength(0));
    expect(asList()).toHaveAttribute('aria-pressed', 'true');
    // Rule 30's inverse: the override is not authored, so the document still says nothing about it.
    fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
    await within(centre).findAllByRole('tab');
    const tabs = allOf(saved(), 'Tabs')[0] as Node;
    expect(tabs.options?.['component']).toBeUndefined();
  });

  it('clears the override on leaving preview (rule 31)', async () => {
    const { centre } = await studioOn();
    preview();
    await waitFor(() => expect(toggles()).not.toBeNull());
    fireEvent.click(asList());
    await waitFor(() => expect(within(centre).queryAllByRole('tab')).toHaveLength(0));

    fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
    await within(centre).findAllByRole('tab');
    preview();

    await waitFor(() => expect(toggles()).not.toBeNull());
    // A leftover override would misreport what the form actually is.
    expect(asList()).toHaveAttribute('aria-pressed', 'false');
    expect(within(centre).getAllByRole('tab')).toHaveLength(3);
  });
});

const inPalette = () => {
  const palette = document.querySelector<HTMLElement>('[data-studio-palette]');
  if (!palette) throw new Error('no palette');
  return within(palette);
};

describe('the palette (rule 13)', () => {
  it('lists Tabs in the Layout group', async () => {
    await studioOn();
    const layout = inPalette().getByRole('group', { name: 'Layout' });

    expect(within(layout).getByRole('button', { name: 'Tabs' })).toBeInTheDocument();
    expect(PALETTE_TEMPLATES.find((entry) => entry.key === 'tabs')?.group).toBe('layout');
  });

  it('lists no Tab and no TabContent — a tab is made by the + alone (rule 10)', async () => {
    await studioOn();

    expect(inPalette().queryByRole('button', { name: 'Tab' })).toBeNull();
    expect(inPalette().queryByRole('button', { name: 'Tab content' })).toBeNull();
    const labels = PALETTE_TEMPLATES.map((entry) => entry.label);
    expect(labels).toContain('Tabs');
    expect(labels).not.toContain('Tab');
    expect(labels).not.toContain('Tab content');
  });

  it('inserts a Tabs carrying one Tab with one TabContent', async () => {
    const view = renderSeededStudio({
      schema,
      uischema: el({ type: 'Form', label: 'Untitled form', elements: [] }),
      onSaveDocument: () => {},
    });
    const centre = centreOf(view.container);
    fireEvent.click(inPalette().getByRole('button', { name: 'Tabs' }));

    // One tab, so the element does something the moment it lands.
    const trigger = await within(centre).findByRole('tab', { name: 'Tab 1' });
    expect(within(centre).getAllByRole('tab')).toHaveLength(1);
    expect(panelOf(centre)).toHaveAttribute('aria-labelledby', trigger.id);

    const built = PALETTE_TEMPLATES.find((entry) => entry.key === 'tabs');
    expect(built?.label).toBe('Tabs');
  });
});

// ---------------------------------------------------------------------------------------------
// Doc 216 rules 35-38 — found by running the studio in a browser, after every test above passed.

describe('found by hand (rules 35-38)', () => {
  it('leaves a Tabs neither inert nor locked, so its strip and panel stay live (rule 35)', async () => {
    const view = await studioOn();
    const frame = view.centre.querySelector('[data-element-type="Tabs"]');
    const content = frame?.querySelector('[data-slot="studio-content"]');

    expect(content).not.toBeNull();
    // `inert` on an ancestor cannot be undone below it, so the strip's `pointer-events-auto` is worthless
    // under one. jsdom cannot hit-test, so the ATTRIBUTE is the only thing a test can see — which is exactly
    // why this shipped: a scripted `.click()` ignores `inert` and every other test here passed.
    expect(content?.hasAttribute('inert')).toBe(false);
    /**
     * And NOT locked either. `pointer-events-none` over the subtree is why the fields inside a panel could
     * not be selected or dragged in and out — the same reason a gridstack layout is exempt, since a tab's
     * panel IS a grid. The trade-off is the one every gridstack layout already accepts: a Tabs is dragged by
     * its frame rather than by its body.
     */
    expect(content?.className ?? '').not.toContain('pointer-events-none');
  });

  it('switches the open tab when a trigger is clicked (rule 37)', async () => {
    const view = await studioOn();
    expect(view.openTab()).toBe('Tab 1');

    fireEvent.click(view.triggers()[1] as HTMLElement);

    // The regression this pins is NOT the derivation (tested directly above) but its DELIVERY: the editor is
    // read through a ref, JSONForms memoises the renderer on its uischema, and a selection-only change left
    // the strip on the old tab while the breadcrumb moved. Tabs could not be switched on the canvas at all.
    await waitFor(() => expect(view.openTab()).toBe('Tab 2'));
    expect(view.breadcrumbs()).toContain('Tab 2');
  });

  it('gives a Tab an inspector Label (rule 36)', () => {
    const tab = { type: 'Tab', label: 'Tab 1', elements: [{ type: 'TabContent', elements: [] }] };
    const label = INSPECTOR_FIELDS.find((field) => field.key === 'label');
    const ctx = { element: tab, layoutKind: undefined } as unknown as InspectorContext;

    // The layout kind sits on the TabContent while the NAME sits on the Tab, so the generic Label field —
    // which applies to a Control, a Flow element, or anything with a layoutKind — matched none of the three
    // and a tab could not be renamed.
    expect(label?.applies(ctx)).toBe(true);
    expect(ctx.layoutKind).toBeUndefined();
  });

  it('keeps the open tab when the selection names no tab at all (rule 17b)', async () => {
    const view = await studioOn();
    const [, second] = view.triggers();

    fireEvent.pointerDown(second as HTMLElement);
    await waitFor(() => expect(view.openTab()).toContain('Tab 2'));

    // Selecting the Tabs ITSELF resolves to no Tab. Falling back to the first tab here meant the strip
    // snapped back to Tab 1 whenever the author clicked the element, empty space in the open panel, or
    // anywhere else on the canvas — while still standing inside the tab they were working in.
    const frame = view.centre.querySelector('[data-element-type="Tabs"]');
    fireEvent.pointerDown(frame as Element);
    await waitFor(() => expect(view.breadcrumbs()).not.toContain('Tab 2'));

    expect(view.openTab()).toContain('Tab 2');
  });

  it('still lets the selection WIN when it does name a tab (rule 17)', async () => {
    const view = await studioOn();
    const [, second] = view.triggers();

    fireEvent.pointerDown(second as HTMLElement);

    // The memory is a fallback, never a second source of truth: a selection that resolves to a Tab still
    // opens it, which is the whole point of deriving the open tab.
    await waitFor(() => expect(view.openTab()).toContain('Tab 2'));
  });

  it('selects the tab under the cursor on POINTERDOWN, not on mouseup (rule 40b)', () => {
    const gestures: TabsGesture[] = [];
    const view = renderStrip(stubEditor((gesture) => gestures.push(gesture)));
    const second = within(view.container).getAllByRole('tab')[1] as HTMLElement;

    fireEvent.pointerDown(second);

    // The studio selects on pointerdown too, and a press on the strip resolves to the Tabs — so the bar
    // selected the FIRST tab on the way down and corrected itself on the way up.
    expect(gestures).toEqual([{ type: 'open-tab', tabId: 'b' }]);
  });

  it('shows a dashed empty view naming the tab, which IS the drop target (rules 41, 41b)', async () => {
    // The seeded document's first tab HAS a field, so the empty view belongs to a tab that does not.
    const uischema = el({
      type: 'Form',
      elements: [{ type: 'Tabs', elements: [tab('Personal details')] }],
    });
    const view = await studioOn(uischema);
    const empty = view.centre.querySelector('[data-slot="tab-empty"]');

    expect(empty).not.toBeNull();
    // The tab's own name, not "<name> Tab" — which read as "Tab 2 Tab" for a default name.
    expect(empty?.textContent).toContain('Personal details');
    expect(empty?.textContent).not.toContain('Personal details Tab');
    expect(empty?.className).toContain('border-dashed');

    // Rule 41b: the box IS the drop target — the grid is stretched to fill it and the caption is an overlay
    // that takes no pointer events, so a drop lands anywhere in the dashed area.
    expect(empty?.className).toContain('[&_.grid-stack]:min-h-16');
    expect(empty?.querySelector('.grid-stack')).not.toBeNull();
    const caption = empty?.querySelector('.pointer-events-none');
    expect(caption?.className).toContain('absolute');
    // Doc 194's rule: the caption is centred by its CONTAINER, never by stretching a child.
    expect(caption?.className).toContain('items-center');
    expect(empty?.className).not.toContain('h-full');
  });

  it('moves the other tabs out of the way while one is dragged (rule 19b)', () => {
    const view = renderStrip(stubEditor(() => {}));
    const order = () =>
      within(view.container)
        .getAllByRole('tab')
        .map((t) => t.textContent ?? '');
    const transfer = dataTransfer();
    const [first, , third] = within(view.container).getAllByRole('tab');

    fireEvent.dragStart(first as HTMLElement, { dataTransfer: transfer });
    fireEvent.dragOver(third as HTMLElement, { dataTransfer: transfer });

    // The strip shows the order the drop will produce, not just where the pointer is — without this a native
    // drag gives no feedback at all, since the document does not change until the drop.
    expect(order()[2]).toContain('Tab 1');
    expect(view.container.querySelector('[data-dragging]')?.textContent).toContain('Tab 1');

    // And the preview never outlives the drag.
    fireEvent.dragEnd(third as HTMLElement, { dataTransfer: transfer });
    expect(order()[0]).toContain('Tab 1');
    expect(view.container.querySelector('[data-dragging]')).toBeNull();
  });

  it('inserts into the open tab panel when a Tabs or a Tab is selected (rule 39)', () => {
    const ids = createElementIds();
    const uischema = tabsDocument();
    const tabsEl = (uischema as Node).elements?.[0] as Node;
    const tab = tabsEl.elements?.[0] as Node;
    const panel = tab.elements?.[0] as Node;

    // Neither a Tabs nor a Tab is a layout kind, so the old "selection if it is a layout, else its parent"
    // walked UP to something that could hold nothing and the insert was refused — a panel with no way in.
    expect(addTargetId(uischema, ids.idOf(tab), ids)).toBe(ids.idOf(panel));
    expect(addTargetId(uischema, ids.idOf(tabsEl), ids)).toBe(ids.idOf(panel));

    const result = insertElement(
      { schema, uischema },
      'text',
      { gridId: addTargetId(uischema, ids.idOf(tab), ids) },
      ids,
      () => 'newField',
    );
    expect(result.inserted).toBeDefined();
  });

  it('selects the Tab on every trigger click, including the open one (rule 40)', () => {
    const gestures: TabsGesture[] = [];
    const view = renderStrip(
      stubEditor((gesture) => gestures.push(gesture)),
      'a',
    );

    // Base UI fires `onValueChange` only when the value CHANGES, so the already-open tab emitted nothing and
    // the first tab — the only tab a new Tabs has — could never be selected, named or described.
    fireEvent.click(within(view.container).getAllByRole('tab')[0] as HTMLElement);

    expect(gestures).toEqual([{ type: 'open-tab', tabId: 'a' }]);
  });

  it("keys the Component field 'tabsComponent', not the reader's name (rule 38)", () => {
    // The rename sweep turned the KEY into `tabsComponentOf`, the reader function's name, because both matched
    // the same pattern. It typechecks and the key is only ever compared to itself, so nothing failed.
    expect(TAB_FIELDS.map((field) => field.key)).toContain('tabsComponent');
    expect(TAB_FIELDS.map((field) => field.key)).not.toContain('tabsComponentOf');
  });

  it('offers a Delete on EVERY tab under an editor, which asks before removing (rule 18)', () => {
    const gestures: TabsGesture[] = [];
    const view = renderStrip(
      stubEditor((gesture) => gestures.push(gesture)),
      'b',
    );

    // A Tab is not a grid item, so it never gets the actions popover — without this control there is no way
    // to delete a tab at all. On EVERY tab (user, 2026-09-22), not only the open one: a control an author has
    // to go looking for is one they will not find, and deleting a tab you are not standing on is ordinary.
    const removes = view.container.querySelectorAll('[data-slot="tab-strip-remove"]');
    expect(removes).toHaveLength(STRIP_TABS.length);
    expect(removes[1]?.closest('[role="tab"]')?.textContent).toContain('Tab 2');

    fireEvent.click(removes[1] as Element);
    // It ASKS: the gesture routes to the same delete confirmation every other element uses.
    expect(gestures).toEqual([{ type: 'remove-tab', tabId: 'b' }]);
  });
});
