import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import { IconLogout, IconSearch } from "@tabler/icons-react";
import { useAuth } from "react-oidc-context";
import { useAppSearch } from "../app-search/app-search.context";
import { type NavItem, NavigationBar } from "../navigation-bar";

export const navigationItems: NavItem[] = [
  {
    type: "link",
    label: "Home",
    to: "/app",
  },
  {
    type: "link",
    label: "Services",
    to: "/app/services",
  },
  {
    type: "menu",
    label: "Help",
    children: [],
  },
  {
    type: "link",
    label: "Settings",
    to: "/app/settings",
  },
];

const getInitials = (name?: string, email?: string): string => {
  if (name) {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return "U";
};

export const AuthenticatedNavigationBar = () => {
  const auth = useAuth();
  const { setOpen } = useAppSearch();
  const user = auth.user?.profile;
  const displayName = user?.name || user?.email || "User";
  const initials = getInitials(user?.name, user?.email);

  return (
    <NavigationBar
      title="Single Digital Gateway"
      items={navigationItems}
      extras={
        <>
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <IconSearch className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="rounded-full p-0">
                  <Avatar>
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="text-[#3470B1] bg-[#F1F8FE]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => auth.signoutRedirect()}
                >
                  <IconLogout />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
};
