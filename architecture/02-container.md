# C4 — Container Diagram

Each audience gets its own **SPA + BFF** pair (structurally identical, differ only by
config). Both BFFs share `@repo/nestjs` and the same Postgres via `@repo/database`.
A separate **notification-service** owns its own Postgres. Tokens never reach the
browser — only an httpOnly session cookie backed by **Valkey**.

```mermaid
C4Container
    title Container Diagram — Single Digital Gateway

    Person(citizen, "Citizen")
    Person(staff, "Staff / Admin")

    System_Boundary(sdg, "Single Digital Gateway") {
        Container(citizenWeb, "citizen-portal-web", "React 19 + Vite SPA (nginx)", "Citizen catalogue & application UI. Port 3000")
        Container(platformWeb, "platform-web", "React 19 + Vite SPA (nginx)", "Staff console & admin shell. Port 3001")

        Container(citizenApi, "citizen-portal-api", "NestJS 11 BFF", "Public catalogue + /me application lifecycle. Port 4000")
        Container(platformApi, "platform-api", "NestJS 11 BFF", "Workspaces, services, forms, reviews, admin. Port 4001")
        Container(notifSvc, "notification-service", "NestJS 11 (m2m only)", "Notification inbox/outbox + email worker. Port 4002")

        ContainerDb(mainDb, "Main Database", "PostgreSQL 16", "users, workspaces, documents (services/forms), submissions, reviews, consents")
        ContainerDb(notifDb, "Notifications Database", "PostgreSQL 16", "recipients, channel_preferences, notifications, deliveries")
        ContainerDb(valkey, "Session Store", "Valkey", "express-session store + user-session index for logout-everywhere")
    }

    System_Ext(keycloak, "Keycloak", "OIDC — realms 'sdg' & 'citizens', plus m2m clients")
    System_Ext(email, "Email Provider", "Transactional email")

    Rel(citizen, citizenWeb, "Uses", "HTTPS")
    Rel(staff, platformWeb, "Uses", "HTTPS")

    Rel(citizenWeb, citizenApi, "API + auth proxy (same-origin)", "JSON/HTTPS")
    Rel(platformWeb, platformApi, "API + auth proxy (same-origin)", "JSON/HTTPS")

    Rel(citizenApi, mainDb, "Reads/writes", "SQL (Drizzle/pg)")
    Rel(platformApi, mainDb, "Reads/writes", "SQL (Drizzle/pg)")
    Rel(citizenApi, valkey, "Sessions", "RESP")
    Rel(platformApi, valkey, "Sessions", "RESP")

    Rel(citizenApi, keycloak, "OIDC login/refresh (citizens realm)", "HTTPS")
    Rel(platformApi, keycloak, "OIDC login/refresh (sdg realm)", "HTTPS")

    Rel(citizenApi, notifSvc, "Enqueue notifications (m2m)", "JSON/HTTPS + Bearer")
    Rel(platformApi, notifSvc, "Enqueue notifications (m2m)", "JSON/HTTPS + Bearer")
    Rel(notifSvc, keycloak, "Validates m2m tokens (JWKS, aud check)", "HTTPS")
    Rel(notifSvc, notifDb, "Reads/writes", "SQL (Drizzle/pg)")
    Rel(notifSvc, email, "Drains email outbox", "SMTP/API")

    Rel(notifSvc, mainDb, "LISTEN pg NOTIFY (real-time feed)", "SQL")
    Rel(citizenWeb, citizenApi, "SSE feed (EventSource)", "text/event-stream")
    Rel(platformWeb, platformApi, "SSE feed (EventSource)", "text/event-stream")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Containers

| Container                  | Tech                                               | Responsibility                                                                                                                             |
| -------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **platform-web**           | React 19, Vite, TanStack Router/Query, Tailwind v4 | Staff console (`/app` workspace-scoped) + admin shell (`/admin`). Consumes `@repo/ui` + `@repo/react`.                                     |
| **citizen-portal-web**     | React 19, Vite, TanStack                           | Public service catalogue + `/me` application flow.                                                                                         |
| **platform-api**           | NestJS 11, CJS, SWC                                | Staff BFF: workspaces, services/forms authoring, reviews, service agreements, admin. OIDC BFF session against `sdg` realm.                 |
| **citizen-portal-api**     | NestJS 11                                          | Citizen BFF: `@Public` catalogue + auth-only `/me/applications` lifecycle, server-side submit validation (Ajv).                            |
| **notification-service**   | NestJS 11 (m2m only)                               | Server-to-server notification ingestion (idempotent inbox), per-channel fan-out (outbox), in-app feed + email worker. No browser sessions. |
| **Main Database**          | PostgreSQL 16 + Drizzle                            | Shared staff/citizen data. Layered drizzle-kit migrations; generated status columns; composite-FK cross-table enforcement.                 |
| **Notifications Database** | PostgreSQL 16 + Drizzle                            | Isolated notification store; `user_id` is an opaque uuid (no cross-DB FK).                                                                 |
| **Session Store**          | Valkey                                             | `connect-redis` session store; per-app key prefix (`sdg:` / `cpa:`) + user-session index for logout-everywhere.                            |
