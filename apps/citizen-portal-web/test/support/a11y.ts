import { axe, toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';

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
