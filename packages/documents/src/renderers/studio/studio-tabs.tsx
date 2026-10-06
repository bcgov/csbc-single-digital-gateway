import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { mdiDotsVertical, mdiPencilOutline, mdiPlus, mdiDeleteOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { useEffect, useMemo, useState } from 'react';
import { holdsId, newTab, tabsOf, tabsVariant, type TabsVariant } from '../ui/tabs-model';
import { mayEdit, useStudioEditor } from './studio-editor';
import { ELEMENT_INSET, STUDIO_INTERACTIVE, useStudioElement } from './studio-element';
import { TabNameDialog } from './tab-name-dialog';
import { releaseTabStrip, STUDIO_TABS_SLOT, TAB_STRIP_SLOT } from './tab-strip-hold';
import { setActiveTab } from './active-tabs';
import { useDragHover } from './use-drag-hover';

/** Outranks the default Tabs (doc 272 rule 4). */
export const studioTabsTester = rankWith(2, uiTypeIs('Tabs'));

/** The strip and its triggers per variant (doc 272 rule 9), drawn like `@repo/ui`'s TabsList. */
const STRIP: Record<TabsVariant, string> = {
  default: 'flex flex-wrap items-center gap-1 rounded-lg bg-muted p-0.5',
  line: 'flex flex-wrap items-center gap-1 border-b border-border',
};
const TRIGGER: Record<TabsVariant, string> = {
  default:
    'rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-xs',
  line: '-mb-px border-b-2 border-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground data-[active]:border-foreground data-[active]:text-foreground',
};

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
      <div
        role="tablist"
        aria-label="Tabs"
        data-slot={TAB_STRIP_SLOT}
        data-variant={variant}
        className={STRIP[variant]}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active?.id}
            data-active={tab.id === active?.id ? '' : undefined}
            className={`${STUDIO_INTERACTIVE} ${TRIGGER[variant]}`}
            // Selecting a tab selects its content layout — its inspector holds the Tab label — not the whole Tabs.
            onClick={(event) => {
              event.stopPropagation();
              setActiveId(tab.id);
              editor?.select(tab.id);
            }}
            onPointerEnter={() => hover.onPointerEnter(tab.id)}
            onPointerLeave={hover.onPointerLeave}
          >
            {tab.label}
          </button>
        ))}
        {editor !== null && active !== undefined && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className={STUDIO_INTERACTIVE}
                  aria-label={`Tab options for ${active.label}`}
                />
              }
            >
              <Icon path={mdiDotsVertical} size="0.875rem" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 text-xs">
              <DropdownMenuItem disabled={!canRename} onClick={() => setRenaming(true)}>
                <Icon path={mdiPencilOutline} size="0.875rem" aria-hidden />
                Rename…
              </DropdownMenuItem>
              {tabs.length > 1 && editor.remove !== undefined && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => editor.remove?.(active.id, active.label)}
                >
                  <Icon path={mdiDeleteOutline} size="0.875rem" aria-hidden />
                  Delete
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
            <Icon path={mdiPlus} size="0.875rem" aria-hidden />
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
