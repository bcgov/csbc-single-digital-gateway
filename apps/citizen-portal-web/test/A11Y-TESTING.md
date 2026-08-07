# Automated accessibility testing — scope, limits, and upkeep

There are two `jest-axe`-based checkers in this app, sharing one mechanism
(`test/support/a11y.ts`'s `expectNoUnjustifiedA11yViolations`) but covering different surfaces:

| Checker                         | Covers                                                           | Exceptions come from                                                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test/dev-pages-a11y.test.tsx`  | The 9 `/dev` reference pages, one documented component each.     | That component's own `.a11y.ts` sidecar, via `getA11yMetadata(name)` (throws on a miss).                                                                              |
| `test/live-pages-a11y.test.tsx` | Real app routes (~10 today), one or more rendered _states_ each. | Every `@repo/ui` primitive the state renders, unioned via `aggregateKnownExceptions(names)` → `findA11yMetadata(name)` (returns `undefined` on a miss, never throws). |

The `/dev`-page metadata system itself (sidecars, the catalog generator, `getA11yMetadata`) is
documented in [`src/components/dev/DEVELOPER.md`](../src/components/dev/DEVELOPER.md) — this doc
covers the checking layer as a whole, especially the real-route side, which composes many
components rather than documenting one.

## What it does

- Runs axe-core's automated ruleset against the actual rendered DOM of every covered route/state
  and fails the build on any violation not explicitly on that state's known-exceptions list.
- Covers each real route's default render **and** a few deliberately chosen interactive states
  where the DOM meaningfully changes — currently: the home page's mobile-menu dialog (scanned
  scoped to the dialog's own subtree, not the whole document, since a background `aria-hidden`
  behind an open modal produces noise otherwise) and the apply flow's live required-field
  validation error (triggered by clearing a prefilled field, not just rendered with empty data —
  a real interaction, not a fixture shortcut).
- Reuses each page's real fetch-mock fixtures and route tree (`renderRoute` in
  `test/support/render-app.tsx`) rather than a synthetic harness, so what's tested is close to
  what actually renders in the app.
- Fails loudly on a genuine regression, and also on a broken/typo'd catalog reference
  (`getA11yMetadata`'s throw) — nothing here degrades to a silently-empty check.

## What it does **not** do — know these limits

- **Coverage is a hand-maintained list, not automatic.** A new route, or a new _state_ of an
  existing route, is invisible to the checker until someone adds an entry to `DEV_PAGES` (dev
  pages) or `CASES` (real pages). Adding a route to the app does not, by itself, get it checked.
- **axe-core only catches what's mechanically detectable.** It cannot judge whether alt text is
  _meaningful_, whether a heading hierarchy is logically sensible beyond well-formed structure,
  whether focus order makes sense across a multi-step flow, or how the page actually sounds
  through a screen reader. Passing this suite is a floor, not an accessibility sign-off — it does
  not replace a manual keyboard-only or assistive-tech walkthrough for anything that matters.
- **platform-web has zero coverage.** No `jest-axe` dependency, no test-utils, nothing. This is a
  deliberate, scoped-out follow-up, not an oversight — don't assume staff-console pages have been
  checked.
- **Only the states explicitly listed are exercised.** We don't open every dialog/drawer, don't
  exercise every form's every validation path, and don't simulate drag-and-drop interactions
  anywhere. A page can have an untested state even though the page itself is "covered."
- **No CI gate.** Both checkers run locally via the `lefthook` pre-push hook (as part of
  `npm run test`) — there is no GitHub Actions check enforcing this on pull requests today. A
  skipped hook (`--no-verify` or equivalent) bypasses both checkers entirely.
- **Known exceptions are opt-outs, not fixes.** A `knownExceptions` entry silences one axe rule for
  one component _everywhere that component is aggregated_ — an overly broad or poorly justified
  entry quietly weakens coverage on every real page that renders that component, not just the one
  it was added for.
- **Aggregation only reaches components that already have a catalog sidecar.** A real page's own
  composition-level violation — one not attributable to any single documented `@repo/ui`
  primitive — has no exceptions mechanism today. If this comes up, decide then whether it's a real
  bug to fix or needs a one-off carve-out; there's deliberately no page-level exceptions list to
  reach for instead — that would let a page silently accumulate suppressions no other page's
  checker run would ever surface.

## Keeping it useful going forward

### Adding a new real route or page (citizen-portal-web)

1. Add an entry — or several, one per meaningfully distinct state — to the `CASES` array in
   `test/live-pages-a11y.test.tsx`.
2. Reuse that page's existing test file's fetch-mock fixture and fixture shapes where one already
   exists, rather than inventing a parallel fixture that can drift from what the page's own tests
   actually exercise.
3. In `components:`, list every `@repo/ui` primitive **with a catalog sidecar** (currently:
   `accordion`, `badge`, `button`, `card`) that the scenario actually renders. This is what lets an
   already-justified, component-level exception carry over automatically — omitting a rendered
   component just means its exceptions (if any) won't apply, which fails safe (over-strict, not
   under-strict).
4. Only add an `interact` (+ `scanRoot`, if scoping to a subtree like an open dialog) for a state
   that's _meaningfully_ different from the default render. Don't try to enumerate every possible
   UI permutation — pick the ones a real user is likely to hit and that change the DOM in a way
   worth checking.

### When it fails

- **Real violation** → fix the underlying markup. Example: `account-page.tsx`'s `@mdi/react`
  `Icon` used `aria-label` while the library defaults to `role="presentation"` — a real
  `presentation-role-conflict`. Fixed by switching to the library's own `title` prop (which
  renders an inner `<title>` + `aria-labelledby` and omits the conflicting role), not by silencing
  the rule.
- **Genuinely justified** → add the exception to the _component's_ `.a11y.ts` sidecar (never a new
  per-page list) with a real justification string. It will suppress that rule for every scenario
  that lists that component in `components:`, not just the one that surfaced it — write the
  justification with that blast radius in mind.

### Signals to watch, not problems to pre-solve

- If `lefthook` pre-push time grows enough to be annoying as more routes get added, that's the
  trigger to revisit CI-level gating — not something to build ahead of the need.
- If a genuinely page-specific (non-component) violation shows up with no home in the aggregation
  model, decide case-by-case. Don't build a page-level exceptions mechanism preemptively for a
  case that hasn't occurred yet.
- platform-web's a11y bootstrapping (the `jest-axe` dependency, its own `test/support/a11y.ts`,
  route coverage) is deferred, not forgotten — revisit it once this pattern has proven out here.
