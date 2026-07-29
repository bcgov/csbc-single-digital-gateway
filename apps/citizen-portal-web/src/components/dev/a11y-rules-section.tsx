import type { A11yRuleSeverity, ComponentA11yMetadata } from '@repo/ui/a11y-types';
import { Badge } from '@repo/ui/badge';
import { ExternalLink } from '@/components/dev/external-link';

const SEVERITY_COLOR: Record<A11yRuleSeverity, 'blue' | 'grey' | 'red'> = {
  required: 'blue',
  recommended: 'grey',
  forbidden: 'red',
};

/** Renders a component's structured accessibility metadata (WCAG criteria, APG pattern, rules,
 *  notes, and any known/justified exceptions) — the machine-readable source for the prose
 *  previously hand-typed in each /dev reference page's Accessibility section. */
export function A11yRulesSection({ metadata }: { metadata: ComponentA11yMetadata }) {
  return (
    <div className="space-y-4">
      {(metadata.wcagCriteria.length > 0 || metadata.ariaPattern) && (
        <div className="flex flex-wrap items-center gap-2">
          {metadata.wcagCriteria.map((criterion) => (
            <Badge key={criterion.id} color="grey">
              WCAG {criterion.id} {criterion.name} ({criterion.level})
            </Badge>
          ))}
          {metadata.ariaPattern && (
            <ExternalLink href={metadata.ariaPattern.url} className="text-sm">
              {metadata.ariaPattern.name} (ARIA APG)
            </ExternalLink>
          )}
        </div>
      )}

      {(metadata.rules.length > 0 || metadata.notes.length > 0) && (
        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
          {metadata.rules.map((rule) => (
            <li key={rule.id}>
              <Badge color={SEVERITY_COLOR[rule.severity]} className="mr-1 align-middle">
                {rule.severity}
              </Badge>
              {rule.description}
            </li>
          ))}
          {metadata.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      {metadata.knownExceptions.length > 0 && (
        <div className="rounded-md border border-bcgov-gold p-3 text-sm space-y-2">
          <p className="font-medium">Known exceptions</p>
          <ul className="list-disc list-inside space-y-1">
            {metadata.knownExceptions.map((exception) => (
              <li key={exception.axeRuleId}>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {exception.axeRuleId}
                </code>{' '}
                — {exception.description} <em>({exception.justification})</em>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
