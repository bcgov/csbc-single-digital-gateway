import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

/** What the picker reads off a version — any document's version satisfies it (doc 229). */
export interface VersionOption {
  readonly id: string;
  readonly versionNumber: number;
  readonly status: string;
}

/**
 * Header dropdown to switch the selected version (newest first). Shared by the admin template page and
 * the service Details section (doc 229); versions arrive oldest-first, as every detail endpoint returns them.
 */
export function VersionDropdown({
  versions,
  selectedId,
  onSelect,
}: {
  versions: readonly VersionOption[];
  selectedId: string;
  onSelect: (versionId: string) => void;
}) {
  const selected = versions.find((version) => version.id === selectedId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant="outline" type="button" />}>
        Version v{selected?.versionNumber}
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {versions.toReversed().map((version) => (
          <DropdownMenuItem
            key={version.id}
            className={version.id === selectedId ? 'font-semibold' : undefined}
            onClick={() => onSelect(version.id)}
          >
            v{version.versionNumber}
            <span className="ml-auto text-xs text-muted-foreground">{version.status}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
