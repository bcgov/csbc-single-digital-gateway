import { mdiChevronRight, mdiFileDocumentCheckOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Card, CardDescription, CardHeader, CardIconAction, CardTitle } from '@repo/ui/card';
import { Skeleton } from '@repo/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { LoginGate } from '@/components/layout/login-gate';
import { MessageCard } from '@/components/layout/message-card';
import { PageContent } from '@/components/layout/page-content';
import { PageLoading } from '@/components/layout/page-loading';
import { PageSection } from '@/components/layout/page-section';
import { SettingsPageHeader } from '@/components/layout/settings-page-header';
import { Breadcrumb } from '@/components/breadcrumb';
import { useAuth } from '@/lib/auth';
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
        <PageSection key={month.key} title={month.label} gap={4}>
          <div className="flex flex-col gap-6">
            {month.days.map((day, i) => (
              <DayRow key={day.key} day={day} isLast={i === month.days.length - 1} />
            ))}
          </div>
        </PageSection>
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
  const agreements = useQuery({ ...serviceAgreementsQueryOptions(), enabled: user != null });

  if (authPending) {
    return (
      <CitizenShell>
        <PageContent>
          <PageLoading variant="settings" />
        </PageContent>
      </CitizenShell>
    );
  }

  if (!user) {
    return (
      <CitizenShell>
        <PageContent>
          <LoginGate message="You need to be signed in to view your service agreements." />
        </PageContent>
      </CitizenShell>
    );
  }

  return (
    <CitizenShell>
      <SettingsPageHeader
        icon={mdiFileDocumentCheckOutline}
        title="Service Agreements"
        subtitle="Agreements you've accepted to use government services."
        breadcrumb={
          <Breadcrumb
            trail={[
              { label: 'Account settings', href: '/account' },
              { label: 'Service Agreements' },
            ]}
          />
        }
      />
      <PageContent>
        {agreements.isSuccess ? (
          agreements.data.length === 0 ? (
            <MessageCard>
              You have no service agreements yet. Agreements you accept will appear here.
            </MessageCard>
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
      </PageContent>
    </CitizenShell>
  );
}
