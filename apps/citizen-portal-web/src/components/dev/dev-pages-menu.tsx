import { mdiMenu } from '@mdi/js';
import { Icon } from '@mdi/react';
import { buttonVariants } from '@repo/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu';
import { Link, useRouterState } from '@tanstack/react-router';

/** Every /dev page, for the cross-page nav menu in DevPageLayout's header. Alphabetical by label,
 *  except the tokens overview which always leads. */
const DEV_PAGES = [
  { to: '/dev', label: 'Tailwind tokens' },
  { to: '/dev/accordion', label: 'Accordion' },
  { to: '/dev/alert', label: 'Alert - Inline' },
  { to: '/dev/badge', label: 'Badge' },
  { to: '/dev/breadcrumb', label: 'Breadcrumb' },
  { to: '/dev/button', label: 'Button' },
  { to: '/dev/cards', label: 'Cards' },
  { to: '/dev/dialog', label: 'Dialog' },
  { to: '/dev/draggable', label: 'Draggable' },
  { to: '/dev/dropdown-menu', label: 'Dropdown menu' },
  { to: '/dev/form-elements', label: 'Form elements' },
  { to: '/dev/icons', label: 'Icons' },
  { to: '/dev/status-banner', label: 'Status banner' },
] as const;

/** Hamburger menu linking to every /dev reference page. Shared by DevPageLayout. */
export function DevPagesMenu() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={buttonVariants({ variant: 'outline', size: 'default' })}>
        <Icon path={mdiMenu} size="16px" aria-hidden={true} />
        Dev pages
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(var(--anchor-width)*1.5)]">
        {DEV_PAGES.map((page) => (
          <DropdownMenuItem
            key={page.to}
            render={<Link to={page.to} />}
            className={`no-underline${pathname === page.to ? ' bg-blue-10 font-semibold' : ''}`}
          >
            {page.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
