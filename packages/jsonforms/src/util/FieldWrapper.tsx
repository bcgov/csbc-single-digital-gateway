import type { ReactNode } from "react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@repo/ui";

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

  const errorMessages = errors
    ? errors
        .split("\n")
        .filter(Boolean)
        .map((message) => ({ message }))
    : undefined;

  return (
    <Field
      orientation={orientation}
      data-invalid={!!errors || undefined}
    >
      <FieldLabel>
        {label}
        {required && " *"}
      </FieldLabel>
      <FieldContent>
        {children}
        {description && <FieldDescription>{description}</FieldDescription>}
        {errorMessages && errorMessages.length > 0 && (
          <FieldError errors={errorMessages} />
        )}
      </FieldContent>
    </Field>
  );
}
