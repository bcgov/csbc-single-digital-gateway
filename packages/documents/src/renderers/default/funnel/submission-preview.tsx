import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { useId } from 'react';

// Doc 274 rule 18: with no submit handler (the studio preview), Submit shows the answers that WOULD be submitted — a
// port of `@repo/forms`' `SubmissionPreview`. Dismissible: it reports, it does not ask.

interface SubmissionPreviewProps {
  readonly open: boolean;
  onOpenChange(open: boolean): void;
  readonly data: unknown;
}

export function SubmissionPreview({ open, onOpenChange, data }: SubmissionPreviewProps) {
  const labelId = useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby={labelId} data-slot="funnel-submission-preview">
        <DialogHeader>
          <DialogTitle id={labelId}>Submission preview</DialogTitle>
          <DialogDescription>
            This form has no submit handler, so nothing was sent. These are the answers that would
            be submitted.
          </DialogDescription>
        </DialogHeader>
        {/* `tabIndex` so a keyboard user can scroll a long payload. */}
        <pre
          tabIndex={0}
          className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-xs"
        >
          {JSON.stringify(data ?? {}, null, 2)}
        </pre>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
