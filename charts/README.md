# Single Digital Gateway — Helm charts

Helm charts to deploy the whole SDG stack onto **OpenShift** (or vanilla Kubernetes). There is
one **umbrella chart** (`single-digital-gateway`) that installs everything into a namespace from a
single per-environment values file, plus six standalone subcharts it composes.

```
charts/
├── single-digital-gateway/     # umbrella — installs the whole stack (this is what you deploy)
│   ├── Chart.yaml              #   file:// deps on the 6 subcharts below
│   ├── values.yaml             #   shared base (DATABASE_URL wiring) — applied under every env file
│   ├── values-dev.yaml         #   per-namespace env config …
│   ├── values-test.yaml        #   …
│   └── values-prod.yaml        #   …
├── postgres/                   # Crunchy PostgresCluster (needs the PGO operator)
├── valkey/                     # Valkey session store (StatefulSet + PVC)
├── platform-api/               # staff BFF (NestJS)
├── citizen-portal-api/         # citizen BFF (NestJS)
├── platform-web/               # staff SPA (nginx)
└── citizen-portal-web/         # citizen SPA (nginx)
```

---

## Resource model — tuned for 0.5 CPU / 2Gi (limits-only quota)

Each environment namespace (`<slug>-dev`, `<slug>-test`, `<slug>-prod`) has a **ResourceQuota of
0.5 CPU / 2Gi that caps limits only**. The whole stack is therefore **single-instance** (apps
`replicaCount: 1`, `postgres.instances.replicas: 1`, no HA) and every container carries an explicit,
lean `limits`. Summed container limits per namespace:

| Workload | CPU limit | Mem limit | |
|---|---:|---:|---|
| platform-api | 100m | 256Mi | |
| citizen-portal-api | 100m | 256Mi | |
| platform-web | 15m | 64Mi | nginx |
| citizen-portal-web | 15m | 64Mi | nginx |
| valkey | 40m | 128Mi | `maxmemory 96mb` to avoid OOMKill |
| postgres — database | 80m | 512Mi | |
| postgres — repo-host | 15m | 96Mi | pgBackRest repo pod |
| postgres — pgbackrest (sidecar) | 10m | 48Mi | in the instance pod |
| postgres — pgbackrest-config (sidecar) | 5m | 32Mi | in the instance pod |
| **Steady total** | **380m** | **1456Mi** | of 500m / 2048Mi |
| + migrate Job (pre-upgrade, transient) | +100m | +256Mi | peak **480m / 1712Mi** |
| + backup Job running too (worst case) | +15m | +64Mi | peak **495m / 1776Mi** |

Every scenario stays under 500m / 2Gi. Apps default to `strategy.maxSurge: 0` (recreate the single
pod in place, brief downtime on upgrade) because a limits-only quota has no room for a surge pod.

> **LimitRange assumption.** A couple of operator-managed init containers get their limits from the
> namespace's **LimitRange** defaults. If a namespace has a limits-only quota but *no* LimitRange,
> Kubernetes rejects any pod with an unlimited container — add a LimitRange with small default
> limits to the namespace.

To grow beyond this budget later: raise the app `replicaCount` / `strategy.maxSurge` and
`postgres.instances.replicas` (to 2 for HA), then re-check the sums.

### Storage budget — fits a 5Gi namespace quota

The stack requests **three PVCs**, tuned in the env files to total **4Gi** (under a 5Gi
namespace storage quota):

| PVC | Value key | Size |
|---|---|---:|
| Postgres data | `postgres.instances.storage.size` | 2Gi |
| pgBackRest repo | `postgres.backups.storage.size` | 1Gi |
| Valkey data | `valkey.persistence.size` | 1Gi |
| **Total** | | **4Gi** |

Notes:
- These sizes are set **per environment** in `values-{dev,test,prod}.yaml` — raise them when a
  namespace has a larger storage quota (prod especially, for backup retention).
- Set `valkey.persistence.enabled: false` to drop the Valkey PVC entirely — sessions become
  ephemeral, so a Valkey pod restart logs everyone out (acceptable in dev/test).
