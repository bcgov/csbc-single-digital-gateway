# CI/CD — GitHub Actions

Build the five container images and deploy the [`single-digital-gateway` umbrella
chart](../charts/README.md) to OpenShift.

| Workflow                                                 | Trigger                                                      | What it does                                                                                                                                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`build-and-deploy.yml`](workflows/build-and-deploy.yml) | push to `main`                                               | Build **only the images whose files (or local deps) changed** → push `:<sha>` + `:dev` → deploy **dev**. Unchanged images are retagged to `:<sha>` (no rebuild) so the SHA set is complete. |
| ″                                                        | push tag `v*`                                                | Deploy **test** — no rebuild; reuse the `:<sha>` images `main` already built.                                                                                                               |
| [`deploy-prod.yml`](workflows/deploy-prod.yml)           | GitHub **Release** published (or manual `workflow_dispatch`) | Deploy **prod**, gated by the `prod` Environment's required-reviewer approval. Deploy-only.                                                                                                 |

- **Change detection** uses Turborepo's affected graph (`turbo run build --affected`), so a change to
  a shared package (`@repo/ui`, `@repo/database`, `@repo/nestjs`, …) rebuilds every dependent image.
- **Images are pinned by immutable git SHA**; deploys always `--set *.image.tag=<sha>` (rollback =
  re-run prod deploy for an older tag/SHA). `dev`/`test`/`prod` moving tags are convenience only.
- **Builds only run on `main`.** A tag/release must be on a commit already built on `main`, or the
  image-existence check fails fast (nothing partial is deployed).

## One-time setup

### 1. GitHub Environments

Create three [Environments](../../settings/environments): **`dev`**, **`test`**, **`prod`**. On
**`prod`**, add **Required reviewers** (the approval gate). Per Environment, set:

| Kind     | Name                  | Example                                      |
| -------- | --------------------- | -------------------------------------------- |
| Variable | `OPENSHIFT_NAMESPACE` | `d62e77-dev` / `d62e77-test` / `d62e77-prod` |
| Secret   | `OPENSHIFT_TOKEN`     | the namespace deployer SA token (below)      |

Set once at the **repository** level (shared across environments):

| Kind     | Name               | Example                                  |
| -------- | ------------------ | ---------------------------------------- |
| Variable | `OPENSHIFT_SERVER` | `https://api.gold.devops.gov.bc.ca:6443` |

`GITHUB_TOKEN` (automatic) pushes/pulls the GHCR images — no PAT needed.

### 2. OpenShift deployer ServiceAccount (per namespace)

