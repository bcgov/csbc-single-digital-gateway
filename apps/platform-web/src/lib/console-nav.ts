/**
 * Console navigation model (features 31/32/160). One source of truth for the top-bar nav links, the
 * command-palette destinations, and `sectionFor`. Section routes are workspace-scoped
 * (`/app/$slug/...`); Account is user-scoped.
 *
 * Feature 160 flattened the old sidebar (primary/secondary/settings groups) into a single horizontal
 * top-bar list (`TOP_NAV`). Service Agreements and Team are still reachable (the Shared Resources hub
 * links to Service Agreements; Team is surfaced inside Settings) but are not top-bar entries.
 */
import {
  FileSignature,
  Inbox,
  LayoutDashboard,
  Library,
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

export const SERVICES_NAV: NavItem = {
  key: 'services',
  label: 'Services',
  to: '/app/$slug/services',
  icon: Package,
  subtitle: 'Service documents that group related applications.',
  scoped: true,
};

/**
 * Feature 160 renamed "Submissions" → "Service Requests" (label only). The key/route stay
 * `submissions` so existing links, routes, and `sectionFor` keep resolving.
 */
export const SERVICE_REQUESTS_NAV: NavItem = {
  key: 'submissions',
  label: 'Service Requests',
  to: '/app/$slug/submissions',
  icon: Inbox,
  subtitle: 'Applications submitted for review.',
  scoped: true,
};

/** New hub grouping shared, cross-service resources (Service Agreements today; more later). */
export const SHARED_RESOURCES_NAV: NavItem = {
  key: 'shared-resources',
  label: 'Shared Resources',
  to: '/app/$slug/shared-resources',
  icon: Library,
  subtitle: 'Resources shared across the services in this workspace.',
  scoped: true,
};

export const SETTINGS_NAV: NavItem = {
  key: 'settings',
  label: 'Settings',
  to: '/app/$slug/settings',
  icon: Settings,
  subtitle: 'Workspace configuration.',
  scoped: true,
};

/** Reachable from the Shared Resources hub (not a top-bar entry). */
export const SERVICE_AGREEMENTS_NAV: NavItem = {
  key: 'service-agreements',
  label: 'Service Agreements',
  to: '/app/$slug/service-agreements',
  icon: FileSignature,
  subtitle: 'Terms applicants approve before applying.',
  scoped: true,
};

/** Reachable from within Settings (not a top-bar entry). */
export const TEAM_NAV: NavItem = {
  key: 'team',
  label: 'Team',
  to: '/app/$slug/team',
  icon: Users,
  subtitle: 'People with access to this workspace.',
  scoped: true,
};

/** Reachable from the avatar menu only, and not workspace-scoped. */
export const ACCOUNT_NAV: NavItem = {
  key: 'account',
  label: 'Account',
  to: '/app/account',
  icon: UserCircle,
  subtitle: 'Your personal account details.',
  scoped: false,
};

/** Primary top-bar navigation, in display order. */
export const TOP_NAV: NavItem[] = [
  OVERVIEW_NAV,
  SERVICES_NAV,
  SERVICE_REQUESTS_NAV,
  SHARED_RESOURCES_NAV,
  SETTINGS_NAV,
];

/** Every destination, used by the command palette. */
export const ALL_DESTINATIONS: NavItem[] = [
  OVERVIEW_NAV,
  SERVICES_NAV,
  SERVICE_REQUESTS_NAV,
  SHARED_RESOURCES_NAV,
  SERVICE_AGREEMENTS_NAV,
  TEAM_NAV,
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
