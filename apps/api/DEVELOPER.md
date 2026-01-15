# API Developer Docs

## Configuration

Create a `.env` file using the following template:

```sh
PORT=4000

# Default Database
DEFAULT_DB_NAME=
DEFAULT_DB_HOST=localhost
DEFAULT_DB_PORT=5432
DEFAULT_DB_USER=
DEFAULT_DB_PASS=
DEFAULT_DB_SSL=false

# Identity Provider
OIDC_ISSUER=
OIDC_JWKS_URI=
```

## Database

- [Drizzle ORM](https://orm.drizzle.team/) is used to interact with the database.
- [drizzle-kit](https://orm.drizzle.team/docs/kit-overview) is used to manage database migrations

### Migrations

Each time the [schema](https://orm.drizzle.team/docs/sql-schema-declaration) is changed, new migrations must be created.

```sh
npx -w api drizzle-kit --config ./drizzle/default/drizzle.config.ts generate
```

Once generated, migrations must be applied to the database.

```sh
npx -w api drizzle-kit --config ./drizzle/default/drizzle.config.ts migrate
```

### Studio

Launch [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview) to browse the database.

```sh
npx -w api drizzle-kit --config ./drizzle/default/drizzle.config.ts studio
```
