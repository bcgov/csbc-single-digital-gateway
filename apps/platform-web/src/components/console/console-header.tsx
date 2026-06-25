import { Button } from '@repo/ui/button';
import { useLocation } from '@tanstack/react-router';
import { PanelLeft, Search } from 'lucide-react';
import { useState } from 'react';
import { CommandPalette } from '@/components/console/command-palette';
import { NewMenu } from '@/components/console/new-menu';
import { NotificationsMenu } from '@/components/console/notifications-menu';
import { sectionFor } from '@/lib/console-nav';

interface ConsoleHeaderProps {
  onToggleSidebar: () => void;
  /** Active workspace slug, or undefined when there is no workspace (actions are disabled). */
  slug: string | undefined;
}

/** Top bar: section title/subtitle, search, notifications, "New". Actions disable with no workspace. */
export function ConsoleHeader({ onToggleSidebar, slug }: ConsoleHeaderProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const section = sectionFor(pathname);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const enabled = slug !== undefined;

  return (
    <header className="flex h-[58px] shrink-0 items-center justify-between gap-4 border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
        >
          <PanelLeft className="size-[18px]" aria-hidden />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold leading-tight">{section.label}</h1>
          <p className="truncate text-xs text-muted-foreground">{section.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          aria-label="Search"
          disabled={!enabled}
          onClick={() => setPaletteOpen(true)}
        >
          <Search className="size-[18px]" aria-hidden />
        </Button>
        <NotificationsMenu disabled={!enabled} />
        <NewMenu slug={slug} />
      </div>

      {enabled && slug !== undefined ? (
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} slug={slug} />
      ) : null}
    </header>
  );
}
