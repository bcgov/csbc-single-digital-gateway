import {
  ContactMethodsView,
  normalizeContactMethods,
} from '@repo/react/jsonforms-renderers-display';

/**
 * The citizen service "Contact information" section (feature 130) — renders the service's authored
 * `contact_methods` as a list of cards (one per method) via the shared `@repo/react` view, or a muted
 * empty state when the service has none. `value` is the raw `data.contact_methods` blob.
 */
export function ContactSection({ value }: { value: unknown }) {
  const methods = normalizeContactMethods(value);
  if (methods.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No contact information for this service yet.
      </p>
    );
  }
  return <ContactMethodsView value={value} />;
}
