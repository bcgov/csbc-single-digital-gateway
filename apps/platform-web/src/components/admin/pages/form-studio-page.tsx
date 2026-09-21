import type { FormStudioProps } from '@repo/forms';
import { FormStudio } from '@repo/forms/studio';
import { toast } from '@repo/ui/sonner';

/**
 * Doc 209 rules 16-17: the studio refuses some edits — an edge re-point that would duplicate a branch, close a
 * cycle or point a node at itself — and says why through this. A module const, not an inline arrow: the studio
 * reads it through a ref, and a new identity each render is the trap doc 200 rule 2 records for `loadDocument`.
 */
const notify = (message: string) => toast(message);

/** The focus props the route passes through (doc 197 rule 22); both optional, so the page still renders bare. */
export type FormStudioPageProps = Pick<FormStudioProps, 'focusedForm' | 'onFocusedFormChange'>;

/**
 * `/admin/studio` — hosts the form studio shell from `@repo/forms` (doc 178).
 *
 * FormStudio sizes itself to its container (`h-full`), which resolves here because the admin
 * layout's `<main>` is a flex child with a definite height. The bordered frame marks where the
 * studio ends against the admin page's muted padding (doc 181).
 *
 * The page stays router-free: the route component owns `useSearch` / `useNavigate` and hands the focus address down
 * (doc 197 rule 22), so this renders anywhere, with or without a router.
 */
export function FormStudioPage({ focusedForm, onFocusedFormChange }: FormStudioPageProps) {
  return (
    <div data-slot="form-studio-frame" className="h-full border bg-background">
      <FormStudio
        focusedForm={focusedForm}
        onFocusedFormChange={onFocusedFormChange}
        onNotice={notify}
      />
    </div>
  );
}
