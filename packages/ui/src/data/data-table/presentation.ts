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
