import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@repo/ui/combobox';
import { Field, FieldLabel } from '@repo/ui/field';
import { Input } from '@repo/ui/input';
import { type ReactNode, useId } from 'react';

import { addressLabelsForIso2 } from './labels';
import { type AddressValue, normalizeAddress } from './model';
import { type GeoCountryOption, type GeoData, useGeo } from './geo-context';

/** Dispatched purely by the uischema option `format: 'address'`, ranked above generic controls. */
export const addressControlTester: RankedTester = rankWith(
  5,
  and(uiTypeIs('Control'), optionIs('format', 'address')),
);

/**
 * Set the country and CLEAR the province — a province from the old country never applies to the new
 * one (business rule 2). Address lines, city and postal text are kept. Pure + exported for testing.
 */
export function withCountry(prev: AddressValue, country: string): AddressValue {
  return { ...prev, country, province: '' };
}

/** Resolve the selected country's record by its stored display name. */
function findCountry(
  countries: GeoCountryOption[] | undefined,
  name: string,
): GeoCountryOption | undefined {
  return countries?.find((country) => country.name === name);
}

interface SubFieldProps {
  id: string;
  label: string;
  children: ReactNode;
}

/** One labelled sub-field. Fills its row; `flex-1` when placed inside a {@link Row}. */
function SubField({ id, label, children }: SubFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
    </Field>
  );
}

/** Lays two sub-fields side by side on ≥sm screens (stacked on mobile). Used for City + State. */
function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:[&>*]:flex-1">{children}</div>;
}

interface BodyProps {
  baseId: string;
  value: AddressValue;
  disabled: boolean;
  invalid: boolean;
  onField: (key: keyof AddressValue, next: string) => void;
  onCountry: (next: string) => void;
}

/** The free-text address body — country + province are plain inputs (no geo data available). */
function PlainBody({ baseId, value, disabled, invalid, onField }: BodyProps) {
  const labels = addressLabelsForIso2(undefined);
  return (
    <>
      <SubField id={`${baseId}-country`} label="Country">
        <Input
          id={`${baseId}-country`}
          value={value.country}
          disabled={disabled}
          aria-invalid={invalid}
          onChange={(event) => onField('country', event.target.value)}
        />
      </SubField>
      <AddressLines baseId={baseId} value={value} disabled={disabled} onField={onField} />
      <Row>
        <CityField baseId={baseId} value={value} disabled={disabled} onField={onField} />
        <SubField id={`${baseId}-province`} label={labels.stateLabel}>
          <Input
            id={`${baseId}-province`}
            value={value.province}
            disabled={disabled}
            onChange={(event) => onField('province', event.target.value)}
          />
        </SubField>
      </Row>
      <SubField id={`${baseId}-postal_code`} label={labels.postalLabel}>
        <Input
          id={`${baseId}-postal_code`}
          value={value.postal_code}
          disabled={disabled}
          onChange={(event) => onField('postal_code', event.target.value)}
        />
      </SubField>
    </>
  );
}

type LineProps = Pick<BodyProps, 'baseId' | 'value' | 'disabled' | 'onField'>;

/** Address line 1 + line 2 — each on its own row, identical across the plain and geo bodies. */
function AddressLines({ baseId, value, disabled, onField }: LineProps) {
  return (
    <>
      <SubField id={`${baseId}-address_one`} label="Address line 1">
        <Input
          id={`${baseId}-address_one`}
          value={value.address_one}
          disabled={disabled}
          onChange={(event) => onField('address_one', event.target.value)}
        />
      </SubField>
      <SubField id={`${baseId}-address_two`} label="Address line 2">
        <Input
          id={`${baseId}-address_two`}
          value={value.address_two}
          disabled={disabled}
          onChange={(event) => onField('address_two', event.target.value)}
        />
      </SubField>
    </>
  );
}

/** The City sub-field — shared, so both bodies can pair it with their State/Province field in a Row. */
function CityField({ baseId, value, disabled, onField }: LineProps) {
  return (
    <SubField id={`${baseId}-city`} label="City">
      <Input
        id={`${baseId}-city`}
        value={value.city}
        disabled={disabled}
        onChange={(event) => onField('city', event.target.value)}
      />
    </SubField>
  );
}

