import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui/dialog';
import { StageBuilder } from './stage-builder';
import type { MultiStageDefinition } from './stage-model';

/** Full-screen dialog hosting the stage builder — used by the service editor's embedded (client-first)
 * flow when a new application is a multi-stage form (mirrors FormBuilderDialog for basic-forms). */
export function StageBuilderDialog({
  open,
  onOpenChange,
  title,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: MultiStageDefinition;
  onChange: (value: MultiStageDefinition) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle>{title || 'Design stages'}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1">
          <StageBuilder value={value} onChange={onChange} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
