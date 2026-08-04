import { addressLabelsForIso2 } from '@repo/react/jsonforms-renderers';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@repo/ui/combobox';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { useQuery } from '@tanstack/react-query';

import { countriesQueryOptions, statesQueryOptions } from '@/lib/geo';
import type { ControlNode } from './model';

/**
 * Inspector editor for an Address field's author-set defaults (feature 153): a default country and a
 * default state/province, pre-filled for citizens (who can still change them). Reuses the same geo
 * data + per-country labels as the field itself; a states-bearing country gets a dropdown, otherwise
 * free text. Changing the default country clears the default province.
 */
export function AddressDefaultsEditor({
  node,
  onChange,
}: {
  node: ControlNode;
  onChange: (patch: Partial<ControlNode>) => void;
}) {
  const { data: countries } = useQuery(countriesQueryOptions());
  const selected = countries?.find((country) => country.name === node.defaultCountry);
  const labels = addressLabelsForIso2(selected?.iso2 ?? null);
  const hasStates = selected?.hasStates ?? false;
  const { data: states } = useQuery(statesQueryOptions(hasStates ? selected?.id : undefined));
  const countryNames = (countries ?? []).map((country) => country.name);
  const stateNames = (states ?? []).map((state) => state.name);

  // Empty string = "no default" (serialization drops it); avoids explicit `undefined` under
  // exactOptionalPropertyTypes. Changing the country also clears the province default.
  const setCountry = (next: string) => onChange({ defaultCountry: next, defaultProvince: '' });
  const setProvince = (next: string) => onChange({ defaultProvince: next });

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <p className="text-xs text-muted-foreground">
        Default values are pre-filled for citizens, who can still change them.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="insp-address-default-country">Default country</Label>
        <Combobox
          items={countryNames}
          value={node.defaultCountry ?? ''}
          onValueChange={(next) => setCountry(typeof next === 'string' ? next : '')}
        >
          <ComboboxInput
            id="insp-address-default-country"
            className="w-full"
            placeholder="No default"
            showClear
          />
          <ComboboxContent>
            <ComboboxEmpty>No country found.</ComboboxEmpty>
            <ComboboxList>
              {(name: string) => (
                <ComboboxItem key={name} value={name}>
                  {name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="insp-address-default-province">Default {labels.stateLabel}</Label>
        {hasStates ? (
          <Combobox
            items={stateNames}
            value={node.defaultProvince ?? ''}
            onValueChange={(next) => setProvince(typeof next === 'string' ? next : '')}
          >
            <ComboboxInput
              id="insp-address-default-province"
              className="w-full"
              placeholder="No default"
              showClear
            />
            <ComboboxContent>
              <ComboboxEmpty>No {labels.stateLabel} found.</ComboboxEmpty>
              <ComboboxList>
                {(name: string) => (
                  <ComboboxItem key={name} value={name}>
                    {name}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        ) : (
          <Input
            id="insp-address-default-province"
            value={node.defaultProvince ?? ''}
            placeholder={selected ? 'No default' : 'Choose a country first'}
            disabled={!selected}
            onChange={(event) => setProvince(event.target.value)}
          />
        )}
      </div>
    </div>
  );
}
