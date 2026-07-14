import { buttonVariants } from '@repo/ui/button';
import { mdiLogin } from '@mdi/js';
import { Icon } from '@mdi/react';
import {
  Card,
  CardContent,
  CardIconAction,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@repo/ui/card';
import { useLoginUrl } from '@/lib/auth';

/** The "Log in to get started" call-to-action panel on the anonymous landing page. */
export function LoginCta() {
  const loginUrl = useLoginUrl();
  return (
    <section>
      <Card centered className="border-b-2 border-bcgov-gold bg-linear-to-t from-blue-10 to-white">
        <CardIconAction>
          <Icon path={mdiLogin} size="32px" className="text-blue-80" aria-hidden={true} />
        </CardIconAction>
        <CardHeader>
          <CardTitle>Log in to get started</CardTitle>
          <CardDescription>Log in to apply for services and manage your requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href={loginUrl} className={buttonVariants({ variant: 'default', size: 'default' })}>
            <Icon path={mdiLogin} size="16px" />
            Log in with BC Services Card Account
          </a>
        </CardContent>
      </Card>
    </section>
  );
}
