import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { Button } from '@repo/ui/button';
import { useId } from 'react';
import type { RunnerData } from './criterion-match';

// Doc 202 rule 38: what Submit does when the host passed no `onSubmit` — it shows the payload that WOULD be
// submitted, rather than doing nothing.
//
// This is what makes the studio's preview worth having: an author can fill the form in, branch through it and see
// exactly what a citizen's submission would carry, without any backend.

/** The answers as they would be submitted. `undefined` and a non-object both read as an empty submission. */
export function submissionPayload(data: RunnerData | undefined): string {
  return JSON.stringify(data ?? {}, null, 2);
}

interface SubmissionPreviewProps {
  readonly open: boolean;
  onOpenChange(open: boolean): void;
  readonly data: RunnerData | undefined;
}

/**
 * The payload dialog. Dismissible (`@repo/ui/dialog`, not `alert-dialog`) — it reports, it does not ask, so
 * there is nothing to confirm and Escape or the backdrop should close it.
 */
export function SubmissionPreview({ open, onOpenChange, data }: SubmissionPreviewProps) {
  const labelId = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby={labelId} data-slot="runner-submission-preview">
        <DialogHeader>
          <DialogTitle id={labelId}>Submission preview</DialogTitle>
          <DialogDescription>
            This form has no submit handler, so nothing was sent. These are the answers that would
            be submitted.
          </DialogDescription>
        </DialogHeader>
        {/* `tabIndex` so a keyboard user can scroll a long payload without a pointer. */}
        <pre
          tabIndex={0}
          data-slot="runner-submission-payload"
          className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-xs"
        >
          {submissionPayload(data)}
        </pre>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
