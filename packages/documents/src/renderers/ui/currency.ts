import { mdiCurrencyUsd } from '@mdi/js';

/** One currency a Money field may hold (doc 286): what its prefix shows and how many decimal places it takes. */
export interface Currency {
  readonly code: string;
  /** The inspector's option title. */
  readonly label: string;
  /** An MDI icon path, drawn before the input. */
  readonly icon: string;
  readonly fractionDigits: number;
  /** What a screen reader hears for the prefix. */
  readonly spokenName: string;
}

/** Doc 286 data model: every currency a Money field offers, by ISO 4217 code. */
export const CURRENCIES: Readonly<Record<string, Currency>> = Object.freeze({
  CAD: Object.freeze({
    code: 'CAD',
    label: 'Canadian dollar (CAD)',
    icon: mdiCurrencyUsd,
    fractionDigits: 2,
    spokenName: 'Canadian dollars',
  }),
});

export const DEFAULT_CURRENCY = 'CAD';

/** Doc 286 rule 8a: a new Money field takes no amount below zero. */
export const MONEY_MINIMUM = 0;

/** Whether a Control is drawn as Money (rule 1). */
export function isMoneyControl(uischema: unknown): boolean {
  return optionsOf(uischema)?.['component'] === 'money';
}

/**
 * The Control's currency (rule 2): `options.currency` when it names a registry entry, else the default — never an
 * error, so no authored string reaches `Intl.NumberFormat` or an icon path.
 */
export function currencyOf(uischema: unknown): Currency {
  const code = optionsOf(uischema)?.['currency'];
  return (
    (typeof code === 'string' && Object.hasOwn(CURRENCIES, code) && CURRENCIES[code]) ||
    CURRENCIES[DEFAULT_CURRENCY]!
  );
}

function optionsOf(uischema: unknown): Record<string, unknown> | undefined {
  const options = recordOf(uischema)?.['options'];
  return recordOf(options);
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
