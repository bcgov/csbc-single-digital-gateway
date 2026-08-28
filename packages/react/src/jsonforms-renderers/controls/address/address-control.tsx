import { and, optionIs, rankWith, uiTypeIs } from '@jsonforms/core';
import type { ControlProps, RankedTester } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@repo/ui/combobox';
import { Field, FieldLabel } from '@repo/ui/field';
import { type ReactNode, useEffect, useId, useRef } from 'react';

import { ClearableInput } from '../../util/clearable-input';
import { describedByIds } from '../../util/control-wrapper';

/** Same `${id}-error` id convention as `describedByIds`, scoped to one address sub-field. */
function subFieldDescribedBy(id: string, error: string | undefined): string | undefined {
  return describedByIds(id, { errors: error });
}
import { AddressSearchField } from './address-search';
import { addressLabelsForIso2 } from './labels';
import { type AddressValue, isAddressEmpty, normalizeAddress } from './model';
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

/** Per-sub-field requiredness + validation message, derived from the object schema (feature 153). */
interface FieldMeta {
  required: boolean;
  error?: string;
}

/** Resolve the {@link FieldMeta} for a sub-field key. */
type MetaFor = (key: keyof AddressValue) => FieldMeta;

interface SubFieldProps extends FieldMeta {
  id: string;
  label: string;
  children: ReactNode;
}

