import {
  mdiAlertOutline,
  mdiArchiveOutline,
  mdiCheckCircleOutline,
  mdiClockOutline,
  mdiCloseCircleOutline,
  mdiFileDocumentOutline,
} from '@mdi/js';
import { Icon } from '@mdi/react';
import type { ReactNode } from 'react';
import type { ApplicationStatus } from '@/lib/catalog';

type Tone = 'info' | 'success' | 'warning' | 'destructive' | 'muted';

/** Per-status banner content: the headline, the explanatory copy, the tone, and the icon path. */
const STATUS_CONFIG: Record<
  ApplicationStatus,
  { title: string; description: string; tone: Tone; icon: string }
> = {
  draft: {
    title: 'Draft',
    description: 'This application hasn’t been submitted yet. Continue when you’re ready.',
    tone: 'muted',
    icon: mdiFileDocumentOutline,
  },
  pending: {
    title: 'Submitted',
    description: 'We’ve received your application — it’s waiting to be reviewed.',
    tone: 'info',
    icon: mdiClockOutline,
  },
  in_review: {
    title: 'Under review',
    description: 'Your application is being reviewed. We’ll let you know if anything is needed.',
    tone: 'info',
    icon: mdiClockOutline,
  },
  approved: {
    title: 'Approved',
    description: 'This application has been approved.',
    tone: 'success',
    icon: mdiCheckCircleOutline,
  },
  rejected: {
    title: 'Not approved',
    description: 'This application was not approved.',
    tone: 'destructive',
    icon: mdiCloseCircleOutline,
  },
  needs_changes: {
    title: 'Action needed',
    description: 'The reviewer has asked for some changes before this can go ahead.',
    tone: 'warning',
    icon: mdiAlertOutline,
  },
  withdrawn: {
    title: 'Withdrawn',
    description: 'This application has been withdrawn.',
    tone: 'muted',
    icon: mdiArchiveOutline,
  },
};

const TONE_CLASSES: Record<Tone, { container: string; icon: string }> = {
  info: { container: 'border-info-border bg-info-surface', icon: 'text-icon-info' },
  success: { container: 'border-success-border bg-success-surface', icon: 'text-icon-success' },
  warning: { container: 'border-warning-border bg-warning-surface', icon: 'text-icon-warning' },
  destructive: {
    container: 'border-danger-border bg-danger-surface',
    icon: 'text-icon-danger',
  },
  muted: { container: 'border-muted-foreground bg-background', icon: 'text-muted-foreground' },
};

/** The reviewer note is shown only for the states a reviewer produces. */
const SHOWS_REASON = new Set<ApplicationStatus>(['needs_changes', 'rejected']);

/**
 * The status-aware banner on the application detail page (feature 66). Maps the submission status to
 * a tone, headline, and explanatory copy, surfaces the reviewer's note for rejected / action-needed,
 * and renders an optional action (e.g. "Make changes" / "Continue your application").
 */
export function StatusBanner({
  status,
  reviewReason,
  action,
}: {
  status: ApplicationStatus;
  reviewReason?: string | null;
  action?: ReactNode;
}) {
  const config = STATUS_CONFIG[status];
  const tone = TONE_CLASSES[config.tone];
  const showReason = SHOWS_REASON.has(status) && Boolean(reviewReason);

  return (
    <div className={`flex gap-3 rounded-md border px-6 py-4 ${tone.container}`}>
      <Icon
        path={config.icon}
        size="20px"
        className={`mt-0.5 shrink-0 ${tone.icon}`}
        aria-hidden={true}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="font-semibold">{config.title}</p>
          <p>{config.description}</p>
        </div>
        {showReason ? (
          <blockquote className="border-l-2 border-foreground/20 pl-3 text-sm text-foreground">
            “{reviewReason}”
          </blockquote>
        ) : null}
        {action ? <div className="mt-2 flex justify-end">{action}</div> : null}
      </div>
    </div>
  );
}
