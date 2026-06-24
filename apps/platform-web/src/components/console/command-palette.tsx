import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/ui/command';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ALL_DESTINATIONS } from '@/lib/console-nav';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** ⌘K / search command palette — a real jump-to-page navigator over the console's destinations. */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput placeholder="Search or jump to…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Go to">
            {ALL_DESTINATIONS.map((dest) => {
              const Icon = dest.icon;
              return (
                <CommandItem
                  key={dest.to}
                  value={dest.label}
                  onSelect={() => {
                    onOpenChange(false);
                    void navigate({ to: dest.to });
                  }}
                >
                  <Icon className="size-4" aria-hidden />
                  {dest.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