- pgBackRest always needs a repo volume (a repo is mandatory), so the minimum is 2 PVCs.
- PVCs are **not** deleted by `helm uninstall` (see [Uninstall](#uninstall)); if a redeploy hits
  the quota, delete leftover PVCs from a previous install first.

---

## Prerequisites

- **Helm 3.8+** and `oc`/`kubectl` logged in to the target cluster.
- **Namespace admin is sufficient — cluster admin is NOT required.** Every chart creates only
  **namespaced** resources (Deployment, StatefulSet, Service, Route, ConfigMap, ServiceAccount,
  Job, the `PostgresCluster` CR). There are no CRDs, ClusterRoles, or operators in these charts.
  - The target namespaces are **pre-provisioned** by the platform (e.g. BC Gov Private Cloud
    license-plate namespaces `<slug>-dev|test|prod|tools`). **Do NOT pass `--create-namespace`** —
    you don't have permission to create/patch the Namespace object, and Helm will fail with
    `namespaces "<slug>-dev" is forbidden: … cannot patch resource "namespaces"`. Just target the
    existing namespace with `-n <slug>-dev`.
- **Crunchy Postgres Operator (PGO)** must already be running **cluster-wide** and watching your
  namespaces, and its `PostgresCluster` CRD must be installed. The `postgres` chart only creates a
  `PostgresCluster` CR — the platform-run operator reconciles it. On the **BC Gov Private Cloud
  PaaS this is already provided**; you neither install nor can install the operator yourself
  (that needs cluster admin). Verify it's available with:
  `oc get crd postgresclusters.postgres-operator.crunchydata.com`.
- **Container images** pushed to a registry the cluster can pull. Default repositories are
  `ghcr.io/bcgov/csbc-single-digital-gateway/{platform-api,citizen-portal-api,platform-web,citizen-portal-web,db-migrate}`
  (override `image.repository`/`image.tag` per environment). If the GHCR packages are **private**
  (the org default), create a pull secret and reference it via `imagePullSecrets`, or pods
  `ImagePullBackOff`:

  ```sh
  oc -n <slug>-dev create secret docker-registry ghcr-pull \
    --docker-server=ghcr.io --docker-username=<gh-user> --docker-password=<gh-pat-read:packages>
  # then in each env file, e.g.:
  #   platform-api:
  #     imagePullSecrets: [{ name: ghcr-pull }]
  ```
- **Pre-created Secrets** in each namespace (the charts reference them by name; they never create
  them):

  | Secret | Used by | Keys |
  |---|---|---|
  | `platform-api-secrets` | platform-api | `OIDC_CLIENT_SECRET`, `AUTH_SESSION_SECRET`, `VALKEY_URL`, `NOTIFICATIONS_M2M_CLIENT_SECRET` |
  | `citizen-portal-api-secrets` | citizen-portal-api | `OIDC_CLIENT_SECRET`, `AUTH_SESSION_SECRET`, `VALKEY_URL`, `NOTIFICATIONS_M2M_CLIENT_SECRET` |
  | `valkey-secrets` | valkey | `VALKEY_PASSWORD` |
  | `notification-service-secrets` | notification-service | `SMTP_URL` |
  | `sdg-pguser-sdg` | both APIs (`DATABASE_URL`) | **operator-generated** — do not create |

  `DATABASE_URL` is **not** in the app secrets — it is sourced from the operator's `sdg-pguser-sdg`
  (and notification-service's `NOTIFICATION_DATABASE_URL` from `sdg-pguser-notifications`)
  secret (`key: uri`) via the umbrella's base `values.yaml`. `VALKEY_URL` is a full
  `redis://:<password>@<release>-valkey:6379` string; put it in the app secret and use the same
  password as `valkey-secrets`.

Example — create the Valkey password and an app secret:

```sh
oc -n <slug>-dev create secret generic valkey-secrets \
  --from-literal=VALKEY_PASSWORD="$(openssl rand -hex 24)"

oc -n <slug>-dev create secret generic platform-api-secrets \
  --from-literal=OIDC_CLIENT_SECRET=... \
  --from-literal=AUTH_SESSION_SECRET="$(openssl rand -hex 32)" \
  --from-literal=VALKEY_URL="redis://:<same-password>@sdg-valkey:6379"
```

---

## Install the whole stack (umbrella chart)

The umbrella declares the six subcharts as local `file://` dependencies — vendor them once:

```sh
helm dependency build charts/single-digital-gateway
```

### First install (phased — DB must exist before migrations)

The `platform-api` migrate Job is a **pre-install/pre-upgrade Helm hook**, and Helm runs pre-install
hooks *before* any release resource — including the `PostgresCluster` CR. On a brand-new namespace
the operator hasn't created `sdg-pguser-sdg` or a ready database yet, so split the first install:

```sh
# 1) bring up Postgres (+ Valkey + apps) WITHOUT the migrate hook
#    (namespace is pre-provisioned — do NOT pass --create-namespace)
helm install sdg charts/single-digital-gateway \
  -n <slug>-dev \
  -f charts/single-digital-gateway/values-dev.yaml \
  --set platform-api.migrations.enabled=false

# 2) wait for the operator to provision the cluster + user secret
oc -n <slug>-dev wait --for=condition=Ready \
  pod -l postgres-operator.crunchydata.com/role=master --timeout=300s

# 3) upgrade with migrations enabled (the default) → pre-upgrade migrate runs against the ready DB
helm upgrade sdg charts/single-digital-gateway \
  -n <slug>-dev -f charts/single-digital-gateway/values-dev.yaml
```

### Subsequent upgrades (single command — DB already exists)

```sh
helm upgrade --install sdg charts/single-digital-gateway \
  -n <slug>-test -f charts/single-digital-gateway/values-test.yaml
```

Swap `-dev` / `values-dev.yaml` for `-test` / `-prod` and the matching env file. The Helm **release
name** (`sdg` above) is your choice — it prefixes the generated resource names (`sdg-platform-api`,
…). The **Postgres cluster name** (`postgres.name: sdg`, hence secret `sdg-pguser-sdg`) is separate
and set in the env files.

### What each env file overrides

The per-container **limits are tuned in the subchart defaults**, so the env files only carry
per-environment identity — route subdomains, `image.tag`, OIDC issuer/redirect URLs, `BFF_ORIGIN`,
`LOG_LEVEL`, and backup policy (dev: no schedules; test: weekly full; prod: weekly full + daily
incremental). Before deploying, set the real image tags, your IdP issuer (`<oidc-issuer-host>`),
and the cluster apps domain in the route URLs (see below).

### Routes — one same-origin host per audience (feature 78)

Each **audience** has a **single** external Route — its `*-web` nginx, which serves the SPA at `/`
and **reverse-proxies `/api/*`** to the co-located BFF Service. The API charts run with
`route.enabled: false` (no external Route); they are reached only in-cluster through the web nginx.
So the browser talks to one origin per audience:

```
staff:   sdg-platform-<env>.apps…   → platform-web nginx   → / (SPA) + /api/* → platform-api
citizen: sdg-portal-<env>.apps…     → citizen-portal-web    → / (SPA) + /api/* → citizen-portal-api
```

Only the two `*-web` charts carry a route host, resolved in this order (`route.*`):

1. **`route.host`** — an explicit FQDN (external DNS + a cert). Use for production vanity domains.
2. **`route.subdomain`** — *just the prefix.* OpenShift appends the cluster's ingress domain →
   **`<subdomain>.<apps-domain>`**, served by the router's **default wildcard cert** (no DNS/cert to
   manage). This is the env-file default (e.g. `sdg-platform-dev`).
3. **Neither set** — OpenShift auto-generates `<route-name>-<namespace>.<apps-domain>`.

Find your cluster's apps domain:

```sh
oc get ingresses.config/cluster -o jsonpath='{.spec.domain}'   # e.g. apps.gold.devops.gov.bc.ca
```

The env files use `apps.gold.devops.gov.bc.ca` inside the app URLs — **replace it if your cluster's
apps domain differs** (`oc get ingresses.config/cluster -o jsonpath='{.spec.domain}'`), and keep it
in sync with each web `route.subdomain`. Notes:

- The web `env.API_UPSTREAM` (`<release>-platform-api:80`) is the in-cluster BFF Service nginx proxies
  to; `env.BFF_ORIGIN` is `/api` (same-origin, relative). Both are **required** — the web container
  fails fast without them.
- **`OIDC_REDIRECT_URI` now carries `/api`** (`https://<web-host>/api/auth/callback`, through nginx):
  register that exact URI in the Keycloak realm client, or the callback fails.
- Because the SPA and BFF are now the **same origin**, the BFF's `SameSite=lax` session cookie and
  the CSRF `Origin` allowlist have no cross-site surface — no CORS needed.
- **Subdomains must be unique cluster-wide** — dev/test/prod share one cluster, hence the
  `-dev`/`-test`/`-prod` suffix. A duplicate host is rejected (`HostAlreadyClaimed`).
- `tls.termination: edge` (the chart default) pairs with the wildcard cert; leave it as-is.

---

## The subcharts

All six are standard `application` charts and can be installed standalone (`helm install <name>
charts/<name> -n <ns> -f my-values.yaml`) if you don't want the umbrella. Common app-chart values:
`replicaCount`, `image.{repository,tag}`, `env` (→ ConfigMap), `extraEnv` (raw env, supports
`valueFrom`; merged into the app **and** migrate containers), `existingSecret`, `route.*`,
`resources`, `strategy`, `probes.*`, `autoscaling.*`, and the OpenShift-safe `podSecurityContext` /
`securityContext`.

| Chart | Kind(s) | Notes |
|---|---|---|
| **platform-api** | Deployment, Service, ConfigMap, ServiceAccount, migrate Job | Staff BFF (NestJS), port 4000. `migrations.enabled: true` — **owns migrations for the shared DB**. `route.enabled: false` in the umbrella — reached via platform-web nginx at `/api/*` (feature 78). |
| **citizen-portal-api** | Deployment, Service, ConfigMap, ServiceAccount | Citizen BFF (NestJS), port 4000. `migrations.enabled: false` (platform-api migrates the shared DB). `route.enabled: false` in the umbrella — reached via citizen-portal-web nginx at `/api/*`. |
| **platform-web** | Deployment, Service, Route, ConfigMap, ServiceAccount | Staff SPA + front door (nginx, port 8080). Serves `/` and reverse-proxies `/api/*` → platform-api. Requires `env.BFF_ORIGIN` (`/api`) + `env.API_UPSTREAM` (`<release>-platform-api:80`). |
| **citizen-portal-web** | Deployment, Service, Route, ConfigMap, ServiceAccount | Citizen SPA + front door (nginx, port 8080). Serves `/` and proxies `/api/*` → citizen-portal-api. Requires `env.BFF_ORIGIN` + `env.API_UPSTREAM`. |
| **valkey** | StatefulSet, Service (+ headless), ConfigMap, ServiceAccount, optional NetworkPolicy | Session store, single replica, persistent PVC. Password from `auth.existingSecret`. `maxmemory` capped below the pod limit (noeviction). |
| **postgres** | PostgresCluster (CRD) | Crunchy PGO cluster. Requires the operator. Exposes `instances.*`, `backups.{schedules,retentionFull,storage,repoHost,sidecars,jobs}`, optional `pgbouncer`/`monitoring`. Generates secret `sdg-pguser-sdg`. |

### Migrations

Migrations run exactly once per deploy from **platform-api** (the shared DB). The migrate Job reuses
platform-api's `resources` and its `extraEnv` (so it gets `DATABASE_URL` from the operator secret).
Keep `citizen-portal-api.migrations.enabled: false` unless it is deployed without platform-api.

### Backups (postgres)

pgBackRest is always on (a repo is mandatory). Schedules are cron strings — empty disables that
schedule. `retentionFull` is how many full backups to keep. The `backups.repoHost` / `backups.sidecars`
/ `backups.jobs` resource blocks exist so every pgBackRest container carries a limit under the
limits-only quota. dev disables schedules; prod keeps weekly-full + daily-incremental.

---

## Uninstall

```sh
helm uninstall sdg -n <slug>-dev
```

PVCs (Postgres data, pgBackRest repo, Valkey data) and the operator-generated `sdg-pguser-sdg`
secret are **not** removed by `helm uninstall` — delete them explicitly if you want a clean slate:

```sh
oc -n <slug>-dev delete pvc -l app.kubernetes.io/instance=sdg
oc -n <slug>-dev delete postgrescluster sdg   # operator then cleans up its PVCs/secret
```

---

## Validate before deploying

```sh
helm dependency build charts/single-digital-gateway
helm lint charts/single-digital-gateway -f charts/single-digital-gateway/values-dev.yaml
helm template sdg charts/single-digital-gateway -f charts/single-digital-gateway/values-dev.yaml | less
```

`charts/single-digital-gateway/charts/` (the vendored subchart tarballs) is git-ignored — it is
rebuilt from the sibling charts by `helm dependency build`. `Chart.lock` is committed for
reproducibility.
