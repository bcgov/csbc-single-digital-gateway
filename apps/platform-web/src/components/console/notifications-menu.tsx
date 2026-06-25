import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Bell } from 'lucide-react';

/** Header notifications bell. Empty in v1 — there is no notification source yet. */
export function NotificationsMenu({ disabled = false }: { disabled?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Notifications"
        disabled={disabled}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <Bell className="size-[18px]" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-2 py-1.5 text-sm font-semibold">Notifications</div>
        <DropdownMenuSeparator />
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
          You&rsquo;re all caught up.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
