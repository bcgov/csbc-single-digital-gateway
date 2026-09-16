import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@repo/ui/field';
import { RadioGroup, RadioGroupItem } from '@repo/ui/radio-group';
import { useId } from 'react';
import type { FormChoice } from '../../types/index';
import { FORM_CHOICES } from './document-source';

interface FormChoiceCardsProps {
  /** The currently selected choice. Selection alone never creates anything (doc 200 rule 11). */
  readonly value: FormChoice;
  /** Names the group — a radiogroup is not a labelable element, so it is labelled by reference. */
  readonly labelledBy?: string;
  onValueChange(choice: FormChoice): void;
}

/** The four choices, labelled and described (doc 200 rule 8). Order comes from `FORM_CHOICES`, never from this map. */
const CHOICES: Record<FormChoice, { readonly label: string; readonly description: string }> = {
  'new-multi-stage': {
    label: 'New Multi-Stage Form',
    description: 'A blank flow. Add stages and connect them into the path an applicant follows.',
  },
  'new-basic': {
    label: 'New Basic Form',
    description: 'A blank single-page form. Add fields and lay them out on one canvas.',
  },
  'template-multi-stage': {
    label: 'Multi-Stage Template',
    description: 'A short sample flow to preview how stages, forms and connections work.',
  },
  'template-basic': {
    label: 'Basic Form Template',
    description: 'A sample single-page form to preview the fields and layouts on offer.',
  },
};

/**
 * The New form dialog's four choices as one radio group of cards (doc 200 rule 10) — a studio-local composition of
 * `@repo/ui/radio-group` and `@repo/ui/field`'s card styling, because nothing like it exists in `@repo/ui`.
 *
 * TRAP (doc 188): Base UI's Radio puts the `id` prop on its HIDDEN `<input>` — the visible root is a `span` — so the
 * `FieldLabel htmlFor={id}` wrapping the whole card names the radio and a click anywhere on the card selects it. The
 * label wraps the card rather than sitting beside it for exactly that reason. Arrow keys are left entirely to the
 * native radio-group behaviour (rule 10): nothing here intercepts a key.
 */
export function FormChoiceCards({ value, labelledBy, onValueChange }: FormChoiceCardsProps) {
  const prefix = useId();

  return (
    <RadioGroup
      value={value}
      onValueChange={(next: FormChoice) => onValueChange(next)}
      // exactOptionalPropertyTypes: an absent label must be an ABSENT KEY, never an explicit undefined.
      {...(labelledBy === undefined ? {} : { 'aria-labelledby': labelledBy })}
      className="gap-2"
    >
      {FORM_CHOICES.map((choice) => {
        const id = `${prefix}-${choice}`;
        const titleId = `${id}-title`;
        const descriptionId = `${id}-description`;
        const { label, description } = CHOICES[choice];

        return (
          <FieldLabel key={choice} htmlFor={id} className="items-start">
            <Field orientation="horizontal" className="gap-3">
              <RadioGroupItem
                id={id}
                value={choice}
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
              />
              <FieldContent>
                <FieldTitle id={titleId} className="text-sm">
                  {label}
                </FieldTitle>
                <FieldDescription id={descriptionId}>{description}</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        );
      })}
    </RadioGroup>
  );
}
