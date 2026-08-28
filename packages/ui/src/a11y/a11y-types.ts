export type WcagLevel = 'A' | 'AA' | 'AAA';

export type WcagCriterion = {
  id: string;
  name: string;
  level: WcagLevel;
  /** The criterion's official W3C "Understanding" documentation page. */
  url: string;
};

export type AriaPattern = {
  name: string;
  url: string;
};

export type A11yRuleSeverity = 'required' | 'recommended' | 'forbidden';

export type A11yRule = {
  id: string;
  description: string;
  severity: A11yRuleSeverity;
};

export type A11yKnownException = {
  /** The axe-core rule id being suppressed for this component, e.g. "color-contrast". */
  axeRuleId: string;
  description: string;
  /** Mandatory — rendered on the /dev page itself as the visible audit trail for the exception. */
  justification: string;
};

export type ComponentA11yMetadata = {
  /** @repo/ui subpath name, or a pattern-page slug for pages with no single owning component. */
  component: string;
  wcagCriteria: WcagCriterion[];
  ariaPattern?: AriaPattern;
  rules: A11yRule[];
  commonMisuses: string[];
  notes: string[];
  knownExceptions: A11yKnownException[];
};
