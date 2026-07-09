/**
 * The surfaces that host the shared Service Agreements components: the workspace console
 * (staff, workspace-scoped) and the admin shell (admin, global). The scope drives the list query,
 * the create payload, and the scope-aware navigation targets. Agreements are authored here — never
 * "under" a service (initiative shared-service-agreements).
 */
export type AgreementScope =
  | { kind: 'workspace'; slug: string; workspaceId: string }
  | { kind: 'admin' };

/** The workspaceId to list by: the workspace's id, or null for the global (admin) surface. */
export function scopeWorkspaceId(scope: AgreementScope): string | null {
  return scope.kind === 'admin' ? null : scope.workspaceId;
}

/** The create payload for the scope: workspace/service agreements carry `workspaceId`; global omits it. */
export function createPayloadFor(
  scope: AgreementScope,
  data: Record<string, unknown>,
): { workspaceId?: string; data: Record<string, unknown> } {
  return scope.kind === 'admin' ? { data } : { workspaceId: scope.workspaceId, data };
}
