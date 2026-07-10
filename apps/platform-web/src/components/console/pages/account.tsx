import { Avatar, AvatarFallback } from '@repo/ui/avatar';
import { Button } from '@repo/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/card';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Skeleton } from '@repo/ui/skeleton';
import { NotificationSettingsCard } from '@/components/console/pages/notification-settings';
import { initials, roleLabel, useAuth } from '@/lib/auth';
import { displayName } from '@/lib/bff';

/** The signed-in user's account details, prefilled from `/auth/me`. Inputs are display-only in v1. */
export function AccountPage() {
  const { data: user } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-[760px]">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const name = displayName(user);
  const email = user.claims.email ?? '';
  const role = roleLabel(user.roles);

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal account details.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
            <div className="leading-tight">
              <div className="text-sm font-semibold">{name}</div>
              <div className="text-xs text-muted-foreground">
                {[email, role].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-name">Full name</Label>
              <Input id="account-name" key={user.id} defaultValue={name} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                key={`${user.id}-email`}
                defaultValue={email}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="ghost" type="button">
            Cancel
          </Button>
          <Button type="button">Save changes</Button>
        </CardFooter>
      </Card>
      <NotificationSettingsCard />
    </div>
  );
}
