/**
 * Console navigation model (features 31/32). One source of truth for the sidebar links, the command
 * palette destinations, and the header title/subtitle. Section routes are workspace-scoped
 * (`/app/$slug/...`); Account is user-scoped.
 */
import {
  BarChart3,
  FileSignature,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react';

export interface NavItem {
  /** Stable id; for scoped sections it equals the trailing path segment. */
  key: string;
  label: string;
  /** TanStack route path — scoped items contain `$slug`. */
  to: string;
  icon: LucideIcon;
  subtitle: string;
  /** Whether `to` needs a `{ slug }` param. */
  scoped: boolean;
}

export const OVERVIEW_NAV: NavItem = {
  key: 'overview',
  label: 'Overview',
  to: '/app/$slug',
  icon: LayoutDashboard,
  subtitle: 'A snapshot of activity across your workspace.',
  scoped: true,
};

/** Primary sidebar group (top of the rail). */
export const PRIMARY_NAV: NavItem[] = [
  OVERVIEW_NAV,
  {
    key: 'services',
    label: 'Services',
    to: '/app/$slug/services',
    icon: Package,
    subtitle: 'Service documents that group related applications.',
    scoped: true,
  },
  {
    key: 'service-agreements',
    label: 'Service Agreements',
    to: '/app/$slug/service-agreements',
    icon: FileSignature,
    subtitle: 'Terms applicants approve before applying.',
    scoped: true,
  },
  {
    key: 'submissions',
    label: 'Submissions',
    to: '/app/$slug/submissions',
    icon: Inbox,
    subtitle: 'Applications submitted for review.',
    scoped: true,
  },
  {
    key: 'team',
    label: 'Team',
    to: '/app/$slug/team',
    icon: Users,
    subtitle: 'People with access to this workspace.',
    scoped: true,
  },
];

/** Secondary sidebar group (below the divider). */
export const SECONDARY_NAV: NavItem[] = [
  {
    key: 'reports',
    label: 'Reports',
    to: '/app/$slug/reports',
    icon: BarChart3,
    subtitle: 'Saved reports for this workspace.',
    scoped: true,
  },
];

/** Pinned to the bottom of the rail. */
export const SETTINGS_NAV: NavItem = {
  key: 'settings',
  label: 'Settings',
  to: '/app/$slug/settings',
  icon: Settings,
  subtitle: 'Workspace configuration.',
  scoped: true,
};

/** Reachable from the profile menu only (not a sidebar link), and not workspace-scoped. */
export const ACCOUNT_NAV: NavItem = {
  key: 'account',
  label: 'Account',
  to: '/app/account',
  icon: UserCircle,
  subtitle: 'Your personal account details.',
  scoped: false,
};

/** Every destination, used by the command palette. */
export const ALL_DESTINATIONS: NavItem[] = [
  ...PRIMARY_NAV,
  ...SECONDARY_NAV,
  SETTINGS_NAV,
  ACCOUNT_NAV,
];

/** The section matching `pathname` (`/app/<slug>/<section>` → section; `/app/<slug>` → overview). */
export function sectionFor(pathname: string): NavItem {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'app') {
    return OVERVIEW_NAV;
  }
  if (segments[1] === 'account') {
    return ACCOUNT_NAV;
  }
  const section = segments[2];
  if (section === undefined) {
    return OVERVIEW_NAV;
  }
  return ALL_DESTINATIONS.find((item) => item.key === section) ?? OVERVIEW_NAV;
}
