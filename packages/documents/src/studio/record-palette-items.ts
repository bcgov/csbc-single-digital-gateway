import { mdiCardTextOutline, mdiFileLinkOutline, mdiTable, mdiUnfoldMoreHorizontal } from '@mdi/js';
import { nanoid } from 'nanoid';
import {
  DOCUMENT_REFERENCE_COMPONENT,
  referenceItemsSchema,
} from '../renderers/ui/document-reference';
import { newId } from './element-ids';
import type { PaletteCreation, PaletteItem } from './palette-items';

/** The palette section holding the object-array presentations (doc 271 rule 18). */
export const RECORD_FIELDS_GROUP = 'Record fields';

/** A Control over a new `nanoid(8)` object-array property — fresh objects every call (doc 238 rule 3). */
function newObjectArray(
  title: string,
  itemProperties: Record<string, Record<string, unknown>>,
  control: Record<string, unknown> = {},
  required?: string[],
): PaletteCreation {
  const key = nanoid(8);
  return {
    element: { id: newId(), type: 'Control', scope: `#/properties/${key}`, ...control },
    properties: {
      [key]: {
        type: 'array',
        title,
        items: {
          type: 'object',
          properties: itemProperties,
          ...(required !== undefined && { required }),
        },
      },
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
  {
    id: 'accordion-input',
    label: 'Accordion',
    icon: mdiUnfoldMoreHorizontal,
    group: RECORD_FIELDS_GROUP,
    keywords: ['accordion', 'faq', 'questions', 'items', 'repeat'],
    // The fixed item keys, each required, a title needing a non-space character (doc 280 rules 2-3, 13).
    create: () =>
      newObjectArray(
        'Untitled accordion',
        {
          title: { type: 'string', title: 'Title', pattern: '\\S' },
          content: { type: 'object', required: ['root'], title: 'Content' },
        },
        { options: { component: 'accordion' } },
        ['title', 'content'],
      ),
  },
  {
    id: 'document-reference',
    label: 'Document reference',
    icon: mdiFileLinkOutline,
    group: RECORD_FIELDS_GROUP,
    keywords: ['reference', 'link', 'document', 'service', 'agreement', 'application', 'attach'],
    // The fixed item shape, pointing at services until the author chooses another type (doc 287 rule 14).
    create: () => {
      const { properties, required } = referenceItemsSchema() as {
        properties: Record<string, Record<string, unknown>>;
        required: string[];
      };
      return newObjectArray(
        'Untitled references',
        properties,
        { options: { component: DOCUMENT_REFERENCE_COMPONENT, documentType: 'services.service' } },
        required,
      );
    },
  },
]);