/** One labelled sub-field. Fills its row; `flex-1` when placed inside a {@link Row}. */
function SubField({ id, label, required, error, children }: SubFieldProps) {
  return (
    <Field data-invalid={error !== undefined ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? ' *' : ''}
      </FieldLabel>
      {children}
      {error !== undefined ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
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
  onField: (key: keyof AddressValue, next: string) => void;
  onCountry: (next: string) => void;
  /** Merge several fields at once — used by the geocoder address search to fill line 1 + city. */
  onFill: (patch: Partial<AddressValue>) => void;
  /** Per-sub-field requiredness + validation message (feature 153 required-address fix). */
  meta: MetaFor;
}

/** The free-text address body — country + province are plain inputs (no geo data available). */
function PlainBody({ baseId, value, disabled, onField, meta }: BodyProps) {
  const labels = addressLabelsForIso2(undefined);
  return (
    <>
      <SubField id={`${baseId}-country`} label="Country" {...meta('country')}>
        <ClearableInput
          id={`${baseId}-country`}
          value={value.country}
          disabled={disabled}
          aria-invalid={meta('country').error !== undefined}
          aria-describedby={subFieldDescribedBy(`${baseId}-country`, meta('country').error)}
          onChange={(event) => onField('country', event.target.value)}
          onClear={() => onField('country', '')}
        />
      </SubField>
      <AddressLines
        baseId={baseId}
        value={value}
        disabled={disabled}
        onField={onField}
        meta={meta}
      />
      <Row>
        <CityField
          baseId={baseId}
          value={value}
          disabled={disabled}
          onField={onField}
          meta={meta}
        />
        <SubField id={`${baseId}-province`} label={labels.stateLabel} {...meta('province')}>
          <ClearableInput
            id={`${baseId}-province`}
            value={value.province}
            disabled={disabled}
            aria-invalid={meta('province').error !== undefined}
            aria-describedby={subFieldDescribedBy(`${baseId}-province`, meta('province').error)}
            onChange={(event) => onField('province', event.target.value)}
            onClear={() => onField('province', '')}
          />
        </SubField>
      </Row>
      <SubField id={`${baseId}-postal_code`} label={labels.postalLabel} {...meta('postal_code')}>
        <ClearableInput
          id={`${baseId}-postal_code`}
          value={value.postal_code}
          disabled={disabled}
          aria-invalid={meta('postal_code').error !== undefined}
          aria-describedby={subFieldDescribedBy(`${baseId}-postal_code`, meta('postal_code').error)}
          onChange={(event) => onField('postal_code', event.target.value)}
          onClear={() => onField('postal_code', '')}
        />
      </SubField>
    </>
  );
}

type LineProps = Pick<BodyProps, 'baseId' | 'value' | 'disabled' | 'onField' | 'meta'>;

/** Address line 1 + line 2 — each on its own row, identical across the plain and geo bodies. */
function AddressLines({ baseId, value, disabled, onField, meta }: LineProps) {
  return (
    <>
      <SubField id={`${baseId}-address_one`} label="Address line 1" {...meta('address_one')}>
        <ClearableInput
          id={`${baseId}-address_one`}
          value={value.address_one}
          disabled={disabled}
          aria-invalid={meta('address_one').error !== undefined}
          aria-describedby={subFieldDescribedBy(`${baseId}-address_one`, meta('address_one').error)}
          onChange={(event) => onField('address_one', event.target.value)}
          onClear={() => onField('address_one', '')}
        />
      </SubField>
      <SubField id={`${baseId}-address_two`} label="Address line 2" {...meta('address_two')}>
        <ClearableInput
          id={`${baseId}-address_two`}
          value={value.address_two}
          disabled={disabled}
          aria-invalid={meta('address_two').error !== undefined}
          aria-describedby={subFieldDescribedBy(`${baseId}-address_two`, meta('address_two').error)}
          onChange={(event) => onField('address_two', event.target.value)}
          onClear={() => onField('address_two', '')}
        />
      </SubField>
    </>
  );
}

/** The City sub-field — shared, so both bodies can pair it with their State/Province field in a Row. */
function CityField({ baseId, value, disabled, onField, meta }: LineProps) {
  return (
    <SubField id={`${baseId}-city`} label="City" {...meta('city')}>
      <ClearableInput
        id={`${baseId}-city`}
        value={value.city}
        disabled={disabled}
        aria-invalid={meta('city').error !== undefined}
        aria-describedby={subFieldDescribedBy(`${baseId}-city`, meta('city').error)}
        onChange={(event) => onField('city', event.target.value)}
        onClear={() => onField('city', '')}
      />
    </SubField>
  );
}

/** The geo-backed body: searchable country combobox → country-filtered province + dynamic labels. */
function GeoBody({
  baseId,
  value,
  disabled,
  onField,
  onCountry,
  onFill,
  meta,
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
  // Regional address search (feature 154) — shown under Country only when the app supplies the
  // capability AND the selected country/province is a supported geocoder region (decided inside
  // AddressSearchField from the ISO codes). Mounted whenever the capability exists so its regions
  // query is stable across province changes.
  const provinceIso2 = statesList?.find((state) => state.name === value.province)?.iso2 ?? null;
  const addressSearchAvailable =
    geo.searchAddresses !== undefined && geo.useAddressSearchRegions !== undefined;

  return (
    <>
      <SubField id={`${baseId}-country`} label="Country" {...meta('country')}>
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
            aria-invalid={meta('country').error !== undefined}
            aria-describedby={subFieldDescribedBy(`${baseId}-country`, meta('country').error)}
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
      {addressSearchAvailable ? (
        <AddressSearchField
          geo={geo}
          countryIso2={selected?.iso2 ?? null}
          provinceIso2={provinceIso2}
          disabled={disabled}
          onFill={onFill}
        />
      ) : null}
      <AddressLines
        baseId={baseId}
        value={value}
        disabled={disabled}
        onField={onField}
        meta={meta}
      />
      <Row>
        <CityField
          baseId={baseId}
          value={value}
          disabled={disabled}
          onField={onField}
          meta={meta}
        />
        <SubField id={`${baseId}-province`} label={labels.stateLabel} {...meta('province')}>
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
                aria-invalid={meta('province').error !== undefined}
                aria-describedby={subFieldDescribedBy(`${baseId}-province`, meta('province').error)}
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
              id={`${baseId}-province`}
              value={value.province}
              disabled={disabled}
              aria-invalid={meta('province').error !== undefined}
              aria-describedby={subFieldDescribedBy(`${baseId}-province`, meta('province').error)}
              onChange={(event) => onField('province', event.target.value)}
              onClear={() => onField('province', '')}
            />
          )}
        </SubField>
      </Row>
      {hasPostal ? (
        <SubField id={`${baseId}-postal_code`} label={labels.postalLabel} {...meta('postal_code')}>
          <ClearableInput
            id={`${baseId}-postal_code`}
            value={value.postal_code}
            disabled={disabled}
            aria-invalid={meta('postal_code').error !== undefined}
            aria-describedby={subFieldDescribedBy(
              `${baseId}-postal_code`,
              meta('postal_code').error,
            )}
            onChange={(event) => onField('postal_code', event.target.value)}
            onClear={() => onField('postal_code', '')}
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
  schema,
  label,
  description,
  errors,
  required,
  enabled,
  visible,
}: ControlProps) {
  const geo = useGeo();
  const ctx = useJsonForms();
  const generatedId = useId();
  const seeded = useRef(false);
  const rawDefault = (schema as { default?: unknown }).default;
  const defaultValue =
    rawDefault !== null && typeof rawDefault === 'object'
      ? (rawDefault as Record<string, unknown>)
      : undefined;
  // Seed the author-set default (feature 153) ONCE, only while the field is still empty and editable —
  // never clobbers a citizen's edits or a resumed draft (JSONForms hands an object control `{}`, not
  // `undefined`, so we test emptiness rather than nullishness).
  //
  // Two timing hazards handled here:
  //  1. A `handleChange` fired during the mount commit runs before JsonForms finishes its own init and
  //     is silently dropped — so the write is DEFERRED a macrotask (`setTimeout`).
  //  2. `seeded` is flipped INSIDE the timer, not before scheduling it. Under React StrictMode the
  //     effect runs twice (mount → cleanup → mount); flipping the flag up front would let the cleanup
  //     cancel the only scheduled write while the second pass sees the flag set and never reschedules,
  //     so the seed would never fire in dev.
  useEffect(() => {
    if (seeded.current || enabled === false) {
      return undefined;
    }
    if (defaultValue === undefined || !isAddressEmpty(normalizeAddress(data))) {
      return undefined;
    }
    const timer = setTimeout(() => {
      seeded.current = true;
      handleChange(path, defaultValue);
    }, 0);
    return () => clearTimeout(timer);
  }, [data, defaultValue, enabled, handleChange, path]);
  if (visible === false) {
    return null;
  }
  const value = normalizeAddress(data);
  const disabled = enabled === false;
  const baseId = id || generatedId;

  // Required-address validation (feature 153 bug fix): the object schema lists which sub-fields are
  // required; JSONForms attributes their (child-path) errors below the object control, not on it, so
  // we surface per-field "required" affordances ourselves. Show messages only when the form is in a
  // validation-visible mode (FormRunner uses ValidateAndShow); the asterisk shows whenever required.
  const requiredKeys = new Set<keyof AddressValue>(
    Array.isArray((schema as { required?: unknown }).required)
      ? ((schema as { required: string[] }).required as (keyof AddressValue)[])
      : [],
  );
  const validationMode = ctx.core?.validationMode ?? 'ValidateAndShow';
  const showErrors = validationMode !== 'ValidateAndHide' && validationMode !== 'NoValidation';
  const meta: MetaFor = (key) => {
    const isRequired = requiredKeys.has(key);
    return {
      required: isRequired,
      ...(showErrors && isRequired && value[key] === '' ? { error: 'This field is required' } : {}),
    };
  };

  const onField = (key: keyof AddressValue, next: string) =>
    handleChange(path, { ...value, [key]: next });
  const onCountry = (next: string) => handleChange(path, withCountry(value, next));
  const onFill = (patch: Partial<AddressValue>) => handleChange(path, { ...value, ...patch });

  const body: BodyProps = { baseId, value, disabled, onField, onCountry, onFill, meta };

  return (
    <fieldset
      className="space-y-3"
      aria-describedby={describedByIds(baseId, { description, errors })}
    >
      {label ? (
        // Match the single-field label style (ControlWrapper renders `text-xs font-semibold`); this
        // composite control renders its own fieldset/legend, so it has to mirror that style by hand.
        <legend className="text-xs font-semibold text-foreground">
          {label}
          {required ? ' *' : ''}
        </legend>
      ) : null}
      {description ? (
        <p id={`${baseId}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        {geo ? <GeoBody {...body} geo={geo} /> : <PlainBody {...body} />}
      </div>
      {errors ? (
        <p id={`${baseId}-error`} className="text-xs text-destructive">
          {errors}
        </p>
      ) : null}
    </fieldset>
  );
}

export const AddressControl = withJsonFormsControlProps(AddressControlComponent);
