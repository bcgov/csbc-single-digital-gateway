import {
  rankWith,
  uiTypeIs,
  type OwnPropsOfRenderer,
  type RankedTester,
  type UISchemaElement,
} from '@jsonforms/core';
import { useJsonForms } from '@jsonforms/react';
import type { PaletteEmptyElement, PaletteItemElement } from '../../types/elements';
import { matchesSearch, searchQuery } from './palette-search';

/** A `PaletteEmpty` — the message shown when the search matches nothing (doc 189 rule 11). */
export const paletteEmptyTester: RankedTester = rankWith(1, uiTypeIs('PaletteEmpty'));

type Tree = UISchemaElement & { elements?: Tree[] };

/** Every `PaletteItem` at or below `element`. */
function itemsIn(element: Tree | undefined): PaletteItemElement[] {
  if (!element) return [];
  if (element.type === 'PaletteItem') return [element as PaletteItemElement];
  return (element.elements ?? []).flatMap((child) => itemsIn(child));
}

/** Renders the message only while a non-empty search matches no `PaletteItem` in the palette's root uischema. */
function PaletteEmpty({ uischema }: OwnPropsOfRenderer) {
  const { core } = useJsonForms();
  const query = searchQuery(core?.data);
  const items = itemsIn(core?.uischema as Tree | undefined);
  if (query === '' || items.some((item) => matchesSearch(item, query))) return null;

  return (
    <p data-slot="palette-empty" className="px-1 text-muted-foreground">
      {(uischema as PaletteEmptyElement).text}
    </p>
  );
}

export const PaletteEmptyRenderer = PaletteEmpty;
