import { FormStudio } from '@repo/forms/studio';

/**
 * `/admin/studio` — hosts the form studio shell from `@repo/forms` (doc 178).
 *
 * FormStudio sizes itself to its container (`h-full`), which resolves here because the admin
 * layout's `<main>` is a flex child with a definite height.
 */
export function FormStudioPage() {
  return <FormStudio />;
}
