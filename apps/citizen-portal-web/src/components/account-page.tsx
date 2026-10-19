import type { ReactNode } from 'react';
import {
  mdiAccountCircle,
  mdiBellOutline,
  mdiChevronRight,
  mdiCog,
  mdiFileDocumentCheckOutline,
} from '@mdi/js';
import { Icon } from '@mdi/react';
import { Card, CardDescription, CardHeader, CardIconAction, CardTitle } from '@repo/ui/card';
import { Link } from '@tanstack/react-router';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { LoginGate } from '@/components/layout/login-gate';
import { PageContent } from '@/components/layout/page-content';
import { PageLoading } from '@/components/layout/page-loading';
import { SectionHeading } from '@/components/layout/page-section';
import { SettingsPageHeader } from '@/components/layout/settings-page-header';
import { useAuth } from '@/lib/auth';
import type { AuthUser, OidcAddress } from '@/lib/bff';

/** Placeholder shown for any identity claim the IdP did not provide. */
const EMPTY = '—';

/** Capitalize the first letter of a claim value for display (e.g. gender `female` → `Female`). */
function capitalizeFirst(value: string | undefined): string | undefined {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** Format the structured OIDC `address` claim as street + city/region/postal lines. */
function formatAddress(address: OidcAddress | undefined): ReactNode {
  if (!address) {
    return EMPTY;
  }
  const cityLine = [
    address.locality,
    [address.region, address.postal_code].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ');
  const lines = [address.street_address, cityLine].filter(Boolean);
  if (lines.length === 0) {
    return EMPTY;
  }
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </>
  );
}

/** One labelled read-only field in the account-details grid. */
export function InfoCell({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 p-4 ${className ?? ''}`}>
      <span className="text-xs font-semibold tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">
        {value === '' || value == null ? EMPTY : value}
      </span>
    </div>
  );
}

/**
 * Light-gray internal grid lines for cell `i` in the 2-col × 3-row details grid (row-major).
 * Top borders separate stacked rows (all sizes); left borders separate the two columns (sm+);
 * the top-right cell drops its mobile top border once the two columns appear.
 */
function cellBorders(i: number): string {
  const isRightCol = i % 2 === 1;
  const isFirstRow = i < 2;
  return [
    i > 0 ? 'border-t border-border' : '',
    isRightCol ? 'sm:border-l sm:border-border sm:pl-6' : '',
    isRightCol && isFirstRow ? 'sm:border-t-0' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** A page section surfacing the citizen's BC Services Card identity in a 3×3 grid. */
function AccountDetails({ user }: { user: AuthUser }) {
  const { claims } = user;
  // Row-major order → left col: Given Names / Date of Birth / Address; right col: Surname / Gender / Email.
  const cells: { label: string; value: ReactNode }[] = [
    { label: 'Given Names', value: claims.given_name },
    { label: 'Surname', value: claims.family_name },
    { label: 'Date of Birth', value: claims.birthdate },
    { label: 'Gender', value: capitalizeFirst(claims.gender) },
    { label: 'Address', value: formatAddress(claims.address) },
    { label: 'Email', value: claims.email },
  ];
  return (
    // The design-spec gradient (feature 138): blue-10 at the bottom fading to white at the top.
    <section className="flex flex-col gap-6 border-b-2 border-bcgov-blue bg-linear-to-t from-blue-10 to-white p-4">
      <SectionHeading title="Account details">
        <p className="text-sm text-muted-foreground">
          This information is fetched from your BC Services Card Account.
        </p>
      </SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] border bg-background">
        {/* Column 1 — photo placeholder, alongside the details on md+. */}
        <div className="flex flex-col gap-2 p-4 pb-6 md:h-full md:items-start md:border-r md:border-border md:pr-6 md:pb-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Photograph
          </span>
          <div className="flex flex-row mx-auto h-44 w-36 items-center justify-center rounded-md bg-blue-10 text-blue-80">
            <Icon path={mdiAccountCircle} size="88px" title="Profile photo placeholder" />
          </div>
        </div>
        {/* Details — two columns of labelled cells with light-gray internal borders. */}
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {cells.map((cell, i) => (
            <InfoCell
              key={cell.label}
              label={cell.label}
              value={cell.value}
              className={cellBorders(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** A single stacked settings card: icon badge + title + description + disclosure chevron. */
function SettingsCard({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link to={to} className="no-underline">
      <Card column className="transition-colors hover:bg-blue-10">
        <CardIconAction size="sm">
          <Icon path={icon} size="32px" className="text-blue-80" aria-hidden={true} />
        </CardIconAction>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <div className="px-4">
          <Icon path={mdiChevronRight} size="20px" className="text-link" aria-hidden={true} />
        </div>
      </Card>
    </Link>
  );
}

/**
 * The citizen account page (`/account`, feature 138) — a login-gated Account Settings landing:
 * a branded header, a personal-information grid sourced from BC Services Card claims, and stacked
 * cards linking to notification preferences and service agreements.
 */
export function AccountPage() {
  const { data: user, isPending } = useAuth();

  if (isPending) {
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
          <LoginGate message="You need to be signed in to view your account." />
        </PageContent>
      </CitizenShell>
    );
  }

  return (
    <CitizenShell>
      <SettingsPageHeader
        icon={mdiCog}
        title="Account settings"
        subtitle="Your Single Digital Gateway account."
      />
      <PageContent>
        <AccountDetails user={user} />
        <div className="flex flex-col">
          <SettingsCard
            to="/account/notifications"
            icon={mdiBellOutline}
            title="Notification preferences"
            description="Choose how you hear about updates to your applications."
          />
          <SettingsCard
            to="/account/service-agreements"
            icon={mdiFileDocumentCheckOutline}
            title="Service Agreements"
            description="Review the agreements you've accepted to use government services."
          />
        </div>
      </PageContent>
    </CitizenShell>
  );
}
