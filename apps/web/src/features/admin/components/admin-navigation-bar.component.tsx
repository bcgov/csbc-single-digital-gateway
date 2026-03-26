import { useMemo, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui";
import { IconChevronDown, IconMenu2 } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import icon from "../../../assets/brand/icon.svg";
import { useIdirAuth } from "../../auth/auth.context";

import type { NavItem } from "../../app/components/navigation-bar";
import { type AdminNavItem, adminNavItems } from "./admin-nav-items";

const NavItemLink = ({ item }: { item: NavItem & { type: "link" } }) => (
  <Button
    variant="link"
    className="shrink-0 p-0 h-auto font-normal text-base"
    render={() => (
      <Link to={item.to} className="flex flex-row items-center gap-2">
        {item.icon}
        {item.label}
      </Link>
    )}
  />
);

const NavItemMenu = ({ item }: { item: NavItem & { type: "menu" } }) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button
          variant="link"
          className="shrink-0 p-0 h-auto flex flex-row items-center gap-2 font-normal text-base"
        >
          {item.icon}
          {item.label}
          <IconChevronDown className="size-4" />
        </Button>
      }
    />
    <DropdownMenuContent>
      <DropdownMenuGroup>
        {item.children.map((child) => (
          <DropdownMenuItem key={child.to}>
            <Link to={child.to}>{child.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);

const DesktopNav = ({ items }: { items: NavItem[] }) => (
  <nav className="hidden lg:flex flex-row gap-4">
    {items.map((item) =>
      item.type === "link" ? (
        <NavItemLink key={item.to} item={item} />
      ) : (
        <NavItemMenu key={item.label} item={item} />
      ),
    )}
  </nav>
);

const MobileNav = ({
  items,
  open,
  onOpenChange,
}: {
  items: NavItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetTrigger
      render={
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open menu"
        >
          <IconMenu2 className="size-5" />
        </Button>
      }
    />
    <SheetContent side="left">
      <SheetHeader>
        <SheetTitle>Menu</SheetTitle>
      </SheetHeader>
      <nav className="flex flex-col gap-2 px-4">
        {items.map((item) =>
          item.type === "link" ? (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
              onClick={() => onOpenChange(false)}
            >
              {item.icon}
              {item.label}
            </Link>
          ) : (
            <div key={item.label} className="flex flex-col gap-1">
              <span className="px-3 py-2 text-sm font-medium">{item.label}</span>
              {item.children.map((child) => (
                <Link
                  key={child.to}
                  to={child.to}
                  className="flex items-center gap-2 rounded-md px-6 py-2 text-sm hover:bg-accent"
                  onClick={() => onOpenChange(false)}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          ),
        )}
      </nav>
    </SheetContent>
  </Sheet>
);

const AccountMenu = () => {
  const { user, logout } = useIdirAuth();
  const displayName = user?.name ?? user?.given_name ?? "Admin";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="flex items-center gap-2 h-auto px-2 py-1"
          >
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm">{displayName}</span>
            <IconChevronDown className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void logout()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

function filterNavItemsByRole(items: AdminNavItem[], userRoles: string[]): NavItem[] {
  return items.filter(
    (item) => !item.requiredRole || userRoles.includes(item.requiredRole),
  );
}

export const AdminNavigationBar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useIdirAuth();

  const visibleItems = useMemo(
    () => filterNavItemsByRole(adminNavItems, user?.roles ?? []),
    [user?.roles],
  );

  return (
    <div className="border-b px-4 md:px-8">
        <div className="flex flex-row py-4 items-center justify-between gap-2 h-14">
          <div className="flex flex-row flex-1 items-center gap-4">
            <MobileNav
              items={visibleItems}
              open={mobileOpen}
              onOpenChange={setMobileOpen}
            />
            <img src={icon} alt="Logo" className="size-8" />
            <DesktopNav items={visibleItems} />
          </div>
          <AccountMenu />
        </div>
    </div>
  );
};
