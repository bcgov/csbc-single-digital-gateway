import { createFileRoute, redirect } from '@tanstack/react-router';
import { ServiceVersionPage } from '@/components/service-version-page';
import { getService } from '@/lib/catalog';

export const Route = createFileRoute('/services/$serviceId/versions/$versionId')({
  // The current published version has no historical page — redirect it to the canonical service URL.
  beforeLoad: async ({ params }) => {
    const service = await getService(params.serviceId).catch(() => null);
    if (service?.publishedVersionId === params.versionId) {
      throw redirect({
        to: '/services/$serviceId',
        params: { serviceId: params.serviceId },
        replace: true,
      });
    }
  },
  component: ServiceVersionPage,
});
