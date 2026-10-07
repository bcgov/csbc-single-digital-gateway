import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { useMemo } from 'react';
import { tabsOf } from '../ui/tabs-model';

/** Outranks the fillable Tabs (rank 1) in the plain set (doc 282 rule 11). */
export const plainTabsTester = rankWith(2, uiTypeIs('Tabs'));

/** Every tab's content on the page, each under its tab title — nothing read back is hidden behind a tab. */
export function PlainTabs({
  uischema,
  schema,
  path,
  enabled,
  visible,
  renderers,
  cells,
}: LayoutProps) {
  const tabs = useMemo(() => tabsOf(uischema), [uischema]);
  if (!visible || tabs.length === 0) return null;
  return (
    <div data-slot="plain-tabs" className="flex flex-col gap-6">
      {tabs.map((tab) => (
        <section key={tab.id} data-slot="plain-tab" className="flex flex-col gap-3">
          {/* The size sits on the element: base styles size a bare h3 (CLAUDE.md, @repo/ui base styles). */}
          <h3 className="text-h5 font-semibold">{tab.label}</h3>
          <JsonFormsDispatch
            uischema={tab.layout as unknown as UISchemaElement}
            schema={schema}
            path={path}
            enabled={enabled}
            {...(renderers !== undefined && { renderers })}
            {...(cells !== undefined && { cells })}
          />
        </section>
      ))}
    </div>
  );
}

export const plainTabsEntry = {
  tester: plainTabsTester,
  renderer: withJsonFormsLayoutProps(PlainTabs),
};
