# Architecture — C4 Diagrams

[C4 model](https://c4model.com) diagrams for the Single Digital Gateway, written as
Mermaid `C4Context` / `C4Container` / `C4Component` diagrams. They render on GitHub and
in any Mermaid-enabled Markdown viewer (VS Code Mermaid preview, mermaid.live, etc.).

| Level              | File                                                                             | Scope                                                                     |
| ------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1 — System Context | [`01-system-context.md`](./01-system-context.md)                                 | People + external systems around the whole platform                       |
| 2 — Container      | [`02-container.md`](./02-container.md)                                           | The SPAs, BFFs, notification-service, databases, session store            |
| 3 — Component      | [`03-component-platform-api.md`](./03-component-platform-api.md)                 | Inside the staff BFF (guard chain, feature modules, ports)                |
| 3 — Component      | [`04-component-citizen-portal-api.md`](./04-component-citizen-portal-api.md)     | Inside the citizen BFF (public catalogue vs private `/me`)                |
| 3 — Component      | [`05-component-notification-service.md`](./05-component-notification-service.md) | Inside notification-service (m2m auth, inbox/outbox, workers)             |
| Data model         | [`06-database-model.md`](./06-database-model.md)                                 | ER diagrams for the main DB & notifications DB (from the Drizzle schemas) |

## Rendering

- **GitHub** renders these inline automatically.
- **Mermaid C4 support is experimental** — layout is auto-generated and can be dense;
  `UpdateLayoutConfig(...)` at the bottom of each diagram tunes shapes-per-row. If a
  diagram looks cramped, adjust `$c4ShapeInRow`.
- Locally: `npx @mermaid-js/mermaid-cli -i architecture/02-container.md -o out.svg`.

These are hand-authored from the codebase conventions (`CLAUDE.md`) and app/package
layout; keep them in sync when containers or module boundaries change.
