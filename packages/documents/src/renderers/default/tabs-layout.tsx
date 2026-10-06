import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { JsonFormsDispatch, useJsonForms, withJsonFormsLayoutProps } from '@jsonforms/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { useMemo } from 'react';
import { tabsOf } from '../ui/tabs-model';
import { hasErrorIn, tabDataPaths, type ValidationError } from './tab-errors';

/** `{ type: 'Tabs' }` at the base rank (doc 272 rule 2); the studio's outranks it. */
export const tabsLayoutTester = rankWith(1, uiTypeIs('Tabs'));

/**
 * A Tabs filled in or read (doc 272 rules 2-3): one trigger per tab, the first active, each panel its tab's
 * VerticalLayout dispatched; a red dot on a tab whose fields have a validation error.
 */
export function TabsLayout({
  uischema,
  schema,
  path,
  enabled,
  visible,
  renderers,
  cells,
}: LayoutProps) {
  const tabs = useMemo(() => tabsOf(uischema), [uischema]);
  const errors = (useJsonForms().core?.errors ?? []) as readonly ValidationError[];
  if (!visible || tabs.length === 0) return null;
  return (
    <Tabs data-slot="tabs-layout" defaultValue={tabs[0]!.id} className="flex flex-col gap-3">
      {/* Always Line (doc 272 rule 9): an authored `options.variant` is ignored. */}
      <TabsList variant="line" className="gap-0.5">
        {tabs.map((tab) => {
          const invalid = hasErrorIn(errors, tabDataPaths(tab.layout));
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              aria-label={invalid ? `${tab.label}, has errors` : tab.label}
            >
              {tab.label}
              {invalid && (
                <span
                  data-slot="tab-error-dot"
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-destructive"
                />
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          className="text-[length:inherit] leading-[inherit]"
        >
          <JsonFormsDispatch
            uischema={tab.layout as unknown as UISchemaElement}
            schema={schema}
            path={path}
            enabled={enabled}
            {...(renderers !== undefined && { renderers })}
            {...(cells !== undefined && { cells })}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

export const tabsLayoutEntry = {
  tester: tabsLayoutTester,
  renderer: withJsonFormsLayoutProps(TabsLayout),
};
