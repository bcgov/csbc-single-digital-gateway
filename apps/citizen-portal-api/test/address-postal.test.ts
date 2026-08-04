import { describe, expect, it } from 'vitest';

import {
  collectAddressPostals,
  validateAddressPostals,
} from '../src/modules/applications/util/validate';

// Canada + US postal regexes from geo reference data (geo.countries.postal_code_regex).
const CA_REGEX =
  '^([ABCEGHJKLMNPRSTVXY]\\d[ABCEGHJKLMNPRSTVWXYZ])(?: ?(\\d[ABCEGHJKLMNPRSTVWXYZ]\\d))?$';
const US_REGEX = '^\\d{5}(-\\d{4})?$';

const regexFor = (country: string): string | null =>
  ({ Canada: CA_REGEX, 'United States': US_REGEX })[country] ?? null;

const basicStructure = {
  uischema: {
    type: 'VerticalLayout',
    elements: [
      { type: 'Control', scope: '#/properties/home', options: { format: 'address' } },
      { type: 'Control', scope: '#/properties/name' },
    ],
  },
};

const multiStageStructure = {
  stages: [
    {
      pages: [
        {
          uischema: {
            type: 'VerticalLayout',
            elements: [
              {
                type: 'Group',
                elements: [
                  { type: 'Control', scope: '#/properties/work', options: { format: 'address' } },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
};

describe('collectAddressPostals', () => {
  it('finds an address field with a non-empty postal (basic form)', () => {
    const entries = collectAddressPostals('basic-form', basicStructure, {
      home: { country: 'Canada', postal_code: 'V8W 1A1' },
      name: 'Ada',
    });
    expect(entries).toEqual([{ key: 'home', country: 'Canada', postal: 'V8W 1A1' }]);
  });

  it('recurses into layout groups (multi-stage form)', () => {
    const entries = collectAddressPostals('multi-stage-form', multiStageStructure, {
      work: { country: 'United States', postal_code: '90210' },
    });
    expect(entries).toEqual([{ key: 'work', country: 'United States', postal: '90210' }]);
  });

  it('skips addresses with an empty postal or missing country', () => {
    expect(
      collectAddressPostals('basic-form', basicStructure, {
        home: { country: 'Canada', postal_code: '' },
      }),
    ).toEqual([]);
    expect(
      collectAddressPostals('basic-form', basicStructure, {
        home: { country: '', postal_code: 'V8W 1A1' },
      }),
    ).toEqual([]);
  });
});

describe('validateAddressPostals', () => {
  it('passes a valid postal for the country', () => {
    expect(
      validateAddressPostals([{ key: 'home', country: 'Canada', postal: 'V8W 1A1' }], regexFor),
    ).toEqual([]);
    expect(
      validateAddressPostals(
        [{ key: 'home', country: 'United States', postal: '90210' }],
        regexFor,
      ),
    ).toEqual([]);
  });

  it('flags a postal that does not match the country regex', () => {
    const errors = validateAddressPostals(
      [{ key: 'home', country: 'Canada', postal: '90210' }],
      regexFor,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('home');
    expect(errors[0]).toContain('Canada');
  });

  it('imposes no constraint for a country with no known regex', () => {
    expect(
      validateAddressPostals([{ key: 'home', country: 'Nowhere', postal: 'anything' }], regexFor),
    ).toEqual([]);
  });

  it('treats a malformed regex as no constraint (never throws)', () => {
    expect(
      validateAddressPostals([{ key: 'home', country: 'X', postal: 'y' }], () => '([unclosed'),
    ).toEqual([]);
  });
});
