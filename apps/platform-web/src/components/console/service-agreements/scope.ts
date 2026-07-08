/**
 * The two surfaces that host the shared Service Agreements components: the workspace console
 * (staff, workspace-scoped) and the admin shell (admin, global). The scope drives the list query
 * (`?workspaceId=` vs none), the create payload (`workspaceId` present vs omitted → global), and
 * the scope-aware navigation targets in the components.
 */
export type AgreementScope =
  | { kind: 'workspace'; slug: string; workspaceId: string }
  | { kind: 'admin' };

/** The workspaceId to list by: the workspace's id, or null for the global (admin) surface. */
export function scopeWorkspaceId(scope: AgreementScope): string | null {
  return scope.kind === 'workspace' ? scope.workspaceId : null;
}

/** The create payload for the scope: workspace agreements carry `workspaceId`; global omits it. */
export function createPayloadFor(
  scope: AgreementScope,
  data: Record<string, unknown>,
): { workspaceId?: string; data: Record<string, unknown> } {
  return scope.kind === 'workspace' ? { workspaceId: scope.workspaceId, data } : { data };
}
