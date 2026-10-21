import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { Tabs, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { useId, useMemo, useState } from 'react';
import { TabPanelBody } from '../default/tabs-layout';
import { tabsLayout, tabsOf } from '../ui/tabs-model';

/** Outranks the fillable Tabs (rank 1) in the plain set (doc 282 rule 11). */
export const plainTabsTester = rankWith(2, uiTypeIs('Tabs'));

/**
 * A Tabs read back (doc 282 rule 11, revised 2026-10-08): real tabs on screen, every tab in print. The strip is the
 * `@repo/ui` Tabs, but the panels are this renderer's own: an inactive one is hidden by CLASS, because Tailwind's
 * preflight hides `[hidden]` with `!important` in the base layer and no print utility could reveal it again.
 */
export function PlainTabs({
  uischema,
  schema,
  path,
  enabled,
  visible,
  renderers,
  cells,
}: LayoutProps) {
  const id = useId();
  const tabs = useMemo(() => tabsOf(uischema), [uischema]);
  const layout = tabsLayout(uischema.options);
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  if (!visible || tabs.length === 0) return null;
  const open = tabs.some((tab) => tab.id === chosen) ? chosen : tabs[0]!.id;
  const triggerId = (tabId: string) => `${id}-tab-${tabId}`;
  const panelId = (tabId: string) => `${id}-panel-${tabId}`;
  return (
    <Tabs
      data-slot="plain-tabs"
      value={open}
      onValueChange={(value) => setChosen(String(value))}
      className="flex flex-col gap-3 print:gap-6"
    >
      {/* Always Line, as the fillable Tabs (doc 272 rule 9). */}
      <TabsList variant="line" className="gap-0.5 print:hidden">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            id={triggerId(tab.id)}
            aria-controls={panelId(tab.id)}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => {
        const active = tab.id === open;
        return (
          <section
            key={tab.id}
            id={panelId(tab.id)}
            role="tabpanel"
            aria-labelledby={triggerId(tab.id)}
            data-slot="plain-tab"
            data-active={active ? '' : undefined}
            className={`${active ? 'flex' : 'hidden'} flex-col gap-3 print:flex`}
          >
            {/* Print only: the strip is hidden there. The size sits on the element (CLAUDE.md, base styles). */}
            <h3 className="hidden text-h5 font-semibold print:block">{tab.label}</h3>
            <TabPanelBody layout={layout}>
              <JsonFormsDispatch
                uischema={tab.layout as unknown as UISchemaElement}
                schema={schema}
                path={path}
                enabled={enabled}
                {...(renderers !== undefined && { renderers })}
                {...(cells !== undefined && { cells })}
              />
            </TabPanelBody>
          </section>
        );
      })}
    </Tabs>
  );
}

export const plainTabsEntry = {
  tester: plainTabsTester,
  renderer: withJsonFormsLayoutProps(PlainTabs),
};
