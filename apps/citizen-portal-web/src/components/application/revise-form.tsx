import { FormRunner } from '@repo/react/form-runner';
import { Button } from '@repo/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  type ApplicationDetail,
  applicationQueryOptions,
  saveDraft,
  submitApplication,
} from '@/lib/applications';

/**
 * Inline editor for an application on the detail page (features 66 + 140) — the same FormRunner the
 * apply flow uses, seeded from the current answers. Debounced autosave (PATCH) + submit (POST). On
 * submit it refreshes the detail query and hands control back so the page re-renders the read-only
 * view + updated status card. Used for both a **draft** (which the detail page opens directly, no
 * Cancel — `submitLabel` "Submit application") and a **revision** of an action-needed application
 * (Cancel returns to the status card; `submitLabel` "Resubmit application").
 */
export function ReviseForm({
  application,
  onSubmitted,
  onCancel,
  submitLabel = 'Resubmit application',
  showCancel = true,
}: {
  application: ApplicationDetail;
  onSubmitted: () => void;
  onCancel: () => void;
  submitLabel?: string;
  showCancel?: boolean;
}) {
  const queryClient = useQueryClient();
  const [data, setData] = useState<Record<string, unknown>>(application.data ?? {});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useMutation({
    mutationFn: (next: Record<string, unknown>) => saveDraft(application.id, next),
  });
  const submit = useMutation({
    mutationFn: (next: Record<string, unknown>) => submitApplication(application.id, next),
    onSuccess: async () => {
      await queryClient.invalidateQueries(applicationQueryOptions(application.id));
      onSubmitted();
    },
  });

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleChange = (next: Record<string, unknown>) => {
    setData(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save.mutate(next), 800); // debounced autosave
  };

  return (
    <div className="flex flex-col gap-4">
      <FormRunner
        kind={application.kind}
        definition={application.structure}
        data={data}
        onChange={handleChange}
        onSubmit={(next) => {
          if (timer.current) clearTimeout(timer.current);
          submit.mutate(next);
        }}
        submitting={submit.isPending}
        submitLabel={submitLabel}
      />
      <div className={`flex items-center gap-3 ${showCancel ? 'justify-between' : 'justify-end'}`}>
        {showCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={submit.isPending}>
            Cancel
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {submit.isError
            ? 'Could not submit — please try again.'
            : save.isPending
              ? 'Saving…'
              : save.isSuccess
                ? 'Draft saved'
                : ''}
        </p>
      </div>
    </div>
  );
}
