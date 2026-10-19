import { mdiLogin } from '@mdi/js';
import { Icon } from '@mdi/react';
import { buttonVariants } from '@repo/ui/button';
import { MessageCard } from '@/components/layout/message-card';
import { useLoginUrl } from '@/lib/auth';

/**
 * The signed-out state of a login-gated page: why sign-in is needed, plus a "Log in" link that
 * returns the citizen to this URL afterwards. Place it inside {@link PageContent}.
 */
export function LoginGate({
  message,
  label = 'Log in',
}: {
  /** e.g. "You need to be signed in to view your account." */
  message: string;
  label?: string;
}) {
  const loginUrl = useLoginUrl();
  return (
    <MessageCard
      actions={
        <a href={loginUrl} className={buttonVariants({ variant: 'default', size: 'default' })}>
          <Icon path={mdiLogin} aria-hidden={true} />
          {label}
        </a>
      }
    >
      {message}
    </MessageCard>
  );
}
