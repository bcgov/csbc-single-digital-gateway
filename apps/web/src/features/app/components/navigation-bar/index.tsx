import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { IconChevronDown } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { RegisteredRouter, RouteToPath } from "@tanstack/router-core";
import type { ReactNode } from "react";
import { Container } from "../container.component";

type RoutePath = RouteToPath<RegisteredRouter>;

type NavLink = {
  type: "link";
  icon?: ReactNode;
  label: string;
  to: RoutePath;
};

type NavMenu = {
  type: "menu";
  icon?: ReactNode;
  label: string;
  children: { label: string; to: RoutePath }[];
};

export type NavItem = NavLink | NavMenu;

interface NavigationBarProps {
  title: ReactNode;
  items?: NavItem[];
  extras?: ReactNode;
}

export const NavigationBar = ({ title, items, extras }: NavigationBarProps) => {
  return (
    <Container>
      <div className="flex flex-row  py-4 items-center justify-between gap-2 h-14">
        <h1 className="text-xl font-extrabold truncate">{title}</h1>

        <div className="flex flex-row gap-4">
          {items?.map((item) =>
            item.type === "link" ? (
              <Button
                key={item.to}
                variant="link"
                className="shrink-0 p-0 h-auto font-normal text-base"
              >
                <Link to={item.to} className="flex flex-row items-center gap-2">
                  {item.icon}
                  {item.label}
                </Link>
              </Button>
            ) : (
              <DropdownMenu key={item.label}>
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
            ),
          )}
          {extras && <div className="flex flex-row gap-2">{extras}</div>}
        </div>
      </div>
    </Container>
  );
};
