import {
  rankWith,
  uiTypeIs,
  type JsonFormsRendererRegistryEntry,
  type Layout,
  type LayoutProps,
} from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { FieldGroup, FieldLegend, FieldSet } from '@repo/ui/field';
import { controlRenderers } from '../../renderers/ui';

/** Dispatches a layout's children in order with the layout's own props. */
function Children({ uischema, schema, path, enabled, renderers, cells }: LayoutProps) {
  return ((uischema as Layout).elements ?? []).map((child, index) => (
    <JsonFormsDispatch
      key={index}
      uischema={child}
      schema={schema}
      path={path}
      enabled={enabled}
      {...(renderers && { renderers })}
      {...(cells && { cells })}
    />
  ));
}

/** A `Group`: one headed inspector section — a FieldSet with a small uppercase legend. */
function SectionLayout(props: LayoutProps) {
  if (!props.visible) return null;
  return (
    <FieldSet data-slot="inspector-section" className="gap-2">
      <FieldLegend
        variant="label"
        className="mb-1 font-bold tracking-wide text-muted-foreground uppercase"
      >
        {props.label}
      </FieldLegend>
      <FieldGroup className="gap-3">
        <Children {...props} />
      </FieldGroup>
    </FieldSet>
  );
}

/**
 * The inspector's sections, stacked. Its descendant variants make the SHARED `renderers/ui` controls compact here
 * only, and hide the required marker: the inspector's required fields are selects that always hold a value, not
 * questions an author must answer.
 */
const COMPACT_CLASS = [
  'flex flex-col gap-5',
  // The ui controls' Fields are slotted text-field, number-field, choice-field and boolean-field.
  '[&_[data-slot$=-field]]:gap-1.5',
  '[&_[data-slot=field-label]>span[aria-hidden=true]]:hidden',
].join(' ');

function StackLayout(props: LayoutProps) {
  if (!props.visible) return null;
  return (
    <div data-slot="inspector-stack" className={COMPACT_CLASS}>
      <Children {...props} />
    </div>
  );
}

/** What the inspector form renders with (doc 249): the ui controls, by reference, plus its two layouts. */
export const INSPECTOR_RENDERERS: JsonFormsRendererRegistryEntry[] = [
  ...controlRenderers,
  { tester: rankWith(1, uiTypeIs('Group')), renderer: withJsonFormsLayoutProps(SectionLayout) },
  {
    tester: rankWith(1, uiTypeIs('VerticalLayout')),
    renderer: withJsonFormsLayoutProps(StackLayout),
  },
];
