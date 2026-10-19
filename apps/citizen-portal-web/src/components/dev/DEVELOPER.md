# `/dev` accessibility metadata

Every `/dev` reference page except the Tailwind tokens index (`accordion`, `alert`, `badge`,
`breadcrumb`, `button`, `cards`, `dialog`, `dropdown-menu`, `form-elements`, `icons`,
`page-layouts`, `status-banner`) renders its **Accessibility** section from structured,
machine-readable metadata instead of hand-typed prose. The same metadata is what an automated checker runs against,
so the docs and the enforcement can't drift apart.

This metadata catalog is also the exceptions source for the _real_ app routes (not just `/dev`
pages) — see [`test/A11Y-TESTING.md`](../../../test/A11Y-TESTING.md) for that broader checker,
what it does and doesn't cover, and how to keep it useful as the app grows.

## Why

Hand-typed prose is invisible to AI coding agents and isn't checked by anything — nothing catches
an accessibility regression, and an agent editing or scaffolding a `/dev` page has no structured
source of truth for a component's WCAG/ARIA constraints. This system fixes both: the metadata is
queryable data, and it's enforced by a test.

## How it fits together

```
<name>.a11y.ts sidecar  →  packages/ui catalog (a11y-catalog.json)  →  getA11yMetadata()
       │                                                                    │
       │                                                    ┌──────────────┴──────────────┐
       │                                                    ▼                             ▼
       └────────────────────────────────────────  <A11yRulesSection>          dev-pages-a11y.test.tsx
                                                    (renders the page)          (axe-core gate)
```

| Piece                | Location                                                | Purpose                                                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema               | `packages/ui/src/a11y/a11y-types.ts`                    | The `ComponentA11yMetadata` type: WCAG criteria, ARIA pattern link, rules, misuses, notes, `knownExceptions`.                                                                                                                                                                           |
| Sidecars (shared)    | `packages/ui/src/a11y/*.a11y.ts` (22)                   | Metadata for `@repo/ui` components — the ones with `/dev` pages plus the JSON Forms input primitives shown on `/dev/form-elements`.                                                                                                                                                     |
| Sidecars (app-local) | `src/a11y/*.a11y.ts` (5)                                | `breadcrumb`, `status-banner` (app-local components); `icons`, `form-elements`, `page-layouts` (pattern pages with no single owning component).                                                                                                                                         |
| Catalog generator    | `packages/ui/scripts/gen-a11y-catalog.mjs`              | Aggregates the shared sidecars into the committed `packages/ui/src/a11y/a11y-catalog.json`.                                                                                                                                                                                             |
| Catalog lookup       | `src/a11y/a11y-catalog.ts`                              | Merges the `@repo/ui` catalog with the app-local sidecars; exports `getA11yMetadata(name)` (throws on a miss — for `/dev` pages, where the name is always known) and `findA11yMetadata(name)` (returns `undefined` — for aggregating exceptions across whatever a _real_ page renders). |
| Rendered section     | `src/components/dev/a11y-rules-section.tsx`             | Turns metadata into the badges/rules/exceptions UI on each reference page.                                                                                                                                                                                                              |
| Checker              | `test/dev-pages-a11y.test.tsx` + `test/support/a11y.ts` | Renders all 13 `/dev` routes and runs `jest-axe` against each. (Real app routes have their own, separate checker — see `test/A11Y-TESTING.md`.)                                                                                                                                         |

All accessibility metadata lives in a dedicated `src/a11y/` directory in each package/app — not
co-located with the component it describes — matching this repo's existing convention of keeping
tests in their own `test/` directory rather than next to the source they cover.

## Adding or updating a component

1. **Write or update its `<name>.a11y.ts` sidecar.**
   - `@repo/ui` component → add it to `packages/ui/src/a11y/`.
   - App-local component or a pattern page with no single owner → add it to this app's
     `src/a11y/`.
2. **If it's a `@repo/ui` sidecar**, regenerate the catalog:
   ```bash
   npm run gen:a11y-catalog -w @repo/ui
   ```
   Forgetting this is caught by `packages/ui/test/a11y-catalog.test.ts`, which diffs the committed
   JSON against what the sidecars currently produce — `npm run check` fails until it's regenerated.
3. **New `/dev` page**: add the route + reference page as usual, then:
   - Add `{ path, component }` to the `DEV_PAGES` array in `test/dev-pages-a11y.test.tsx`.
   - Wire its Accessibility `<DevSection>` to:
     ```tsx
     <DevSection id="accessibility" title="Accessibility">
       <A11yRulesSection metadata={getA11yMetadata('your-component-name')} />
     </DevSection>
     ```

`getA11yMetadata()` **throws** if the name doesn't match anything in the catalog — that's
deliberate. A typo'd `component` field or a forgotten sidecar shows up as an immediate crash, not a
silently blank Accessibility section.

## When the checker fails

`dev-pages-a11y.test.tsx` runs on every `npm run test` / `npm run check`, and fails on any axe
violation not explicitly listed as a known exception.

- **Real issue** → fix it.
- **Deliberate, justified exception** (should be rare) → add it to that component's
  `knownExceptions` in its `.a11y.ts` sidecar:
  ```ts
  knownExceptions: [
    {
      axeRuleId: 'color-contrast',
      description: 'Disabled state text fails contrast against the muted background.',
      justification: 'Matches the BC Design System disabled-control spec; see LINK.',
    },
  ],
  ```
  Only the listed `axeRuleId`s are suppressed — everything else still fails. The justification is
  rendered on the `/dev` page itself as a "Known exceptions" callout, so it's visible to anyone
  (human or agent) looking at the component, not buried in a config file.

## Known gaps (by design)

- The `tailwind` index page (`/dev`) has no sidecar — it documents design tokens, not a component —
  but is still axe-checked with an empty exceptions list.
- Metadata covers the documented components, not all ~60 primitives in `packages/ui`. Extending
  coverage is just adding another sidecar — no structural changes needed.
- No MCP server and no LLM-based judgment-call review pass yet; `a11y-catalog.json` is the artifact
  either would consume. The separate page-building catalog (`src/catalog/`, see its `README.md`)
  is the first step toward that layer, built independently so it can be removed without touching
  anything here.
