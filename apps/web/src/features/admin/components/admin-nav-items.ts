import type { NavItem } from "../../app/components/navigation-bar";

export type AdminNavItem = NavItem & { requiredRole?: string };

export const adminNavItems: AdminNavItem[] = [
  { type: "link", label: "Dashboard", to: "/admin" },
  { type: "link", label: "Consent", to: "/admin/consent/documents" },
  { type: "link", label: "Settings", to: "/admin/settings", requiredRole: "admin" },
];
