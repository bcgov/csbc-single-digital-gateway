import { describe, expect, it } from 'vitest';

import {
  collectAddressLocks,
  validateAddressLocks,
} from '../../../../../src/modules/applications/util/validate';

// Feature 170 — server-side enforcement of the address read-only locks. Pure and synchronous: unlike
// the postal-code pass it needs no geo lookup, since the expected value comes from the form
// definition already in hand. The rendered field being read-only is UX only; this is the real gate.

const addressProperties = {
  country: { type: 'string' },
  address_one: { type: 'string' },
  address_two: { type: 'string' },
  city: { type: 'string' },
  province: { type: 'string' },
  postal_code: { type: 'string' },
};

/** A basic form with one address field: `fields` = the lock bags, `addressDefault` = the pinned values. */
const basicForm = (
  fields: Record<string, unknown>,
  addressDefault: Record<string, unknown> = { country: 'Canada', province: 'British Columbia' },
  key = 'addr',
) => ({
  schema: {
    type: 'object',
    properties: {
      [key]: { type: 'object', default: addressDefault, properties: addressProperties },
    },
  },
  uischema: {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: `#/properties/${key}`, options: { format: 'address', fields } },
    ],
  },
});

const lockedCountry = basicForm({ country: { readOnly: true } });

describe('collectAddressLocks — walking the definition', () => {
  it('Should collect a locked country with its expected default value', () => {
    expect(collectAddressLocks('basic-form', lockedCountry)).toEqual([
      { key: 'addr', field: 'country', expected: 'Canada' },
    ]);
  });

  it('Should collect a locked province with its expected default value', () => {
    const form = basicForm({ province: { readOnly: true } });
    expect(collectAddressLocks('basic-form', form)).toEqual([
      { key: 'addr', field: 'province', expected: 'British Columbia' },
    ]);
  });

  it('Should collect nothing when no address sub-field is locked', () => {
    expect(collectAddressLocks('basic-form', basicForm({}))).toEqual([]);
    expect(collectAddressLocks('basic-form', basicForm({ country: { readOnly: false } }))).toEqual(
      [],
    );
  });

  it('Should collect nothing for a form with no address fields at all', () => {
    const form = {
      schema: { type: 'object', properties: { name: { type: 'string' } } },
      uischema: {
        type: 'VerticalLayout',
        elements: [{ type: 'Control', scope: '#/properties/name' }],
      },
    };
    expect(collectAddressLocks('basic-form', form)).toEqual([]);
  });

  it('Should collect locks from every page of a multi-stage form', () => {
    const page = (key: string) =>
      basicForm({ country: { readOnly: true } }, { country: 'Canada' }, key);
    const structure = {
      stages: [{ pages: [page('home')] }, { pages: [page('mailing')] }],
    };
    const found = collectAddressLocks('multi-stage-form', structure);
    expect(found.map((c) => c.key).toSorted()).toEqual(['home', 'mailing']);
  });

  it('Should collect locks from an address nested inside a layout element', () => {
    const form = {
      schema: {
        type: 'object',
        properties: {
          addr: { type: 'object', default: { country: 'Canada' }, properties: addressProperties },
        },
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Group',
            elements: [
              {
                type: 'Control',
                scope: '#/properties/addr',
                options: { format: 'address', fields: { country: { readOnly: true } } },
              },
            ],
          },
        ],
      },
    };
    expect(collectAddressLocks('basic-form', form)).toEqual([
      { key: 'addr', field: 'country', expected: 'Canada' },
    ]);
  });

  it('Should handle two address fields in one form independently', () => {
    const form = {
      schema: {
        type: 'object',
        properties: {
          home: { type: 'object', default: { country: 'Canada' }, properties: addressProperties },
          work: { type: 'object', default: { country: 'France' }, properties: addressProperties },
        },
      },
      uischema: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/home',
            options: { format: 'address', fields: { country: { readOnly: true } } },
          },
          {
            type: 'Control',
            scope: '#/properties/work',
            options: { format: 'address', fields: { country: { readOnly: true } } },
          },
        ],
      },
    };
    expect(collectAddressLocks('basic-form', form)).toEqual([
      { key: 'home', field: 'country', expected: 'Canada' },
      { key: 'work', field: 'country', expected: 'France' },
    ]);
  });

  it('Should not throw on a hand-edited non-object fields blob', () => {
    for (const blob of ['nope', 42, null, true]) {
      expect(() => collectAddressLocks('basic-form', basicForm(blob as never))).not.toThrow();
      expect(collectAddressLocks('basic-form', basicForm(blob as never))).toEqual([]);
    }
    expect(collectAddressLocks('basic-form', basicForm({ country: 'locked' as never }))).toEqual(
      [],
    );
  });
});

