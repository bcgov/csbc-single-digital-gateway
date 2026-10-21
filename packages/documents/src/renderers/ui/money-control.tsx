import { and, rankWith, schemaMatches, uiTypeIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Icon } from '@mdi/react';
import { InputGroup, InputGroupAddon } from '@repo/ui/input-group';
import { NumberInput } from '@repo/ui/number-input';
import { currencyOf, isMoneyControl } from './currency';
import { NumberControlField } from './number-input-control';
import { isPlainNumber } from './number-options';

/** A plain number Control with `options.component: 'money'` — one above the Number input it varies (doc 286 rule 1). */
export const moneyControlTester = rankWith(
  2,
  and(
    uiTypeIs('Control'),
    schemaMatches((schema) => isPlainNumber(schema)),
    (uischema) => isMoneyControl(uischema),
  ),
);

/**
 * A money field (doc 286 rules 3-6): the number field's shell around an input group whose leading addon shows the
 * currency's icon. The icon is hidden from assistive technology; the currency's spoken name describes the input
 * FIRST instead (rule 5). The decimal places ride `numberOptions`' format: the input refuses a keystroke past them,
 * and Base UI rounds a programmatic value to them on commit (rule 3).
 */
export function MoneyControl(props: ControlProps) {
  const currency = currencyOf(props.uischema);
  const currencyId = `${props.id}-currency`;
  return (
    <NumberControlField
      props={props}
      renderInput={({ input, describedBy }) => (
        <InputGroup data-slot="money-input" data-disabled={input.disabled === true}>
          <InputGroupAddon data-slot="money-currency">
            <Icon path={currency.icon} size="1rem" aria-hidden="true" />
            <span id={currencyId} className="sr-only">
              {currency.spokenName}
            </span>
          </InputGroupAddon>
          <NumberInput
            {...input}
            grouped
            maxFractionDigits={input.format?.maximumFractionDigits}
            aria-describedby={[currencyId, ...describedBy].join(' ')}
          />
        </InputGroup>
      )}
    />
  );
}

export const moneyControlEntry = {
  tester: moneyControlTester,
  renderer: withJsonFormsControlProps(MoneyControl),
};
