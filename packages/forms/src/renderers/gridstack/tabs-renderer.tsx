import type { Layout, LayoutProps, UISchemaElement } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { Heading } from '@repo/ui/heading';
import { Tabs, TabsContent } from '@repo/ui/tabs';
import { useContext, useState, type ReactNode } from 'react';
import { presentationOf } from '../ui/control-presentation';
import { tabsComponentOf, type TabsComponent } from './tabs-options';
import { useTabsOverride } from './tabs-override';
import { labelOf } from './element-label';
import { TAB_CONTENT_TYPE, TAB_TYPE } from './grid-layouts';
import { GAP_CLASS, layoutGapOf } from './layout-gap';
import { LayoutNestingContext } from './layout-nesting';
import { SectionDepthContext } from './section-depth-context';
import { sectionHeadingLevel } from './section-options';
import { TabStrip, type TabDescriptor } from './tab-strip';
import { useTabsEditor, type TabsEditor } from './tabs-editor';

// The `Tabs` renderer (doc 216 rules 2-5, 17, 21-27): a row of tabs and the open tab's panel.
//
// ONE component for every set, unlike `createSectionRenderer` and `createFormRenderer`, which are factories
// because the studio and a fillable form draw their CHILDREN with different vertical layout renderers. A
// Tabs's children are Tabs, and a Tab is dispatched back through JSONForms — so the
// registry in play decides whether a panel is a gridstack canvas or a CSS column, and there is nothing left
// for this component to be parameterised by.
//
// Pure of gridstack, so `renderers/default` may import it under doc 193's purity gate.

/**
 * Rule 25: `TabsContent` ships `text-xs/relaxed`, which fields inside would inherit — while `@repo/ui` base
 * styles size bare `p`, `li`, `dd` and `h1`-`h6` ON the element, so those would NOT shrink and the panel would
 * render at two sizes at once. `inherit` hands the size back to whatever encloses the Tabs, which is
 * the same fix `inputs/rich-text/shared.ts` takes for `p`.
 */
const PANEL_CLASS = 'text-[length:inherit] leading-[inherit]';

const elementsOf = (uischema: UISchemaElement): readonly UISchemaElement[] =>
  (uischema as Layout).elements ?? [];

/** Rule 13: only `Tab` children are tabs. A document authored otherwise draws what it legally can. */
const tabElementsOf = (uischema: UISchemaElement) =>
  elementsOf(uischema).filter((element) => element.type === TAB_TYPE);

/**
 * Rule 1: a Tab holds exactly one `TabContent`, and THAT is what the panel dispatches — the Tab itself is a
 * trigger and is never dispatched. `undefined` for a Tab authored without one, which draws an empty panel
 * rather than throwing: the metaschema requires the child, and a document that got past it anyway is still a
 * document someone has to open.
 */
const tabContentOf = (tab: UISchemaElement): UISchemaElement | undefined =>
  elementsOf(tab).find((element) => element.type === TAB_CONTENT_TYPE);

/**
 * Rule 17: a tab's value is the studio element id under an editor, and its index otherwise.
 *
 * Studio ids are per-mount counters (doc 197) — fine for a value that never leaves the page, and never for a
 * URL. Without an editor there are no ids at all, and index is stable because nothing can reorder the strip.
 */
const tabValue = (element: UISchemaElement, index: number, editor: TabsEditor | null) =>
  editor ? editor.idOf(element) : String(index);

/**
 * Rule 41: what an empty tab shows in the studio — its own name, a line saying what to do, and a dashed box
 * (user, 2026-09-22). A new Tabs otherwise arrives as a strip above nothing at all, which reads as broken
 * rather than as empty.
 *
 * The grid goes INSIDE the box rather than the box replacing it: the panel must stay a drop target while it is
 * empty, which is exactly when an author most needs to drop something into it.
 */