describe('validateAddressLocks — enforcement (rule 9)', () => {
  const constraints = collectAddressLocks('basic-form', lockedCountry);

  it('Should return no errors when the submitted value equals the locked default', () => {
    expect(validateAddressLocks(constraints, { addr: { country: 'Canada' } })).toEqual([]);
  });

  it('Should return an error when the submitted country differs from the locked default', () => {
    const errors = validateAddressLocks(constraints, { addr: { country: 'France' } });
    expect(errors).toHaveLength(1);
  });

  it('Should return an error when the submitted province differs from the locked default', () => {
    const provinceConstraints = collectAddressLocks(
      'basic-form',
      basicForm({ province: { readOnly: true } }),
    );
    const errors = validateAddressLocks(provinceConstraints, {
      addr: { province: 'Alberta' },
    });
    expect(errors).toHaveLength(1);
  });

  it('Should name the field key and the expected value in the error message', () => {
    const [error] = validateAddressLocks(constraints, { addr: { country: 'France' } });
    expect(error).toContain('addr.country');
    expect(error).toContain('Canada');
  });

  it('Should not leak unrelated definition internals into the error message', () => {
    const [error] = validateAddressLocks(constraints, { addr: { country: 'France' } });
    expect(error).not.toContain('properties');
    expect(error).not.toContain('uischema');
    expect(error).not.toContain('readOnly');
  });

  it('Should report both sub-fields when country and province are both violated', () => {
    const both = collectAddressLocks(
      'basic-form',
      basicForm({ country: { readOnly: true }, province: { readOnly: true } }),
    );
    const errors = validateAddressLocks(both, {
      addr: { country: 'France', province: 'Alberta' },
    });
    expect(errors).toHaveLength(2);
  });

  it('Should ignore an unlocked sub-field that differs from its default', () => {
    // Only `country` is locked — the citizen may still change the province freely.
    const errors = validateAddressLocks(constraints, {
      addr: { country: 'Canada', province: 'Alberta' },
    });
    expect(errors).toEqual([]);
  });
});

describe('validateAddressLocks — fail-open and empty cases (rules 10, 11)', () => {
  it('Should impose no constraint when a lock has no matching schema default (rule 10)', () => {
    // readOnly: true but the schema pins nothing — an enforced lock here would make the form
    // unsatisfiable, so it must fail OPEN.
    const constraints = collectAddressLocks(
      'basic-form',
      basicForm({ country: { readOnly: true } }, {}),
    );
    expect(constraints).toEqual([]);
    expect(validateAddressLocks(constraints, { addr: { country: 'Anything' } })).toEqual([]);
  });

  it('Should reject an empty submitted value for a locked sub-field (rule 11)', () => {
    const constraints = collectAddressLocks('basic-form', lockedCountry);
    expect(validateAddressLocks(constraints, { addr: { country: '' } })).toHaveLength(1);
  });

  it('Should impose no constraint when the address key is absent from the submitted data', () => {
    const constraints = collectAddressLocks('basic-form', lockedCountry);
    expect(validateAddressLocks(constraints, {})).toEqual([]);
    expect(validateAddressLocks(constraints, { other: 'value' })).toEqual([]);
  });

  it('Should not throw when the submitted address is not an object', () => {
    const constraints = collectAddressLocks('basic-form', lockedCountry);
    for (const blob of ['nope', 42, null, true]) {
      expect(() => validateAddressLocks(constraints, { addr: blob })).not.toThrow();
    }
  });

  it('Should not throw when a locked default is a non-string', () => {
    const form = basicForm({ country: { readOnly: true } }, { country: 42 });
    expect(() => collectAddressLocks('basic-form', form)).not.toThrow();
    // A non-string default coerces to '' → no constraint (same fail-open path as rule 10).
    expect(collectAddressLocks('basic-form', form)).toEqual([]);
  });

  it('Should not throw when the whole structure is empty', () => {
    expect(() => collectAddressLocks('basic-form', {})).not.toThrow();
    expect(collectAddressLocks('basic-form', {})).toEqual([]);
    expect(collectAddressLocks('multi-stage-form', {})).toEqual([]);
    expect(
      collectAddressLocks('multi-stage-form', {
        stages: [{ pages: [{}] }, {}],
      }),
    ).toEqual([]);
  });

  it('Should handle uischema with non-record elements or missing schema properties safely', () => {
    expect(
      collectAddressLocks('basic-form', {
        schema: {},
        uischema: {
          type: 'VerticalLayout',
          elements: [
            null,
            undefined,
            123,
            {
              type: 'Control',
              scope: '#/properties/addr',
              options: { format: 'address', fields: { country: { readOnly: true } } },
            },
          ],
        },
      }),
    ).toEqual([]);
  });

  it('Should handle non-object data passed to validateAddressLocks safely', () => {
    const constraints = collectAddressLocks('basic-form', lockedCountry);
    expect(validateAddressLocks(constraints, null)).toEqual([]);
    expect(validateAddressLocks(constraints, 'string')).toEqual([]);
  });
});
