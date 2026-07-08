import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { Badge } from '@repo/ui/badge';
import { Button } from '@repo/ui/button';
import { Card, CardContent } from '@repo/ui/card';
import { Skeleton } from '@repo/ui/skeleton';
import { Textarea } from '@repo/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import {
  type ReviewDecision,
  type SubmissionDetail as SubmissionDetailData,
  reviewSubmission,
  submissionQueryOptions,
} from '@/lib/submissions';

const REVIEWABLE = new Set(['pending', 'in_review']);

interface StructurePage {
  id?: string;
  name?: string;
  schema?: Record<string, unknown>;
  uischema?: Record<string, unknown>;
}

/** The submitted answers, read-only (disabled form). Basic = one form; multi-stage = one per page. */
function Answers({ submission }: { submission: SubmissionDetailData }) {
  const { kind, structure, data } = submission;
  if (kind === 'multi-stage-form') {
    const stages = (structure['stages'] as Array<{ pages?: StructurePage[] }> | undefined) ?? [];
    const pages = stages.flatMap((stage) => stage.pages ?? []);
    return (
      <div className="flex flex-col gap-6">
        {pages.map((page, index) => (
          <div key={page.id ?? index} className="flex flex-col gap-2">
            {page.name ? <h3 className="text-sm font-semibold">{page.name}</h3> : null}
            <JsonForms
              schema={(page.schema ?? {}) as JsonSchema}
              uischema={page.uischema as unknown as UISchemaElement}
              data={data}
              readonly
            />
          </div>
        ))}
      </div>
    );
  }
  return (
    <JsonForms
      schema={(structure['schema'] ?? {}) as JsonSchema}
      uischema={structure['uischema'] as unknown as UISchemaElement}
      data={data}
      readonly
    />
  );
}

const DECISIONS: Array<{
  decision: ReviewDecision;
  label: string;
  variant: 'default' | 'outline';
}> = [
  { decision: 'approve', label: 'Approve', variant: 'default' },
  { decision: 'request_changes', label: 'Request changes', variant: 'outline' },
  { decision: 'reject', label: 'Reject', variant: 'outline' },
];

/** The review panel: a reason + approve/request-changes/reject, shown only while reviewable. */
function ReviewPanel({ submission }: { submission: SubmissionDetailData }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const review = useMutation({
    mutationFn: (decision: ReviewDecision) =>
      reviewSubmission(submission.id, {
        decision,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }),
    onSuccess: () => {
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });

  if (!REVIEWABLE.has(submission.status)) {
    return (
      <p className="text-sm text-muted-foreground">
        This submission is <span className="font-medium">{submission.statusLabel}</span> and has
        been actioned.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Add a note for the applicant (optional)…"
        rows={3}
      />
      <div className="flex flex-wrap gap-2">
        {DECISIONS.map((d) => (
          <Button
            key={d.decision}
            variant={d.variant}
            disabled={review.isPending}
            onClick={() => review.mutate(d.decision)}
          >
            {d.label}
          </Button>
        ))}
      </div>
      {review.isError ? (
        <p className="text-xs text-destructive">Could not record the review — please try again.</p>
      ) : null}
    </div>
  );
}

/** A submission's full record for review (feature 65): answers, review history, and review actions. */
export function SubmissionDetail() {
  const { slug, id } = useParams({ from: '/app/$slug/submissions/$id' });
  const { data: submission, isPending, isError } = useQuery(submissionQueryOptions(id));

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isError || !submission) {
    return (
      <div className="rounded-xl border p-10 text-center">
        <p className="text-sm text-muted-foreground">This submission could not be loaded.</p>
        <Button
          variant="outline"
          className="mt-4"
          render={<Link to="/app/$slug/submissions" params={{ slug }} />}
        >
          Back to submissions
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-1">
      <Link
        to="/app/$slug/submissions"
        params={{ slug }}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← All submissions
      </Link>

      <header className="flex flex-col gap-2 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-heading text-xl font-semibold">{submission.applicantName}</h1>
          <Badge color="yellow">{submission.statusLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {submission.serviceTitle} · {submission.formTitle}
        </p>
        <p className="text-xs text-muted-foreground">
          {submission.reference}
          {submission.applicantEmail ? ` · ${submission.applicantEmail}` : ''}
          {submission.submittedAt
            ? ` · Submitted ${new Date(submission.submittedAt).toLocaleDateString()}`
            : ''}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-sm font-semibold uppercase text-muted-foreground">
          Answers
        </h2>
        <Card>
          <CardContent className="py-4">
            <Answers submission={submission} />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-sm font-semibold uppercase text-muted-foreground">
          Review
        </h2>
        <ReviewPanel submission={submission} />
      </section>

      {submission.reviews.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-sm font-semibold uppercase text-muted-foreground">
            History
          </h2>
          <ul className="flex flex-col gap-2">
            {submission.reviews.map((r) => (
              <li key={r.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium capitalize">{r.decision.replaceAll('_', ' ')}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.reviewerName} · {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
                {r.reason ? <p className="mt-1 text-muted-foreground">{r.reason}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
