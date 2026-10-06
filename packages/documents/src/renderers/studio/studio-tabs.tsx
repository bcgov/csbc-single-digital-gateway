import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { mdiDotsHorizontal, mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { useEffect, useMemo, useRef, useState } from 'react';
import { holdsId, newTab, tabsOf, tabsVariant } from '../ui/tabs-model';
import { mayEdit, useStudioEditor } from './studio-editor';
import { ELEMENT_INSET, STUDIO_INTERACTIVE, useStudioElement } from './studio-element';
import { TabNameDialog } from './tab-name-dialog';
import { releaseTabStrip, STUDIO_TABS_SLOT, TAB_STRIP_SLOT } from './tab-strip-hold';
import { setActiveTab } from './active-tabs';
import { useDragHover } from './use-drag-hover';
import { useStripDrop } from './use-strip-drop';

/** Outranks the default Tabs (doc 272 rule 4). */
export const studioTabsTester = rankWith(2, uiTypeIs('Tabs'));

/** A tab a drag rests on (doc 272 rule 6c): tinted and ringed until it opens, a second later. */
const DRAG_OVER =
  'data-[drag-over]:bg-primary/10 data-[drag-over]:text-foreground data-[drag-over]:ring-2 data-[drag-over]:ring-ring/60';

/**
 * A Tabs authored on the canvas (doc 272 rules 4-6): a strip of triggers, the active tab's menu (Rename…, Delete),
 * + Add tab, over the ACTIVE tab's VerticalLayout as an ordinary studio layout. The active tab follows the selection,
 * and a drag resting on another tab for a second opens it.
 */
export function StudioTabs({ uischema, schema, path, renderers, cells, visible }: LayoutProps) {
  const editor = useStudioEditor();
  const element = useStudioElement();
  const tabs = useMemo(() => tabsOf(uischema), [uischema]);
  const variant = tabsVariant(uischema);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  // Doc 272 rule 10: a palette click with this Tabs selected lands in the tab it shows.
  const tabsKey = element?.id;
  useEffect(() => {
    if (tabsKey !== undefined && active !== undefined) setActiveTab(tabsKey, active.id);
  }, [tabsKey, active]);
  const hover = useDragHover(setActiveId);
  // Doc 272 rule 6d: a drag released on the strip lands at the end of the tab under the pointer (else the shown tab).
  const strip = useRef<HTMLDivElement>(null);
  useStripDrop(
    strip,
    () => active?.id,
    (tabId, drop) => {
      if (editor === null) return;
      setActiveId(tabId);
      if ('itemId' in drop) editor.insert(tabId, Infinity, drop.itemId);
      else {
        editor.move?.(drop.elementId, tabId, Infinity);
        editor.select(drop.elementId);
      }
    },
  );
  // Doc 272 rule 4: selecting anything inside another tab — on the canvas or from the breadcrumb — opens it.
  const selectedId = editor?.selectedId ?? null;
  useEffect(() => {
    if (selectedId === null) return;
    const holder = tabs.find((tab) => holdsId(tab.layout, selectedId));
    if (holder !== undefined) setActiveId(holder.id);
  }, [selectedId, tabs]);
  if (!visible) return null;
  const tabsId = element?.id;
  const canAdd =
    editor !== null && tabsId !== undefined && editor.governance?.canAdd(tabsId) !== false;
  const canRename = editor !== null && active !== undefined && mayEdit(editor, active.id, 'label');
  const elements = (uischema as { elements?: unknown[] }).elements ?? [];
  return (
    <div
      data-slot={STUDIO_TABS_SLOT}
      // Doc 272 rule 6b: a drag held inside the Tabs leaves the tab's grid once it leaves the Tabs.
      onMouseLeave={(event) => releaseTabStrip(event.nativeEvent)}
      className={`${ELEMENT_INSET} flex flex-col gap-2`}
    >
      {/* The variant tab bar's own pieces and sizes (doc 272 rule 4b): @repo/ui Tabs, a size-6 menu, an xs button. */}
      <div ref={strip} data-slot={TAB_STRIP_SLOT} className="flex min-w-0 items-center gap-1">
        <Tabs
          value={active?.id ?? null}
          onValueChange={(value: unknown) => {
            if (typeof value === 'string') setActiveId(value);
          }}
          className="min-w-0"
        >
          <TabsList
            variant={variant}
            aria-label="Tabs"
            className="max-w-full gap-0.5 overflow-x-auto"
          >
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                data-tab-id={tab.id}
                data-drag-over={hover.armed === tab.id ? '' : undefined}
                className={`${STUDIO_INTERACTIVE} ${DRAG_OVER}`}
                // Selecting a tab selects its content layout — its inspector holds the Tab label — not the Tabs.
                onClick={(event) => {
                  event.stopPropagation();
                  editor?.select(tab.id);
                }}
                onPointerEnter={() => hover.onPointerEnter(tab.id)}
                onPointerLeave={hover.onPointerLeave}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {editor !== null && active !== undefined && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Tab options for ${active.label}`}
              className={`${STUDIO_INTERACTIVE} flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground`}
            >
              <Icon path={mdiDotsHorizontal} size="16px" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-auto text-xs">
              <DropdownMenuItem disabled={!canRename} onClick={() => setRenaming(true)}>
                Rename…
              </DropdownMenuItem>
              {tabs.length > 1 && editor.remove !== undefined && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => editor.remove?.(active.id, active.label)}
                >
                  Delete…
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {editor !== null && tabsId !== undefined && (
          <Button
            variant="ghost"
            size="xs"
            className={STUDIO_INTERACTIVE}
            disabled={!canAdd}
            onClick={() => {
              const tab = newTab(tabs);
              editor.update(tabsId, { elements: [...elements, tab] });
              setActiveId(tab['id'] as string);
            }}
          >
            <Icon path={mdiPlus} size="14px" />
            Add tab
          </Button>
        )}
      </div>
      {/* Every tab stays mounted (doc 272 rule 6b): switching mid-drag must never destroy the grid the drag came
          from. The inactive ones sit invisible and inert under the active one, out of the layout. */}
      <div className="relative">
        {tabs.map((tab) => {
          const shown = tab.id === active?.id;
          return (
            <div
              key={tab.id}
              role="tabpanel"
              aria-label={tab.label}
              inert={!shown || undefined}
              data-active={shown ? '' : undefined}
              className={shown ? undefined : 'invisible absolute inset-x-0 top-0'}
            >
              <JsonFormsDispatch
                uischema={tab.layout as unknown as UISchemaElement}
                schema={schema}
                path={path}
                {...(renderers !== undefined && { renderers })}
                {...(cells !== undefined && { cells })}
              />
            </div>
          );
        })}
      </div>
      {renaming && editor !== null && active !== undefined && (
        <TabNameDialog
          name={active.label}
          onClose={() => setRenaming(false)}
          onSave={(name) => {
            editor.update(active.id, { label: name });
            setRenaming(false);
          }}
        />
      )}
    </div>
  );
}

export const studioTabsEntry = {
  tester: studioTabsTester,
  renderer: withJsonFormsLayoutProps(StudioTabs),
};
