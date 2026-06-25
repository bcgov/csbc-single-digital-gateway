import { Button } from '@repo/ui/button';
import { useLocation } from '@tanstack/react-router';
import { PanelLeft } from 'lucide-react';
import { adminSectionFor } from '@/lib/admin-nav';

/** Admin top bar: collapse toggle + the active section's title/subtitle (mirrors the console header). */
export function AdminHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const section = adminSectionFor(pathname);

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
    </header>
  );
}
