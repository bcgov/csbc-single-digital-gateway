import type { ServiceDeletable } from '../dtos/service.dtos';

/** The refusal `ServicesService.remove` throws — one wording, so the API and the console never disagree. */
export const SERVICE_HAS_SUBMISSIONS =
  'This service has submissions — archive it instead of deleting it';

/**
 * Doc 230 (the doc 225 contract): what may be deleted from a service's edit page, and why not.
 *
 * It restates the two write paths' own guards, so the console renders exactly what the endpoints accept:
 * `remove` refuses a service with submissions, and `discardVersion` takes only a DRAFT and never the
 * last version. Pure — the caller already holds both inputs from building the detail.
 */
export function deletableFor(
  versions: readonly { readonly id: string; readonly status: string }[],
  hasSubmissions: boolean,
): ServiceDeletable {
  const versionIds =
    versions.length > 1 ? versions.filter((v) => v.status === 'draft').map((v) => v.id) : [];
  return hasSubmissions
    ? { service: false, reason: SERVICE_HAS_SUBMISSIONS, versionIds }
    : { service: true, versionIds };
}
