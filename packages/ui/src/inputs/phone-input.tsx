import * as React from 'react';
import * as RPNInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import { CheckIcon, ChevronsUpDown } from 'lucide-react';

import { Button } from '@ui/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@ui/components/ui/command';
import { Input } from '@ui/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@ui/components/ui/popover';
import { ScrollArea } from '@ui/components/ui/scroll-area';
import { cn } from '@ui/lib/utils';

// The country selector and flags are rendered with shadcn/Base-UI primitives + the flag SVGs from
// `react-phone-number-input/flags` — so NO `react-phone-number-input/style.css` is needed.
// Adapted from https://shadcn-phone-input.vercel.app/ to this repo's Base UI primitives.

export interface PhoneInputProps {
  id?: string | undefined;
  /** Stored value is E.164 (e.g. "+12505551234"), or undefined when empty. */
  value?: string | undefined;
  onChange?: ((value: string | undefined) => void) | undefined;
  disabled?: boolean | undefined;
  'aria-invalid'?: boolean | undefined;
  className?: string | undefined;
}

// react-phone-number-input's own prop types are strictly-optional (no `| undefined`), which trips
// `exactOptionalPropertyTypes`. Drive it through a facade whose props explicitly allow `undefined`.
interface RPNIComponentProps {
  id?: string | undefined;
  value?: RPNInput.Value | undefined;
  onChange?: ((value?: RPNInput.Value) => void) | undefined;
  defaultCountry?: RPNInput.Country | undefined;
  international?: boolean | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  smartCaret?: boolean | undefined;
  numberInputProps?: React.ComponentProps<'input'> | undefined;
  flagComponent?: React.ComponentType<RPNInput.FlagProps> | undefined;
  countrySelectComponent?: React.ComponentType<CountrySelectProps> | undefined;
  inputComponent?: React.ComponentType<React.ComponentProps<'input'>> | undefined;
}
const RPNInputBase = RPNInput.default as unknown as React.ComponentType<RPNIComponentProps>;

/**
 * A phone-number input with a country selector defaulting to **Canada**. Emits an E.164 string (or
 * undefined). Mirrors the thin-wrapper pattern of the other `src/inputs/*` components.
 */
export function PhoneInput({ id, value, onChange, disabled, className, ...rest }: PhoneInputProps) {
  return (
    <RPNInputBase
      id={id}
      defaultCountry="CA"
      international={false}
      className={cn('flex', className)}
      flagComponent={FlagComponent}
      countrySelectComponent={CountrySelect}
      inputComponent={InputComponent}
      smartCaret={false}
      disabled={disabled}
      value={(value || undefined) as RPNInput.Value | undefined}
      onChange={(next) => onChange?.((next as string | undefined) || undefined)}
      numberInputProps={{ 'aria-invalid': rest['aria-invalid'] }}
    />
  );
}

/** National-format a stored E.164 value for read-only display; falls back to the raw value. */
export function formatPhone(value: string | undefined): string {
  if (!value) {
    return '';
  }
  return RPNInput.formatPhoneNumber(value) || value;
}

const InputComponent = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => (
    <Input className={cn('rounded-e-md rounded-s-none', className)} {...props} ref={ref} />
  ),
);
InputComponent.displayName = 'PhoneNumberInput';

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

interface CountrySelectProps {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
}

function CountrySelect({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <Popover open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label="Select country"
            className="flex h-7 gap-1 rounded-e-none rounded-s-md border-r-0 !border-input px-2 text-sm focus:z-10"
            disabled={disabled}
          />
        }
      >
        <FlagComponent country={selectedCountry} countryName={selectedCountry} />
        <ChevronsUpDown
          className={cn('-mr-2 size-4 opacity-50', disabled ? 'hidden' : 'opacity-100')}
          aria-hidden
        />
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <ScrollArea className="h-72">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryList.map(({ value, label }) =>
                  value ? (
                    <CountrySelectOption
                      key={value}
                      country={value}
                      countryName={label}
                      selectedCountry={selectedCountry}
                      onChange={onChange}
                      onSelectComplete={() => setIsOpen(false)}
                    />
                  ) : null,
                )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface CountrySelectOptionProps extends RPNInput.FlagProps {
  selectedCountry: RPNInput.Country;
  onChange: (country: RPNInput.Country) => void;
  onSelectComplete: () => void;
}

function CountrySelectOption({
  country,
  countryName,
  selectedCountry,
  onChange,
  onSelectComplete,
}: CountrySelectOptionProps) {
  return (
    <CommandItem
      className="gap-2"
      onSelect={() => {
        onChange(country);
        onSelectComplete();
      }}
    >
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <span className="text-sm text-foreground/50">{`+${RPNInput.getCountryCallingCode(country)}`}</span>
      <CheckIcon
        className={cn('ml-auto size-4', country === selectedCountry ? 'opacity-100' : 'opacity-0')}
      />
    </CommandItem>
  );
}

function FlagComponent({ country, countryName }: RPNInput.FlagProps) {
  const Flag = flags[country];
  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">
      {Flag ? <Flag title={countryName} /> : null}
    </span>
  );
}
