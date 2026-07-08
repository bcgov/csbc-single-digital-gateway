import { Outlet, createFileRoute, notFound } from '@tanstack/react-router';

export const Route = createFileRoute('/dev')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw notFound();
    }
  },
  component: () => <Outlet />,
});
