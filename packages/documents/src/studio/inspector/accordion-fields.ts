import {
  accordionDefaultOpen,
  DEFAULT_ACCORDION_OPEN,
  DEFAULT_OPEN_CHOICES,
} from '../../renderers/ui/accordion-model';
import { richTextHasText, richTextValue } from '../../renderers/ui/rich-text-value';
import {
  absentIf,
  choice,
  isKind,
  optionOf,
  patchElement,
  RICH_TEXT,
  STRING,
  type InspectorField,
} from './inspector-field';

const isAccordion = isKind('accordion-group');

/** Doc 279 rule 15: an Accordion group's Title, Description and Initially open. Items are edited on the canvas. */
export const ACCORDION_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'accordionTitle',
    section: 'General',
    label: 'Title',
    applies: isAccordion,
    schema: () => STRING,
    read: (t) => t.element['label'],
    write: (content, t, value) =>
      patchElement(content, t, { label: absentIf(value) as string | undefined }),
  },
  {
    key: 'accordionDescription',
    section: 'General',
    label: 'Description',
    applies: isAccordion,
    schema: () => RICH_TEXT,
    read: (t) => richTextValue(optionOf(t, 'description')),
    // An emptied editor is no description (doc 250 rule 2).
    write: (content, t, value) => {
      const state = richTextValue(value);
      return patchElement(content, t, {
        options: { description: richTextHasText(state) ? state : undefined },
      });
    },
  },
  {
    key: 'accordionDefaultOpen',
    section: 'Appearance',
    label: 'Initially open',
    applies: isAccordion,
    schema: () => choice(DEFAULT_OPEN_CHOICES),
    required: true,
    read: (t) => accordionDefaultOpen(t.element['options']),
    write: (content, t, value) =>
      patchElement(content, t, {
        options: {
          defaultOpen: absentIf(
            accordionDefaultOpen({ defaultOpen: value }),
            DEFAULT_ACCORDION_OPEN,
          ),
        },
      }),
  },
]);
