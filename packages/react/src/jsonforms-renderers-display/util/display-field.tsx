import type { ReactNode } from 'react';

/**
 * Read-only field: a small label above the formatted value — the display counterpart to the
 * form `ControlWrapper`. No inputs, no validation; purely presentational.
 */
export function DisplayField({
  label,
  description,
  children,
}: {
  /** JSONForms passes `false` when the label is suppressed. */
  label?: string | false | undefined;
  description?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {label ? <span className="text-xs font-medium text-muted-foreground">{label}</span> : null}
      <div className="text-sm text-foreground">{children}</div>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

/** Placeholder shown when a value is absent, so a labelled field still renders. */
export function EmptyValue() {
  return <span className="text-muted-foreground">—</span>;
}
