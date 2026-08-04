/**
 * Per-country labels for the state/province and postal-code fields (feature 153). The geo dataset has
 * `postal_code_format`/`postal_code_regex` and a per-state `type`, but NO display-name strings — so
 * the field labels come from this small **curated map keyed by ISO2**, defaulting to a generic pair.
 * Extend the map as needed; an unknown/absent country falls back to {@link DEFAULT_ADDRESS_LABELS}.
 */

export interface AddressLabels {
  /** Label for the state / province / region field. */
  stateLabel: string;
  /** Label for the postal / ZIP code field. */
  postalLabel: string;
}

export const DEFAULT_ADDRESS_LABELS: AddressLabels = {
  stateLabel: 'State / Province',
  postalLabel: 'Postal code',
};

/** ISO2 → labels. Keys are upper-case ISO2 codes. */
const ADDRESS_LABELS_BY_ISO2: Record<string, AddressLabels> = {
  US: { stateLabel: 'State', postalLabel: 'ZIP code' },
  CA: { stateLabel: 'Province', postalLabel: 'Postal code' },
  GB: { stateLabel: 'County', postalLabel: 'Postcode' },
  AU: { stateLabel: 'State', postalLabel: 'Postcode' },
  IN: { stateLabel: 'State', postalLabel: 'PIN code' },
  IE: { stateLabel: 'County', postalLabel: 'Eircode' },
  NZ: { stateLabel: 'Region', postalLabel: 'Postcode' },
};

/**
 * Resolve the state/province + postal labels for a country by ISO2. Case-insensitive; `undefined`,
 * empty, or an unknown code returns {@link DEFAULT_ADDRESS_LABELS}.
 */
export function addressLabelsForIso2(iso2: string | undefined | null): AddressLabels {
  if (!iso2) {
    return DEFAULT_ADDRESS_LABELS;
  }
  return ADDRESS_LABELS_BY_ISO2[iso2.toUpperCase()] ?? DEFAULT_ADDRESS_LABELS;
}
