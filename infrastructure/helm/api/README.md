# CSBC API Helm Chart

A production-ready Helm chart for deploying the CSBC NestJS API to OpenShift.

## Prerequisites

- Helm 3.x
- OpenShift CLI (oc)
- Access to an OpenShift cluster
- **Database chart must be deployed first** - The API chart references resources created by the database chart

### Database Chart Dependency

This chart requires the database chart to be deployed first. The database chart creates:

- **PostgreSQL Cluster**: Using Crunchy Postgres Operator
- **Service**: `csbc-single-digital-gateway-postgres-pgbouncer` (connection pooler)
- **Secret**: `csbc-single-digital-gateway-postgres-pguser-postgres` (contains database credentials)
- **Database**: `csbc-single-digital-gateway-postgres`
- **User**: `postgres`

The API chart automatically references these resources using sensible defaults.

## Port Architecture

The API uses a dual-port architecture for security:

**Port 4000 (http)**: Main API endpoints
- Exposed externally via OpenShift Route
- Handles all application traffic
- Accessible via the Route URL

**Port 9000 (health)**: Health check endpoints only
- Internal cluster access only
- Used by Kubernetes liveness and readiness probes
- Not exposed via Route
- Endpoints: `/health/live`, `/health/ready`

This architecture ensures health endpoints are not accessible from the internet while remaining available for Kubernetes probes and internal monitoring.

## Required Parameters

The following parameters **must** be provided during installation. The chart will fail with clear error messages if any are missing.

### Database Configuration

Database connection details now have sensible defaults that reference the database chart:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `app.database.name` | Database name | `csbc-single-digital-gateway-postgres` |
| `app.database.host` | Database host (pgBouncer service) | `csbc-single-digital-gateway-postgres-pgbouncer` |
| `app.database.user` | Database username | `postgres` |
| `app.database.secretName` | Secret containing password (from database chart) | `csbc-single-digital-gateway-postgres-pguser-postgres` |

**Note**: The chart automatically references the database secret created by the database chart. You do not need to provide database credentials manually.

### OIDC Configuration

| Parameter | Description | Example |
|-----------|-------------|---------|
| `app.oidc.issuer` | OIDC issuer URL | `https://sso-dev.apps.silver.devops.gov.bc.ca/auth/realms/csbc` |
| `app.oidc.jwksUri` | OIDC JWKS URI for JWT validation | `https://sso-dev.apps.silver.devops.gov.bc.ca/auth/realms/csbc/protocol/openid-connect/certs` |

### Database Secrets

Database credentials are managed by the database chart and automatically referenced:

- The database chart creates a secret: `csbc-single-digital-gateway-postgres-pguser-postgres`
- The API chart references this secret using `secretKeyRef` for the password
- No manual secret creation is required

## Installation

**IMPORTANT**: Deploy the database chart first before deploying the API chart.

### Development Environment

**Step 1: Deploy database chart**
```bash
helm upgrade --install database ./infrastructure/helm/database \
  --namespace csbc-dev \
  --create-namespace \
  -f ./infrastructure/helm/database/values.dev.yaml
```

**Step 2: Verify database resources**
```bash
# Verify secret exists
kubectl get secret csbc-single-digital-gateway-postgres-pguser-postgres -n csbc-dev

# Verify service exists
kubectl get service csbc-single-digital-gateway-postgres-pgbouncer -n csbc-dev
```

**Step 3: Deploy API chart**
```bash
helm upgrade --install api ./infrastructure/helm/api \
  --namespace csbc-dev \
  -f ./infrastructure/helm/api/values.dev.yaml \
  --set app.oidc.issuer=https://sso-dev.example.com/auth/realms/csbc \
  --set app.oidc.jwksUri=https://sso-dev.example.com/auth/realms/csbc/protocol/openid-connect/certs \
  --set route.host=api-dev.apps.example.com
```

**Note**: Database configuration is automatically set via defaults. Only OIDC and route parameters are required.

### Test Environment

```bash
# Deploy database chart first
helm upgrade --install database ./infrastructure/helm/database \
  --namespace csbc-test \
  --create-namespace \
  -f ./infrastructure/helm/database/values.test.yaml

# Deploy API chart
helm upgrade --install api ./infrastructure/helm/api \
  --namespace csbc-test \
  -f ./infrastructure/helm/api/values.test.yaml \
  --set app.oidc.issuer=https://sso-test.example.com/auth/realms/csbc \
  --set app.oidc.jwksUri=https://sso-test.example.com/auth/realms/csbc/protocol/openid-connect/certs \
  --set route.host=api-test.apps.example.com
```

### Production Environment

```bash
# Deploy database chart first
helm upgrade --install database ./infrastructure/helm/database \
  --namespace csbc-prod \
  -f ./infrastructure/helm/database/values.prod.yaml

# Deploy API chart
helm upgrade --install api ./infrastructure/helm/api \
  --namespace csbc-prod \
  -f ./infrastructure/helm/api/values.prod.yaml \
  --set image.tag=${IMAGE_TAG} \
  --set app.oidc.issuer=https://sso.example.com/auth/realms/csbc \
  --set app.oidc.jwksUri=https://sso.example.com/auth/realms/csbc/protocol/openid-connect/certs \
  --set route.host=api.example.com
```

**Note:** The production values file sets `app.database.ssl=true` by default.

## Validation

The chart includes built-in validation for required parameters. If any required parameter is missing, the deployment will fail with a clear error message:

```
VALIDATION ERRORS - Required values are missing:

  ❌ app.database.secretName is required. This should reference the secret created by the database chart.
  ❌ app.oidc.issuer is required. Please set the OIDC issuer URL.
  ❌ app.oidc.jwksUri is required. Please set the OIDC JWKS URI.
  ...
```


