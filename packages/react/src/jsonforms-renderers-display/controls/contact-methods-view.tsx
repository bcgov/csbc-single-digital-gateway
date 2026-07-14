import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/card';
import { ArrowRight } from 'lucide-react';
import {
  CONTACT_METHOD_META,
  type ContactMethod,
  methodDetailLines,
  normalizeContactMethods,
} from '../../jsonforms-renderers/controls/contact-methods/model';

interface ContactAction {
  href: string;
  cta: string;
  /** External http(s) links open in a new tab; tel:/mailto: do not. */
  external: boolean;
}

const withProtocol = (url: string): string => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

const addressQuery = (method: ContactMethod): string =>
  [
    method.address_one,
    method.address_two,
    method.city,
    method.province,
    method.postal_code,
    method.country,
  ]
    .filter(Boolean)
    .join(', ');

/** The clickable action + right-side CTA label for a method (null = not actionable, e.g. fax). */
function contactAction(method: ContactMethod): ContactAction | null {
  switch (method.type) {
    case 'phone':
      return method.value ? { href: `tel:${method.value}`, cta: 'Call us', external: false } : null;
    case 'email':
      return method.value
        ? { href: `mailto:${method.value}`, cta: 'Email us', external: false }
        : null;
    case 'links':
      return method.value
        ? { href: withProtocol(method.value), cta: 'Visit website', external: true }
        : null;
    case 'address': {
      const query = addressQuery(method);
      return query
        ? {
            href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
            cta: 'Get directions',
            external: true,
          }
        : null;
    }
    default:
      return null;
  }
}

/**
 * Citizen-portal card (feature 130): a full-width "link" card — icon chip + label/value, with a
 * per-type call-to-action on the right, wrapping the whole card in the relevant tel:/mailto:/URL/maps
 * link. Non-actionable methods (e.g. fax) render the same card without a link.
 */
function MethodRowCard({ method }: { method: ContactMethod }) {
  const meta = CONTACT_METHOD_META[method.type];
  const Icon = meta.icon;
  const lines = methodDetailLines(method);
  const action = contactAction(method);

  const card = (
    <Card
      column
      className={
        action
          ? 'border-l-4 border-l-blue-80 transition-colors hover:bg-blue-10'
          : 'border-l-4 border-l-border'
      }
    >
      <CardAction className="pr-0" aria-hidden={true}>
        <Avatar variant="card">
          <AvatarFallback variant="card">
            <Icon className="size-5" aria-hidden />
          </AvatarFallback>
        </Avatar>
      </CardAction>
      <CardHeader>
        <CardTitle>{method.label || meta.label}</CardTitle>
        {lines.length > 0 ? (
          <CardDescription className="whitespace-pre-line">{lines.join('\n')}</CardDescription>
        ) : null}
      </CardHeader>
      {action ? (
        <div className="flex shrink-0 items-center gap-1 px-4 text-base font-medium text-link">
          {action.cta}
          <ArrowRight className="size-4" aria-hidden />
        </div>
      ) : null}
    </Card>
  );

  if (!action) {
    return card;
  }
  return (
    <a
      href={action.href}
      {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="block no-underline"
    >
      {card}
    </a>
  );
}

/** Grid (platform) card — stacked, with the type sub-label. */
function MethodGridCard({ method }: { method: ContactMethod }) {
  const meta = CONTACT_METHOD_META[method.type];
  const Icon = meta.icon;
  const lines = methodDetailLines(method);
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
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
        {lines.length > 0 ? (
          <div className="flex flex-col">
            {lines.map((line, index) => (
              <span key={index} className="text-sm text-foreground">
                {line}
              </span>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Read-only "list of cards" for a service's contact methods (feature 130) — one card per method.
 * `value` is the raw `data.contact_methods` blob; it is normalized (revision-1 tolerant) so a partial
 * or hand-edited value never throws. Renders `null` when there are no methods (the host owns any empty
 * state).
 */
export function ContactMethodsView({
  value,
  layout = 'grid',
}: {
  value: unknown;
  /** `grid` = two-up cards (default); `rows` = full-width link cards (citizen portal). */
  layout?: 'grid' | 'rows';
}) {
  const methods = normalizeContactMethods(value);
  if (methods.length === 0) {
    return null;
  }
  if (layout === 'rows') {
    return (
      <div className="flex flex-col gap-3">
        {methods.map((method, index) => (
          <MethodRowCard key={index} method={method} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {methods.map((method, index) => (
        <MethodGridCard key={index} method={method} />
      ))}
    </div>
  );
}
