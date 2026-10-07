import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { JsonFormsDispatch, useJsonForms, withJsonFormsLayoutProps } from '@jsonforms/react';
import { useMemo } from 'react';
import { formsOf, nodeIdOf, type FunnelElement } from '../default/funnel/funnel-graph';
import { projectPath } from '../default/funnel/funnel-projection';

/** Outranks the stepping Funnel (rank 1) in the plain set (doc 282 rule 12). */
export const plainFunnelTester = rankWith(2, uiTypeIs('Funnel'));

/**
 * A Funnel read back (doc 282 rules 12-13): the Forms on the path the answers take — the step rail's own projection,
 * stopping at a Condition they do not decide — stacked on one page, each with its title. No rail, no summary, no bar.
 */
export function PlainFunnel({
  uischema,
  schema,
  path,
  enabled,
  visible,
  renderers,
  cells,
}: LayoutProps) {
  const data = useJsonForms().core?.data as Record<string, unknown> | undefined;
  const funnel = uischema as unknown as FunnelElement;
  const forms = useMemo(() => {
    const { formIds } = projectPath({ funnel, schema: schema as Record<string, unknown>, data });
    const byId = new Map(formsOf(funnel).map((form) => [nodeIdOf(form), form]));
    return formIds.flatMap((id): FunnelElement[] => {
      const form = byId.get(id);
      return form === undefined ? [] : [form];
    });
  }, [funnel, schema, data]);
  if (!visible) return null;
  return (
    <div data-slot="plain-funnel" className="flex flex-col gap-8">
      {forms.map((form, index) => (
        <JsonFormsDispatch
          key={nodeIdOf(form) ?? index}
          uischema={form as unknown as UISchemaElement}
          schema={schema}
          path={path}
          enabled={enabled}
          {...(renderers !== undefined && { renderers })}
          {...(cells !== undefined && { cells })}
        />
      ))}
    </div>
  );
}

export const plainFunnelEntry = {
  tester: plainFunnelTester,
  renderer: withJsonFormsLayoutProps(PlainFunnel),
};
