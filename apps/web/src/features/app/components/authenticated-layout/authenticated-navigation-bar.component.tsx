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
import { Link } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import { Container } from "../container.component";

const navigationItems = [
  {
    label: "Dashboard",
    to: "/app",
    icon: <IconLayoutDashboardFilled />,
  },
  {
    label: "Services",
    to: "/app/services",
    icon: <IconBriefcase2Filled />,
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
    <Container>
      <div className="flex flex-row  py-4 items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-xl font-extrabold truncate">
            Single Digital Gateway
          </h1>

          {navigationItems.map((item) => (
            <Button
              key={item.to}
              variant="link"
              className="shrink-0 p-0 h-auto"
            >
              <Link to={item.to} className="flex flex-row items-center gap-2">
                {item.icon}
                {item.label}
              </Link>
            </Button>
          ))}
        </div>

        <div className="flex flex-row gap-2">
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
        </div>
      </div>
    </Container>
  );
};
