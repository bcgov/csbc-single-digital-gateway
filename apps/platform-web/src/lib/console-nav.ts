/**
 * Console navigation model (feature 31). One source of truth for the sidebar links, the command
 * palette destinations, and the header title/subtitle keyed on the active route.
 */
import {
  BarChart3,
  FileText,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Header subtitle shown for this section. */
  subtitle: string;
}

/** The console's default section (sidebar index + header fallback). */
export const OVERVIEW_NAV: NavItem = {
  label: 'Overview',
  to: '/app',
  icon: LayoutDashboard,
  subtitle: 'A snapshot of activity across your workspace.',
};

/** Primary sidebar group (top of the rail). */
export const PRIMARY_NAV: NavItem[] = [
  OVERVIEW_NAV,
  {
    label: 'Services',
    to: '/app/services',
    icon: Package,
    subtitle: 'Service documents that group related applications.',
  },
  {
    label: 'Applications',
    to: '/app/applications',
    icon: FileText,
    subtitle: 'Forms and wizards citizens use to apply.',
  },
  {
    label: 'Submissions',
    to: '/app/submissions',
    icon: Inbox,
    subtitle: 'Applications submitted for review.',
  },
  {
    label: 'Team',
    to: '/app/team',
    icon: Users,
    subtitle: 'People with access to this workspace.',
  },
];

/** Secondary sidebar group (below the divider). */
export const SECONDARY_NAV: NavItem[] = [
  {
    label: 'Reports',
    to: '/app/reports',
    icon: BarChart3,
    subtitle: 'Saved reports for this workspace.',
  },
];

/** Pinned to the bottom of the rail. */
export const SETTINGS_NAV: NavItem = {
  label: 'Settings',
  to: '/app/settings',
  icon: Settings,
  subtitle: 'Workspace configuration.',
};

/** Reachable from the profile menu only (not a sidebar link). */
export const ACCOUNT_NAV: NavItem = {
  label: 'Account',
  to: '/app/account',
  icon: UserCircle,
  subtitle: 'Your personal account details.',
};

/** Every destination, used by the command palette and the header lookup. */
export const ALL_DESTINATIONS: NavItem[] = [
  ...PRIMARY_NAV,
  ...SECONDARY_NAV,
  SETTINGS_NAV,
  ACCOUNT_NAV,
];

/** The section whose route matches `pathname` exactly, falling back to Overview. */
export function sectionFor(pathname: string): NavItem {
  return ALL_DESTINATIONS.find((item) => item.to === pathname) ?? OVERVIEW_NAV;
}
