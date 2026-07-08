/**
 * Whether the current viewer may edit an agreement version. A global agreement is admin-only; a
 * version must be a draft; and — when the agreement is reached FROM a service (service scope) — its
 * owning service version must also be a draft (the agreement follows the service's lifecycle). The
 * server (`ServiceAgreementsService.updateDraft`) is the authoritative enforcement point.
 */
export function canEditAgreementVersion(params: {
  versionStatus: string | undefined;
  isGlobal: boolean;
  isAdmin: boolean;
  serviceScope: boolean;
  serviceVersionIsDraft: boolean;
}): boolean {
  if (params.versionStatus !== 'draft') return false;
  if (params.isGlobal && !params.isAdmin) return false;
  if (params.serviceScope && !params.serviceVersionIsDraft) return false;
  return true;
}
