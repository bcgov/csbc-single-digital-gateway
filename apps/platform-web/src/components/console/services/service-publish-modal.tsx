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
import { Check, X } from 'lucide-react';

/** A one-line summary of an application method for the publish modal. */
export interface PublishApplication {
  title: string;
  hasStructure: boolean;
}

/** Publish-confirmation summary: lists the methods that go live with the service, each marked ✓ (has
 * fields) / ✗ (no fields). Publish is disabled with 0 methods or any structureless form. */
export function ServicePublishModal({
  open,
  onOpenChange,
  applications,
  onConfirm,
  publishing,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: PublishApplication[];
  onConfirm: () => void;
  publishing: boolean;
  error: Error | null;
}) {
  const structureless = applications.filter((app) => !app.hasStructure);
  const canPublish = applications.length > 0 && structureless.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !publishing) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish service?</DialogTitle>
          <DialogDescription>
            Publishing makes the service and its application methods live.
          </DialogDescription>
        </DialogHeader>
        {applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This service has no application methods. Add at least one before publishing.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {applications.length} application method{applications.length === 1 ? '' : 's'} will be
              published with the service:
            </p>
            <ul className="flex flex-col gap-1.5">
              {applications.map((app) => (
                <li key={app.title} className="flex items-center gap-2 text-sm">
                  {app.hasStructure ? (
                    <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <X className="size-4 shrink-0 text-destructive" aria-hidden />
                  )}
                  <span className="min-w-0 truncate">{app.title}</span>
                  {app.hasStructure ? null : (
                    <span className="text-xs text-destructive">no fields</span>
                  )}
                </li>
              ))}
            </ul>
            {structureless.length > 0 ? (
              <p className="text-sm text-destructive">
                Add fields to every method before publishing.
              </p>
            ) : null}
          </div>
        )}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={publishing}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={!canPublish || publishing} onClick={onConfirm}>
            {publishing ? <Spinner className="size-4" /> : null}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
