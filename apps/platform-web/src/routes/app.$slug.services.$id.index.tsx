import { createFileRoute, redirect } from '@tanstack/react-router';
import { serviceQueryOptions } from '@/lib/services';

/** `…/services/:id` redirects to the most recent version (`…/versions/:versionId`). */
export const Route = createFileRoute('/app/$slug/services/$id/')({
  loader: async ({ context, params }) => {
    const detail = await context.queryClient.ensureQueryData(serviceQueryOptions(params.id));
    const latest = detail.versions[detail.versions.length - 1];
    if (latest) {
      throw redirect({
        to: '/app/$slug/services/$id/versions/$versionId',
        params: { slug: params.slug, id: params.id, versionId: latest.id },
      });
    }
  },
  component: () => null,
});
