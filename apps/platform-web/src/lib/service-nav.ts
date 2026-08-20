/**
 * Service console sidebar navigation (feature 164) — the section links inside a single service's
 * shell. Dashboard is the default view at the bare `…/services/$id` route (matched `exact`); the
 * others are child sections. `to` values are literal TanStack route paths and take `{ slug, id }`.
 */
import {
  BarChart3,
  FileText,
  Inbox,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface ServiceNavItem {
  /** Stable id (also the section slug for the non-index links). */
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Dashboard is the index route → match `exact` so it isn't active on every child. */
  exact: boolean;
}

export const SERVICE_NAV = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    to: '/app/$slug/services/$id',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    key: 'details',
    label: 'Service details',
    to: '/app/$slug/services/$id/details',
    icon: FileText,
    exact: false,
  },
  {
    key: 'requests',
    label: 'Service requests',
    to: '/app/$slug/services/$id/requests',
    icon: Inbox,
    exact: false,
  },
  {
    key: 'analytics',
    label: 'Analytics',
    to: '/app/$slug/services/$id/analytics',
    icon: BarChart3,
    exact: false,
  },
  {
    key: 'settings',
    label: 'Settings',
    to: '/app/$slug/services/$id/settings',
    icon: Settings,
    exact: false,
  },
] as const satisfies readonly ServiceNavItem[];

// Feature 174 removed the static `SERVICE_DETAILS_SECTIONS` list: the details page's sections are
// now DERIVED from the top-level `Group` elements of the service definition's uischema (see
// `lib/service-sections.ts`), and the sidebar submenu derives its anchors from the same helper.

/**
 * Sections the console ALWAYS shows on the Service details page, appended after whatever the
 * definition derives. These are console-owned concerns rather than authored content — they collect
 * no service data, so they can never come from the schema and must not depend on how the Service
 * document type happens to be authored.
 */
export const SERVICE_ALWAYS_SECTIONS: readonly { anchor: string; label: string }[] = [
  { anchor: 'configuration', label: 'Configuration' },
];
