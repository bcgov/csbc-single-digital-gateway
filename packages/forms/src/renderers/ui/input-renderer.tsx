import { isStringControl, rankWith, type ControlProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Input } from '@repo/ui/input';
import { ControlField } from './control-field';
import { maskConfig, stringInputProps } from './control-options';
import { plainText } from './control-plain-value';
import { maskedValue, useMaskRef } from './mask-input';

/** Any string control — `options.component` absent, `'input'` or unrecognised (doc 182 rule 8). */
export const inputTester: RankedTester = rankWith(1, isStringControl);

/**
 * Renders a string `Control` with `@repo/ui`'s `Input`. Clearing the field writes `undefined`, not
 * `''`, so the property is removed and a `required` constraint still fails (doc 182 rule 15). A
 * `maxLength` also shows the `<n>/<max>` counter under the input (rule 18b).
 *
 * Doc 204 rules 3-7: an authored `options.mask` becomes a REF on the input — `use-mask-input` rewrites the
 * element's value as the citizen types — and `options.maskUnmasked` decides whether the raw characters are
 * stored instead of what is shown. With no mask the ref is `undefined` and the stored value is exactly what it
 * was before, so an unmasked field is untouched by any of this.
 */
function InputControl(props: ControlProps) {
  const { data, path, schema, uischema, handleChange } = props;
  const inputProps = stringInputProps(schema, uischema.options);
  const { mask, unmasked } = maskConfig(uischema.options);
  const maskRef = useMaskRef(mask);
  return (
    // Doc 211 rules 11-12: the stored string, re-masked when the field stores raw characters.
    <ControlField
      control={props}
      maxLength={inputProps.maxLength}
      plainValue={plainText(data, uischema.options)}
    >
      {(input) => (
        <Input
          {...input}
          {...inputProps}
          ref={maskRef}
          value={typeof data === 'string' ? data : ''}
          onChange={(event) =>
            handleChange(path, maskedValue(event.target.value, maskRef, unmasked))
          }
        />
      )}
    </ControlField>
  );
}

export const InputControlRenderer = withJsonFormsControlProps(InputControl);
