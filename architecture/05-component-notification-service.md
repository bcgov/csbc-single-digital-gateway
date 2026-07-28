# C4 — Component Diagram: notification-service

A server-to-server app (no browser sessions). It ingests notifications into an
idempotent **inbox**, fans them out to a per-channel **outbox**, serves an in-app
feed, and drains an email worker. m2m tokens are validated against Keycloak with a
**mandatory audience** check.

```mermaid
C4Component
    title Component Diagram — notification-service

    Container(platformApi, "platform-api", "NestJS BFF", "m2m client")
    Container(citizenApi, "citizen-portal-api", "NestJS BFF", "m2m client")
    ContainerDb(notifDb, "Notifications Database", "PostgreSQL 16")
    ContainerDb(mainDb, "Main Database", "PostgreSQL 16", "pg NOTIFY source")
    System_Ext(keycloak, "Keycloak (sdg realm, m2m)", "OIDC / JWKS")
    System_Ext(email, "Email Provider", "SMTP/API")

    Container_Boundary(svc, "notification-service") {
        Component(m2mGuard, "M2mAuthGuard", "@repo/nestjs/m2m-auth", "Global, protected-by-default. jose JWKS verify + mandatory 'notification-service' audience")
        Component(ingest, "Ingestion Controller", "NestJS", "Accepts notifications with producer idempotency_key")
        Component(fanout, "Fan-out Service", "Service", "Resolves recipients + channel_preferences; writes deliveries in one tx")
        Component(recipients, "Recipients Service", "Service", "Contact fields + per-channel opt-in; unknown = defaults")
        Component(feed, "Feed Controller", "NestJS", "In-app notification-center feed (read_at)")
        Component(emailWorker, "Email Worker", "Background", "Drains email deliveries outbox")
        Component(sse, "Real-time Bridge", "pg LISTEN", "Listens to pg NOTIFY → byte-pipes to BFF SSE")
    }

    Rel(platformApi, m2mGuard, "Enqueue (Bearer m2m)", "HTTPS")
    Rel(citizenApi, m2mGuard, "Enqueue (Bearer m2m)", "HTTPS")
    Rel(m2mGuard, keycloak, "Fetch JWKS / verify aud", "HTTPS")
    Rel(m2mGuard, ingest, "Authenticated requests", "")

    Rel(ingest, fanout, "", "")
    Rel(fanout, recipients, "Resolve recipient + prefs", "")
    Rel(fanout, notifDb, "Write inbox + outbox (tx)", "SQL")
    Rel(recipients, notifDb, "Read/write recipients", "SQL")

    Rel(feed, notifDb, "Read in-app deliveries", "SQL")
    Rel(emailWorker, notifDb, "Claim + mark email deliveries", "SQL")
    Rel(emailWorker, email, "Send", "SMTP/API")

    Rel(sse, mainDb, "LISTEN submission events", "SQL")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Notes

- **Users are never replicated.** `recipients.user_id` holds the shared `users.id`
  value as an opaque uuid — no FK, no cross-database join.
- **Inbox/outbox, no broker.** `notifications` is an append-only idempotent inbox
  (unique `idempotency_key`); `deliveries` is a per-channel outbox with a writable
  status state machine, pinned to its notification/recipient by composite FK.
- **Audience check is mandatory.** Issuer alone also matches staff login tokens, so
  the guard requires the `notification-service` audience specifically.
