import { useState } from 'react';
import { Button } from '@repo/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Skeleton } from '@repo/ui/skeleton';
import { Switch } from '@repo/ui/switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  NOTIFICATIONS_KEY,
  notificationPreferencesQueryOptions,
  updateNotificationPreferences,
  type NotificationChannel,
  type NotificationPreferences,
} from '@/lib/notifications';

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
  const save = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (fresh) => {
      setEmail(fresh.email ?? '');
      setChannels(fresh.channels);
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });

  return (
    <CardContent className="flex flex-col gap-6">
      {channels.map((entry) => {
        const meta = CHANNEL_LABELS[entry.channel];
        return (
          <div key={entry.channel} className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{meta.title}</span>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notification-email">Contact email</Label>
        <Input
          id="notification-email"
          type="email"
          value={email}
          placeholder="you@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Where email notifications are sent. Leave empty to clear it.
        </p>
      </div>
      {save.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Saving failed — please try again.
        </p>
      ) : null}
      <div>
        <Button
          type="button"
          disabled={save.isPending}
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
    </CardContent>
  );
}

/**
 * The staff notification preferences card — a section of `/app/account` (user-scoped, like the
 * rest of that page). Same seeded-form rules as the citizen preferences page.
 */
export function NotificationSettingsCard() {
  const prefs = useQuery(notificationPreferencesQueryOptions());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification settings</CardTitle>
        <CardDescription>Choose how you hear about activity in your workspaces.</CardDescription>
      </CardHeader>
      {prefs.isSuccess ? (
        <PreferencesForm initial={prefs.data} />
      ) : prefs.isError ? (
        <CardContent>
          <p className="text-sm text-destructive" role="alert">
            Notification settings are temporarily unavailable.
          </p>
        </CardContent>
      ) : (
        <CardContent>
          <Skeleton className="h-56 w-full" />
        </CardContent>
      )}
    </Card>
  );
}
