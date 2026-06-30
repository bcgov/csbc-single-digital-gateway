import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  FileText,
  type LucideIcon,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { ApplicationStatus } from '@/lib/catalog';

type Tone = 'info' | 'success' | 'warning' | 'destructive' | 'muted';

/** Per-status banner content: the headline, the explanatory copy, the tone, and the icon. */
const STATUS_CONFIG: Record<
  ApplicationStatus,
  { title: string; description: string; tone: Tone; icon: LucideIcon }
> = {
  draft: {
    title: 'Draft',
    description: 'This application hasn’t been submitted yet. Continue when you’re ready.',
    tone: 'muted',
    icon: FileText,
  },
  pending: {
    title: 'Submitted',
    description: 'We’ve received your application — it’s waiting to be reviewed.',
    tone: 'info',
    icon: Clock,
  },
  in_review: {
    title: 'Under review',
    description: 'Your application is being reviewed. We’ll let you know if anything is needed.',
    tone: 'info',
    icon: Clock,
  },
  approved: {
    title: 'Approved',
    description: 'This application has been approved.',
    tone: 'success',
    icon: CheckCircle2,
  },
  rejected: {
    title: 'Not approved',
    description: 'This application was not approved.',
    tone: 'destructive',
    icon: XCircle,
  },
  needs_changes: {
    title: 'Action needed',
    description: 'The reviewer has asked for some changes before this can go ahead.',
    tone: 'warning',
    icon: AlertTriangle,
  },
  withdrawn: {
    title: 'Withdrawn',
    description: 'This application has been withdrawn.',
    tone: 'muted',
    icon: Archive,
  },
};

const TONE_CLASSES: Record<Tone, { container: string; icon: string }> = {
  info: { container: 'border-sky-200 bg-sky-50/70', icon: 'text-sky-600' },
  success: { container: 'border-emerald-200 bg-emerald-50/70', icon: 'text-emerald-600' },
  warning: { container: 'border-amber-200 bg-amber-50/70', icon: 'text-amber-600' },
  destructive: { container: 'border-red-200 bg-red-50/70', icon: 'text-red-600' },
  muted: { container: 'border-foreground/10 bg-background', icon: 'text-muted-foreground' },
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
  const Icon = config.icon;
  const showReason = SHOWS_REASON.has(status) && Boolean(reviewReason);

  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${tone.container}`}>
      <Icon className={`mt-0.5 size-5 shrink-0 ${tone.icon}`} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-heading text-sm font-semibold text-foreground">{config.title}</span>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        {showReason ? (
          <blockquote className="border-l-2 border-foreground/20 pl-3 text-sm text-foreground">
            “{reviewReason}”
          </blockquote>
        ) : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    </div>
  );
}
