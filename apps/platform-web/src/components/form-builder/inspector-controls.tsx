import { Label } from '@repo/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@repo/ui/toggle-group';
import type { ReactNode } from 'react';

/**
 * The two layout primitives every inspector settings block is built from. They live here rather than
 * in `inspector.tsx` so per-field-type settings files (address defaults, accordion group, …) can use
 * them without importing the inspector itself — which would be a circular import.
 */

/** A labelled inspector row: caption above its control. */
export function Row({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

/**
 * A single-select segmented toggle group (`spacing={0}`) with a clear primary selection. Base UI's
 * ToggleGroup value is an array, so we bind `[value]` and pick the newly-pressed item (never allowing
 * an empty selection). Used by the Boolean "Display as", Number "Number type" and accordion
 * "Open by default" settings.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onValueChange,
  fullWidth = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onValueChange: (value: T) => void;
  /** Stretch the group to its container's width, with items sharing it equally. */
  fullWidth?: boolean;
}) {
  // The default "on" style is bg-muted (same as hover) — too subtle. Use a clear primary fill.
  const pressed =
    'aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground';
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      {...(fullWidth ? { className: 'w-full' } : {})}
      value={[value]}
      onValueChange={(values: string[]) =>
        onValueChange((values.find((v) => v !== value) ?? value) as T)
      }
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className={fullWidth ? `flex-1 ${pressed}` : pressed}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