## Testing

### Lint the chart

```bash
helm lint ./infrastructure/helm/api \
  -f ./infrastructure/helm/api/values.dev.yaml \
  --set app.oidc.issuer=https://sso.example.com/realms/test \
  --set app.oidc.jwksUri=https://sso.example.com/realms/test/certs
```

**Note**: Database configuration now uses defaults, so no database parameters are required for testing.

### Render templates locally

```bash
helm template test ./infrastructure/helm/api \
  -f ./infrastructure/helm/api/values.dev.yaml \
  --set app.oidc.issuer=https://sso.example.com/realms/test \
  --set app.oidc.jwksUri=https://sso.example.com/realms/test/certs
```

### Dry-run installation

```bash
helm install test ./infrastructure/helm/api \
  --dry-run --debug \
  --namespace csbc-dev \
  -f ./infrastructure/helm/api/values.dev.yaml \
  --set app.oidc.issuer=https://sso.example.com/realms/test \
  --set app.oidc.jwksUri=https://sso.example.com/realms/test/certs
```

## Configuration

### Common Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` (1 in dev, 3 in prod) |
| `image.registry` | Container registry | `ghcr.io` |
| `image.repository` | Image repository | `bcgov/csbc-single-digital-gateway/api` |
| `image.tag` | Image tag | `""` (uses appVersion) |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `app.port` | Application port | `4000` |
| `app.nodeEnv` | Node environment | `production` |
| `app.database.name` | Database name | `csbc-single-digital-gateway-postgres` |
| `app.database.host` | Database host | `csbc-single-digital-gateway-postgres-pgbouncer` |
| `app.database.port` | Database port | `5432` |
| `app.database.user` | Database user | `postgres` |
| `app.database.ssl` | Enable database SSL | `false` (true in test/prod) |
| `app.database.secretName` | Database secret name | `csbc-single-digital-gateway-postgres-pguser-postgres` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `256Mi` |
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `route.enabled` | Enable OpenShift Route | `true` |
| `route.host` | Route hostname | `""` (auto-generated) |
| `route.tls.enabled` | Enable TLS | `true` |
| `route.tls.termination` | TLS termination type | `edge` |

### Environment-Specific Values Files

The chart includes three environment-specific values files:

- **values.dev.yaml** - Development environment (1 replica, reduced resources)
- **values.test.yaml** - Test environment (2 replicas, standard resources)
- **values.prod.yaml** - Production environment (3 replicas, increased resources, existing secret)

## Health Checks

The deployment includes both liveness and readiness probes:

- **Liveness Probe**: `/health/live` - Simple check to restart unhealthy pods
- **Readiness Probe**: `/health/ready` - Checks database and OIDC connectivity before routing traffic

## Security

The chart follows security best practices and is OpenShift-compatible:

- ✅ Non-root user (automatically assigned by OpenShift)
- ✅ Compatible with OpenShift's `restricted-v2` Security Context Constraint (SCC)
- ✅ UIDs/GIDs automatically assigned from namespace range
- ✅ Drop all Linux capabilities
- ✅ No privilege escalation
- ✅ Secrets separated from configuration
- ✅ TLS enabled by default

**OpenShift Compatibility**: The chart does not hardcode user IDs or group IDs. OpenShift automatically assigns UIDs/GIDs from the namespace's allowed range, ensuring compatibility with Security Context Constraints.

## Deployment Strategy

The chart uses a rolling update strategy:

- `maxSurge: 1` - One additional pod during updates
- `maxUnavailable: 0` - Zero downtime deployments

Pods are automatically restarted when ConfigMap changes are detected (via checksum annotations).

**Note**: Pods will NOT automatically restart on database secret changes since the secret is managed externally by the database chart. For password rotation, manually restart pods using:

```bash
kubectl rollout restart deployment/api -n <namespace>
```

For automatic secret rotation support, consider using tools like [Reloader](https://github.com/stakater/Reloader).

## Troubleshooting

### Check deployment status

```bash
oc get deployment api -n csbc-dev
oc get pods -l app.kubernetes.io/name=api -n csbc-dev
```

### View logs

```bash
oc logs -l app.kubernetes.io/name=api -n csbc-dev --follow
```

### Get route URL

```bash
export ROUTE_URL=$(oc get route api -n csbc-dev -o jsonpath='{.spec.host}')
echo "Application URL: https://$ROUTE_URL"
```

### Test health endpoints

```bash
curl https://$ROUTE_URL/health/live
curl https://$ROUTE_URL/health/ready
```

### Validation errors

If you see validation errors, ensure all required parameters are provided:

```bash
# Check what values will be used
helm get values api -n csbc-dev

# Update with missing values (typically only OIDC config needed)
helm upgrade api ./infrastructure/helm/api \
  -n csbc-dev \
  -f ./infrastructure/helm/api/values.dev.yaml \
  --set app.oidc.issuer=https://sso-dev.example.com/auth/realms/csbc \
  --set app.oidc.jwksUri=https://sso-dev.example.com/auth/realms/csbc/protocol/openid-connect/certs
```

### Database connection issues

If the API cannot connect to the database:

```bash
# Verify database chart is deployed
helm list -n csbc-dev | grep database

# Verify database secret exists
kubectl get secret csbc-single-digital-gateway-postgres-pguser-postgres -n csbc-dev

# Verify database service exists
kubectl get service csbc-single-digital-gateway-postgres-pgbouncer -n csbc-dev

# Check API pod logs for connection errors
kubectl logs -l app.kubernetes.io/name=api -n csbc-dev --tail=50
```

## Uninstall

```bash
helm uninstall api --namespace csbc-dev
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
