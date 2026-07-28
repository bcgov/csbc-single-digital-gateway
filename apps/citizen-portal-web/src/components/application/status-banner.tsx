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

/**
 * Per-status banner content: the headline, a compact status badge label, the explanatory copy, the
 * tone, and the icon path. `title` is the prominent headline; `badge` is the short status tag shown
 * in the coloured pill next to it.
 */
const STATUS_CONFIG: Record<
  ApplicationStatus,
  { title: string; badge: string; description: string; tone: Tone; icon: string }
> = {
  draft: {
    title: 'Draft',
    badge: 'Draft',
    description: 'This application hasn’t been submitted yet. Continue when you’re ready.',
    tone: 'muted',
    icon: mdiFileDocumentOutline,
  },
  pending: {
    title: 'Application received',
    badge: 'Submitted',
    description: 'We’ve received your application — it’s waiting to be reviewed.',
    tone: 'info',
    icon: mdiClockOutline,
  },
  in_review: {
    title: 'Under review',
    badge: 'In review',
    description: 'Your application is being reviewed. We’ll let you know if anything is needed.',
    tone: 'info',
    icon: mdiClockOutline,
  },
  approved: {
    title: 'Approved',
    badge: 'Approved',
    description: 'This application has been approved.',
    tone: 'success',
    icon: mdiCheckCircleOutline,
  },
  rejected: {
    title: 'Not approved',
    badge: 'Rejected',
    description: 'This application was not approved.',
    tone: 'destructive',
    icon: mdiCloseCircleOutline,
  },
  needs_changes: {
    title: 'Action needed',
    badge: 'Changes requested',
    description: 'The reviewer has asked for some changes before this can go ahead.',
    tone: 'warning',
    icon: mdiAlertOutline,
  },
  withdrawn: {
    title: 'Withdrawn',
    badge: 'Withdrawn',
    description: 'This application has been withdrawn.',
    tone: 'muted',
    icon: mdiArchiveOutline,
  },
};

/**
 * Per-tone classes composed from the `@repo/ui` support tokens: `container` (card surface + border),
 * `accent` (the left bar + badge dot), `chip` (the icon chip fill), `icon` (icon colour), and
 * `badge` (the pill). `info` has no dedicated icon token, so it borrows its border colour.
 */
const TONE_CLASSES: Record<
  Tone,
  { container: string; accent: string; chip: string; icon: string; badge: string }
> = {
  info: {
    container: 'border-info-border bg-info-surface',
    accent: 'bg-info-border',
    chip: 'bg-info-border/15',
    icon: 'text-info-border',
    badge: 'bg-info-border/15 text-foreground',
  },
  success: {
    container: 'border-success-border bg-success-surface',
    accent: 'bg-success-border',
    chip: 'bg-success-border/15',
    icon: 'text-icon-success',
    badge: 'bg-success-border/15 text-foreground',
  },
  warning: {
    container: 'border-warning-border bg-warning-surface',
    accent: 'bg-warning-border',
    chip: 'bg-warning-border/15',
    icon: 'text-icon-warning',
    badge: 'bg-warning-border/15 text-foreground',
  },
  destructive: {
    container: 'border-danger-border bg-danger-surface',
    accent: 'bg-danger-border',
    chip: 'bg-danger-border/15',
    icon: 'text-icon-danger',
    badge: 'bg-danger-border/15 text-foreground',
  },
  muted: {
    container: 'border-border bg-background',
    accent: 'bg-muted-foreground',
    chip: 'bg-muted-foreground/15',
    icon: 'text-muted-foreground',
    badge: 'bg-muted-foreground/15 text-muted-foreground',
  },
};

/** The reviewer note is shown only for the states a reviewer produces. */
const SHOWS_REASON = new Set<ApplicationStatus>(['needs_changes', 'rejected']);

/**
 * The status-aware card on the application detail page (features 66 + 140). Maps the submission
 * status to a tone and renders a high-fidelity, status-coloured card: a left accent bar, a filled
 * icon chip, the headline + a status badge pill, the explanatory copy, the reviewer's note (for
 * rejected / action-needed), and an optional action (e.g. "Make changes"). Not rendered for drafts —
 * a draft opens straight into the editable form.
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
    <div className={`flex overflow-hidden rounded-lg border ${tone.container}`}>
      <div className={`w-1.5 shrink-0 ${tone.accent}`} aria-hidden={true} />
      <div className="flex flex-1 gap-3 px-5 py-4">
        <span
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${tone.chip}`}
        >
          <Icon path={config.icon} size="20px" className={tone.icon} aria-hidden={true} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-semibold text-foreground">{config.title}</p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${tone.badge}`}
            >
              <span className={`size-1.5 rounded-full ${tone.accent}`} aria-hidden={true} />
              {config.badge}
            </span>
          </div>
          <p className="text-sm text-foreground/80">{config.description}</p>
          {showReason ? (
            <blockquote className="border-l-2 border-foreground/20 pl-3 text-sm text-foreground">
              “{reviewReason}”
            </blockquote>
          ) : null}
          {action ? <div className="mt-1 flex justify-end">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
