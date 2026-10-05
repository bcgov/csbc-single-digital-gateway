import { LOCKED } from '../capabilities/governance';
import { Button } from '@repo/ui/button';
import { clauseSummary, type CriterionField } from '../criteria';
import type { DocumentContent } from '../document-types';
import { findById } from '../element-ids';
import { FoldableSection } from '../foldable-section';
import { SECTION_CLASSES } from '../inspector/inspector-renderers';
import { readRule } from './rule-compile';
import { EFFECT_LABELS } from './rule-dialog';
import { ruleProblems } from './rule-problems';
import { ruleSources } from './rule-sources';
import { NO_RULE_SOURCES } from '../../renderers/studio/element-actions';

/** Rule 13: the rule in words — `Show when all of: Region equals North; Age is at least 18`. */
export function ruleSummary(rule: unknown, fields: readonly CriterionField[]): string {
  const read = readRule(rule, () => '');
  if (read.kind === 'none') return 'No rule';
  if (read.kind === 'custom') return 'Custom rule (edit in Schema)';
  const { effect, match, clauses } = read.draft;
  const words = clauses.map((clause) => clauseSummary(clause, fields));
  const head = `${EFFECT_LABELS[effect]} when`;
  return clauses.length === 1 ? `${head} ${words[0]}` : `${head} ${match} of: ${words.join('; ')}`;
}

/**
 * The inspector's Rule section (doc 256 rule 13): the element's rule in words, any fields it may not test in red
 * (rule 6), and Edit rule / Add rule — the dialog is where it is edited.
 */
export function InspectorRule({
  content,
  elementId,
  locked = false,
  onEdit,
}: {
  content: DocumentContent;
  elementId: string;
  /** The pinned template locks the Rule (doc 259 rule 17): Add / Edit rule disabled. */
  locked?: boolean;
  onEdit: () => void;
}) {
  const rule = findById(content.variants.default, elementId)?.['rule'];
  const problems = ruleProblems(content, elementId);
  // A field the rule may not test is still named by its title — in the summary and in the warning.
  const properties = content.schema['properties'] as
    | Record<string, { title?: unknown }>
    | undefined;
  const nameOf = (key: string) => {
    const title = properties?.[key]?.title;
    return typeof title === 'string' && title !== '' ? title : key;
  };
  const names = problems.map(nameOf);
  const sources = ruleSources(content, elementId);
  // Rule 9b: with no field above to test there is nothing to add — an existing rule stays editable.
  const unavailable = rule === undefined && sources.length === 0;
  const fields = [
    ...sources,
    ...problems.map((key): CriterionField => ({ key, label: nameOf(key), kind: 'text' })),
  ];
  return (
    <FoldableSection
      name="Rule"
      {...SECTION_CLASSES}
      className={`${SECTION_CLASSES.className} mt-2`}
    >
      <p data-slot="inspector-rule-summary" className="text-xs">
        {ruleSummary(rule, fields)}
      </p>
      {problems.length > 0 && (
        <p role="alert" className="text-xs text-warning-text">
          This rule tests a field that comes after it: {names.join(', ')}.
        </p>
      )}
      {locked && (
        <p data-slot="inspector-rule-locked" className="text-xs text-muted-foreground">
          {LOCKED}.
        </p>
      )}
      {!locked && unavailable && (
        <p data-slot="inspector-rule-unavailable" className="text-xs text-muted-foreground">
          {NO_RULE_SOURCES}.
        </p>
      )}
      <Button
        size="sm"
        variant="outline"
        className="mt-1 h-7 w-full text-xs"
        disabled={locked || unavailable}
        onClick={onEdit}
      >
        {rule === undefined ? 'Add rule' : 'Edit rule'}
      </Button>
    </FoldableSection>
  );
}
