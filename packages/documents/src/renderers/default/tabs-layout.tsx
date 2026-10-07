import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { JsonFormsDispatch, useJsonForms, withJsonFormsLayoutProps } from '@jsonforms/react';
import { Card, CardContent } from '@repo/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { useMemo, type ReactNode } from 'react';
import { tabsLayout, tabsOf, type TabsLayout } from '../ui/tabs-model';
import { hasErrorIn, tabDataPaths, type ValidationError } from './tab-errors';

/** `{ type: 'Tabs' }` at the base rank (doc 272 rule 2); the studio's outranks it. */
export const tabsLayoutTester = rankWith(1, uiTypeIs('Tabs'));

/**
 * One tab's panel body (doc 272 rules 13, 17), shared by both renderers: `tab-body` around the dispatched layout — inside
 * a `@repo/ui` Card frame, with no header or footer, when the Tabs' layout is `card`.
 */
export function TabPanelBody({ layout, children }: { layout: TabsLayout; children: ReactNode }) {
  const body = <div data-slot="tab-body">{children}</div>;
  if (layout !== 'card') return body;
  return (
    <Card data-slot="tab-card">
      <CardContent>{body}</CardContent>
    </Card>
  );
}

/**
 * A Tabs filled in or read (doc 272 rules 2-3): one trigger per tab, the first active, each panel its tab's
 * container layout dispatched (in a Card frame for `card`, rule 13); a red dot on a tab whose fields have a validation error.
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
  const layout = tabsLayout(uischema.options);
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
        </TabsContent>
      ))}
    </Tabs>
  );
}

export const tabsLayoutEntry = {
  tester: tabsLayoutTester,
  renderer: withJsonFormsLayoutProps(TabsLayout),
};
