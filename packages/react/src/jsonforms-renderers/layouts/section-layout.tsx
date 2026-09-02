import { rankWith, uiTypeIs } from '@jsonforms/core';
import type { Layout, LayoutProps, RankedTester } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { useEditAction } from './edit-actions-context';

export const sectionLayoutTester: RankedTester = rankWith(1, uiTypeIs('Section'));

/** The optional authored title/description carried by a Section element. */
type SectionElement = Layout & { label?: unknown; options?: { description?: unknown } };

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * A banded group of related fields (feature 172): a real `<fieldset>` with a `<legend>`, padded on
 * the lightest grey surface in the scale.
 *
 * The `<legend>` is the point — assistive technology announces it with every control inside the
 * fieldset, which a `<div>` with a heading cannot do. It is rendered only when the author set a
 * label; an empty legend would be announced as noise rather than being neutral.
 *
 * `min-w-0` is load-bearing: browsers give `<fieldset>` a default `min-inline-size: min-content`, so
 * without it a Section placed in a Grid column or a flex row refuses to shrink and overflows.
 */
function SectionLayoutComponent({ uischema, schema, path, enabled, visible }: LayoutProps) {
  const section = uischema as SectionElement;
  const legend = asText(section.label);
  const description = asText(section.options?.description);
  // Windowed section editing (feature 175) — before the `visible` bail, so hook order is stable.
  const editAction = useEditAction(uischema, legend);

  if (visible === false) {
    return null;
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-md bg-gray-10 p-4 border border-border">
      {/* The fieldset is a flex column, so the legend is an ordinary flex item here (no border to
          notch into) — it needs no float/width hack to sit on its own line. */}
      {/* The edit affordance lives INSIDE the legend: a `<legend>` must stay a direct child of
          its `<fieldset>` for assistive tech to announce it with every enclosed control, so it
          cannot be wrapped in a flex row alongside a sibling button. */}
      {legend === '' && editAction === null ? null : (
        <legend className="section-heading flex w-full items-center justify-between gap-3">
          {legend}
          {editAction}
        </legend>
      )}
      {description === '' ? null : <p className="text-sm text-muted-foreground">{description}</p>}
      {section.elements.map((child, index) => (
        <JsonFormsDispatch
          key={index}
          uischema={child}
          schema={schema}
          path={path}
          enabled={enabled}
        />
      ))}
    </fieldset>
  );
}

export const SectionLayoutRenderer = withJsonFormsLayoutProps(SectionLayoutComponent);
