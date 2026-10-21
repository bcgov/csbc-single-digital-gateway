import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { findById } from '../src/studio/element-ids';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { fieldsFor, inspectorForm } from '../src/studio/inspector/inspector-form';
import { inspectorTarget, KIND_NAMES } from '../src/studio/inspector/inspector-target';
import { form } from './funnel-fixtures';

const SCHEMA = { type: 'object', properties: { name: { type: 'string', title: 'Name' } } };
const section = (options?: Record<string, unknown>): Uischema => ({
  id: 'S',
  type: 'Section',
  label: 'About you',
  ...(options !== undefined && { options }),
  elements: [],
});
const contentWith = (element: Uischema): DocumentContent => ({
  schema: SCHEMA,
  variants: { default: form('F', 'Page', [element]) },
});
const targetOf = (content: DocumentContent) =>
  inspectorTarget(content, { pageSelectedId: 'S', focusedId: 'F', formId: 'F' })!;
const sectionIn = (content: DocumentContent) => findById(content.variants.default, 'S')!;
const apply = (content: DocumentContent, values: Record<string, unknown>) => {
  const target = targetOf(content);
  return applyInspector(content, target, { ...inspectorForm(target).data, ...values });
};

describe('Section in the inspector (doc 278 rule 14)', () => {
  it('inspects a Section as kind section with Title, Description, Variant and Spacing', () => {
    const target = targetOf(contentWith(section()));
    expect(target.kind).toBe('section');
    expect(KIND_NAMES.section).toBe('Section');
    const keys = fieldsFor(target).map((f) => f.key);
    expect(keys).toEqual(
      expect.arrayContaining(['sectionTitle', 'sectionDescription', 'sectionVariant', 'gap']),
    );
    // Rule 14: Inset only for a container.
    expect(keys).not.toContain('sectionInset');
    expect(inspectorForm(target).data).toMatchObject({
      sectionTitle: 'About you',
      sectionVariant: 'plain',
      gap: 'md',
    });
  });

  it('shows Inset for a container, reading the default when unset', () => {
    const target = targetOf(contentWith(section({ variant: 'container' })));
    expect(fieldsFor(target).map((f) => f.key)).toContain('sectionInset');
    expect(inspectorForm(target).data['sectionInset']).toBe('md');
  });

  it('writes title, description, variant, inset and spacing', () => {
    const next = apply(contentWith(section({ variant: 'container' })), {
      sectionTitle: 'Your details',
      sectionDescription: 'Line one\nLine two',
      sectionInset: 'xl',
      gap: 'lg',
    });
    expect(sectionIn(next)).toMatchObject({
      label: 'Your details',
      options: { description: 'Line one\nLine two', variant: 'container', inset: 'xl', gap: 'lg' },
    });
  });

  it('defaults and blanks are absent keys', () => {
    const content = contentWith(
      section({ variant: 'container', inset: 'lg', description: 'x', gap: 'sm' }),
    );
    const next = apply(content, {
      sectionTitle: '',
      sectionDescription: '',
      sectionVariant: 'plain',
      gap: 'md',
    });
    expect(sectionIn(next)['label']).toBeUndefined();
    // An inset on a plain Section is kept and ignored (rule 11) — not stripped by changing the variant.
    expect(sectionIn(next)['options']).toEqual({ inset: 'lg' });
    const container = apply(contentWith(section({ variant: 'container', inset: 'lg' })), {
      sectionInset: 'md',
    });
    expect(sectionIn(container)['options']).toEqual({ variant: 'container' });
  });
});
