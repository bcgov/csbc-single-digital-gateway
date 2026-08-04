import { describe, expect, it } from 'vitest';
import { FIELD_TYPE_BY_ID } from '@/components/form-builder/field-types';
import {
  createField,
  parseModel,
  serializeModel,
  type ControlNode,
  type FormModel,
} from '@/components/form-builder/model';

/** Feature 153 — the Address field serializes to an object schema + a `format:'address'` control. */
describe('form builder — address field', () => {
  it('is a control-kind palette entry', () => {
    const def = FIELD_TYPE_BY_ID.address;
    expect(def).toBeDefined();
    expect(def.kind).toBe('control');
  });

  it('createField(address) makes a plain control node (no enum / slider extras)', () => {
    const node = createField('address');
    expect(node.kind).toBe('control');
    expect(node.fieldType).toBe('address');
    expect(node.enumOptions).toBeUndefined();
    expect(node.min).toBeUndefined();
  });

  it('serializes to an object property with the six sub-fields + a format:address control', () => {
    const node: ControlNode = {
      ...createField('address'),
      key: 'applicant_address',
      label: 'Applicant address',
    };
    const model: FormModel = { title: '', description: '', fields: [node] };
    const { schema, uischema } = serializeModel(model);

    const prop = (
      schema as {
        properties: Record<
          string,
          { type: string; title?: string; properties?: Record<string, unknown> } | undefined
        >;
      }
    ).properties.applicant_address!;
    expect(prop.type).toBe('object');
    expect(prop.title).toBe('Applicant address');
    expect(Object.keys(prop.properties ?? {}).toSorted()).toEqual([
      'address_one',
      'address_two',
      'city',
      'country',
      'postal_code',
      'province',
    ]);

    const control = (
      uischema as { elements: Array<{ scope?: string; options?: { format?: string } } | undefined> }
    ).elements[0]!;
    expect(control.scope).toBe('#/properties/applicant_address');
    expect(control.options?.format).toBe('address');
  });

  it('round-trips serialize → parse back to an address control node', () => {
    const node: ControlNode = {
      ...createField('address'),
      key: 'addr',
      label: 'Address',
      required: true,
    };
    const model: FormModel = { title: '', description: '', fields: [node] };
    const parsed = parseModel(serializeModel(model));

    expect(parsed.fields).toHaveLength(1);
    const back = parsed.fields[0] as ControlNode;
    expect(back.kind).toBe('control');
    expect(back.fieldType).toBe('address');
    expect(back.key).toBe('addr');
    expect(back.label).toBe('Address');
    expect(back.required).toBe(true);
    // The synthesized `format` flag is stripped so options round-trip empty.
    expect(back.options).toEqual({});
  });
});
