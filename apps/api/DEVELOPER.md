# API Developer Docs

## Configuration

Copy the example env file and fill in the values:

```sh
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `NODE_ENV` | `development` or `production` | `development` |
| `PORT` | Main API server port | `4000` |
| `HEALTH_PORT` | Health check server port | `9000` |
| `DB_NAME` | PostgreSQL database name | — |
| `DB_HOST` | PostgreSQL host | — |
| `DB_PORT` | PostgreSQL port | — |
| `DB_USER` | PostgreSQL user | — |
| `DB_PASS` | PostgreSQL password | — |
| `DB_SSL` | Enable SSL (`true`/`false`) | — |
| `OIDC_ISSUER` | OIDC provider issuer URL (e.g. Keycloak realm) | — |
| `OIDC_CLIENT_ID` | OIDC confidential client ID | — |
| `OIDC_CLIENT_SECRET` | OIDC client secret | — |
| `OIDC_REDIRECT_URI` | OAuth callback URL (e.g. `http://localhost:4000/auth/callback`) | — |
| `OIDC_POST_LOGOUT_REDIRECT_URI` | Redirect after logout (e.g. `http://localhost:5173`) | — |
| `SESSION_SECRET` | Secret for signing session cookies | — |
| `FRONTEND_URL` | Frontend origin for CORS and redirects (e.g. `http://localhost:5173`) | — |
| `CONSENT_MANAGER_API_URL` | Consent Manager API base URL (optional) | — |

Database env vars (`DB_*`) are also documented in the [`@repo/db` package](../../packages/db/DEVELOPER.md).

## Database

Database client, schema, and migration tooling are provided by the [`@repo/db`](../../packages/db/DEVELOPER.md) package. See that package's documentation for scripts and environment variables.

Sessions are stored in PostgreSQL via `connect-pg-simple` (the `session` table is created automatically).

## Authentication

The API implements a **BFF (Backend-For-Frontend)** authentication pattern using `openid-client` v6.

### How It Works

1. **Login** — `GET /auth/login` redirects the user to the OIDC provider with PKCE. An optional `?returnTo=` query parameter controls where to redirect after login.
2. **Callback** — `GET /auth/callback` exchanges the authorization code for tokens and stores them in the server-side session.
3. **Session** — Tokens (access, refresh, ID) and the user profile are stored in an encrypted server-side session cookie (`connect.sid`).
4. **Token Refresh** — The `AuthGuard` automatically refreshes expired access tokens using the refresh token.
5. **Logout** — `POST /auth/logout` destroys the session and returns the OIDC end-session URL.
6. **User Profile** — `GET /auth/me` returns the authenticated user's profile from the session.

### Auth Guard (Dual Mode)

The global `AuthGuard` supports two authentication methods:

- **Session cookies** (primary) — Used by the web frontend via the BFF flow.
- **Bearer JWT** (fallback) — Used by Postman, machine-to-machine clients, or external consumers. Tokens are verified against the OIDC provider's JWKS endpoint.

Routes can be made public using the `@PublicRoute()` decorator.

### CSRF Protection

State-changing requests (POST, PUT, DELETE, PATCH) are protected by Double Submit Cookie via `csrf-csrf`. The frontend must:

1. Read the `csrf-token` cookie value.
2. Send it in the `X-CSRF-Token` header on mutating requests.

The `/auth/callback` route is exempt from CSRF checks.
