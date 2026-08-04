import { AsyncSelect, type AsyncSelectOption } from '@repo/ui/async-select';
import { Field, FieldLabel } from '@repo/ui/field';
import { useId, useState } from 'react';

import type { AddressValue } from './model';
import type { AddressSuggestion, GeoData } from './geo-context';

/** The address fields a chosen suggestion fills — line 1 + city (the geocoder has no postal code). */
export function suggestionToPatch(suggestion: AddressSuggestion): Partial<AddressValue> {
  return { address_one: suggestion.streetAddress, city: suggestion.city };
}

/**
 * Decode an option `value` (a JSON-encoded {@link AddressSuggestion}) back to the suggestion, or `null`
 * if it isn't valid. The suggestion is round-tripped through the option value so the picked address
 * both fills the form AND displays its human `label` (not the raw JSON).
 */
export function parseSuggestion(raw: string): AddressSuggestion | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed !== null &&
      typeof parsed === 'object' &&
      typeof (parsed as AddressSuggestion).label === 'string'
      ? (parsed as AddressSuggestion)
      : null;
  } catch {
    return null;
  }
}

/** True when the server can run address search for this (country, province) ISO2 pair. */
export function regionSupported(
  regions: readonly { country: string; province: string }[] | undefined,
  countryIso2: string | null | undefined,
  provinceIso2: string | null | undefined,
): boolean {
  if (!regions || !countryIso2 || !provinceIso2) {
    return false;
  }
  const cc = countryIso2.toUpperCase();
  const pp = provinceIso2.toUpperCase();
  return regions.some((r) => r.country.toUpperCase() === cc && r.province.toUpperCase() === pp);
}

/**
 * The "Search for your address" typeahead (feature 154). Rendered under the Country selector ONLY when
 * the selected (country, province) is a server-supported geocoder region. As-you-type it queries the
 * region's geocoder (debounced, via the `GeoData` port) and shows results in a popup; picking one fills
 * Address line 1 + City (`onFill`). Parent guarantees `geo.useAddressSearchRegions`/`searchAddresses`
 * exist (it only mounts this when the capability is present), so the non-null assertions are safe.
 */
export function AddressSearchField({
  geo,
  countryIso2,
  provinceIso2,
  disabled,
  onFill,
}: {
  geo: GeoData;
  countryIso2: string | null | undefined;
  provinceIso2: string | null | undefined;
  disabled: boolean;
  onFill: (patch: Partial<AddressValue>) => void;
}) {
  const id = useId();
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const { data: regions } = geo.useAddressSearchRegions!();
  const search = geo.searchAddresses!;

  if (!regionSupported(regions, countryIso2, provinceIso2)) {
    return null;
  }

  // Encode the whole suggestion in the option value so selection maps back with no extra state.
  const loadOptions = async (
    input: string,
  ): Promise<{ options: AsyncSelectOption[]; hasMore: false }> => {
    const query = input.trim();
    if (query === '') {
      return { options: [], hasMore: false };
    }
    const items = await search({
      country: countryIso2!.toUpperCase(),
      province: provinceIso2!.toUpperCase(),
      query,
    });
    return {
      options: items.map((item) => ({ value: JSON.stringify(item), label: item.label })),
      hasMore: false,
    };
  };

  const handleChange = (value: string | string[] | undefined) => {
    const next = Array.isArray(value) ? value[0] : value;
    setSelected(next);
    const suggestion = typeof next === 'string' ? parseSuggestion(next) : null;
    if (suggestion) {
      onFill(suggestionToPatch(suggestion));
    }
  };

  // The option `value` is the JSON-encoded suggestion; without this, AsyncSelect would render the raw
  // JSON as the selected label. Resolve it back to the human `label` for display.
  const resolveValue = async (value: string | string[]): Promise<AsyncSelectOption[]> => {
    const raw = Array.isArray(value) ? value[0] : value;
    const suggestion = typeof raw === 'string' ? parseSuggestion(raw) : null;
    return suggestion ? [{ value: raw as string, label: suggestion.label }] : [];
  };

  return (
    <Field>
      <FieldLabel htmlFor={id}>Search for your address</FieldLabel>
      <AsyncSelect
        value={selected}
        onChange={handleChange}
        resolveValue={resolveValue}
        loadOptions={loadOptions}
        placeholder="Start typing your address…"
        isDisabled={disabled}
      />
    </Field>
  );
}