/**
 * Rule 41b: the dashed box IS the drop target, it does not CONTAIN one (user, 2026-09-22).
 *
 * The grid is stretched to fill the box with a descendant utility — the grid element is dispatched, so this is
 * the only place that can size it — and the caption is an absolutely positioned overlay that takes no height
 * and no pointer events. Drops therefore land anywhere in the dashed area rather than only on a strip of grid
 * beneath the text, and the box is half the height the padded version was.
 *
 * Doc 194's rule still holds for the caption: it is centred by its CONTAINER, never by stretching a child —
 * studio size-to-content measures the item content's child at its natural height, so an `h-full` child would
 * stop a resized item shrinking back.
 */
const EMPTY_CLASS =
  'relative rounded-md border border-dashed border-border [&_.grid-stack]:min-h-16';
const EMPTY_CAPTION_CLASS =
  'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center';
const EMPTY_DESCRIPTION = 'Drag a field here, or pick one from the palette.';

/**
 * Rule 41: the tab's own name (user, 2026-09-22 — it read as "Tab 2 Tab" for a default name), falling back to
 * `Tab` for one not yet named, since an empty heading over an empty box says nothing at all.
 */
export const emptyTabTitle = (label: string) => (label === '' ? 'Tab' : label);

/** One Tab's `TabContent`, dispatched so the registry in play decides how the panel draws. */
function TabPanel({
  layout,
  tab,
  editable,
}: {
  layout: LayoutProps;
  tab: UISchemaElement;
  editable: boolean;
}) {
  const { schema, path, enabled, renderers, cells } = layout;
  const element = tabContentOf(tab);
  if (!element) return null;
  const dispatched = (
    <JsonFormsDispatch
      uischema={element}
      schema={schema}
      path={path}
      enabled={enabled}
      {...(renderers ? { renderers } : {})}
      {...(cells ? { cells } : {})}
    />
  );
  // Rule 41: only while AUTHORING — a citizen filling the form has nothing to drag, and an empty tab is simply
  // an empty tab. The absence of a provider is what says "not authoring" (rule 14).
  if (!editable || elementsOf(element).length > 0) return dispatched;
  return (
    <div data-slot="tab-empty" className={EMPTY_CLASS}>
      {dispatched}
      <div className={EMPTY_CAPTION_CLASS}>
        <span className="text-sm font-medium text-foreground">
          {emptyTabTitle(labelOf(tab, ''))}
        </span>
        <span className="text-xs text-muted-foreground">{EMPTY_DESCRIPTION}</span>
      </div>
    </div>
  );
}

interface TabsEntry {
  readonly descriptor: TabDescriptor;
  readonly element: UISchemaElement;
}

interface BodyProps {
  readonly props: LayoutProps;
  readonly tabs: readonly TabsEntry[];
  readonly editor: TabsEditor | null;
}

/**
 * Rules 22-23, 28-29: the `list` presentation — the tabs BROKEN OUT. No row; every Tab is a labelled block,
 * all visible at once and on paper.
 *
 * This is ALSO what plain presentation draws (rule 29): plain is `list` forced, not a third thing, so the review
 * page and an authored list can never drift into two slightly different stacked layouts.
 *
 * The heading level comes from `SectionDepthContext`, the machinery doc 212 already built for exactly this
 * question, so a Tabs inside a Section heads its tabs one level down rather than inventing a second
 * rule. The depth is raised only here, where a heading is actually drawn.
 *
 * The ANSWERS are the controls' own business (doc 211, doc 214) — this renderer only decides the chrome.
 */
function ListBody({ props, tabs, editor }: BodyProps) {
  const depth = useContext(SectionDepthContext);
  const level = sectionHeadingLevel(depth);
  return (
    <SectionDepthContext.Provider value={depth + 1}>
      <div
        data-slot="tabs"
        data-component="list"
        className={`flex flex-col ${GAP_CLASS[layoutGapOf(props.uischema.options)]}`}
      >
        {tabs.map(({ descriptor, element }) => (
          <div key={descriptor.value} data-slot="tab-block" className="flex flex-col gap-2">
            {descriptor.label === '' ? null : (
              <Heading level={level} size={level} data-slot="tab-heading">
                {descriptor.label}
              </Heading>
            )}
            <TabPanel layout={props} tab={element} editable={editor !== null} />
          </div>
        ))}
      </div>
    </SectionDepthContext.Provider>
  );
}

