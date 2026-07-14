import { Card, CardContent } from '@repo/ui/card';
import { RichTextView, type RichTextViewProps } from '@repo/ui/rich-text-view';
import {
  CONTACT_METHOD_META,
  type AddressEntry,
  type ContactEntry,
  type ContactMethod,
  type ContactMethodType,
  type ValueEntry,
  entryHasContent,
  normalizeContactMethods,
} from '../../jsonforms-renderers/controls/contact-methods/model';

/** The presentational lines for a single entry (a value or a postal address). */
function EntryView({ type, entry }: { type: ContactMethodType; entry: ContactEntry }) {
  if (type === 'address') {
    const address = entry as AddressEntry;
    const region = [address.city, address.province, address.postal_code].filter(Boolean).join(' ');
    const lines = [address.address_one, address.address_two, region, address.country].filter(
      Boolean,
    );
    return (
      <div className="flex flex-col">
        {address.label ? (
          <span className="text-[11px] text-muted-foreground">{address.label}</span>
        ) : null}
        {lines.map((line, index) => (
          <span key={index} className="text-sm text-foreground">
            {line}
          </span>
        ))}
      </div>
    );
  }
  const value = entry as ValueEntry;
  return (
    <div className="flex flex-col">
      {value.label ? (
        <span className="text-[11px] text-muted-foreground">{value.label}</span>
      ) : null}
      <span className="text-sm font-medium text-foreground">{value.value}</span>
    </div>
  );
}

/** A single contact method rendered as a card: icon + label, optional rich-text, then its entries. */
function MethodCard({ method }: { method: ContactMethod }) {
  const meta = CONTACT_METHOD_META[method.type];
  const Icon = meta.icon;
  const description = (method.description ?? null) as RichTextViewProps['value'];
  const entries = method.entries.filter((entry) => entryHasContent(method.type, entry));
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="flex flex-col">
            <span className="font-heading text-sm font-semibold text-foreground">
              {method.label || meta.label}
            </span>
            <span className="text-[11px] text-muted-foreground">{meta.label}</span>
          </div>
        </div>
        {description ? (
          <div className="text-sm text-muted-foreground">
            <RichTextView value={description} />
          </div>
        ) : null}
        {entries.length > 0 ? (
          <div className="flex flex-col gap-2">
            {entries.map((entry, index) => (
              <EntryView key={index} type={method.type} entry={entry} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Read-only "list of cards" for a service's contact methods (feature 130) — one card per method.
 * `value` is the raw `data.contact_methods` blob; it is normalized so a partial/hand-edited value
 * never throws. Renders `null` when there are no methods (the host owns any empty-state message).
 */
export function ContactMethodsView({ value }: { value: unknown }) {
  const methods = normalizeContactMethods(value);
  if (methods.length === 0) {
    return null;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {methods.map((method, index) => (
        <MethodCard key={index} method={method} />
      ))}
    </div>
  );
}
