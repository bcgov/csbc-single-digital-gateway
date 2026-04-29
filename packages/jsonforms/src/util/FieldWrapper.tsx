import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@repo/ui";
import type { ReactNode } from "react";

interface FieldWrapperProps {
  label: string;
  description?: string;
  errors?: string;
  visible?: boolean;
  required?: boolean;
  orientation?: "vertical" | "horizontal";
  children: ReactNode;
}

export function FieldWrapper({
  label,
  description,
  errors,
  visible,
  required,
  orientation = "vertical",
  children,
}: FieldWrapperProps) {
  if (visible === false) {
    return null;
  }

  const trimmedErrors = errors?.trim() || undefined;
  const errorMessages = trimmedErrors
    ? trimmedErrors
        .split("\n")
        .filter(Boolean)
        .map((message) => ({ message }))
    : undefined;

  return (
    <Field orientation={orientation} data-invalid={!!trimmedErrors || undefined}>
      <FieldLabel>
        {label}
        {required && " *"}
      </FieldLabel>
      <FieldContent>
        {description && <FieldDescription>{description}</FieldDescription>}
        {children}
        {errorMessages && errorMessages.length > 0 && (
          <FieldError errors={errorMessages} />
        )}
      </FieldContent>
    </Field>
  );
}
