# Single Digital Gateway — Helm charts

Helm charts to deploy the whole SDG stack onto **OpenShift** (or vanilla Kubernetes). There is
one **umbrella chart** (`single-digital-gateway`) that installs everything into a namespace from a
single per-environment values file, plus seven standalone subcharts it composes.

```
charts/
├── single-digital-gateway/     # umbrella — installs the whole stack (this is what you deploy)
│   ├── Chart.yaml              #   file:// deps on the 7 subcharts below
│   ├── values.yaml             #   shared base (DATABASE_URL wiring) — applied under every env file
│   ├── values-dev.yaml         #   per-namespace env config …
│   ├── values-test.yaml        #   …
│   └── values-prod.yaml        #   …
├── postgres/                   # Crunchy PostgresCluster (needs the PGO operator)
├── valkey/                     # Valkey session store (StatefulSet + PVC)
├── platform-api/               # staff BFF (NestJS)
├── citizen-portal-api/         # citizen BFF (NestJS)
├── platform-web/               # staff SPA (nginx)
├── citizen-portal-web/         # citizen SPA (nginx)
└── notification-service/       # internal notifications m2m service (NestJS, no Route)
```

---

## Resource model — fits a 0.5 CPU / 2Gi requests-metered quota

Each environment namespace (`<slug>-dev`, `<slug>-test`, `<slug>-prod`) has a **ResourceQuota of
0.5 CPU / 2Gi that meters container `requests`** — `requests.cpu` / `requests.memory`, the BC Gov
Private Cloud model (confirm yours with `oc describe quota -n <slug>-dev`). **Limits are not
quota-metered**; they only cap what a container may burst to on its node. So two sums matter, and
only the first is a hard budget:

**Requests — quota-metered (must stay ≤ 500m / 2048Mi):**

| Workload | CPU req | Mem req | |
|---|---:|---:|---|
| platform-api | 25m | 128Mi | |
| citizen-portal-api | 25m | 128Mi | |
| notification-service | 25m | 128Mi | |
| platform-web | 10m | 32Mi | nginx |
| citizen-portal-web | 10m | 32Mi | nginx |
| valkey | 25m | 64Mi | |
| postgres — database | 50m | 256Mi | |
| postgres — repo-host | 10m | 48Mi | pgBackRest repo pod |
| postgres — pgbackrest (sidecar) | 10m | 16Mi | in the instance pod |
| postgres — pgbackrest-config (sidecar) | 5m | 16Mi | in the instance pod |
| **Steady total** | **195m** | **848Mi** | of 500m / 2048Mi |
| + migrate Job (pre-upgrade, transient) | +25m | +64Mi | Helm runs release hooks serially, so at most ONE migrate Job exists at a time |
| + backup Job running too (worst case) | +5m | +32Mi | peak **225m / 944Mi** |

Worst-case peak uses **under half** the quota — comfortable headroom for surge pods, an HA Postgres
replica, or new services later.

**Limits — not metered, sized for behaviour (sum 570m / 1648Mi):** each container's limit buys
boot speed and burst latency, so they deliberately sum past 500m — that's fine under a
requests-metered quota. Notable: the pgBackRest **sidecar carries a 100m limit on a 10m request**
because its operator-fixed 1-second liveness probe (`pgbackrest server-ping`) gets CPU-throttled
past 1s under a lower limit → CrashLoopBackOff that severs in-flight backups (pgBackRest
ERROR [039]). Do not "tidy" that limit down — see the comment in `charts/postgres/values.yaml`.

The whole stack is **single-instance** (apps `replicaCount: 1`, `postgres.instances.replicas: 1`,
no HA), and apps default to `strategy.maxSurge: 0` (the single pod is recreated in place — brief
downtime on upgrade). With the requests headroom above, a surge pod is affordable: set
`<app>.strategy.rollingUpdate.maxSurge: 1` per app for zero-downtime rollouts if brief
double-scheduling is acceptable.

> **LimitRange assumption.** Every container the charts render carries explicit
> requests+limits, but a couple of **operator-managed init containers** rely on the namespace's
> **LimitRange** defaults. A quota on a resource rejects any pod whose containers omit that
> resource — if the namespace has no LimitRange, add one with small defaults.