/** The geo-backed body: searchable country combobox → country-filtered province + dynamic labels. */
function GeoBody({
  baseId,
  value,
  disabled,
  invalid,
  onField,
  onCountry,
  geo,
}: BodyProps & { geo: GeoData }) {
  const { data: countries } = geo.useCountries();
  const selected = findCountry(countries, value.country);
  const labels = addressLabelsForIso2(selected?.iso2 ?? null);
  const hasStates = selected?.hasStates ?? false;
  // Default to showing the postal field when the country is unknown/unresolved.
  const hasPostal = selected?.hasPostal ?? true;
  const { data: statesList } = geo.useStates(hasStates ? selected?.id : undefined);
  const countryNames = (countries ?? []).map((country) => country.name);
  const stateNames = (statesList ?? []).map((state) => state.name);

  return (
    <>
      <SubField id={`${baseId}-country`} label="Country">
        <Combobox
          items={countryNames}
          value={value.country}
          onValueChange={(next) => onCountry(typeof next === 'string' ? next : '')}
          disabled={disabled}
        >
          <ComboboxInput
            id={`${baseId}-country`}
            className="w-full"
            placeholder="Select a country"
            aria-invalid={invalid}
          />
          <ComboboxContent>
            <ComboboxEmpty>No country found.</ComboboxEmpty>
            {/* Function child → Base UI renders the FILTERED items (a manual .map is not filtered). */}
            <ComboboxList>
              {(name: string) => (
                <ComboboxItem key={name} value={name}>
                  {name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </SubField>
      <AddressLines baseId={baseId} value={value} disabled={disabled} onField={onField} />
      <Row>
        <CityField baseId={baseId} value={value} disabled={disabled} onField={onField} />
        <SubField id={`${baseId}-province`} label={labels.stateLabel}>
          {hasStates ? (
            <Combobox
              items={stateNames}
              value={value.province}
              onValueChange={(next) => onField('province', typeof next === 'string' ? next : '')}
              disabled={disabled}
            >
              <ComboboxInput
                id={`${baseId}-province`}
                className="w-full"
                placeholder={`Select a ${labels.stateLabel}`}
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
              id={`${baseId}-province`}
              value={value.province}
              disabled={disabled}
              onChange={(event) => onField('province', event.target.value)}
            />
          )}
        </SubField>
      </Row>
      {hasPostal ? (
        <SubField id={`${baseId}-postal_code`} label={labels.postalLabel}>
          <Input
            id={`${baseId}-postal_code`}
            value={value.postal_code}
            disabled={disabled}
            onChange={(event) => onField('postal_code', event.target.value)}
          />
        </SubField>
      ) : null}
    </>
  );
}

function AddressControlComponent({
  id,
  data,
  handleChange,
  path,
  label,
  description,
  errors,
  required,
  enabled,
  visible,
}: ControlProps) {
  const geo = useGeo();
  const generatedId = useId();
  if (visible === false) {
    return null;
  }
  const value = normalizeAddress(data);
  const disabled = enabled === false;
  const invalid = Boolean(errors);
  const baseId = id || generatedId;

  const onField = (key: keyof AddressValue, next: string) =>
    handleChange(path, { ...value, [key]: next });
  const onCountry = (next: string) => handleChange(path, withCountry(value, next));

  const body: BodyProps = { baseId, value, disabled, invalid, onField, onCountry };

  return (
    <fieldset className="space-y-3">
      {label ? (
        <legend className="text-sm font-medium text-foreground">
          {label}
          {required ? ' *' : ''}
        </legend>
      ) : null}
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      <div className="flex flex-col gap-3">
        {geo ? <GeoBody {...body} geo={geo} /> : <PlainBody {...body} />}
      </div>
      {errors ? <p className="text-sm text-destructive">{errors}</p> : null}
    </fieldset>
  );
}

export const AddressControl = withJsonFormsControlProps(AddressControlComponent);
