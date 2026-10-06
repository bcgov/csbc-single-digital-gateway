import { cardGap, cardSize, cardSlots, newCardSlot } from '../../renderers/ui/card-model';
import { elementName } from '../../renderers/studio/element-actions';
import type { Governance } from '../capabilities/governance';
import type { DocumentContent, Uischema } from '../document-types';
import { idOf } from '../element-ids';
import { removeElement } from '../element-remove';
import type { GridShrinkPlan } from './grid-fields';
import {
  absentIf,
  BOOLEAN,
  choice,
  isKind,
  optionOf,
  patchElement,
  SMALL_SWITCH,
  STRING,
  type InspectorField,
} from './inspector-field';
import type { InspectorTarget } from './inspector-target';

const isCard = isKind('card');

/** Doc 273 rule 8: a Card's Title, Description and Size, ahead of its Spacing. */
export const CARD_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'cardTitle',
    section: 'General',
    label: 'Title',
    applies: isCard,
    schema: () => STRING,
    read: (t) => t.element['label'],
    write: (content, t, value) =>
      patchElement(content, t, { label: absentIf(value) as string | undefined }),
  },
  {
    key: 'cardDescription',
    section: 'General',
    label: 'Description',
    applies: isCard,
    schema: () => STRING,
    options: { component: 'textarea' },
    read: (t) => optionOf(t, 'description'),
    write: (content, t, value) =>
      patchElement(content, t, { options: { description: absentIf(value) } }),
  },
  {
    key: 'cardSize',
    section: 'Appearance',
    label: 'Size',
    applies: isCard,
    schema: () =>
      choice([
        ['default', 'Default'],
        ['sm', 'Small'],
      ]),
    required: true,
    read: (t) => cardSize(t.element),
    write: (content, t, value) =>
      patchElement(content, t, { options: { size: value === 'sm' ? 'sm' : undefined } }),
  },
]);

/**
 * Doc 273 rules 4, 8-9: the Card's Spacing — its own key, since the layouts' Spacing always has a value and a Card's
 * may be empty (it then follows the size) — and Show footer, after it.
 */
export const CARD_TRAILING_FIELDS: readonly InspectorField[] = Object.freeze([
  {
    key: 'cardSpacing',
    section: 'Appearance',
    label: 'Spacing',
    applies: isCard,
    schema: () =>
      choice([
        ['sm', 'Small'],
        ['md', 'Medium'],
        ['lg', 'Large'],
      ]),
    options: { description: 'Empty: follows the size.' },
    read: (t) => cardGap(t.element),
    write: (content, t, value) => patchElement(content, t, { options: { gap: absentIf(value) } }),
  },
  {
    key: 'cardFooter',
    section: 'Appearance',
    label: 'Show footer',
    applies: isCard,
    schema: () => BOOLEAN,
    options: SMALL_SWITCH,
    read: (t) => cardSlots(t.element).footer !== undefined,
    write: (content, t, value) => {
      const footer = cardSlots(t.element).footer;
      if (value === true && footer === undefined) {
        const elements = (t.element['elements'] as unknown[] | undefined) ?? [];
        return patchElement(content, t, { elements: [...elements, newCardSlot()] });
      }
      const footerId = footer === undefined ? undefined : idOf(footer);
      return value === false && footerId !== undefined
        ? removeElement(content, footerId, t.variant)
        : content;
    },
  },
]);

/**
 * What switching a Card's footer off would delete (doc 273 rule 9): the footer's elements, or `undefined` when the
 * values keep the footer or it is empty — an empty footer goes at once.
 */
export function cardFooterPlan(
  content: DocumentContent,
  target: InspectorTarget,
  values: Record<string, unknown>,
  governance: Governance | undefined,
): GridShrinkPlan | undefined {
  if (target.kind !== 'card' || values['cardFooter'] !== false) return undefined;
  const footer = cardSlots(target.element).footer;
  const footerId = footer === undefined ? undefined : idOf(footer);
  const children = ((footer?.['elements'] as unknown[] | undefined) ?? []).filter(isRecord);
  if (footerId === undefined || children.length === 0) return undefined;
  const ids = children.map((child) => idOf(child) ?? '');
  return {
    ids,
    names: children.map((child) => elementName(child as never, content.schema)),
    where: 'in the card footer',
    locked: [footerId, ...ids].some((id) => governance?.canRemove(id) === false),
  };
}

function isRecord(value: unknown): value is Uischema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
