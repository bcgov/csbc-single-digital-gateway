# CSBC Web Helm Chart

A production-ready Helm chart for deploying the CSBC Web Application to OpenShift.

## Prerequisites

- Helm 3.x
- OpenShift CLI (oc)
- Access to an OpenShift cluster
- Prebuilt container image available in GitHub Container Registry (ghcr.io)

## Required Parameters

The following parameters **must** be provided during installation. The chart will fail with clear error messages if any are missing.

### Application Configuration

| Parameter | Description | Example |
|-----------|-------------|---------|
| `app.apiUri` | Backend API URI | `https://api-dev.apps.example.com` |
| `app.oidc.issuer` | OIDC issuer URL | `https://sso-dev.apps.silver.devops.gov.bc.ca/auth/realms/csbc` |
| `app.oidc.clientId` | OIDC client ID | `csbc-web` |
| `app.oidc.redirectUri` | OIDC redirect URI after login | `https://web-dev.apps.example.com/callback` |
| `app.oidc.postLogoutRedirectUri` | OIDC redirect URI after logout | `https://web-dev.apps.example.com` |

## Installation

### Development Environment

```bash
helm upgrade --install web ./infrastructure/helm/web \
  --namespace csbc-dev \
  --create-namespace \
  -f ./infrastructure/helm/web/values.dev.yaml \
  --set app.apiUri=https://api-dev.apps.example.com \
  --set app.oidc.issuer=https://sso-dev.example.com/auth/realms/csbc \
  --set app.oidc.clientId=csbc-web \
  --set app.oidc.redirectUri=https://web-dev.apps.example.com/callback \
  --set app.oidc.postLogoutRedirectUri=https://web-dev.apps.example.com \
  --set route.host=web-dev.apps.example.com
```

### Test Environment

```bash
helm upgrade --install web ./infrastructure/helm/web \
  --namespace csbc-test \
  -f ./infrastructure/helm/web/values.test.yaml \
  --set app.apiUri=https://api-test.apps.example.com \
  --set app.oidc.issuer=https://sso-test.example.com/auth/realms/csbc \
  --set app.oidc.clientId=csbc-web \
  --set app.oidc.redirectUri=https://web-test.apps.example.com/callback \
  --set app.oidc.postLogoutRedirectUri=https://web-test.apps.example.com \
  --set route.host=web-test.apps.example.com
```

### Production Environment

```bash
helm upgrade --install web ./infrastructure/helm/web \
  --namespace csbc-prod \
  -f ./infrastructure/helm/web/values.prod.yaml \
  --set image.tag=${IMAGE_TAG} \
  --set app.apiUri=https://api.example.com \
  --set app.oidc.issuer=https://sso.example.com/auth/realms/csbc \
  --set app.oidc.clientId=csbc-web \
  --set app.oidc.redirectUri=https://web.example.com/callback \
  --set app.oidc.postLogoutRedirectUri=https://web.example.com \
  --set route.host=web.example.com
```

## Validation

The chart includes built-in validation for required parameters. If any required parameter is missing, the deployment will fail with a clear error message:

```
VALIDATION ERRORS - Required values are missing:

  - app.oidc.issuer is required. Please set the OIDC issuer URL.
  - app.oidc.clientId is required. Please set the OIDC client ID.
  ...
```

## Testing

### Lint the chart

```bash
helm lint ./infrastructure/helm/web \
  -f ./infrastructure/helm/web/values.dev.yaml \
  --set app.apiUri=https://api.example.com \
  --set app.oidc.issuer=https://sso.example.com/realms/test \
  --set app.oidc.clientId=test-client \
  --set app.oidc.redirectUri=https://web.example.com/callback \
  --set app.oidc.postLogoutRedirectUri=https://web.example.com
```

### Render templates locally

```bash
helm template test ./infrastructure/helm/web \
  -f ./infrastructure/helm/web/values.dev.yaml \
  --set app.apiUri=https://api.example.com \
  --set app.oidc.issuer=https://sso.example.com/realms/test \
  --set app.oidc.clientId=test-client \
  --set app.oidc.redirectUri=https://web.example.com/callback \
  --set app.oidc.postLogoutRedirectUri=https://web.example.com
```

