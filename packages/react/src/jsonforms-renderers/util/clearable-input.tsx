import type { ComponentProps } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@repo/ui/input-group';
import { mdiClose } from '@mdi/js';
import { Icon } from '@mdi/react';

/**
 * A text/number input with a trailing clear "x" that appears only when the field has a value (feature
 * 160). Used by the text, number and address controls; the date picker has its own clear affordance.
 */
export function ClearableInput({
  onClear,
  disabled,
  readOnly,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'ref'> & { onClear: () => void }) {
  const hasValue = props.value !== undefined && props.value !== null && props.value !== '';
  return (
    <InputGroup {...(className ? { className } : {})}>
      <InputGroupInput
        disabled={disabled}
        readOnly={readOnly}
        className={readOnly === true ? 'bg-muted text-muted-foreground cursor-default' : undefined}
        {...props}
      />
      {/* A read-only field must not offer a clear affordance either — clearing is an edit. */}
      {hasValue && disabled !== true && readOnly !== true ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="button" aria-label="Clear" onClick={onClear}>
            <Icon path={mdiClose} size="14px" aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
