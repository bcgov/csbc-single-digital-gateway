# API Developer Docs

## Configuration

Create a `.env` file using the following template:

```sh
PORT=4000

# Identity Provider
OIDC_ISSUER=
OIDC_JWKS_URI=
```

Database env vars (`DB_*`) are documented in the [`@repo/db` package](../../packages/db/DEVELOPER.md).

## Database

Database client, schema, and migration tooling are provided by the [`@repo/db`](../../packages/db/DEVELOPER.md) package. See that package's documentation for scripts and environment variables.
