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

Variables (per environment)

Common:

| Variable | Description |
| -------- | ----------- |
| OPENSHIFT_SERVER | OpenShift API URL |
| OPENSHIFT_NAMESPACE | Target namespace |

API-specific:

| Variable | Description |
| -------- | ----------- |
| API_OIDC_ISSUER | OIDC issuer URL |
| API_OIDC_CLIENT_ID | OIDC confidential client ID |
| API_OIDC_CLIENT_SECRET | OIDC client secret (use secrets.*) |
| API_OIDC_REDIRECT_URI | OAuth callback URL (e.g. `https://api.example.com/auth/callback`) |
| API_OIDC_POST_LOGOUT_REDIRECT_URI | Redirect after logout (e.g. `https://app.example.com`) |
| API_SESSION_SECRET | Session cookie signing secret (use secrets.*) |
| API_FRONTEND_URL | Frontend origin for CORS |
| API_CONSENT_MANAGER_API_URL | Consent Manager API URL (optional) |

Web-specific:

| Variable | Description |
| -------- | ----------- |
| WEB_BASE_URL | Web route hostname |
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