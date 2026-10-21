import {
  rankWith,
  uiTypeIs,
  type Layout,
  type LayoutProps,
  type RankedTester,
} from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { FieldGroup, FieldLegend, FieldSet } from '@repo/ui/field';

/** A `Group` — one headed inspector section (doc 187 rule 5). */
export const sectionTester: RankedTester = rankWith(1, uiTypeIs('Group'));

/**
 * Renders a `Group` as a `FieldSet` whose `FieldLegend` is the group's label (none when empty), with its
 * children dispatched in order inside a `FieldGroup`. Compact (rule 6c): `gap-2` between fields and a small
 * uppercase muted legend. A hidden group renders nothing.
 */
function SectionLayout({
  uischema,
  schema,
  path,
  enabled,
  visible,
  label,
  renderers,
  cells,
}: LayoutProps) {
  if (!visible) return null;
  const legend = typeof label === 'string' ? label.trim() : '';

  return (
    <FieldSet data-slot="inspector-section" className="gap-2">
      {legend ? (
        <FieldLegend
          variant="label"
          className="mb-1 font-bold tracking-wide text-muted-foreground uppercase"
        >
          {legend}
        </FieldLegend>
      ) : null}
      <FieldGroup className="gap-2">
        {((uischema as Layout).elements ?? []).map((child, index) => (
          <JsonFormsDispatch
            key={index}
            uischema={child}
            schema={schema}
            path={path}
            enabled={enabled}
            {...(renderers ? { renderers } : {})}
            {...(cells ? { cells } : {})}
          />
        ))}
      </FieldGroup>
    </FieldSet>
  );
}

export const SectionLayoutRenderer = withJsonFormsLayoutProps(SectionLayout);
