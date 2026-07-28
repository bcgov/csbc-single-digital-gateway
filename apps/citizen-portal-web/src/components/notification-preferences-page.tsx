import { useState } from 'react';
import { Button, buttonVariants } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Skeleton } from '@repo/ui/skeleton';
import { Switch } from '@repo/ui/switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker } from '@tanstack/react-router';
import { Icon } from '@mdi/react';
import { mdiBellOutline, mdiLogin } from '@mdi/js';

import { Breadcrumb } from '@/components/breadcrumb';
import { CitizenShell } from '@/components/layout/citizen-shell';
import { SettingsPageHeader } from '@/components/layout/settings-page-header';
import { useAuth, useLoginUrl } from '@/lib/auth';
import {
  NOTIFICATIONS_KEY,
  notificationPreferencesQueryOptions,
  updateNotificationPreferences,
  type NotificationChannel,
  type NotificationPreferences,
} from '@/lib/notifications';

/** Prompt shown when navigating away from the notification form with unsaved edits. */
const UNSAVED_PROMPT = 'You have unsaved changes. Leave this page without saving?';

type PreferencesSnapshot = Pick<NotificationPreferences, 'channels'> & { email: string };

/** Whether the edited form differs from the last-saved snapshot (order-independent on channels). */
export function preferencesDirty(
  current: PreferencesSnapshot,
  saved: PreferencesSnapshot,
): boolean {
  if (current.email !== saved.email) {
    return true;
  }
  if (current.channels.length !== saved.channels.length) {
    return true;
  }
  return current.channels.some((c) => {
    const match = saved.channels.find((s) => s.channel === c.channel);
    return match === undefined || match.enabled !== c.enabled;
  });
}

const CHANNEL_LABELS: Record<NotificationChannel, { title: string; description: string }> = {
  in_app: {
    title: 'In-app notifications',
    description: 'Show updates in the notification bell while you are signed in.',
  },
  email: {
    title: 'Email notifications',
    description: 'Send updates to your contact email address.',
  },
};

/** The editable form, mounted only once the preferences query has data (async-seed gotcha). */
function PreferencesForm({ initial }: { initial: NotificationPreferences }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(initial.email ?? '');
  const [channels, setChannels] = useState(initial.channels);
  // The last-persisted snapshot — advances on every successful save so dirty tracking resets.
  const [saved, setSaved] = useState<PreferencesSnapshot>({
    email: initial.email ?? '',
    channels: initial.channels,
  });
  const save = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (fresh) => {
      const freshEmail = fresh.email ?? '';
      setEmail(freshEmail);
      setChannels(fresh.channels);
      setSaved({ email: freshEmail, channels: fresh.channels });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });

  // The contact email section is revealed only when email notifications are on, and the email is
  // then required — the client gates Save on it (the notification-service also enforces this on the
  // merged state and returns 422; the client gate is the fast-path UX).
  const emailEnabled = channels.some((c) => c.channel === 'email' && c.enabled);
  const emailMissing = emailEnabled && email.trim() === '';

  // Guard against losing unsaved edits: confirm on in-app navigation and native browser unload.
  const isDirty = preferencesDirty({ email, channels }, saved);
  useBlocker({
    shouldBlockFn: () => (isDirty ? !window.confirm(UNSAVED_PROMPT) : false),
    enableBeforeUnload: isDirty,
  });

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="section-heading">Notification Channels</h2>
        <p className="text-sm text-muted-foreground">
          Choose how you want to receive notifications.
        </p>
      </div>
      {channels.map((entry) => {
        const meta = CHANNEL_LABELS[entry.channel];
        return (
          <div key={entry.channel} className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold tracking-wide text-muted-foreground">
                {meta.title}
              </span>
              <p className="text-sm text-muted-foreground">{meta.description}</p>
            </div>
            {entry.channel === 'in_app' ? (
              // Mandatory channel (feature 128): always on, not a preference.
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Always on</span>
                <Switch aria-label={meta.title} checked disabled />
              </div>
            ) : (
              <Switch
                aria-label={meta.title}
                checked={entry.enabled}
                onCheckedChange={(enabled) => {
                  setChannels((prev) =>
                    prev.map((c) => (c.channel === entry.channel ? { ...c, enabled } : c)),
                  );
                }}
              />
            )}
          </div>
        );
      })}
      {emailEnabled ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notification-email" className="text-sm font-semibold">
            Contact email
          </Label>
          <Input
            id="notification-email"
            type="email"
            value={email}
            placeholder="you@example.com"
            aria-invalid={emailMissing}
            onChange={(event) => setEmail(event.target.value)}
          />
          {emailMissing ? (
            <p className="text-sm text-destructive" role="alert">
              Contact email is required when email notifications are enabled.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Where email notifications are sent.</p>
          )}
        </div>
      ) : null}
      {save.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Saving failed — please try again.
        </p>
      ) : null}
      <div>
        <Button
          type="button"
          disabled={save.isPending || emailMissing}
          onClick={() => {
            save.mutate({
              email: email.trim() === '' ? null : email.trim(),
              // in_app is mandatory — the write path only accepts togglable channels.
              channels: channels.filter((c) => c.channel !== 'in_app'),
            });
          }}
        >
          {save.isPending ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </section>
  );
}

/**
 * `/account/notifications` — channel toggles + contact email for the notification center
 * (feature 115). Login-gated like the account page; the form mounts only on query success.
 */
export function NotificationPreferencesPage() {
  const { data: user, isPending: authPending } = useAuth();
  const loginUrl = useLoginUrl();
  const prefs = useQuery({ ...notificationPreferencesQueryOptions(), enabled: user != null });

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
              You need to be signed in to manage notifications.
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
          icon={mdiBellOutline}
          title="Notification settings"
          subtitle="Choose how you hear about updates to your applications."
          breadcrumb={
            <Breadcrumb
              trail={[
                { label: 'Account settings', href: '/account' },
                { label: 'Notification settings' },
              ]}
            />
          }
        />
        <div className="mx-auto my-6 flex w-full max-w-280 flex-col gap-9 px-4 md:px-8">
          {prefs.isSuccess ? (
            <PreferencesForm initial={prefs.data} />
          ) : prefs.isError ? (
            <p className="text-sm text-destructive" role="alert">
              Notification settings are temporarily unavailable.
            </p>
          ) : (
            <Skeleton className="h-56 w-full" />
          )}
        </div>
      </div>
    </CitizenShell>
  );
}
