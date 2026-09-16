import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { PALETTE_SEARCH_KEY } from '../../renderers/studio-palette/palette-search';
import type {
  PaletteEmptyElement,
  PaletteGroupElement,
  PaletteItemElement,
} from '../../types/elements';
import {
  PALETTE_GROUPS,
  PALETTE_TEMPLATES,
  type PaletteGroupId,
  type PaletteTemplate,
} from './palette-templates';

// The palette's own JSONForms form (doc 189 rule 19), built once from the catalogue at module load.
// Doc 198 rule 19: the Flow view is gone — a Flow is authored entirely on its canvas, so there is one catalogue again.

export const PALETTE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: { [PALETTE_SEARCH_KEY]: { type: 'string' } },
};

const itemFor = (template: PaletteTemplate): PaletteItemElement => ({
  type: 'PaletteItem',
  template: template.key,
  label: template.label,
  options: { icon: template.icon, keywords: [...template.keywords] },
});

const empty: PaletteEmptyElement = { type: 'PaletteEmpty', text: 'No elements match your search.' };

function paletteUischema(groupIds: readonly PaletteGroupId[]): UISchemaElement {
  const groups = PALETTE_GROUPS.filter((group) => groupIds.includes(group.id)).map(
    (group): PaletteGroupElement => ({
      type: 'PaletteGroup',
      label: group.label,
      elements: PALETTE_TEMPLATES.filter((template) => template.group === group.id).map(itemFor),
    }),
  );
  return {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: `#/properties/${PALETTE_SEARCH_KEY}`, label: 'Search elements' },
      ...groups,
      empty,
    ],
  } as UISchemaElement;
}

/** The palette for a Form root or a focused Form: Display, Layout and Fields. */
export const PALETTE_UISCHEMA = paletteUischema(['display', 'layout', 'fields']);
