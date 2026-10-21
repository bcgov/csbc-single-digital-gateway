import { mdiClose, mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog';
import { NativeSelect, NativeSelectOption } from '@repo/ui/native-select';
import { useState } from 'react';
import { ClauseFields } from '../clause-fields';
import { clauseFor, clauseIsSet, type CriterionField } from '../criteria';
import { newId } from '../element-ids';
import { kindsOf } from './rule-sources';
import {
  compileRule,
  readRule,
  RULE_EFFECTS,
  type RuleDraft,
  type RuleEffect,
  type StoredRule,
} from './rule-compile';

export const EFFECT_LABELS: Readonly<Record<RuleEffect, string>> = Object.freeze({
  SHOW: 'Show',
  HIDE: 'Hide',
  ENABLE: 'Enable',
  DISABLE: 'Disable',
});

/** The element whose rule is being edited. */
export interface RuleTarget {
  id: string;
  /** The element as the author knows it. */
  name: string;
  /** Its stored rule, if any. */
  rule: unknown;
  /** The fields it may test (doc 256 rule 4); the nearest source above it is last. */
  sources: readonly CriterionField[];
}

export interface RuleDialogProps {
  /** `undefined` keeps the dialog closed. */
  target: RuleTarget | undefined;
  /** Writes a rule, or `undefined` to remove it (rule 12). */
  onSave: (rule: StoredRule | undefined) => void;
  onClose: () => void;
}

/** Edits one element's rule as a draft (doc 256 rules 10-12); Save writes it, Cancel or Escape discards it. */
export function RuleDialog({ target, onSave, onClose }: RuleDialogProps) {
  return (
    <Dialog open={target !== undefined} onOpenChange={(open) => !open && onClose()}>
      {target !== undefined && (
        <RuleEditor key={target.id} target={target} onSave={onSave} onClose={onClose} />
      )}
    </Dialog>
  );
}

/** A new rule (rule 10): Show, all, one clause on the nearest source above. */
function newDraft(sources: readonly CriterionField[]): RuleDraft {
  const nearest = sources.at(-1);
  return {
    effect: 'SHOW',
    match: 'all',
    clauses: nearest === undefined ? [] : [clauseFor(nearest, newId())],
  };
}

function RuleEditor({ target, onSave, onClose }: RuleDialogProps & { target: RuleTarget }) {
  const read = readRule(target.rule, newId);
  const [draft, setDraft] = useState<RuleDraft>(() =>
    read.kind === 'draft' ? read.draft : newDraft(target.sources),
  );
  const exists = read.kind !== 'none';
  const set = (patch: Partial<RuleDraft>) => setDraft({ ...draft, ...patch });
  const canSave =
    read.kind !== 'custom' &&
    target.sources.length > 0 &&
    draft.clauses.length > 0 &&
    draft.clauses.every(clauseIsSet);

  return (
    <DialogContent
      className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
      data-slot="document-studio-rule-dialog"
    >
      <DialogHeader>
        <DialogTitle>Rule</DialogTitle>
        <DialogDescription>{target.name}</DialogDescription>
      </DialogHeader>
      {read.kind === 'custom' ? (
        <p role="note" className="text-sm text-muted-foreground">
          Custom rule (edit in Schema). It was written by hand, so it can be removed here but not
          edited.
        </p>
      ) : target.sources.length === 0 ? (
        <p role="note" className="text-sm text-muted-foreground">
          No fields come before this element to test.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <NativeSelect
              aria-label="Effect"
              value={draft.effect}
              onChange={(event) => set({ effect: event.target.value as RuleEffect })}
            >
              {RULE_EFFECTS.map((effect) => (
                <NativeSelectOption key={effect} value={effect}>
                  {EFFECT_LABELS[effect]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <span>this element when</span>
            {draft.clauses.length > 1 && (
              <>
                <NativeSelect
                  aria-label="Match"
                  value={draft.match}
                  onChange={(event) => set({ match: event.target.value === 'any' ? 'any' : 'all' })}
                >
                  <NativeSelectOption value="all">all</NativeSelectOption>
                  <NativeSelectOption value="any">any</NativeSelectOption>
                </NativeSelect>
                <span>of these are true</span>
              </>
            )}
          </div>
          <ol className="flex flex-col gap-2" aria-label="Conditions">
            {draft.clauses.map((clause, index) => (
              <li key={clause.id} className="flex items-center gap-2">
                <ClauseFields
                  clause={clause}
                  fields={target.sources}
                  onChange={(next) =>
                    set({ clauses: draft.clauses.map((c) => (c.id === clause.id ? next : c)) })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove condition ${index + 1}`}
                  onClick={() => set({ clauses: draft.clauses.filter((c) => c.id !== clause.id) })}
                >
                  <Icon path={mdiClose} size="14px" />
                </Button>
              </li>
            ))}
          </ol>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => {
              const nearest = target.sources.at(-1);
              if (nearest !== undefined)
                set({ clauses: [...draft.clauses, clauseFor(nearest, newId())] });
            }}
          >
            <Icon path={mdiPlus} size="14px" />
            Add condition
          </Button>
        </div>
      )}
      <DialogFooter className="sm:justify-between">
        <div>
          {exists && (
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => onSave(undefined)}
            >
              Remove rule
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {read.kind !== 'custom' && (
            <Button
              disabled={!canSave}
              onClick={() => onSave(compileRule(draft, kindsOf(target.sources)))}
            >
              Save
            </Button>
          )}
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
