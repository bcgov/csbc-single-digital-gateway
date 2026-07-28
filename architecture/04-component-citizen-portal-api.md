# C4 — Component Diagram: citizen-portal-api (Citizen BFF)

The citizen BFF is **workspace-free to the caller**. The organizing principle is the
public/private split: `/v1/services*` is the `@Public` catalogue; `/v1/me/applications*`
is auth-only and `@CurrentUser`-scoped. It reuses the same `@repo/nestjs` cross-cutting
stack as platform-api (auth/guard chain/health/logger omitted here for focus).

```mermaid
C4Component
    title Component Diagram — citizen-portal-api

    Container(web, "citizen-portal-web", "React SPA", "Same-origin API + auth proxy")
    ContainerDb(db, "Main Database", "PostgreSQL 16")
    System_Ext(keycloak, "Keycloak (citizens realm)", "OIDC")
    Container(notif, "notification-service", "NestJS", "m2m")

    Container_Boundary(api, "citizen-portal-api") {
        Component(guards, "Global Guard Chain", "@repo/nestjs/auth", "CSRF → Auth → TokenRefresh (same as platform-api)")

        Component(catalog, "Catalogue Module", "NestJS feature", "@Public: published services, service detail + form refs, version reads, form-to-fill")
        Component(catalogSvc, "CatalogService", "Service", "Reads published documents across all workspaces; returns bound schema/uischema")

        Component(meApps, "My Applications Module", "NestJS feature", "@CurrentUser-scoped: get-or-create draft, resume, save, submit, list")
        Component(subSvc, "SubmissionService", "Service", "Draft lifecycle; formVersionId in body, not path")
        Component(validator, "Submit Validator", "Ajv + ajv-formats", "Validates submitted data vs schema(s) on submit → 422; drafts never validated")
    }

    Rel(web, guards, "Requests", "JSON/HTTPS")
    Rel(guards, catalog, "Public + authorized requests", "")
    Rel(guards, meApps, "Auth-only requests", "")

    Rel(catalog, catalogSvc, "", "")
    Rel(catalogSvc, db, "Read published services/forms", "SQL")

    Rel(meApps, subSvc, "", "")
    Rel(meApps, validator, "Validate on submit", "")
    Rel(subSvc, db, "Read/write submissions (own only → 404)", "SQL")

    Rel(guards, keycloak, "OIDC login/refresh", "HTTPS")
    Rel(meApps, notif, "Enqueue submission notifications (m2m)", "HTTPS")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Notes

- **Public vs private is the auth boundary.** The catalogue never surfaces a
  `workspace_id`; private writes hang off `/me`, not the public `services` tree.
- **Server is the real validator.** Client-side gating is best-effort; drafts are
  intentionally partial and only `submit` runs Ajv against the form's schema(s)
  (basic = one schema; multi-stage = every page's schema) → 422 on failure.
