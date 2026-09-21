import {
  rankWith,
  uiTypeIs,
  type Layout,
  type LayoutProps,
  type RankedTester,
} from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';

/** A `VerticalLayout` — the inspector's column of sections (doc 187 rule 6). */
export const stackTester: RankedTester = rankWith(1, uiTypeIs('VerticalLayout'));

/**
 * Compact density (rule 6c) for everything below the inspector's root stack. Descendant variants shrink the
 * SHARED renderers/ui controls here only — the same controls stay full size on the canvas. Written out in
 * full: Tailwind only generates classes it finds as literal strings in the source.
 */
const COMPACT_CLASS = [
  'text-xs',
  '[&_[data-slot=field]]:gap-1',
  '[&_[data-slot=field-label]]:text-xs',
  '[&_[data-slot=field-description]]:text-xs',
  '[&_[data-slot=input]]:h-7',
  '[&_[data-slot=input]]:px-2',
  '[&_[data-slot=input]]:py-1',
  '[&_[data-slot=input]]:text-xs',
  '[&_[data-slot=number-input-input]]:h-7',
  '[&_[data-slot=number-input-input]]:px-2',
  '[&_[data-slot=number-input-input]]:py-1',
  '[&_[data-slot=number-input-input]]:text-xs',
  '[&_[data-slot=textarea]]:min-h-12',
  '[&_[data-slot=textarea]]:text-xs',
  // Doc 188 rule 23: the choice controls.
  '[&_[data-slot=radio-group]]:gap-2',
  '[&_[data-slot=input-group]]:h-7',
  '[&_[data-slot=input-group-control]]:text-xs',
  // Doc 207: the rich text editor. Its paragraphs INHERIT their size (see `richTextTheme`), so setting it
  // on the container is enough — before that fix a bare `p` was 16px from base.css and nothing here could
  // reach it. The editor is also given a shorter body and smaller toolbar buttons: `min-h-28` is most of
  // the 300px panel, and the toolbar wrapped to two rows at full size.
  '[&_[data-slot=rich-text-input]]:text-xs',
  '[&_[data-slot=rich-text-content]]:min-h-16',
  '[&_[data-slot=rich-text-content]]:px-2',
  '[&_[data-slot=rich-text-content]]:py-1',
  '[&_[data-slot=rich-text-toolbar]]:p-0.5',
  '[&_[data-slot=rich-text-toolbar]_button]:size-6',
].join(' ');

/**
 * Renders a `VerticalLayout` as a plain flex column of its children, in order, carrying the compact density.
 * Unlike the canvas sets, no gridstack is involved: the inspector never renders a draggable or static grid.
 */
function StackLayout({ uischema, schema, path, enabled, visible, renderers, cells }: LayoutProps) {
  if (!visible) return null;

  return (
    <div data-slot="inspector-stack" className={`flex flex-col gap-4 ${COMPACT_CLASS}`}>
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
    </div>
  );
}

export const StackLayoutRenderer = withJsonFormsLayoutProps(StackLayout);
