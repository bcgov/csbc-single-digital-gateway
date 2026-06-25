import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { useNavigate } from '@tanstack/react-router';
import { ExternalLink, FileText, type LucideIcon, Layers } from 'lucide-react';

interface Method {
  title: string;
  description: string;
  icon: LucideIcon;
}

const PREFERRED: Method[] = [
  {
    title: 'Basic form',
    description: 'A single page of fields applicants complete and submit in one go.',
    icon: FileText,
  },
  {
    title: 'Multi-stage form',
    description: 'A guided flow split into stages, with conditional logic between them.',
    icon: Layers,
  },
];

const OTHER: Method[] = [
  {
    title: 'External link',
    description: 'Send applicants to a form or service hosted elsewhere.',
    icon: ExternalLink,
  },
];

interface ApplicationTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Active workspace slug — selecting a method lands on its applications screen. */
  slug: string | undefined;
}

/**
 * "New application" modal — opened from the New sheet's Application option. Offers the application
 * methods (basic form / multi-stage / external); the builders aren't built yet, so selecting a method
 * lands on the workspace's applications screen.
 */
export function ApplicationTypeModal({ open, onOpenChange, slug }: ApplicationTypeModalProps) {
  const navigate = useNavigate();

  function pick(): void {
    onOpenChange(false);
    void navigate({ to: '/app/$slug/applications', params: { slug: slug ?? '' } });
  }

  const renderMethod = (method: Method) => {
    const Icon = method.icon;
    return (
      <button
        key={method.title}
        type="button"
        onClick={pick}
        className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">{method.title}</span>
          <span className="block text-sm text-muted-foreground">{method.description}</span>
        </span>
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New application</DialogTitle>
          <DialogDescription>Choose how users apply for your service.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Preferred methods
          </span>
          {PREFERRED.map(renderMethod)}
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Other methods
          </span>
          {OTHER.map(renderMethod)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
