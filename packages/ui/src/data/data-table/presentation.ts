/** A column's text alignment (doc 267 rule 2). */
export type DataTableAlign = 'left' | 'center' | 'right';

const ALIGN: Readonly<Record<DataTableAlign, string>> = Object.freeze({
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
});

/** The header / cell class for an alignment; none for the default left. */
export function alignClass(align: DataTableAlign | undefined): string | undefined {
  return align === undefined || align === 'left' ? undefined : ALIGN[align];
}

/**
 * A column pinned to the right edge (doc 270): it stays in view while the other columns scroll under it, so it needs
 * an opaque background and a left rule to read as separate. It hugs its content (`w-px` on a table cell is "as narrow
 * as the content allows"), or a full-width table shares its spare width with it and the button column stretches.
 */
export function pinClass(pin: 'right' | undefined): string | undefined {
  return pin === 'right'
    ? 'sticky right-0 z-10 w-px bg-background shadow-[inset_1px_0_0_var(--color-border)]'
    : undefined;
}

/** How a table is drawn (rule 1). */
export interface DataTableStyle {
  striped?: boolean | undefined;
  bordered?: boolean | undefined;
  compact?: boolean | undefined;
}

/** The `<table>` classes for a style (rule 3), reaching its cells and rows with descendant variants. */
export function tableStyleClass({ striped, bordered, compact }: DataTableStyle): string {
  return [
    striped && '[&_tbody_tr:nth-child(even)]:bg-muted/50',
    bordered && '[&_td]:border [&_th]:border',
    compact && '[&_td]:px-1.5 [&_td]:py-1 [&_th]:h-8 [&_th]:px-1.5',
  ]
    .filter(Boolean)
    .join(' ');
}
