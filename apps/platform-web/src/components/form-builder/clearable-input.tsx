import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@repo/ui/input-group';
import { X } from 'lucide-react';
import type { ComponentProps } from 'react';

/**
 * A text input with a trailing clear "x" that appears only when the field has a value. Used by the
 * form-builder title/description fields; mirrors the `@repo/react` renderer helper of the same name
 * (platform-web can't import that package's internals, so it carries its own small copy).
 */
export function ClearableInput({
  onClear,
  disabled,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'ref'> & { onClear: () => void }) {
  const hasValue = props.value !== undefined && props.value !== null && props.value !== '';
  return (
    <InputGroup>
      <InputGroupInput disabled={disabled} {...(className ? { className } : {})} {...props} />
      {hasValue && disabled !== true ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="button" aria-label="Clear" onClick={onClear}>
            <X className="size-3.5" aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
