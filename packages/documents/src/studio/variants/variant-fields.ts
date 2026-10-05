import { mdiFormTextbox } from '@mdi/js';
import { DEFAULT_VARIANT, variantOf, type DocumentContent, type Uischema } from '../document-types';
import { newId } from '../element-ids';
import { DEFAULT_PALETTE_ITEMS, type PaletteItem } from '../palette-items';
import { boundKeys, controlsOf, isRecord, keyOfScope, scopeOf } from './variant-bindings';
import { titleOf } from './variant-problems';

/** The palette group a variant's fields list under — the default palette's own (doc 262 rule 13a). */
export const FIELDS_GROUP = 'Fields';

/**
 * The palette for `variant` (doc 262 rule 13a). Default keeps `items` as resolved. Elsewhere every item whose creation
 * adds a schema property is withheld, and the fields default shows that `variant` does not yet show are offered instead.
 */
export function variantPalette(
  items: readonly PaletteItem[],
  content: DocumentContent,
  variant: string,
): PaletteItem[] {
  if (variant === DEFAULT_VARIANT) return [...items];
  const kept = items.filter((item) => Object.keys(item.create().properties ?? {}).length === 0);
  return [...kept, ...variantFieldItems(content, variant)];
}

/**
 * One item per property a Control in the DEFAULT variant binds and `variant` does not, in default's reading order
 * (doc 262 rule 13a). Each places a Control over that same property — fresh id, default's first Control's options
 * minus its grid placement and description override, no rule, no label — and adds nothing to the schema.
 */
export function variantFieldItems(content: DocumentContent, variant: string): PaletteItem[] {
  const shown = new Set(boundKeys(variantOf(content, variant)));
  const properties = isRecord(content.schema['properties']) ? content.schema['properties'] : {};
  const firstControl = new Map<string, Uischema>();
  for (const control of controlsOf(variantOf(content))) {
    const key = keyOfScope(control['scope']);
    if (key !== undefined && !firstControl.has(key)) firstControl.set(key, control);
  }
  return [...firstControl]
    .filter(([key]) => !shown.has(key) && isRecord(properties[key]))
    .map(([key, control]) => {
      const property = properties[key] as Record<string, unknown>;
      const options = placedOptions(control['options']);
      return {
        id: `field:${key}`,
        label: titleOf(property, key),
        icon: iconFor(property, options),
        group: FIELDS_GROUP,
        keywords: [key],
        create: () => ({
          element: {
            id: newId(),
            type: 'Control',
            scope: scopeOf(key),
            ...(options !== undefined && { options: structuredClone(options) }),
          },
        }),
      };
    });
}

/** A Control's options as a variant places them: no `gridItem` (its own layout decides) or `description` override. */
function placedOptions(options: unknown): Record<string, unknown> | undefined {
  if (!isRecord(options)) return undefined;
  const rest = Object.fromEntries(
    Object.entries(options).filter(([name]) => name !== 'gridItem' && name !== 'description'),
  );
  return Object.keys(rest).length === 0 ? undefined : rest;
}

/** The default palette item's icon for the same kind of field — schema type and component — else a text field's. */
function iconFor(property: Record<string, unknown>, options: Record<string, unknown> | undefined) {
  const type = property['type'] === 'integer' ? 'number' : property['type'];
  const component = options?.['component'];
  const match = fieldKinds().find((kind) => kind.type === type && kind.component === component);
  return match?.icon ?? fieldKinds().find((kind) => kind.type === type)?.icon ?? mdiFormTextbox;
}

interface FieldKind {
  type: unknown;
  component: unknown;
  icon: string;
}

let kinds: FieldKind[] | undefined;

/** What each default field item creates, probed once: its property's type and its Control's component. */
function fieldKinds(): FieldKind[] {
  kinds ??= DEFAULT_PALETTE_ITEMS.flatMap((item) => {
    const { element, properties } = item.create();
    const property = Object.values(properties ?? {})[0];
    if (property === undefined) return [];
    const options = isRecord(element['options']) ? element['options'] : {};
    return [{ type: property['type'], component: options['component'], icon: item.icon }];
  });
  return kinds;
}
