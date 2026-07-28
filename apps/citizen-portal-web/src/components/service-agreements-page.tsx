import { mdiChevronRight, mdiFileDocumentCheckOutline, mdiLogin } from '@mdi/js';
import { Icon } from '@mdi/react';
import { buttonVariants } from '@repo/ui/button';
import { Card, CardDescription, CardHeader, CardIconAction, CardTitle } from '@repo/ui/card';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { SettingsPageHeader } from '@/components/layout/settings-page-header';
import { useAuth, useLoginUrl } from '@/lib/auth';
import {
  serviceAgreementsQueryOptions,
  type ServiceAgreementListItem,
} from '@/lib/service-agreements';

interface DayGroup {
  key: string;
  date: Date;
  items: ServiceAgreementListItem[];
}
interface MonthGroup {
  key: string;
  label: string;
  days: DayGroup[];
}

/**
 * Group a newest-first list into month → day sections (browser locale + timezone). Because the input
 * is already descending, first-seen order yields months and days descending too.
 */
export function groupByMonth(items: ServiceAgreementListItem[]): MonthGroup[] {
  const months = new Map<string, MonthGroup>();
  for (const item of items) {
    const date = new Date(item.consentedAt);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    let month = months.get(monthKey);
    if (month === undefined) {
      month = {
        key: monthKey,
        label: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        days: [],
      };
      months.set(monthKey, month);
    }
    const dayKey = `${monthKey}-${date.getDate()}`;
    let day = month.days.find((d) => d.key === dayKey);
    if (day === undefined) {
      day = { key: dayKey, date, items: [] };
      month.days.push(day);
    }
    day.items.push(item);
  }
  return [...months.values()];
}

const timeOf = (iso: string): string =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** One approval as a link card (title + consent time), linking to its detail page. */
function AgreementCard({ item }: { item: ServiceAgreementListItem }) {
  return (
    <Link
      to="/account/service-agreements/$serviceAgreementId"
      params={{ serviceAgreementId: item.id }}
      className="no-underline"
    >
      <Card column className="h-16 py-0 transition-colors hover:bg-blue-10">
        <CardIconAction size="sm">
          <Icon
            path={mdiFileDocumentCheckOutline}
            size="32px"
            className="text-blue-80"
            aria-hidden={true}
          />
        </CardIconAction>
        <CardHeader>
          <CardTitle>{item.title}</CardTitle>
          <CardDescription>Approved at {timeOf(item.consentedAt)}</CardDescription>
        </CardHeader>
        <div className="px-4">
          <Icon path={mdiChevronRight} size="20px" className="text-link" aria-hidden={true} />
        </div>
      </Card>
    </Link>
  );
}

/**
 * One day: a bordered date square (day number + weekday) beside that day's approval cards. A vertical
 * connector line links each square to the next within the month (omitted on the last day).
 */
function DayRow({ day, isLast }: { day: DayGroup; isLast: boolean }) {
  return (
    <div className="flex gap-4 md:gap-6">
      <div className="relative w-16 shrink-0">
        {!isLast ? (
          <div
            className="absolute top-8 -bottom-6 left-1/2 w-px -translate-x-1/2 bg-border"
            aria-hidden={true}
          />
        ) : null}
        <div className="relative z-10 flex size-16 flex-col items-center justify-center border border-border bg-background text-center">
          <div className="text-2xl leading-none font-semibold text-foreground">
            {day.date.getDate()}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {day.date.toLocaleDateString(undefined, { weekday: 'short' })}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {day.items.map((item) => (
          <AgreementCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

/** The month → day timeline for a citizen's approved agreements. */
function Timeline({ items }: { items: ServiceAgreementListItem[] }) {
  const months = groupByMonth(items);
  return (
    <div className="flex flex-col gap-10">
      {months.map((month) => (
        <section key={month.key} className="flex flex-col gap-4">
          <h2 className="section-heading">{month.label}</h2>
          <div className="flex flex-col gap-6">
            {month.days.map((day, i) => (
              <DayRow key={day.key} day={day} isLast={i === month.days.length - 1} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * `/account/service-agreements` (feature 139) — a login-gated historical timeline of the agreements
 * the citizen has approved, grouped by month, newest first. Each approval links to its detail page.
 */
export function ServiceAgreementsPage() {
  const { data: user, isPending: authPending } = useAuth();
  const loginUrl = useLoginUrl();
  const agreements = useQuery({ ...serviceAgreementsQueryOptions(), enabled: user != null });

  if (authPending) {
    return (
      <CitizenShell>
        <div className="mx-auto my-6 flex w-full max-w-280 flex-col gap-3 px-4 md:px-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </CitizenShell>
    );
  }

  if (!user) {
    return (
      <CitizenShell>
        <div className="mx-auto my-6 flex w-full max-w-280 flex-col px-4 md:px-8">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
            <p className="text-sm text-muted-foreground">
              You need to be signed in to view your service agreements.
            </p>
            <a href={loginUrl} className={buttonVariants({ variant: 'default', size: 'default' })}>
              <Icon path={mdiLogin} aria-hidden={true} />
              Log in
            </a>
          </div>
        </div>
      </CitizenShell>
    );
  }

  return (
    <CitizenShell>
      <div className="flex flex-col">
        <SettingsPageHeader
          icon={mdiFileDocumentCheckOutline}
          title="Service Agreements"
          subtitle="Agreements you've accepted to use government services."
        />
        <div className="mx-auto my-6 flex w-full max-w-280 flex-col gap-9 px-4 md:px-8">
          {agreements.isSuccess ? (
            agreements.data.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl bg-background p-10 text-center ring-1 ring-foreground/10">
                <p className="text-sm text-muted-foreground">
                  You have no service agreements yet. Agreements you accept will appear here.
                </p>
              </div>
            ) : (
              <Timeline items={agreements.data} />
            )
          ) : agreements.isError ? (
            <p className="text-sm text-destructive" role="alert">
              Your service agreements are temporarily unavailable.
            </p>
          ) : (
            <Skeleton className="h-56 w-full" />
          )}
        </div>
      </div>
    </CitizenShell>
  );
}
