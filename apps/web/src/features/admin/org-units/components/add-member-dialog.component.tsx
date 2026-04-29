import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAddMember } from "../data/org-units.mutations";
import type { SearchUser } from "../data/user-search.query";
import { userSearchQueryOptions } from "../data/user-search.query";

interface AddMemberDialogProps {
  orgUnitId: string;
  trigger?: React.ReactNode;
}

export function AddMemberDialog({ orgUnitId, trigger }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [role, setRole] = useState<"admin" | "member">("member");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const addMutation = useAddMember(orgUnitId);

  const { data: users, isLoading } = useQuery(
    userSearchQueryOptions(orgUnitId, debouncedSearch),
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const reset = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedUser(null);
    setRole("member");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    addMutation.mutate(
      { userId: selectedUser.id, role },
      {
        onSuccess: () => {
          toast.success(
            `Added ${selectedUser.name ?? selectedUser.email ?? "user"} as ${role}`,
          );
          setOpen(false);
          reset();
        },
        onError: (err) => {
          toast.error(`Failed to add member: ${err.message}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Search for a staff user to add to this org unit.
          </p>

          {selectedUser ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">
                  {selectedUser.name ?? "Unnamed user"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedUser.email}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedUser(null)}
              >
                <IconX className="size-4" />
              </Button>
            </div>
          ) : (
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search by name or email…"
                value={search}
                onValueChange={handleSearchChange}
              />
              <CommandList>
                {debouncedSearch.length >= 2 && !isLoading && (
                  <CommandEmpty>No users found.</CommandEmpty>
                )}
                {isLoading && debouncedSearch.length >= 2 && (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Searching…
                  </div>
                )}
                {users && users.length > 0 && (
                  <CommandGroup>
                    {users.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.id}
                        onSelect={() => setSelectedUser(user)}
                      >
                        <div>
                          <p className="font-medium">
                            {user.name ?? "Unnamed user"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="add-member-role">Role</Label>
            <Select
              value={role}
              onValueChange={(value) =>
                value && setRole(value as "admin" | "member")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue className="capitalize" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="w-full bg-bcgov-blue hover:bg-bcgov-blue/80"
            disabled={!selectedUser || addMutation.isPending}
          >
            {addMutation.isPending ? "Adding…" : "Add Member"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