### Dry-run installation

```bash
helm install test ./infrastructure/helm/web \
  --dry-run --debug \
  --namespace csbc-dev \
  -f ./infrastructure/helm/web/values.dev.yaml \
  --set app.apiUri=https://api.example.com \
  --set app.oidc.issuer=https://sso.example.com/realms/test \
  --set app.oidc.clientId=test-client \
  --set app.oidc.redirectUri=https://web.example.com/callback \
  --set app.oidc.postLogoutRedirectUri=https://web.example.com
```

## Configuration

### Common Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` (1 in dev, 3 in prod) |
| `image.registry` | Container registry | `ghcr.io` |
| `image.repository` | Image repository | `bcgov/csbc-single-digital-gateway/web` |
| `image.tag` | Image tag | `""` (uses appVersion) |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `app.port` | Application port | `80` |
| `app.appName` | Application name displayed in UI | `CSBC Single Digital Gateway` |
| `app.apiUri` | Backend API URI | `""` (required) |
| `resources.requests.cpu` | CPU request | `50m` |
| `resources.requests.memory` | Memory request | `128Mi` |
| `resources.limits.cpu` | CPU limit | `250m` |
| `resources.limits.memory` | Memory limit | `256Mi` |
| `route.enabled` | Enable OpenShift Route | `true` |
| `route.host` | Route hostname | `""` (auto-generated) |
| `route.tls.enabled` | Enable TLS | `true` |
| `route.tls.termination` | TLS termination type | `edge` |

### Environment-Specific Values Files

The chart includes three environment-specific values files:

- **values.dev.yaml** - Development environment (1 replica, reduced resources)
- **values.test.yaml** - Test environment (2 replicas, standard resources)
- **values.prod.yaml** - Production environment (3 replicas, increased resources)

## Security

The chart follows security best practices and is OpenShift-compatible:

- Non-root user (automatically assigned by OpenShift)
- Compatible with OpenShift's `restricted-v2` Security Context Constraint (SCC)
- UIDs/GIDs automatically assigned from namespace range
- Drop all Linux capabilities
- No privilege escalation
- TLS enabled by default

## Deployment Strategy

The chart uses a rolling update strategy:

- `maxSurge: 1` - One additional pod during updates
- `maxUnavailable: 0` - Zero downtime deployments

Pods are automatically restarted when ConfigMap changes are detected (via checksum annotations).

## Troubleshooting

### Check deployment status

```bash
oc get deployment web -n csbc-dev
oc get pods -l app.kubernetes.io/name=web -n csbc-dev
```

### View logs

```bash
oc logs -l app.kubernetes.io/name=web -n csbc-dev --follow
```

### Get route URL

```bash
export ROUTE_URL=$(oc get route web -n csbc-dev -o jsonpath='{.spec.host}')
echo "Application URL: https://$ROUTE_URL"
```

### Validation errors

If you see validation errors, ensure all required parameters are provided:

```bash
# Check what values will be used
helm get values web -n csbc-dev

# Update with missing values
helm upgrade web ./infrastructure/helm/web \
  -n csbc-dev \
  -f ./infrastructure/helm/web/values.dev.yaml \
  --set app.apiUri=https://api.example.com \
  --set app.oidc.issuer=https://sso.example.com/auth/realms/csbc \
  --set app.oidc.clientId=csbc-web \
  --set app.oidc.redirectUri=https://web.example.com/callback \
  --set app.oidc.postLogoutRedirectUri=https://web.example.com
```

## Uninstall

```bash
helm uninstall web --namespace csbc-dev
```

## Contributing

When modifying the chart:

1. Update the version in `Chart.yaml`
2. Test with `helm lint`
3. Test with `helm template` and `--dry-run`
4. Update this README if adding new parameters
5. Test deployment to development environment

## Support

For issues or questions, please create an issue in the repository.
