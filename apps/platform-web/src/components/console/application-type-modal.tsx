import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ExternalLink, FileText, type LucideIcon, Layers } from 'lucide-react';
import { formTypesQueryOptions } from '@/lib/services';

type MethodId = 'basic-form' | 'multi-stage-form' | 'external';

interface Method {
  id: MethodId;
  title: string;
  description: string;
  icon: LucideIcon;
}

const PREFERRED: Method[] = [
  {
    id: 'basic-form',
    title: 'Basic form',
    description: 'A single page of fields applicants complete and submit in one go.',
    icon: FileText,
  },
  {
    id: 'multi-stage-form',
    title: 'Multi-stage form',
    description: 'A guided flow split into stages, with conditional logic between them.',
    icon: Layers,
  },
];

const OTHER: Method[] = [
  {
    id: 'external',
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
  const queryClient = useQueryClient();

  async function pick(method: Method): Promise<void> {
    onOpenChange(false);
    // Basic form launches the form builder for a new basic-form; resolve its type lazily on click.
    if (method.id === 'basic-form') {
      try {
        const types = await queryClient.ensureQueryData(formTypesQueryOptions());
        const type = types.find((t) => t.kind === 'basic-form');
        if (type) {
          await navigate({
            to: '/app/$slug/forms/new',
            params: { slug: slug ?? '' },
            search: { typeId: type.typeId },
          });
          return;
        }
      } catch {
        /* fall through to the applications screen */
      }
    }
    await navigate({ to: '/app/$slug/applications', params: { slug: slug ?? '' } });
  }

  const renderMethod = (method: Method) => {
    const Icon = method.icon;
    return (
      <button
        key={method.title}
        type="button"
        onClick={() => void pick(method)}
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
