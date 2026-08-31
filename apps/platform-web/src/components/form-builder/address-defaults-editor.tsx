import { addressLabelsForIso2 } from '@repo/react/jsonforms-renderers';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@repo/ui/combobox';
import { Label } from '@repo/ui/label';
import { Switch } from '@repo/ui/switch';
import { useQuery } from '@tanstack/react-query';

import { countriesQueryOptions, statesQueryOptions } from '@/lib/geo';
import { ClearableInput } from './clearable-input';
import type { ControlNode } from './model';

/**
 * Inspector editor for an Address field's author-set defaults (feature 153): a default country and a
 * default state/province, pre-filled for citizens (who can still change them). Reuses the same geo
 * data + per-country labels as the field itself; a states-bearing country gets a dropdown, otherwise
 * free text. Changing the default country clears the default province.
 *
 * Feature 170 adds a read-only switch per sub-field. A lock is only offered where there is a default
 * to lock to, and is turned OFF (never left dangling) whenever that default goes away — so a lock can
 * never outlive its value.
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
  // exactOptionalPropertyTypes. Changing the country also clears the province default — and with it
  // the province lock, or the lock would outlive the value it pins (feature 170, rule 4).
  const setCountry = (next: string) =>
    onChange({
      defaultCountry: next,
      defaultProvince: '',
      ...(next === '' ? { readOnlyCountry: false } : {}),
      readOnlyProvince: false,
    });
  const setProvince = (next: string) =>
    onChange({ defaultProvince: next, ...(next === '' ? { readOnlyProvince: false } : {}) });

  const hasCountryDefault = (node.defaultCountry ?? '') !== '';
  const hasProvinceDefault = (node.defaultProvince ?? '') !== '';

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
            // `showClear` alone renders an icon-only button with NO accessible name — name it.
            clearLabel="Clear default country"
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
        {hasCountryDefault ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Label htmlFor="insp-address-readonly-country" className="font-normal">
              Country read-only
            </Label>
            <Switch
              id="insp-address-readonly-country"
              checked={node.readOnlyCountry ?? false}
              onCheckedChange={(checked) => onChange({ readOnlyCountry: checked === true })}
            />
          </div>
        ) : null}
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
              clearLabel={`Clear default ${labels.stateLabel}`}
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
          <ClearableInput
            id="insp-address-default-province"
            value={node.defaultProvince ?? ''}
            placeholder={selected ? 'No default' : 'Choose a country first'}
            disabled={!selected}
            onChange={(event) => setProvince(event.target.value)}
            onClear={() => setProvince('')}
          />
        )}
        {hasProvinceDefault ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <Label htmlFor="insp-address-readonly-province" className="font-normal">
              {labels.stateLabel} read-only
            </Label>
            <Switch
              id="insp-address-readonly-province"
              checked={node.readOnlyProvince ?? false}
              onCheckedChange={(checked) => onChange({ readOnlyProvince: checked === true })}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
