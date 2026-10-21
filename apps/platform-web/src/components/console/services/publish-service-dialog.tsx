import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Spinner } from '@repo/ui/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CircleCheck, CircleX } from 'lucide-react';
import type { ReactNode } from 'react';
import { type MethodCheck, publishCheckQueryOptions, publishVersion } from '@/lib/services';

interface PublishServiceDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly slug: string;
  readonly id: string;
  readonly versionId: string;
  /** After a successful publish, with the dialog already closing. */
  readonly onPublished: () => void;
}

/**
 * Doc 289 rules 9-11 — Publish asks first: the server's precheck as a checklist (the service has an application
 * method, then each method with its problems), and the dialog's Publish only when every check passes. The API re-runs
 * the same checks (rule 7), so this is guidance, never the gate.
 */
export function PublishServiceDialog(props: PublishServiceDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish this version?</DialogTitle>
          <DialogDescription>
            Publishing makes this version live and publishes its draft application methods with it.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so every open fetches a fresh check (rule 9). */}
        {props.open ? <PublishBody {...props} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function PublishBody({
  slug,
  id,
  versionId,
  onOpenChange,
  onPublished,
}: PublishServiceDialogProps) {
  const check = useQuery(publishCheckQueryOptions(id, versionId));
  const publish = useMutation({
    mutationFn: () => publishVersion(id, versionId),
    onSuccess: () => {
      onOpenChange(false);
      onPublished();
    },
  });
  const ready = check.data?.ok === true;

  return (
    <>
      <div data-slot="publish-check" aria-busy={check.isPending} className="flex flex-col gap-3">
        {check.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" /> Checking this version…
          </p>
        ) : check.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {check.error.message}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            <CheckRow passed={check.data.hasMethods} label="Has an application method">
              {check.data.hasMethods ? null : 'Add at least one application method.'}
            </CheckRow>
            {check.data.methods.map((method) => (
              <MethodRow
                key={method.id}
                slug={slug}
                id={id}
                versionId={versionId}
                method={method}
              />
            ))}
          </ul>
        )}
        {publish.error ? (
          <p role="alert" className="text-sm text-destructive">
            {publish.error.message}
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!ready || publish.isPending}
          onClick={() => publish.mutate()}
        >
          {publish.isPending ? <Spinner className="size-4" /> : null} Publish
        </Button>
      </DialogFooter>
    </>
  );
}

function MethodRow({
  slug,
  id,
  versionId,
  method,
}: {
  slug: string;
  id: string;
  versionId: string;
  method: MethodCheck;
}) {
  const title = method.title ?? 'Untitled application method';
  // A method that wasn't found has no editor to open.
  const label =
    method.status === null ? (
      title
    ) : (
      <Link
        to="/app/$slug/services/$id/versions/$versionId/application-methods/$methodId"
        params={{ slug, id, versionId, methodId: method.id }}
        className="underline-offset-4 hover:underline"
      >
        {title}
      </Link>
    );
  return (
    <CheckRow passed={method.problems.length === 0} label={label}>
      {method.problems.length === 0 ? null : method.problems.join(' · ')}
    </CheckRow>
  );
}

function CheckRow({
  passed,
  label,
  children,
}: {
  passed: boolean;
  label: ReactNode;
  children: ReactNode;
}) {
  const Icon = passed ? CircleCheck : CircleX;
  return (
    <li
      data-slot="publish-check-row"
      data-passed={passed}
      className="flex items-start gap-2 text-sm"
    >
      <Icon
        className={passed ? 'mt-0.5 size-4 text-icon-success' : 'mt-0.5 size-4 text-icon-danger'}
        aria-hidden
      />
      <span className="sr-only">{passed ? 'Passed:' : 'Failed:'}</span>
      <span className="flex flex-col">
        <span className="font-medium">{label}</span>
        {children === null ? null : <span className="text-muted-foreground">{children}</span>}
      </span>
    </li>
  );
}
