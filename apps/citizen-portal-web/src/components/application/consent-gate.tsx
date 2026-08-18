import type { ComponentProps } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@repo/ui/accordion';
import { AccordionGroup } from '@repo/ui/accordion-group';
import { Button } from '@repo/ui/button';
import { Field, FieldLabel } from '@repo/ui/field';
import { RadioGroup, RadioGroupItem } from '@repo/ui/radio-group';
import { RichTextView } from '@repo/ui/rich-text-view';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  type ConsentDecision,
  type ServiceAgreementConsent,
  recordConsent,
} from '@/lib/applications';

/** An agreement is required unless its authored data marks it optional. */
const isOptional = (a: ServiceAgreementConsent): boolean => a.data.isOptional === true;
const str = (v: unknown, fallback: string): string =>
  typeof v === 'string' && v.length > 0 ? v : fallback;

/** Whether this decision satisfies the agreement (required → must be approve; optional → any decision). */
function satisfied(a: ServiceAgreementConsent, decision: ConsentDecision | null): boolean {
  if (decision === null) return false;
  return isOptional(a) || decision === 'approve';
}

interface ConsentGateProps {
  agreements: ServiceAgreementConsent[];
  serviceId: string;
  /** Called when every agreement is decided (required = approved) and the citizen continues. */
  onContinue: () => void;
}

/**
 * The consent gate (feature 90): shown before the application form when a service's agreements
 * haven't all been decided. Presents ONLY the agreements still needing a decision on their current
 * version — new/changed ones (feature 148); already-satisfied agreements are hidden so the gate
 * never re-presents or re-records an unchanged approval. Renders each pending agreement read-only +
 * an approve/reject radio (authored labels, canonical values), gathers the decisions LOCALLY, and
 * gates Continue until every required agreement is approved. Decisions are recorded (POSTed) only
 * when the citizen presses Continue — not on each radio change. The server (feature 89) re-validates
 * on submit — this is UX only.
 */
export function ConsentGate({ agreements, serviceId, onContinue }: ConsentGateProps) {
  const queryClient = useQueryClient();
  // Present ONLY agreements still needing a decision on their current version — i.e. new or changed
  // ones (consent is keyed to the published version, so a bumped version has no consent → unsatisfied).
  // Agreements the citizen already satisfied (approved-required / decided-optional) on the current
  // version are hidden, so the gate never re-presents — or re-records — an unchanged approval.
  const pending = agreements.filter((a) => !satisfied(a, a.decision));
  // Local decisions seeded from the server's current decisions (a rejected required agreement
  // arrives with decision='reject' and still blocks until re-decided to approve).
  const [decisions, setDecisions] = useState<Record<string, ConsentDecision>>(() =>
    Object.fromEntries(
      pending.filter((a) => a.decision !== null).map((a) => [a.agreementVersionId, a.decision!]),
    ),
  );
  const [failed, setFailed] = useState(false);

  // Decisions are recorded only when the citizen presses Continue — not on each radio change.
  const submit = useMutation({
    mutationFn: async () => {
      // Record only decisions that differ from what the server already has (append-only, latest-wins).
      const changed = pending
        .map((a) => ({
          versionId: a.agreementVersionId,
          decision: decisions[a.agreementVersionId],
          server: a.decision,
        }))
        .filter(
          (
            x,
          ): x is {
            versionId: string;
            decision: ConsentDecision;
            server: ConsentDecision | null;
          } => x.decision !== undefined && x.decision !== x.server,
        );
      await Promise.all(changed.map((x) => recordConsent(x.versionId, x.decision)));
    },
    onMutate: () => setFailed(false),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me', 'serviceAgreements', serviceId] });
      onContinue();
    },
    onError: () => setFailed(true),
  });

  const choose = (versionId: string, decision: ConsentDecision) => {
    setDecisions((prev) => ({ ...prev, [versionId]: decision }));
    setFailed(false);
  };

  const allSatisfied = pending.every((a) => satisfied(a, decisions[a.agreementVersionId] ?? null));
  const canContinue = allSatisfied && !submit.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Before you apply</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Please review and respond to the following{' '}
          {pending.length === 1 ? 'agreement' : 'agreements'} to continue your application.
        </p>
      </div>

      <AccordionGroup
        values={pending.map((a) => a.agreementVersionId)}
        defaultValue={pending.map((a) => a.agreementVersionId)}
      >
        {pending.map((a) => {
          const title = str(a.data.title, 'Service agreement');
          const description = str(a.data.description, '');
          const content = a.data.content as ComponentProps<typeof RichTextView>['value'];
          const chosen = decisions[a.agreementVersionId] ?? null;
          const required = !isOptional(a);
          const blocked = required && chosen === 'reject';
          return (
            <AccordionItem key={a.agreementVersionId} value={a.agreementVersionId}>
              <AccordionTrigger>
                <span className="flex flex-1 items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">{title}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {required ? 'Required' : 'Optional'}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4">
                {description ? (
                  <p className="text-sm text-muted-foreground">{description}</p>
                ) : null}
                {content ? <RichTextView value={content} /> : null}
                {/* Gray, visually distinct response section (matches the read-only detail view). */}
                <div className="-mx-4 -mb-4 flex flex-col gap-2 border-t border-border bg-gray-20 px-4 py-4">
                  <p className="text-sm font-medium text-muted-foreground">Your response</p>
                  <RadioGroup
                    value={chosen}
                    aria-label={`Your decision on ${title}`}
                    className="flex flex-col gap-2"
                    onValueChange={(value: unknown) =>
                      choose(a.agreementVersionId, value as ConsentDecision)
                    }
                  >
                    <Field orientation="horizontal">
                      <RadioGroupItem id={`${a.agreementVersionId}-approve`} value="approve" />
                      <FieldLabel htmlFor={`${a.agreementVersionId}-approve`}>
                        {str(a.data.approveLabel, 'I approve')}
                      </FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                      <RadioGroupItem id={`${a.agreementVersionId}-reject`} value="reject" />
                      <FieldLabel htmlFor={`${a.agreementVersionId}-reject`}>
                        {str(a.data.rejectLabel, 'I do not approve')}
                      </FieldLabel>
                    </Field>
                  </RadioGroup>
                  {blocked ? (
                    <p className="text-sm text-destructive">
                      You must approve this agreement to continue your application.
                    </p>
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </AccordionGroup>

      {failed ? (
        <p className="text-sm text-destructive" role="alert">
          Could not save your response — please try again.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={!canContinue} onClick={() => submit.mutate()}>
          Continue to application
        </Button>
      </div>
    </div>
  );
}

/** Whether a service's agreements still block the application (undecided or required-not-approved). */
export function consentPending(agreements: ServiceAgreementConsent[]): boolean {
  return agreements.some((a) => !satisfied(a, a.decision));
}
