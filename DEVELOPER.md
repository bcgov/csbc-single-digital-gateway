# CSBC Single Digital Gateway Developer Docs

## Configuration

1. Follow the configuration steps in the [api application](./apps/api/DEVELOPER.md)
2. Follow the configuration steps in the [web application](./apps/web/DEVELOPER.md)

## Development

Use docker to bootstrap the development environment.

```sh
docker compose \
    --env-file=./apps/api/.env \
    -f compose.yaml \
    up -d
```

Once complete, run the application.

```sh
# Run all apps at once
npm run dev

# Run apps independently
npm run dev -- --filter=api
npm run dev -- --filter=web
```

## Test Deployment

Test the production Dockerfiles using the following command.

```sh
docker compose
    --env-file=./apps/api/.env
    --env-file=./apps/web/.env
    -f compose.yaml
    -f compose.prod.yaml
    up -d
```

## Deploy

GitHub Environments & Configuration

Create three GitHub environments in Settings → Environments:
- development
- staging
- production

Secrets (per environment)

| Secret | Description |
| ------ | ----------- |
| OPENSHIFT_TOKEN | Service account token (sensitive) |
| API_OIDC_CLIENT_SECRET | BCSC OIDC client secret |
| API_AUTH_OIDC_CLIENT_SECRET | IDIR OIDC client secret |
| API_SESSION_SECRET | Session cookie signing secret |

Variables (per environment)

Common:

| Variable | Description |
| -------- | ----------- |
| OPENSHIFT_SERVER | OpenShift API URL |
| OPENSHIFT_NAMESPACE | Target namespace |

API-specific:

| Variable | Description |
| -------- | ----------- |
| API_BASE_URL | API route hostname (used to construct redirect URIs) |
| API_OIDC_ISSUER | BCSC OIDC issuer URL |
| API_OIDC_CLIENT_ID | BCSC OIDC confidential client ID |
| API_OIDC_CLIENT_AUTH_METHOD | BCSC OIDC client auth method (e.g. `client_secret_post`) |
| API_AUTH_OIDC_ISSUER | IDIR OIDC issuer URL |
| API_AUTH_OIDC_CLIENT_ID | IDIR OIDC confidential client ID |
| API_AUTH_OIDC_CLIENT_AUTH_METHOD | IDIR OIDC client auth method (e.g. `client_secret_post`) |

Note: OIDC redirect URIs are constructed automatically from `API_BASE_URL` (e.g. `https://{API_BASE_URL}/auth/bcsc/callback`). Post-logout redirect URIs are constructed from `WEB_BASE_URL`.

Web-specific:

| Variable | Description |
| -------- | ----------- |
| WEB_BASE_URL | Web route hostname (also used to construct frontend/admin URLs) |
| WEB_AUTH_URL | Direct API URL for auth redirects |

Note: Variables use vars.* syntax in workflows, secrets use secrets.*

Getting the OpenShift Token

# Create a service account for CI/CD
oc create sa github-actions -n <namespace>

# Grant edit role (allows helm deploy)
oc policy add-role-to-user edit -z github-actions -n <namespace>

# Get the token (valid for 1 year)
oc create token github-actions -n <namespace> --duration=8760h

## Additional Documentation

For app-specific documentation, see the following files:
- [./apps/api/DEVELOPER.md](./apps/api/DEVELOPER.md)
- [./apps/web/DEVELOPER.md](./apps/web/DEVELOPER.md)

For package-specific documentation, see the following files:
- [./packages/db/DEVELOPER.md](./packages/db/DEVELOPER.md)
- [./packages/ui/DEVELOPER.md](./packages/ui/DEVELOPER.md)

For QA/Performance testing-specific documentation, see the following files:
- [./apps/api/tests/README.md](./apps/api/tests/README.md)
- [./apps/web/tests/README.md](./apps/web/tests/README.md)
- [./testings/cypress/README.md](./testings/cypress/README.md)
- [./testings/performance/README.md](./testings/performance/README.md)
