import { axe, toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';
import { findA11yMetadata } from '@/a11y/a11y-catalog';

expect.extend(toHaveNoViolations);

interface KnownException {
  axeRuleId: string;
}

/** Runs axe against `container`, disabling ONLY the axe rules explicitly listed as
 *  knownExceptions for this component — every other violation still fails the test. */
export async function expectNoUnjustifiedA11yViolations(
  container: Element,
  knownExceptions: KnownException[] = [],
) {
  const rules = Object.fromEntries(
    knownExceptions.map((exception) => [exception.axeRuleId, { enabled: false }]),
  );
  const results = await axe(container, { rules });
  expect(results).toHaveNoViolations();
}

/** Unions the knownExceptions of every named component's catalog entry — for a real page that
 *  composes many `@repo/ui` primitives rather than documenting a single one. Names with no
 *  sidecar yet (most page-specific composition) simply contribute nothing, rather than throwing
 *  like `getA11yMetadata` does for a /dev reference page. */
export function aggregateKnownExceptions(componentNames: string[]): KnownException[] {
  return componentNames.flatMap((name) => findA11yMetadata(name)?.knownExceptions ?? []);
}
