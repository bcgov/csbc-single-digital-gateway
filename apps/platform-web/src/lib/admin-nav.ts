/**
 * Admin navigation model (feature 34) — mirrors `console-nav.ts` for the `/admin` site. The starter
 * set is Overview + Document Types (Document Types is the first real admin feature, built next).
 */
import { FileType, LayoutDashboard, type LucideIcon } from 'lucide-react';

export interface AdminNavItem {
  /** Stable id; for sections it equals the trailing path segment. */
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  subtitle: string;
}

export const ADMIN_OVERVIEW: AdminNavItem = {
  key: 'overview',
  label: 'Overview',
  to: '/admin',
  icon: LayoutDashboard,
  subtitle: 'Platform administration.',
};

export const ADMIN_NAV: AdminNavItem[] = [
  ADMIN_OVERVIEW,
  {
    key: 'document-types',
    label: 'Document Types',
    to: '/admin/document-types',
    icon: FileType,
    subtitle: 'Manage the document type definitions available to workspaces.',
  },
];

/** The admin section matching `pathname` (`/admin` → overview; `/admin/<section>` → section). */
export function adminSectionFor(pathname: string): AdminNavItem {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'admin') {
    return ADMIN_OVERVIEW;
  }
  const section = segments[1];
  if (section === undefined) {
    return ADMIN_OVERVIEW;
  }
  return ADMIN_NAV.find((item) => item.key === section) ?? ADMIN_OVERVIEW;
}
