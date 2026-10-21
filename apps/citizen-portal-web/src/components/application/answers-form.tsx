import { DocumentRunner } from '@repo/documents/runner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { citizenUischema } from '@/components/services/detail-sections';
import {
  APPLICATIONS_KEY,
  RequestError,
  type Submission,
  saveDraft,
  submitApplication,
} from '@/lib/applications';

/**
 * Doc 292 rules 6, 10 — a citizen's draft filled in a `DocumentRunner` over the form's Citizen variant (else default):
 * Save draft stores the answers, Submit sends them. A refusal (e.g. the API's validation errors) shows above the form
 * and the answers stay. Shared by the apply page (a new or resumed draft) and the application page (a revision).
 */
export function AnswersForm({
  submission,
  schema,
  variants,
  onSubmitted,
}: {
  submission: Submission;
  schema: Record<string, unknown>;
  variants: Readonly<Record<string, Record<string, unknown>>>;
  onSubmitted: (submissionId: string) => void;
}) {
  const queryClient = useQueryClient();
  const uischema = useMemo(() => citizenUischema(variants), [variants]);
  const [answers, setAnswers] = useState<Record<string, unknown>>(submission.data);
  const refresh = () => queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY });
  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) => saveDraft(submission.id, data),
    onSuccess: refresh,
  });
  const submit = useMutation({
    mutationFn: (data: Record<string, unknown>) => submitApplication(submission.id, data),
    onSuccess: async (sent) => {
      await refresh();
      onSubmitted(sent.id);
    },
  });
  const error = submit.error ?? save.error;
  return (
    <div className="flex flex-col gap-4">
      {error ? <Refusal error={error} /> : null}
      {save.isSuccess && !save.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Draft saved.
        </p>
      ) : null}
      <div data-slot="apply-form" className="rounded-xl border border-border bg-background">
        <DocumentRunner
          schema={schema}
          uischema={uischema}
          data={answers}
          onChange={(next) => setAnswers(next as Record<string, unknown>)}
          // A refusal is shown through the mutation's error above, so the rejection stops here.
          onSaveDraft={(data) =>
            save.mutateAsync(data).then(
              () => {},
              () => {},
            )
          }
          onSubmit={(data) =>
            submit.mutateAsync(data).then(
              () => {},
              () => {},
            )
          }
        />
      </div>
    </div>
  );
}

function Refusal({ error }: { error: Error }) {
  const details = error instanceof RequestError ? error.errors : [];
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
    >
      <p className="font-medium text-destructive">{error.message}</p>
      {details.length > 0 ? (
        <ul className="mt-1 list-disc pl-5 text-destructive">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
