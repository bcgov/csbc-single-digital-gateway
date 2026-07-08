/**
 * The surfaces that host the shared Service Agreements components: the workspace console
 * (staff, workspace-scoped), the admin shell (admin, global), and — when editing an agreement
 * reached FROM a service — the `service` scope, which is a workspace edit whose "back" returns to
 * the service's agreements tab. The scope drives the list query, the create payload, and the
 * scope-aware navigation targets.
 */
export type AgreementScope =
  | { kind: 'workspace'; slug: string; workspaceId: string }
  | { kind: 'admin' }
  | {
      kind: 'service';
      slug: string;
      workspaceId: string;
      serviceId: string;
      /** The service version the agreement is edited under — its draft-ness gates editability. */
      serviceVersionId: string;
    };

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
