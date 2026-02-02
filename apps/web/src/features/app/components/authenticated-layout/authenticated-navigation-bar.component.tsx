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
import {
  IconBriefcase2Filled,
  IconLayoutDashboardFilled,
  IconLogout,
} from "@tabler/icons-react";
import { useAuth } from "react-oidc-context";
import { type NavItem, NavigationBar } from "../navigation-bar";

const navigationItems: NavItem[] = [
  {
    type: "link",
    icon: <IconLayoutDashboardFilled />,
    label: "Dashboard",
    to: "/app",
  },
  {
    type: "link",
    icon: <IconBriefcase2Filled />,
    label: "Services",
    to: "/app/services",
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
  const user = auth.user?.profile;
  const displayName = user?.name || user?.email || "User";
  const initials = getInitials(user?.name, user?.email);

  return (
    <NavigationBar
      title="Single Digital Gateway"
      items={navigationItems}
      extras={
        <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <Avatar>
                <AvatarImage src={user?.picture} />
                <AvatarFallback>{initials}</AvatarFallback>
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
      }
    />
  );
};
