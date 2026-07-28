# C4 — Component Diagram: platform-api (Staff BFF)

Internal structure of the **platform-api** NestJS app. Cross-cutting concerns
(auth, health, logging) come from `@repo/nestjs`; feature modules live under
`src/modules/<feature>`. A chain of global guards enforces CSRF → auth → token
refresh on every request.

```mermaid
C4Component
    title Component Diagram — platform-api

    Container(web, "platform-web", "React SPA", "Same-origin API + auth proxy")
    ContainerDb(db, "Main Database", "PostgreSQL 16")
    ContainerDb(valkey, "Session Store", "Valkey")
    System_Ext(keycloak, "Keycloak (sdg realm)", "OIDC")
    Container(notif, "notification-service", "NestJS", "m2m")

    Container_Boundary(api, "platform-api") {
        Component(guards, "Global Guard Chain", "APP_GUARD", "CsrfGuard → AuthGuard (RBAC) → TokenRefreshGuard. Fail-closed, protected-by-default")
        Component(authMod, "Auth Module (BFF)", "@repo/nestjs/auth", "/auth login|callback|me|logout; OIDC PKCE; express-session; SessionRegistry")
        Component(health, "Health Module", "@repo/nestjs/health", "/health live + readiness (DB indicator)")
        Component(logger, "Logger", "@repo/nestjs/logger", "pino request logging + redaction")

        Component(workspaces, "Workspaces Module", "NestJS feature", "Workspaces, memberships, ownership transfer")
        Component(services, "Services Module", "NestJS feature", "Service documents, versions, publish, references")
        Component(forms, "Forms Module", "NestJS feature", "Form & multi-stage definitions")
        Component(reviews, "Reviews Module", "NestJS feature", "Submission review workflow (state machine)")
        Component(agreements, "Agreements Module", "NestJS feature", "Service agreements + consents")

        Component(userSync, "OidcUserSync", "AUTH_USER_SYNC port", "Persists users on first login; stamps role")
        Component(sessionReg, "ValkeySessionRegistry", "SessionRegistry port", "Tracks/revokes sessions (logout-everywhere)")
        Component(zod, "Zod Validation", "nestjs-zod", "ZodValidationPipe + Serializer + HttpExceptionFilter")
    }

    Rel(web, guards, "All requests pass through", "JSON/HTTPS")
    Rel(guards, authMod, "Delegates auth/session", "")
    Rel(guards, workspaces, "Authorized requests", "")
    Rel(guards, services, "Authorized requests", "")
    Rel(guards, forms, "Authorized requests", "")
    Rel(guards, reviews, "Authorized requests", "")
    Rel(guards, agreements, "Authorized requests", "")

    Rel(authMod, keycloak, "OIDC discovery/login/refresh", "HTTPS")
    Rel(authMod, userSync, "onSignIn(claims)", "")
    Rel(authMod, sessionReg, "track / revokeAll", "")
    Rel(authMod, valkey, "Session store", "RESP")
    Rel(sessionReg, valkey, "SADD / DEL user-sessions", "RESP")

    Rel(userSync, db, "Upsert user", "SQL")
    Rel(workspaces, db, "SQL", "Drizzle/pg")
    Rel(services, db, "SQL", "Drizzle/pg")
    Rel(forms, db, "SQL", "Drizzle/pg")
    Rel(reviews, db, "SQL", "Drizzle/pg")
    Rel(agreements, db, "SQL", "Drizzle/pg")

    Rel(reviews, notif, "Enqueue review notifications (m2m)", "HTTPS")
    Rel(health, db, "SELECT 1 (readiness)", "SQL")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Notes

- **Guard chain order matters:** `CsrfGuard` (Origin allowlist, opt-in) runs before
  `AuthGuard` (session → 401/403 by `@Roles`), which runs before `TokenRefreshGuard`
  (lazy, coalesced, rotation-aware; `invalid_grant` destroys the session).
- **Ports keep `@repo/database` out of `@repo/nestjs`:** the auth module calls back
  into app-provided `OidcUserSync` and `ValkeySessionRegistry` implementations.
- **Validation** is `nestjs-zod` globals (`APP_PIPE`/`APP_INTERCEPTOR`/`APP_FILTER`),
  with per-feature `createZodDto` classes; feature authz is per-resource in the service.
- `citizen-portal-api` has the **same** cross-cutting shape; its feature modules are
  the public `services` catalogue and the auth-only `/me/applications` lifecycle instead.
