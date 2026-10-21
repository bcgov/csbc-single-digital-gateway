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

/**
 * The create payload for the scope: workspace agreements carry `workspaceId`; global omits it.
 *
 * Feature 217: create takes a TITLE, which the API stamps into the copied template's root label
 * (the generated title column reads exactly that path) — not a `data` bag of filled values.
 */
export function createPayloadFor(
  scope: AgreementScope,
  title: string,
): { workspaceId?: string; title: string } {
  return scope.kind === 'admin' ? { title } : { workspaceId: scope.workspaceId, title };
}