**Re-check after changing any chart's resources** — render the umbrella and sum per dimension
(steady containers, plus the largest hook Job and the pgBackRest backup Job as transient peak):

```sh
helm dependency build charts/single-digital-gateway
helm template sdg charts/single-digital-gateway \
  -f charts/single-digital-gateway/values-prod.yaml | grep -B2 -A4 'requests:'
```

To grow beyond this budget later: raise the app `replicaCount` / `strategy.maxSurge` and
`postgres.instances.replicas` (to 2 for HA), then re-check the request sums.

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
  `ghcr.io/bcgov/csbc-single-digital-gateway/{platform-api,citizen-portal-api,platform-web,citizen-portal-web,notification-service,db-migrate,notification-db-migrate}`
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

The umbrella declares the seven subcharts as local `file://` dependencies — vendor them once:

```sh
helm dependency build charts/single-digital-gateway
```

### First install (phased — DBs must exist before migrations)

The `platform-api` and `notification-service` migrate Jobs are **pre-install/pre-upgrade Helm
hooks**, and Helm runs pre-install hooks *before* any release resource — including the
`PostgresCluster` CR. On a brand-new namespace the operator hasn't created `sdg-pguser-sdg` /
`sdg-pguser-notifications` or a ready database yet, so split the first install:

```sh
# 1) bring up Postgres (+ Valkey + apps) WITHOUT the migrate hooks
#    (namespace is pre-provisioned — do NOT pass --create-namespace)
helm install sdg charts/single-digital-gateway \
  -n <slug>-dev \
  -f charts/single-digital-gateway/values-dev.yaml \
  --set platform-api.migrations.enabled=false \
  --set notification-service.migrations.enabled=false

# 2) wait for the operator to provision the cluster + user secrets
oc -n <slug>-dev wait --for=condition=Ready \
  pod -l postgres-operator.crunchydata.com/role=master --timeout=300s

# 3) upgrade with migrations enabled (the default) → pre-upgrade migrates run against the ready DBs
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

All seven are standard `application` charts and can be installed standalone (`helm install <name>
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
| **notification-service** | Deployment, Service, ConfigMap, ServiceAccount, migrate Job | Internal notifications m2m resource server (NestJS), port 4002. **No Route template — browsers never reach it**; the BFFs call the ClusterIP Service with client-credentials tokens. `migrations.enabled: true` — **owns migrations for its own DB** (`sdg_notifications`, operator secret `sdg-pguser-notifications` via `postgres.extraUsers`). |
| **valkey** | StatefulSet, Service (+ headless), ConfigMap, ServiceAccount, optional NetworkPolicy | Session store, single replica, persistent PVC. Password from `auth.existingSecret`. `maxmemory` capped below the pod limit (noeviction). |
| **postgres** | PostgresCluster (CRD) | Crunchy PGO cluster. Requires the operator. Exposes `instances.*`, `backups.{schedules,retentionFull,storage,repoHost,sidecars,jobs}`, optional `pgbouncer`/`monitoring`. Generates secret `sdg-pguser-sdg` (+ `sdg-pguser-notifications` via `extraUsers`). |

### Migrations

Two databases, two owners — each migrated exactly once per deploy:

- **Shared app DB (`sdg`)** — migrated by **platform-api**'s hook (image `db-migrate`). Keep
  `citizen-portal-api.migrations.enabled: false` unless it is deployed without platform-api.
- **Notifications DB (`sdg_notifications`)** — migrated by **notification-service**'s own hook
  (image `notification-db-migrate`); no conflict, since Helm runs release hooks serially.

Each migrate Job gets its DB URL from the app's `extraEnv` (the operator-generated pguser secret)
and its own lean `migrations.resources` (requests are what the quota meters; the transient Job adds
only +25m / 64Mi to the request sum while it runs).

### Backups (postgres)

pgBackRest is always on (a repo is mandatory). Schedules are cron strings — empty disables that
schedule. `retentionFull` is how many full backups to keep. The `backups.repoHost` / `backups.sidecars`
/ `backups.jobs` resource blocks exist so every pgBackRest container carries explicit requests
(what the quota meters) and a deliberate limit — in particular the sidecar's 100m CPU limit, which
its 1-second liveness probe needs (see the resource model above). dev disables schedules; prod
keeps weekly-full + daily-incremental.

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
