import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import { Button } from '@repo/ui/button';
import { ButtonGroup } from '@repo/ui/button-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { initials } from '@/lib/auth';
import {
  addWorkspaceMember,
  type StaffUser,
  type WorkspaceRole,
  workspaceAddableStaffQueryOptions,
} from '@/lib/workspaces';

interface AddMemberModalProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Add member dialog. Step 1: search staff (server-side `addable-staff`) and pick a person. Step 2:
 * choose a role and add. On success the workspace's members query is invalidated and the dialog
 * closes. Admin-only is enforced server-side; this is the affordance for it.
 */
export function AddMemberModal({ workspaceId, open, onOpenChange }: AddMemberModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StaffUser | null>(null);
  const [role, setRole] = useState<WorkspaceRole>('member');

  const staff = useQuery({
    ...workspaceAddableStaffQueryOptions(workspaceId, search),
    enabled: open,
  });

  const add = useMutation({
    mutationFn: () => addWorkspaceMember(workspaceId, { userId: selected?.id ?? '', role }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspaces', 'members', workspaceId] });
      close();
    },
  });

  function close() {
    onOpenChange(false);
    setSearch('');
    setSelected(null);
    setRole('member');
    add.reset();
  }

  const results = staff.data ?? [];

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            {selected
              ? 'Choose a role for this member.'
              : 'Search staff by name or email, then choose a role.'}
          </DialogDescription>
        </DialogHeader>

        {selected ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar size="sm">
                <AvatarFallback>{initials(selected.displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium">{selected.displayName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {selected.email ?? 'No email on file'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setSelected(null)}
              >
                Change
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Role</span>
              <ButtonGroup>
                {(['admin', 'member'] as const).map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={role === option ? 'default' : 'outline'}
                    onClick={() => setRole(option)}
                  >
                    {option === 'admin' ? 'Admin' : 'Member'}
                  </Button>
                ))}
              </ButtonGroup>
            </div>

            {add.error ? (
              <p role="alert" className="text-sm text-destructive">
                {add.error.message}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={close} disabled={add.isPending}>
                Cancel
              </Button>
              <Button type="button" onClick={() => add.mutate()} disabled={add.isPending}>
                {add.isPending ? <Spinner className="size-4" /> : null}
                Add member
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff by name or email"
              aria-label="Search staff"
              autoFocus
            />
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {staff.isLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner className="size-5" />
                </div>
              ) : results.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No staff found.</p>
              ) : (
                results.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelected(user)}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-accent"
                  >
                    <Avatar size="sm">
                      <AvatarFallback>{initials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium">{user.displayName}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {user.email ?? 'No email on file'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
