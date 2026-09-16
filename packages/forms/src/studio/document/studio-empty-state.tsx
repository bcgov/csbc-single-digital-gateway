import { mdiAlertCircleOutline, mdiFileDocumentOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@repo/ui/empty';
import { Spinner } from '@repo/ui/spinner';
import type { DocumentSessionStatus } from './use-document-session';

interface StudioEmptyStateProps {
  /** Anything but `'ready'` — the canvas renders the document itself once there is one. */
  readonly status: Exclude<DocumentSessionStatus, 'ready'>;
  /** Why the load failed, when it did (doc 200 rule 5). */
  readonly reason?: string | null;
  /** Reopens the New form dialog (doc 200 rule 16). */
  onNewForm(): void;
  /** Runs `loadDocument` again (doc 200 rule 5). */
  onRetry(): void;
}

/**
 * What occupies the studio's centre while there is no document to edit (doc 200 rules 15-17).
 *
 * All three states live here so `StudioCanvas` has ONE early return for "not the document", beside its existing root
 * check. The call to action sits inside `EmptyContent` — the component's intended composition, which no app consumer
 * uses yet.
 *
 * The failure reason is rendered as TEXT (rule 5). It originates outside the studio, so it is never treated as markup.
 */
export function StudioEmptyState({ status, reason, onNewForm, onRetry }: StudioEmptyStateProps) {
  if (status === 'loading') {
    return (
      <div
        data-slot="form-studio-loading"
        aria-busy="true"
        className="flex h-full flex-col items-center justify-center gap-2"
      >
        <Spinner className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Opening form…</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <Empty data-slot="form-studio-failed" className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon path={mdiAlertCircleOutline} size="16px" />
          </EmptyMedia>
          <EmptyTitle>This form couldn&rsquo;t be opened</EmptyTitle>
          {/* Text, never markup — the reason comes from the host's transport (rule 5). */}
          <EmptyDescription>{reason ?? 'The form could not be loaded.'}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onRetry}>Try again</Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty data-slot="form-studio-empty" className="h-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon path={mdiFileDocumentOutline} size="16px" />
        </EmptyMedia>
        <EmptyTitle>No form open</EmptyTitle>
        <EmptyDescription>
          Start a new form, or open one from a template, to begin building.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onNewForm}>New form</Button>
      </EmptyContent>
    </Empty>
  );
}
