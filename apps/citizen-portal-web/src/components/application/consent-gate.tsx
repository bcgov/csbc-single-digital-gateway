import type { ComponentProps } from 'react';
import { Button } from '@repo/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
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
 * haven't all been decided. Renders each agreement read-only + an approve/reject radio (authored
 * labels, canonical values), records each decision, and gates Continue until every required
 * agreement is approved. The server (feature 89) re-validates on submit — this is UX only.
 */
export function ConsentGate({ agreements, serviceId, onContinue }: ConsentGateProps) {
  const queryClient = useQueryClient();
  // Local decisions seeded from the server's current decisions (a rejected required agreement
  // arrives with decision='reject' and still blocks until re-decided to approve).
  const [decisions, setDecisions] = useState<Record<string, ConsentDecision>>(() =>
    Object.fromEntries(
      agreements.filter((a) => a.decision !== null).map((a) => [a.agreementVersionId, a.decision!]),
    ),
  );
  const [failed, setFailed] = useState(false);

  const record = useMutation({
    mutationFn: ({ versionId, decision }: { versionId: string; decision: ConsentDecision }) =>
      recordConsent(versionId, decision),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['me', 'serviceAgreements', serviceId] }),
  });

  const choose = (versionId: string, decision: ConsentDecision) => {
    setDecisions((prev) => ({ ...prev, [versionId]: decision }));
    setFailed(false);
    record.mutate({ versionId, decision }, { onError: () => setFailed(true) });
  };

  const allSatisfied = agreements.every((a) =>
    satisfied(a, decisions[a.agreementVersionId] ?? null),
  );
  const canContinue = allSatisfied && !record.isPending && !failed;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Before you apply</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Please review and respond to the following{' '}
          {agreements.length === 1 ? 'agreement' : 'agreements'} to continue your application.
        </p>
      </div>

      {agreements.map((a) => {
        const title = str(a.data.title, 'Service agreement');
        const description = str(a.data.description, '');
        const content = a.data.content as ComponentProps<typeof RichTextView>['value'];
        const chosen = decisions[a.agreementVersionId] ?? null;
        const required = !isOptional(a);
        const blocked = required && chosen === 'reject';
        return (
          <Card key={a.agreementVersionId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {title}
                <span className="text-xs font-normal text-muted-foreground">
                  {required ? 'Required' : 'Optional'}
                </span>
              </CardTitle>
              {description ? <CardDescription>{description}</CardDescription> : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {content ? <RichTextView value={content} /> : null}
              <RadioGroup
                value={chosen}
                aria-label={`Your decision on ${title}`}
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
            </CardContent>
          </Card>
        );
      })}

      {failed ? (
        <p className="text-sm text-destructive" role="alert">
          Could not save your response — please try again.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={!canContinue} onClick={onContinue}>
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
