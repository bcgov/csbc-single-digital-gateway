# single-digital-gateway

A Turborepo monorepo using npm workspaces.

## Layout

```
apps/        # applications — bare package.json "name" (no scope)
packages/    # shared libraries — "@repo/<name>" scope
```

## Toolchain

Configured once at the root and applied across the whole tree:

| Tool       | Purpose            | Config                |
| ---------- | ------------------ | --------------------- |
| Turborepo  | task orchestration | `turbo.json`          |
| TypeScript | strict typing      | `tsconfig.base.json`  |
| Prettier   | formatting         | `prettier.config.mjs` |
| oxlint     | linting            | `.oxlintrc.json`      |
| Vitest     | testing            | `vitest.config.ts`    |
| Lefthook   | git hooks          | `lefthook.yml`        |

## Scripts

```bash
npm install        # install deps + register git hooks (lefthook)
npm run dev        # turbo run dev across workspaces
npm run build      # turbo run build
npm run lint       # oxlint across the tree
npm run format     # prettier --write .
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
npm run check      # format:check + lint + typecheck + test
```

## Conventions

- **TypeScript everywhere, strict mode.** Extend `tsconfig.base.json`.
- **Apps** under `apps/` use a bare `name` (e.g. `"web"`).
- **Packages** under `packages/` use the `@repo/` scope (e.g. `"@repo/ui"`).
- Git hooks: Prettier + oxlint on staged files pre-commit; typecheck + tests pre-push.
