import { Link, useLocation } from '@tanstack/react-router';

const TAB = 'rounded-md px-3 py-1.5 text-sm font-medium no-underline transition-colors';

/**
 * Settings section sub-navigation (feature 160). Team was moved out of the primary top nav and now
 * lives under Settings; this tab strip switches between General settings and the Team members list.
 * Rendered only when a workspace is active (the parent gates on `slug`), so its router hooks always
 * run inside a router.
 */
export function SettingsSubNav({ slug }: { slug: string }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const base = `/app/${slug}`;
  const onGeneral = pathname.startsWith(`${base}/settings`);
  const onTeam = pathname.startsWith(`${base}/team`);

  const cls = (active: boolean): string =>
    `${TAB} ${active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`;

  return (
    <nav
      aria-label="Settings sections"
      className="flex items-center gap-1 border-b border-border pb-2"
    >
      <Link to="/app/$slug/settings" params={{ slug }} className={cls(onGeneral)}>
        General
      </Link>
      <Link to="/app/$slug/team" params={{ slug }} className={cls(onTeam)}>
        Team
      </Link>
    </nav>
  );
}
