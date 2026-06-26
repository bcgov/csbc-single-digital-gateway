import { Square } from 'lucide-react';
import { FIELD_TYPE_BY_ID, type FieldTypeId } from './field-types';

/**
 * A canvas-style card for a field type — shared by the drag overlay (cursor preview) and the drop
 * placeholder, so what you drag and where it lands both look like the real field. `ghost` = the
 * translucent placeholder variant; default = the solid floating preview.
 */
export function FieldCardPreview({
  fieldType,
  label,
  ghost = false,
}: {
  fieldType: FieldTypeId;
  label?: string;
  ghost?: boolean;
}) {
  const def = FIELD_TYPE_BY_ID[fieldType];
  const Icon = def?.icon ?? Square;
  return (
    <div
      className={
        ghost
          ? 'flex items-center gap-2 rounded-lg border-2 border-dashed border-primary bg-primary/10 p-2'
          : 'flex items-center gap-2 rounded-lg border border-primary bg-card p-2 shadow-lg'
      }
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">{label ?? def?.label ?? fieldType}</span>
        <span className="text-xs text-muted-foreground">{def?.label}</span>
      </span>
    </div>
  );
}
