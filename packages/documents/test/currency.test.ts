import { mdiCurrencyUsd } from '@mdi/js';
import { describe, expect, it } from 'vitest';
import {
  CURRENCIES,
  currencyOf,
  DEFAULT_CURRENCY,
  isMoneyControl,
} from '../src/renderers/ui/currency';
import { numberOptions } from '../src/renderers/ui/number-options';

const money = (options: Record<string, unknown> = {}) => ({
  type: 'Control',
  options: { component: 'money', ...options },
});

describe('currency registry (doc 286 rules 2-3)', () => {
  it('CURRENCIES is frozen and holds CAD with mdiCurrencyUsd, 2 fraction digits and a spoken name', () => {
    expect(Object.isFrozen(CURRENCIES)).toBe(true);
    expect(Object.isFrozen(CURRENCIES['CAD'])).toBe(true);
    expect(DEFAULT_CURRENCY).toBe('CAD');
    expect(CURRENCIES['CAD']).toEqual({
      code: 'CAD',
      label: 'Canadian dollar (CAD)',
      icon: mdiCurrencyUsd,
      fractionDigits: 2,
      spokenName: 'Canadian dollars',
    });
  });

  it('currencyOf returns CAD for an absent, wrong-typed or unknown options.currency', () => {
    expect(currencyOf(money({ currency: 'CAD' })).code).toBe('CAD');
    for (const uischema of [
      money(),
      money({ currency: 7 }),
      money({ currency: 'XYZ' }),
      money({ currency: '__proto__' }),
      money({ currency: 'toString' }),
      null,
      { options: null },
    ]) {
      expect(currencyOf(uischema).code).toBe('CAD');
    }
  });

  it('isMoneyControl is true only for options.component "money"', () => {
    expect(isMoneyControl(money())).toBe(true);
    expect(isMoneyControl({ options: { component: 'textarea' } })).toBe(false);
    expect(isMoneyControl({ options: { component: ['money'] } })).toBe(false);
    expect(isMoneyControl({})).toBe(false);
    expect(isMoneyControl(undefined)).toBe(false);
  });

  it('numberOptions gives a money Control min/max fraction digits of the currency, and 0 for an integer schema', () => {
    expect(numberOptions(money(), { type: 'number', minimum: 0 })).toEqual({
      min: 0,
      format: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    });
    expect(numberOptions(money(), { type: 'integer' })).toEqual({
      step: 1,
      format: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
    });
  });

  it('numberOptions for a plain Number is unchanged', () => {
    expect(numberOptions({}, { type: 'number' })).toEqual({});
    expect(numberOptions({}, { type: 'integer' })).toEqual({
      step: 1,
      format: { maximumFractionDigits: 0 },
    });
  });
});
