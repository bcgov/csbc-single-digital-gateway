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

export interface ServiceDetailsSection {
  /** Anchor id — matches the section element's `id` and the `#hash` the sidebar link scrolls to. */
  key: string;
  label: string;
}

/**
 * The Service details page is one scrollable page of sections; the sidebar's "Service details" item
 * expands into these anchors, each scrolling to the matching `<section id>` header on `…/details`.
 */
export const SERVICE_DETAILS_SECTIONS: readonly ServiceDetailsSection[] = [
  { key: 'service-description', label: 'Service description' },
  { key: 'eligibility-criteria', label: 'Eligibility criteria' },
  { key: 'application-methods', label: 'Application methods' },
  { key: 'data-privacy', label: 'Data & privacy' },
  { key: 'configuration', label: 'Configuration' },
];
