import {
  rankWith,
  uiTypeIs,
  type Layout,
  type LayoutProps,
  type RankedTester,
} from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';

/** The palette's root `VerticalLayout` (doc 189 rule 6). */
export const paletteStackTester: RankedTester = rankWith(1, uiTypeIs('VerticalLayout'));

/** Renders a `VerticalLayout` as a plain, compact column of its children, in order. Hidden renders nothing. */
function PaletteStack({ uischema, schema, path, enabled, visible, renderers, cells }: LayoutProps) {
  if (!visible) return null;

  return (
    <div data-slot="palette-stack" className="flex flex-col gap-3 text-xs">
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

export const PaletteStackRenderer = withJsonFormsLayoutProps(PaletteStack);
