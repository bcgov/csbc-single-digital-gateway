import {
  rankWith,
  uiTypeIs,
  type JsonFormsRendererRegistryEntry,
  type Layout,
  type LayoutProps,
} from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { controlRenderers } from '../../renderers/ui';
import { FoldableSection } from '../foldable-section';

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

/** An inspector section's classes (doc 252 rules 5-7), shared with the Options section drawn outside the form (doc 255). */
export const SECTION_CLASSES = Object.freeze({
  className: 'flex flex-col gap-1 border-t border-border pt-2 first:border-t-0 first:pt-0',
  headingClassName: 'text-[11px] font-bold tracking-wide text-muted-foreground uppercase',
  rowsClassName: 'flex flex-col gap-1',
});

/** A `Group`: one headed, foldable inspector section (doc 252 rules 6-8), ruled off from the one above it. */
function SectionLayout(props: LayoutProps) {
  if (!props.visible) return null;
  return (
    <FoldableSection name={typeof props.label === 'string' ? props.label : ''} {...SECTION_CLASSES}>
      <Children {...props} />
    </FoldableSection>
  );
}

/**
 * Compact density (doc 252 rules 1, 3-5) for everything below the inspector's root stack: descendant variants shrink
 * the SHARED `renderers/ui` controls here only — they stay full size on the canvas and in preview. Written out in
 * full: Tailwind only generates classes it finds as literal strings. The documents controls slot their Fields
 * `text-field`, `number-field`, `choice-field`, `boolean-field` and `rich-text-field`, never `field`.
 */
const COMPACT_CLASS = [
  'flex flex-col gap-2 text-xs',
  '[&_[data-slot$=-field]]:gap-1',
  '[&_[data-slot=field-label]]:text-xs',
  '[&_[data-slot=field-label]]:font-normal',
  '[&_[data-slot=field-description]]:text-[11px]',
  // Doc 249: the inspector's required fields are always-set selects, not questions.
  // The marker sits beside the label, in its line (doc 285 rule 5).
  '[&_[data-slot=required-marker]]:hidden',
  '[&_[data-slot=input]]:h-7',
  '[&_[data-slot=input]]:px-2',
  '[&_[data-slot=input]]:py-1',
  '[&_[data-slot=input]]:text-xs',
  '[&_[data-slot=number-input-input]]:h-7',
  '[&_[data-slot=number-input-input]]:px-2',
  '[&_[data-slot=number-input-input]]:py-1',
  '[&_[data-slot=number-input-input]]:text-xs',
  // Numbers are short (doc 252 rule 2b): an 80px box at the column's right end, digits right-aligned.
  '[&_[data-slot=number-input]]:w-20',
  '[&_[data-slot=number-input]]:justify-self-end',
  '[&_[data-slot=number-input-input]]:text-right',
  '[&_[data-slot=input-group]]:h-7',
  '[&_[data-slot=input-group-control]]:text-xs',
  '[&_[data-slot=textarea]]:min-h-12',
  '[&_[data-slot=textarea]]:px-2',
  '[&_[data-slot=textarea]]:py-1',
  '[&_[data-slot=textarea]]:text-xs',
  '[&_[data-slot=boolean-field]]:min-h-7',
  '[&_[data-slot=boolean-field]]:items-center',
  // Rich text (doc 250): the placeholder overlays the content, so it is repadded in the SAME breath.
  '[&_[data-slot=rich-text-input]]:text-xs',
  '[&_[data-slot=rich-text-content]]:min-h-16',
  '[&_[data-slot=rich-text-content]]:px-2',
  '[&_[data-slot=rich-text-content]]:py-1',
  '[&_[data-slot=rich-text-placeholder]]:px-2',
  '[&_[data-slot=rich-text-placeholder]]:py-1',
  '[&_[data-slot=rich-text-toolbar]]:p-0.5',
  '[&_[data-slot=rich-text-toolbar]_button]:size-6',
].join(' ');

/**
 * Label BESIDE control (doc 252 rule 2) for text inputs, numbers and choices: a 2fr | 3fr grid whose label truncates;
 * a description moves after the control and spans both columns. A text area and rich text keep the label above.
 */
const ROW_CLASS = [
  '[&_[data-slot=text-field][data-component=input]]:grid',
  '[&_[data-slot=number-field]]:grid',
  '[&_[data-slot=choice-field]]:grid',
  '[&_[data-slot=text-field][data-component=input]]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
  '[&_[data-slot=number-field]]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
  '[&_[data-slot=choice-field]]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
  '[&_[data-slot=text-field][data-component=input]]:items-center',
  '[&_[data-slot=number-field]]:items-center',
  '[&_[data-slot=choice-field]]:items-center',
  '[&_[data-slot=text-field][data-component=input]]:gap-x-2',
  '[&_[data-slot=number-field]]:gap-x-2',
  '[&_[data-slot=choice-field]]:gap-x-2',
  '[&_[data-slot=field-label]]:min-w-0',
  // A required field's label sits in a line with its (hidden) marker: let that line shrink so the label truncates.
  '[&_[data-slot=control-label-line]]:min-w-0',
  '[&_[data-slot=field-label]]:truncate',
  '[&_[data-slot=field-description]]:col-span-2',
  '[&_[data-slot=field-description]]:order-last',
].join(' ');

function StackLayout(props: LayoutProps) {
  if (!props.visible) return null;
  return (
    <div data-slot="inspector-stack" className={`${COMPACT_CLASS} ${ROW_CLASS}`}>
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