/** Rule 3: the `tabs` presentation — the row, then the open tab's panel. */
function TabsBody({ props, tabs, editor }: BodyProps) {
  const { uischema } = props;
  /**
   * Rule 17b: the tab last OPENED, remembered.
   *
   * Rule 17 derives the open tab from the selection, and the selection very often names no tab at all — the
   * Tabs element itself, empty space in a panel, or anything elsewhere on the canvas. Falling back to the
   * first tab in those cases meant the strip snapped back to Tab 1 whenever the author clicked almost
   * anywhere, including inside the open tab's own panel.
   *
   * So the derivation still WINS whenever it resolves — selecting a field in another tab still opens that tab,
   * which is rule 17's whole point — and `undefined` now means "leave it where it is" rather than "go to the
   * first". This is the smallest possible amount of state: a memory of the last answer, never a second source
   * of truth, and a remembered tab that has since been deleted simply fails to match and falls back.
   *
   * Without an editor there is no selection to derive from, so this state is the only answer (rule 21).
   */
  const [remembered, setRemembered] = useState<string | undefined>(undefined);
  const tabsId = editor ? editor.idOf(uischema) : '';
  const derived = editor ? editor.openTabId(tabsId) : undefined;
  // Adjusting state during render, React's documented pattern for state derived from changing props — guarded,
  // so it settles immediately rather than looping, and with no effect that would render the wrong tab first.
  if (derived !== undefined && derived !== remembered) setRemembered(derived);
  const wanted = derived ?? remembered;
  const open = tabs.find((tab) => tab.descriptor.value === wanted) ?? tabs[0];

  return (
    <Tabs
      data-slot="tabs"
      data-layout-type={uischema.type}
      value={open?.descriptor.value ?? ''}
      onValueChange={(value) => {
        if (typeof value !== 'string') return;
        // Rule 14: opening a tab is a SELECTION change in the studio, and local state without one.
        if (editor) editor.onGesture({ type: 'open-tab', tabId: value });
        else setRemembered(value);
      }}
    >
      <TabStrip tabs={tabs.map((tab) => tab.descriptor)} editor={editor} tabsId={tabsId} />
      {tabs.map(({ descriptor, element }) => (
        <TabsContent key={descriptor.value} value={descriptor.value} className={PANEL_CLASS}>
          <TabPanel layout={props} tab={element} editable={editor !== null} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

/**
 * Rules 3-4: the presentations, keyed by the sanitised `options.component`.
 *
 * A map rather than a branch, and a MODULE-LEVEL one so each body keeps a stable component identity across
 * renders. A second component is one entry here plus its enum value in `tabs-options.ts` and the
 * metaschema — and, if it should be reachable by tester rank the way Textarea is, a rank-2 `optionIs` entry.
 */
const BODIES: Readonly<Record<TabsComponent, (props: BodyProps) => ReactNode>> = Object.freeze({
  tabs: TabsBody,
  list: ListBody,
});

function TabsElement(props: LayoutProps) {
  const { uischema, visible } = props;
  const editor = useTabsEditor();
  // Rules 31-32: a preview may force the other shape without the document changing.
  const override = useTabsOverride();

  const tabs: TabsEntry[] = tabElementsOf(uischema).map((element, index) => ({
    element,
    descriptor: { value: tabValue(element, index, editor), label: labelOf(element, '') },
  }));

  if (!visible) return null;
  // Rules 22, 29: plain presentation is `list` FORCED — it outranks both the authored component and a preview
  // override, because a review page that hid most of its answers behind tabs would defeat doc 214.
  const component =
    presentationOf(props.config) === 'plain'
      ? 'list'
      : (override ?? tabsComponentOf(uischema.options));
  const Body = BODIES[component];
  return (
    // Rule 24: children see this layout's kind, like every other layout renderer.
    <LayoutNestingContext.Provider value="vertical">
      <Body props={props} tabs={tabs} editor={editor} />
    </LayoutNestingContext.Provider>
  );
}
TabsElement.displayName = 'TabsElement';

/** Rule 4: ONE entry per set, at rank 1 on the bare type, dispatching on the sanitised component. */
export const TabsRenderer = withJsonFormsLayoutProps(TabsElement);