Run once per namespace by someone with namespace admin (you don't need cluster admin).

> **Use a long-lived token — not `oc create token`.** `oc create token` mints a bound token that
> **expires** (~1h), and CI then fails with `The token provided is invalid or expired`. Create a
> `kubernetes.io/service-account-token` Secret instead; its token does not expire.

```sh
NS=d62e77-dev   # repeat for -test, -prod
oc create sa github-deployer -n "$NS"
oc policy add-role-to-user edit -z github-deployer -n "$NS"

# Long-lived token (OpenShift 4.11+ does not auto-create SA token secrets):
oc apply -n "$NS" -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: github-deployer-token
  namespace: $NS
  annotations:
    kubernetes.io/service-account.name: github-deployer
type: kubernetes.io/service-account-token
EOF

# The token controller populates .data.token ASYNCHRONOUSLY — wait until it is non-empty:
until oc get secret github-deployer-token -n "$NS" -o jsonpath='{.data.token}' | grep -q .; do
  echo "waiting for token…"; sleep 2
done

# Print the token (note: no trailing newline — do not copy the shell prompt after it):
TOKEN=$(oc get secret github-deployer-token -n "$NS" -o jsonpath='{.data.token}' | base64 -d)
printf '%s\n' "$TOKEN"

# VERIFY it works BEFORE saving it to GitHub (should print the SA identity, not an error):
oc login --token="$TOKEN" --server=https://api.gold.devops.gov.bc.ca:6443 >/dev/null \
  && oc whoami   # → system:serviceaccount:$NS:github-deployer
```

Paste the printed token into the environment's `OPENSHIFT_TOKEN` secret **exactly** — no leading/
trailing whitespace or newline. (Alternatively, BC Gov namespaces ship a built-in `pipeline`
ServiceAccount with a long-lived token secret you can reuse instead of creating `github-deployer`.)

### 3. Namespace secrets (per namespace)

The charts reference **three** hand-created secrets per namespace. The `*-web` apps need none, and
`DATABASE_URL` is **not** here — it comes from the operator-generated `sdg-pguser-sdg` secret.

| Secret                       | Keys                                                      |
| ---------------------------- | --------------------------------------------------------- |
| `valkey-secrets`             | `VALKEY_PASSWORD`                                         |
| `platform-api-secrets`       | `OIDC_CLIENT_SECRET`, `AUTH_SESSION_SECRET`, `VALKEY_URL` |
| `citizen-portal-api-secrets` | `OIDC_CLIENT_SECRET`, `AUTH_SESSION_SECRET`, `VALKEY_URL` |

```sh
NS=d62e77-dev   # repeat per namespace, with that env's Keycloak client secrets

# One Valkey password, shared by the server and both BFFs:
VALKEY_PASSWORD=$(openssl rand -hex 24)
VALKEY_URL="redis://:${VALKEY_PASSWORD}@sdg-valkey:6379"

oc create secret generic valkey-secrets -n "$NS" \
  --from-literal=VALKEY_PASSWORD="$VALKEY_PASSWORD"

oc create secret generic platform-api-secrets -n "$NS" \
  --from-literal=OIDC_CLIENT_SECRET='<platform-api client secret — Keycloak realm sdg>' \
  --from-literal=AUTH_SESSION_SECRET="$(openssl rand -hex 32)" \
  --from-literal=VALKEY_URL="$VALKEY_URL"

oc create secret generic citizen-portal-api-secrets -n "$NS" \
  --from-literal=OIDC_CLIENT_SECRET='<citizen-portal-api client secret — Keycloak realm citizens>' \
  --from-literal=AUTH_SESSION_SECRET="$(openssl rand -hex 32)" \
  --from-literal=VALKEY_URL="$VALKEY_URL"
```

- The `VALKEY_PASSWORD` in `valkey-secrets` **must equal** the password embedded in both `VALKEY_URL`s.
- `AUTH_SESSION_SECRET` ≥ 16 chars; use a distinct value per app (rotating it logs everyone out).
- `OIDC_CLIENT_SECRET` is each app's confidential-client secret from its Keycloak realm — different
  per app and per environment.
- Update an existing secret idempotently by appending `--dry-run=client -o yaml | oc apply -f -`.

### 4. Bootstrap each namespace once (before CI can deploy)

The umbrella's migrate hook is a pre-install Helm hook, so the very first install must be phased (the
DB must exist first). Do the phased first install by hand (see [charts/README.md](../charts/README.md#first-install-phased--db-must-exist-before-migrations)),
then CI handles all subsequent `helm upgrade`s.

If the GHCR packages are **private**, the pods also need an image pull secret, linked to the app
ServiceAccounts (or set `imagePullSecrets` in the umbrella env files):

```sh
oc create secret docker-registry ghcr-pull -n "$NS" \
  --docker-server=ghcr.io --docker-username=<gh-user> --docker-password=<gh-PAT-with-read:packages>
for sa in default sdg-platform-api sdg-citizen-portal-api sdg-platform-web sdg-citizen-portal-web; do
  oc secrets link "$sa" ghcr-pull --for=pull -n "$NS" 2>/dev/null || true
done
```

## Images

`ghcr.io/bcgov/csbc-single-digital-gateway/{platform-api,citizen-portal-api,platform-web,citizen-portal-web,db-migrate}`
— all built from the monorepo root; `db-migrate` from `packages/database/Dockerfile`, the rest from
`apps/<name>/Dockerfile`.
