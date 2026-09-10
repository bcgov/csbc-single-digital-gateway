import { FormStudio } from '@repo/forms/studio';

/**
 * `/admin/studio` — hosts the form studio shell from `@repo/forms` (doc 178).
 *
 * FormStudio sizes itself to its container (`h-full`), which resolves here because the admin
 * layout's `<main>` is a flex child with a definite height. The bordered frame marks where the
 * studio ends against the admin page's muted padding (doc 181).
 */
export function FormStudioPage() {
  return (
    <div data-slot="form-studio-frame" className="h-full border bg-background">
      <FormStudio />
    </div>
  );
}
