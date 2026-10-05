import { mdiCardTextOutline, mdiTable } from '@mdi/js';
import { nanoid } from 'nanoid';
import { newId } from './element-ids';
import type { PaletteCreation, PaletteItem } from './palette-items';

/** The palette section holding the object-array presentations (doc 271 rule 18). */
export const RECORD_FIELDS_GROUP = 'Record fields';

/** A Control over a new `nanoid(8)` object-array property — fresh objects every call (doc 238 rule 3). */
function newObjectArray(
  title: string,
  itemProperties: Record<string, Record<string, unknown>>,
  control: Record<string, unknown> = {},
): PaletteCreation {
  const key = nanoid(8);
  return {
    element: { id: newId(), type: 'Control', scope: `#/properties/${key}`, ...control },
    properties: {
      [key]: { type: 'array', title, items: { type: 'object', properties: itemProperties } },
    },
  };
}

export const RECORD_FIELD_ITEMS: readonly PaletteItem[] = Object.freeze([
  {
    id: 'data-table',
    label: 'Data table',
    icon: mdiTable,
    group: RECORD_FIELDS_GROUP,
    keywords: ['table', 'rows', 'columns', 'list', 'repeat'],
    // One Text column, its key as fresh as the property's (doc 263 rule 31).
    create: () =>
      newObjectArray('Untitled data table', {
        [nanoid(8)]: { type: 'string', title: 'Column 1' },
      }),
  },
  {
    id: 'record',
    label: 'Record',
    icon: mdiCardTextOutline,
    group: RECORD_FIELDS_GROUP,
    keywords: ['repeat', 'items', 'group', 'list', 'record'],
    // No item fields yet: the author drops them into the item form (doc 271 rule 19).
    create: () =>
      newObjectArray(
        'Untitled record',
        {},
        {
          options: { component: 'record' },
          elements: [{ id: newId(), type: 'VerticalLayout', elements: [] }],
        },
      ),
  },
]);
