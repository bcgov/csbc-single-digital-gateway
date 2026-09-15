import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { PALETTE_SEARCH_KEY } from '../../renderers/studio-palette/palette-search';
import type {
  PaletteEmptyElement,
  PaletteGroupElement,
  PaletteItemElement,
} from '../../types/elements';
import { PALETTE_GROUPS, PALETTE_TEMPLATES } from './palette-templates';

// The palette's own JSONForms form (doc 189 rule 19), built once from the catalogue at module load.

export const PALETTE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: { [PALETTE_SEARCH_KEY]: { type: 'string' } },
};

const groups = PALETTE_GROUPS.map(
  (group): PaletteGroupElement => ({
    type: 'PaletteGroup',
    label: group.label,
    elements: PALETTE_TEMPLATES.filter((template) => template.group === group.id).map(
      (template): PaletteItemElement => ({
        type: 'PaletteItem',
        template: template.key,
        label: template.label,
        options: { icon: template.icon, keywords: [...template.keywords] },
      }),
    ),
  }),
);

const empty: PaletteEmptyElement = { type: 'PaletteEmpty', text: 'No elements match your search.' };

export const PALETTE_UISCHEMA = {
  type: 'VerticalLayout',
  elements: [
    { type: 'Control', scope: `#/properties/${PALETTE_SEARCH_KEY}`, label: 'Search elements' },
    ...groups,
    empty,
  ],
} as UISchemaElement;
