# Page-building catalog (citizen-portal-web)

> **Status: parked (2026-10).** Complete and green as of the pivot. See [Not done](#not-done)
> before resuming.

This directory is the machine-readable half of the AI-assisted page-building guardrails. It
records **which layout primitives a page may compose from, what each one is for, and whether it may
be changed**, so an agent (or a person) building a page has one source of truth instead of
reverse-engineering existing pages. This README is the committed reference for the whole system;
agent-specific instructions (`CLAUDE.md`, the `/build-page` skill) are kept locally and are not in
the repo.

## Rules

citizen-portal-web pages compose from `@repo/ui` plus the layout primitives in
`src/components/layout/`, never hand-rolled one-off markup:

| Role          | Primitive                                                       |
| ------------- | --------------------------------------------------------------- |
| Chrome        | `CitizenShell` (wraps `PageShell`)                              |
| Title band    | `PageHeaderBanner` + `PageTitle`, or `SettingsPageHeader`       |
| Body column   | `PageContent`                                                   |
| Body sections | `PageSection` (`SectionHeading`), `PageWithRail` for a jump-nav |
| States        | `PageLoading`, `LoginGate`, `MessageCard`                       |
| Landing bands | `FullBleedBand`                                                 |

Every page is one of five templates built from these: **standard content**, **settings**,
**detail with rail**, **landing**, plus the shared **loading/message states**. `/dev/page-layouts`
shows each one live with a copyable recipe.

1. Compose only from `@repo/ui` + the primitives above. If nothing fits, stop and ask — don't
   invent a one-off substitute or a new template variant.
2. Any edit under `packages/ui/**` is a shared component change, not page content — it needs the
   repo owner's explicit go-ahead, even when a request seems to imply it.
3. Tailwind classes use the semantic tokens in `packages/ui/src/styles/tokens.css` — never
   arbitrary hex/px values (`bg-[#…]`, `top-[14px]`).
4. The title band is a sibling **above** `PageContent`, never inside it, and each page has exactly
   one `<h1>`.

The system is deliberately independent of the accessibility-metadata system
(`src/a11y/`, `packages/ui/src/a11y/`): nothing here reads or writes those files, so it can be
removed without touching them.

## How it fits together

```
src/catalog/<name>.catalog.ts ─┐
                               ├─► component-catalog.ts ─► findComponentMetadata() / isFrozen()
packages/ui/src/catalog/       │   (merges both lists)        listComponentCatalog()
  component-catalog.json ──────┘
  (generated from packages/ui/src/catalog/*.catalog.ts — currently none, see below)

Enforcement in `npm run check`:
  test/page-imports.test.ts      no hand-rolled page column (max-w-285), no hand-rolled message card,
                                 no hex/px arbitrary Tailwind values — in any src/components file
                                 outside dev/ and layout/
  .oxlintrc.json @shadcn/lint    token/arbitrary-value/unknown-class rules, warnings, scoped to
                                 apps/citizen-portal-web/src/**
  packages/ui/test/
    component-catalog.test.ts    the committed shared JSON matches its sidecars
```

| Piece              | Location                                                                   |
| ------------------ | -------------------------------------------------------------------------- |
| Schema             | `packages/ui/src/catalog/catalog-types.ts` (`ComponentUsageMetadata`)      |
| App-local sidecars | `src/catalog/*.catalog.ts` — one per layout primitive                      |
| Shared sidecars    | `packages/ui/src/catalog/*.catalog.ts` → `component-catalog.json`          |
| Lookup             | `src/catalog/component-catalog.ts`                                         |
| Primitives         | `src/components/layout/*`                                                  |
| Live reference     | `/dev/page-layouts` (`src/components/dev/page-layouts-reference-page.tsx`) |
| Agent procedure    | the `/build-page` skill — kept locally, not in this repo                   |

### Statuses

- `stable` — compose freely.
- `experimental` — compose freely, but flag before building a new page pattern around it. The
  primitives added during the 2026-10 wrap-up (`PageTitle`, `PageSection`, `PageWithRail`,
  `MessageCard`, `LoginGate`, `PageLoading`, `FullBleedBand`) start here.
- `frozen` — don't modify without the repo owner's sign-off.

A component with **no entry** is treated as frozen by `isFrozen()`: a gap in coverage is not
permission.

## Adding or changing an entry

1. Add/edit `src/catalog/<name>.catalog.ts` (copy an existing one) and register it in
   `appLocalCatalog` in `component-catalog.ts`.
2. For a `@repo/ui` component, the sidecar goes in `packages/ui/src/catalog/` instead; then run
   `npm run gen:component-catalog -w @repo/ui` (the drift test fails until you do).
3. If it's a new layout primitive, add a section to `/dev/page-layouts` and, if it affects
   landmarks/headings, update `src/a11y/page-layouts.a11y.ts`.

## Not done

Deliberately left out of scope at the pivot:

- **The shared `@repo/ui` catalog is empty.** Whether each primitive is `stable` or `frozen` is the
  repo owner's call, so no entries were guessed. Until it's populated, `isFrozen()` reports every
  `@repo/ui` component as frozen.
- **No router-level not-found / error / pending pages.** `routes/__root.tsx` sets none, so an unknown
  URL renders TanStack Router's unstyled default with no shell. `CitizenShell` + `MessageCard` is
  the obvious shape for them.
- **`platform-web`** has no equivalent system — it uses a different, imperative chrome model
  (`PageChromeProvider`/`useSetPageChrome` in `apps/platform-web/src/lib/page-chrome.tsx`).
- **No MCP server / LLM review pass** reads this catalog yet; the JSON is the artifact either
  would consume.
- **Remaining lint warnings** in this app are structural arbitrary values with no token
  equivalent (grid templates such as `md:grid-cols-[auto_1fr]`, `calc()` widths,
  `transition-[width]`, `after:rounded-[inherit]`), plus one dynamic `className` in the `/dev`
  menu. They're intentional; promoting them to `@utility` classes in `packages/ui` would be a
  shared-component change.
- **Display headings.** Landing-style pages (home, services) use a bare `<h1>` for the larger
  global heading style; everything else uses `PageTitle`. Unifying them is a design decision.

## Removing the system

Delete: `src/catalog/`, `packages/ui/src/catalog/`, `packages/ui/scripts/gen-component-catalog.mjs`,
`packages/ui/test/component-catalog.test.ts`, and the `catalog-types` / `component-catalog.json`
exports and `gen:component-catalog` script in `packages/ui/package.json` (plus the "Building pages"
section of your local `CLAUDE.md`, if you keep one). Keep the layout primitives — the pages depend
on them, and they stand on their own. `test/page-imports.test.ts` and the `@shadcn/lint` override
are optional to keep.
