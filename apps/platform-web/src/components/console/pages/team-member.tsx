import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { ButtonGroup } from '@repo/ui/button-group';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { initials, useAuth } from '@/lib/auth';
import {
  type WorkspaceMember,
  transferWorkspaceOwnership,
  updateWorkspaceMember,
  workspaceBySlugQueryOptions,
  workspaceMembersQueryOptions,
} from '@/lib/workspaces';

export function MemberProfilePage() {
  const { slug, memberId } = useParams({ from: '/app/$slug/team/$memberId' });
  const navigate = useNavigate();
  const { data: auth } = useAuth();
  const { data: workspace } = useQuery(workspaceBySlugQueryOptions(slug));
  const members = useQuery({
    ...workspaceMembersQueryOptions(workspace?.id ?? ''),
    enabled: workspace != null,
  });
  const member = members.data?.find((m) => m.id === memberId);
  const back = () => navigate({ to: '/app/$slug/team', params: { slug } });

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
      <Button variant="ghost" size="sm" type="button" className="self-start" onClick={back}>
        <ArrowLeft className="size-4" aria-hidden />
        Back to team
      </Button>
      {members.isSuccess && !member ? (
        <p className="text-sm text-muted-foreground">This member is no longer in the workspace.</p>
      ) : !workspace || !member ? (
        <div className="flex justify-center py-10">
          <Spinner className="size-6" />
        </div>
      ) : (
        <MemberForm
          key={member.id}
          member={member}
          workspaceId={workspace.id}
          canEdit={workspace.role === 'admin'}
          isSelf={auth?.id === member.userId}
          // Only the current owner can transfer, and only to another active member.
          canTransfer={
            workspace.ownerId === auth?.id && !member.isOwner && member.status === 'active'
          }
          onSaved={back}
        />
      )}
    </div>
  );
}

function Toggle<T extends string>({
  value,
  options,
  disabled,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <ButtonGroup>
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size="sm"
          variant={value === opt.value ? 'default' : 'outline'}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}

function MemberForm({
  member,
  workspaceId,
  canEdit,
  isSelf,
  canTransfer,
  onSaved,
}: {
  member: WorkspaceMember;
  workspaceId: string;
  canEdit: boolean;
  isSelf: boolean;
  canTransfer: boolean;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const [confirmingTransfer, setConfirmingTransfer] = useState(false);
  // The owner's role and status are immutable (enforced server-side); lock the controls to match.
  const locked = !canEdit || member.isOwner;
  const dirty = role !== member.role || status !== member.status;

  const save = useMutation({
    mutationFn: () => updateWorkspaceMember(workspaceId, member.id, { role, status }),
    onSuccess: async () => {
      // Editing yourself can change your own role → refresh members + the workspace (caller's role).
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      onSaved();
    },
  });

  const transfer = useMutation({
    mutationFn: () => transferWorkspaceOwnership(workspaceId, member.userId),
    onSuccess: async () => {
      // Ownership moved → refresh members (isOwner) and workspaces (the viewer is no longer owner).
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      onSaved();
    },
  });

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback>{initials(member.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{member.displayName}</h2>
            {member.isOwner ? <Badge variant="secondary">Owner</Badge> : null}
          </div>
          <p className="text-sm text-muted-foreground">{member.email ?? 'No email on file'}</p>
          <p className="text-xs text-muted-foreground">
            Joined {new Date(member.joinedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {canEdit ? (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Role</span>
            <Toggle
              value={role}
              disabled={locked}
              onChange={setRole}
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'member', label: 'Member' },
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Status</span>
            <Toggle
              value={status}
              disabled={locked}
              onChange={setStatus}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
              ]}
            />
          </div>

          {member.isOwner ? (
            <p className="text-sm text-muted-foreground">
              This member owns the workspace — their role and status can&apos;t be changed. The
              owner can transfer ownership to another member.
            </p>
          ) : (
            <div className="flex items-center justify-end gap-3">
              {save.error ? (
                <p role="alert" className="mr-auto text-sm text-destructive">
                  {save.error.message}
                </p>
              ) : null}
              {isSelf ? (
                <p className="mr-auto text-xs text-muted-foreground">
                  This is your own membership.
                </p>
              ) : null}
              <Button
                type="button"
                disabled={!dirty || save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? <Spinner className="size-4" /> : null}
                Save changes
              </Button>
            </div>
          )}
        </>
      ) : (
        // Regular members can see another member's role and status, but not as an editable form.
        <div className="flex gap-10">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Role</span>
            <Badge variant={member.role === 'admin' ? 'default' : 'outline'} className="self-start">
              {member.role === 'admin' ? 'Admin' : 'Member'}
            </Badge>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Status</span>
            {member.status === 'suspended' ? (
              <Badge variant="outline" className="self-start">
                Suspended
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Active</span>
            )}
          </div>
        </div>
      )}

      {canTransfer ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-sm font-medium">Ownership</span>
          <p className="text-xs text-muted-foreground">
            Transferring makes {member.displayName} the workspace owner and an admin. You&apos;ll
            stay an admin.
          </p>
          {transfer.error ? (
            <p role="alert" className="text-sm text-destructive">
              {transfer.error.message}
            </p>
          ) : null}
          {confirmingTransfer ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={transfer.isPending}
                onClick={() => transfer.mutate()}
              >
                {transfer.isPending ? <Spinner className="size-4" /> : null}
                Confirm transfer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={transfer.isPending}
                onClick={() => setConfirmingTransfer(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setConfirmingTransfer(true)}
            >
              Make owner
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
