import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { schemaLocked } from '../src/studio/inspector/inspector-field';
import { fieldsFor, inspectorForm } from '../src/studio/inspector/inspector-form';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';

const content = (mobileName: Uischema = {}): DocumentContent => ({
  schema: {
    type: 'object',
    properties: { name: { type: 'string', title: 'Name', description: 'Your full name' } },
    required: ['name'],
  },
  variants: {
    default: {
      id: 'f',
      type: 'Form',
      elements: [{ id: 'd-name', type: 'Control', scope: '#/properties/name' }],
    },
    Mobile: {
      id: 'm',
      type: 'Form',
      elements: [{ id: 'm-name', type: 'Control', scope: '#/properties/name', ...mobileName }],
    },
  },
});
const inputs = (id: string, form: string) => ({
  pageSelectedId: id,
  focusedId: form,
  formId: form,
});
const mobileTarget = (c: DocumentContent) => inspectorTarget(c, inputs('m-name', 'm'), 'Mobile')!;
const defaultTarget = (c: DocumentContent) => inspectorTarget(c, inputs('d-name', 'f'))!;
const mobileControl = (c: DocumentContent) => (c.variants['Mobile']!['elements'] as Uischema[])[0]!;

describe('inspector on a non-default variant (doc 262 rules 13e-f)', () => {
  it('inspectorTarget resolves the element in the named variant', () => {
    const c = content();
    const target = mobileTarget(c);
    expect(target).toMatchObject({ id: 'm-name', variant: 'Mobile', kind: 'text', root: false });
    expect(target.property).toMatchObject({ key: 'name', required: true, shared: 1 });
    expect(inspectorTarget(c, inputs('d-name', 'f'), 'Mobile')?.id).toBe('m');
    expect(defaultTarget(c).variant).toBe('default');
  });

  it('schema-level fields are marked schemaLevel and their writes are ignored outside default', () => {
    const c = content();
    const target = mobileTarget(c);
    const locked = fieldsFor(target)
      .filter((field) => schemaLocked(field, target))
      .map((field) => field.key);
    expect(locked).toEqual(['required', 'minLength', 'maxLength']);
    const form = inspectorForm(target);
    const general = (form.uischema['elements'] as Uischema[])[0]!['elements'] as Uischema[];
    const required = general.find((el) => el['scope'] === '#/properties/required');
    expect(required?.['options']).toMatchObject({ readonly: true });
    const label = general.find((el) => el['scope'] === '#/properties/label');
    expect(label?.['options']).toBeUndefined();
    const values = { ...form.data, required: false, maxLength: 5 };
    expect(applyInspector(c, target, values)).toBe(c);
    // In default the same writes go through.
    const d = defaultTarget(c);
    const written = applyInspector(c, d, { ...inspectorForm(d).data, required: false });
    expect(written.schema['required']).toBeUndefined();
    expect(fieldsFor(d).some((field) => schemaLocked(field, d))).toBe(false);
  });

  it('Label writes a Control label override outside default and leaves the schema title', () => {
    const c = content();
    const target = mobileTarget(c);
    const next = applyInspector(c, target, {
      ...inspectorForm(target).data,
      label: 'Name (short)',
    });
    expect(mobileControl(next)['label']).toBe('Name (short)');
    expect(next.schema).toBe(c.schema);
    expect(next.variants.default).toBe(c.variants.default);
    expect(inspectorForm(mobileTarget(next)).data['label']).toBe('Name (short)');
  });

  it('Description writes options.description outside default and leaves the schema', () => {
    const c = content();
    const target = mobileTarget(c);
    expect(inspectorForm(target).data['description']).toBe('Your full name');
    const next = applyInspector(c, target, {
      ...inspectorForm(target).data,
      description: 'As on your ID',
    });
    expect(mobileControl(next)['options']).toEqual({ description: 'As on your ID' });
    expect(next.schema).toBe(c.schema);
  });

  it('clearing an override removes it so the property value shows again', () => {
    const c = content({ label: 'Short', options: { description: 'Override' } });
    const target = mobileTarget(c);
    expect(inspectorForm(target).data).toMatchObject({ label: 'Short', description: 'Override' });
    const { label: _label, description: _description, ...rest } = inspectorForm(target).data;
    const next = applyInspector(c, target, rest);
    expect(mobileControl(next)).not.toHaveProperty('label');
    expect(mobileControl(next)['options']).toEqual({});
    expect(inspectorForm(mobileTarget(next)).data).toMatchObject({
      label: 'Name',
      description: 'Your full name',
    });
    expect(next.schema).toBe(c.schema);
  });

  it('in default, Label and Description still write the schema', () => {
    const c = content();
    const target = defaultTarget(c);
    const next = applyInspector(c, target, {
      ...inspectorForm(target).data,
      label: 'Full name',
      description: 'Given and family',
    });
    const property = (next.schema['properties'] as Record<string, Record<string, unknown>>)['name'];
    expect(property).toMatchObject({ title: 'Full name', description: 'Given and family' });
    expect(next.variants.default).toBe(c.variants.default);
  });
});
