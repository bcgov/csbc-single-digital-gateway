import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import type { NavItem } from "../navigation-bar";
import { useAppSearch } from "./app-search.context";

interface AppSearchProps {
  navigationItems: NavItem[];
}

export const AppSearch = ({ navigationItems }: AppSearchProps) => {
  const { open, setOpen } = useAppSearch();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  const handleSelect = useCallback(
    (to: string) => {
      setOpen(false);
      navigate({ to });
    },
    [navigate, setOpen],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {navigationItems.flatMap((item) =>
              item.type === "link" ? (
                <CommandItem
                  key={item.to}
                  onSelect={() => handleSelect(item.to)}
                >
                  {item.icon}
                  {item.label}
                </CommandItem>
              ) : (
                item.children.map((child) => (
                  <CommandItem
                    key={`${item.label}-${child.to}`}
                    onSelect={() => handleSelect(child.to)}
                  >
                    {item.icon}
                    {child.label}
                    <CommandShortcut>{item.label}</CommandShortcut>
                  </CommandItem>
                ))
              ),
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
};
