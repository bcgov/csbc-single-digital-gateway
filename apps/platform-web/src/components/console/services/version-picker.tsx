import { Button } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import type { ServiceVersion } from '@/lib/services';

/** Header dropdown to switch the service version (newest first). Sits inside a ButtonGroup — the Base UI
 * trigger carries a `data-slot`, so the group merges it with the adjacent button. */
export function VersionPicker({
  versions,
  selectedId,
  onSelect,
}: {
  versions: ServiceVersion[];
  selectedId: string;
  onSelect: (versionId: string) => void;
}) {
  const selected = versions.find((v) => v.id === selectedId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" variant="outline" type="button" />}>
        Version v{selected?.version}
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {versions.toReversed().map((version) => (
          <DropdownMenuItem
            key={version.id}
            className={version.id === selectedId ? 'font-semibold' : undefined}
            onClick={() => onSelect(version.id)}
          >
            v{version.version}
            <span className="ml-auto text-xs text-muted-foreground">{version.status}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
