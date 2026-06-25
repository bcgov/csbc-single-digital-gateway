import { createFileRoute } from '@tanstack/react-router';
import { AccountPage } from '@/components/console/pages/account';

export const Route = createFileRoute('/app/account')({
  component: AccountPage,
});
