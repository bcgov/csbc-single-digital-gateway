import { createFileRoute } from '@tanstack/react-router';
import { NewServiceModal } from '@/components/console/services/new-service-modal';
import { ServicesList } from '@/components/console/services/services-list';

/** `/services/new` shows the services list with the "New service" modal open over it. */
function NewService() {
  return (
    <>
      <ServicesList />
      <NewServiceModal />
    </>
  );
}

export const Route = createFileRoute('/app/$slug/services/new')({
  component: NewService,
});
