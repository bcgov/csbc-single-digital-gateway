import { mdiAlertCircleOutline, mdiSourceBranch } from '@mdi/js';
import { Icon } from '@mdi/react';

/** Where the studio canvas keeps an element's rule, out of JSONForms' reach (doc 256 rule 7). */
export const STUDIO_RULE = 'x-studio-rule';

/** An element's rule on the canvas: the moved `x-studio-rule`, else a `rule` still in place. */
export function ruleOf(uischema: unknown): unknown {
  const element = uischema as Record<string, unknown>;
  return element[STUDIO_RULE] ?? element['rule'];
}

const EFFECT_WORDS: Readonly<Record<string, string>> = {
  SHOW: 'Shown when…',
  HIDE: 'Hidden when…',
  ENABLE: 'Enabled when…',
  DISABLE: 'Disabled when…',
};

/**
 * The pinned rule badge (doc 256 rules 6, 8): white on BC Gov blue at the element's top-right corner, without hover —
 * or in the warning colours with an alert icon when the rule tests a field it may not (a warning, not an error: the form
 * still works, the field just asks for data it hides or disables further down).
 */
export function RuleBadge({ rule, inError }: { rule: unknown; inError: boolean }) {
  const effect = (rule as { effect?: unknown } | undefined)?.effect;
  const title = inError
    ? 'This rule tests a field that comes after it'
    : (EFFECT_WORDS[String(effect)] ?? 'Has a rule');
  return (
    <span
      data-slot="studio-rule-badge"
      data-error={inError || undefined}
      role="img"
      aria-label={title}
      title={title}
      className={`pointer-events-auto absolute -top-2 -right-2 z-10 flex size-4 items-center justify-center rounded-sm shadow-xs ${
        inError
          ? 'bg-warning-surface text-icon-warning ring-1 ring-warning-border'
          : 'bg-bcgov-blue text-white'
      }`}
    >
      <Icon path={inError ? mdiAlertCircleOutline : mdiSourceBranch} size="12px" />
    </span>
  );
}
