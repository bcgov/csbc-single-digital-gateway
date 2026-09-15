import { rankWith, uiTypeIs, type LayoutProps, type RankedTester } from '@jsonforms/core';
import { JsonFormsDispatch, useJsonForms, withJsonFormsLayoutProps } from '@jsonforms/react';
import { useId } from 'react';
import type { PaletteGroupElement } from '../../types/elements';
import { matchesSearch, searchQuery } from './palette-search';

/** A `PaletteGroup` — one labelled group of palette items (doc 189 rule 7). */
export const paletteGroupTester: RankedTester = rankWith(1, uiTypeIs('PaletteGroup'));

/**
 * Renders a `PaletteGroup` as a `role="group"` labelled by its small uppercase heading, with its items dispatched in
 * a vertical list. It renders nothing when hidden, or when none of its items matches the palette search.
 */
function PaletteGroup({ uischema, schema, path, enabled, visible, renderers, cells }: LayoutProps) {
  const headingId = useId();
  const query = searchQuery(useJsonForms().core?.data);
  const group = uischema as PaletteGroupElement;
  const items = group.elements ?? [];
  if (!visible || !items.some((item) => matchesSearch(item, query))) return null;

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      data-slot="palette-group"
      className="flex flex-col gap-1"
    >
      <div id={headingId} className="px-1 font-bold tracking-wide text-muted-foreground uppercase">
        {group.label}
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((item, index) => (
          <JsonFormsDispatch
            key={index}
            uischema={item}
            schema={schema}
            path={path}
            enabled={enabled}
            {...(renderers ? { renderers } : {})}
            {...(cells ? { cells } : {})}
          />
        ))}
      </div>
    </div>
  );
}

export const PaletteGroupRenderer = withJsonFormsLayoutProps(PaletteGroup);
