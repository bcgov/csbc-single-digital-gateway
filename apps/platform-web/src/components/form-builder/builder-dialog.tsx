import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui/dialog';
import type { FormDefinition } from '@/lib/services';
import { FormBuilder } from './form-builder';

/** An empty basic-form definition — the starting point for a form designed in the dialog. */
export const EMPTY_FORM_DEFINITION: FormDefinition = {
  schema: { type: 'object', properties: {}, required: [] },
  uischema: { type: 'VerticalLayout', elements: [] },
};

/** Full-screen dialog hosting the builder — used by the service editor's embedded (client-first) flow. */
export function FormBuilderDialog({
  open,
  onOpenChange,
  title,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: FormDefinition;
  onChange: (value: FormDefinition) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle>{title || 'Design form'}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1">
          <FormBuilder value={value} onChange={onChange} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
