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

// The palette's own JSONForms forms (doc 189 rule 19, doc 196 rule 17), built once from the catalogue at module load:
// one for a Form (the form groups) and one for a Flow's view (the Flow group alone).

export const PALETTE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: { [PALETTE_SEARCH_KEY]: { type: 'string' } },
};

/** Which palette a studio view shows. */
export type PaletteView = 'form' | 'flow';

const itemFor = (template: PaletteTemplate): PaletteItemElement => ({
  type: 'PaletteItem',
  template: template.key,
  label: template.label,
  options: {
    icon: template.icon,
    keywords: [...template.keywords],
    // Doc 196 rule 17: Stage and Form are added by click or keyboard only — a Flow has no grid to drop on.
    ...(template.group === 'flow' ? { dragIn: false } : {}),
  },
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

/** The palette for a Flow's view: the Flow group alone. */
export const FLOW_PALETTE_UISCHEMA = paletteUischema(['flow']);

export const PALETTE_UISCHEMAS: Readonly<Record<PaletteView, UISchemaElement>> = Object.freeze({
  form: PALETTE_UISCHEMA,
  flow: FLOW_PALETTE_UISCHEMA,
});
