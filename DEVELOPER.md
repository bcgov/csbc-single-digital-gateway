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
| API_OIDC_ISSUER | OIDC issuer URL for API |
| API_OIDC_JWKS_URI | OIDC JWKS URI for API |

Web-specific:

| Variable | Description |
| -------- | ----------- |
| WEB_OIDC_ISSUER | OIDC issuer URL for Web |
| WEB_OIDC_CLIENT_ID | OIDC client ID for Web |
| WEB_BASE_URL | Web route hostname |
| WEB_CONSENT_MANAGER_API_URL | Consent Manager API URL |
| WEB_SERVICE_CATALOGUE_API_URL | Service Catalogue API URL |

Note: Variables use vars.* syntax in workflows, secrets use secrets.*

The redirect URIs are constructed from WEB_BASE_URL:
- redirectUri = https://${WEB_BASE_URL}/callback
- postLogoutRedirectUri = https://${WEB_BASE_URL}/

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
- [./packages/ui/DEVELOPER.md](./packages/ui/DEVELOPER.md)