import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { findById } from '../src/studio/element-ids';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { fieldsFor, inspectorForm } from '../src/studio/inspector/inspector-form';
import { inspectorTarget, KIND_NAMES } from '../src/studio/inspector/inspector-target';
import { form } from './funnel-fixtures';
import { emptyRichText, richText } from './rich-text-fixtures';

const group = (options: Record<string, unknown> = {}): Uischema => ({
  id: 'G',
  type: 'AccordionGroup',
  label: 'FAQ',
  options: { items: [{ id: 'a', title: 'One' }], ...options },
});
const contentWith = (element: Uischema): DocumentContent => ({
  schema: { type: 'object' },
  variants: { default: form('F', 'Page', [element]) },
});
const targetOf = (content: DocumentContent) =>
  inspectorTarget(content, { pageSelectedId: 'G', focusedId: 'F', formId: 'F' })!;
const groupIn = (content: DocumentContent) => findById(content.variants.default, 'G')!;
const apply = (content: DocumentContent, values: Record<string, unknown>) => {
  const target = targetOf(content);
  return applyInspector(content, target, { ...inspectorForm(target).data, ...values });
};

describe('Accordion group in the inspector (doc 279 rule 15)', () => {
  it('inspects as kind accordion-group with Title, Description and Initially open', () => {
    const target = targetOf(contentWith(group({ description: richText('More') })));
    expect(target.kind).toBe('accordion-group');
    expect(KIND_NAMES['accordion-group']).toBe('Accordion group');
    const fields = fieldsFor(target);
    expect(fields.map((f) => [f.key, f.section, f.label])).toEqual(
      expect.arrayContaining([
        ['accordionTitle', 'General', 'Title'],
        ['accordionDescription', 'General', 'Description'],
        ['accordionDefaultOpen', 'Appearance', 'Initially open'],
      ]),
    );
    const { data, schema } = inspectorForm(target);
    expect(data).toMatchObject({
      accordionTitle: 'FAQ',
      accordionDescription: richText('More'),
      accordionDefaultOpen: 'none',
    });
    const open = (
      schema as { properties: Record<string, { oneOf: { const: string; title: string }[] }> }
    ).properties['accordionDefaultOpen']!.oneOf;
    expect(open.map((c) => [c.const, c.title])).toEqual([
      ['none', 'None'],
      ['first', 'First item'],
      ['all', 'All items'],
    ]);
    // Items are edited on the canvas only.
    expect(fields.map((f) => f.key).filter((k) => /item/i.test(k))).toEqual([]);
  });

  it('writes the title, rich description and initial open mode, leaving the items alone', () => {
    const next = apply(contentWith(group()), {
      accordionTitle: 'Questions',
      accordionDescription: richText('Read first'),
      accordionDefaultOpen: 'all',
    });
    expect(groupIn(next)).toMatchObject({
      label: 'Questions',
      options: {
        description: richText('Read first'),
        defaultOpen: 'all',
        items: [{ id: 'a', title: 'One' }],
      },
    });
  });

  it('defaults and blanks are absent keys', () => {
    const content = contentWith(group({ description: richText('x'), defaultOpen: 'first' }));
    const next = apply(content, {
      accordionTitle: '',
      accordionDescription: emptyRichText(),
      accordionDefaultOpen: 'none',
    });
    expect(groupIn(next)['label']).toBeUndefined();
    expect(groupIn(next)['options']).toEqual({ items: [{ id: 'a', title: 'One' }] });
  });
});
