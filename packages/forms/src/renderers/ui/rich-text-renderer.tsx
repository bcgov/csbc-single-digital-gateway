import { rankWith, type ControlProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { RichTextInput } from '@repo/ui/rich-text-input';
import { RichTextView } from '@repo/ui/rich-text-view';
import { ControlField } from './control-field';
import { richTextConfig } from './rich-text-options';
import { isRichTextControl, richTextIsEmpty, richTextValue } from './rich-text-value';

/**
 * Doc 207 rule 6: a Control bound to a rich text property.
 *
 * The rank ties with nothing — `isStringControl` cannot match an object, so there is no contention with
 * Input (1) or Textarea (2), and no `options.component` is involved. 7 continues the sequence.
 *
 * APPENDED to the ui set, never inserted: `integer-control.test.tsx` reaches the number entry by array
 * position (doc 205's cost).
 */
export const richTextTester: RankedTester = rankWith(7, isRichTextControl);

/**
 * Renders a rich text `Control` with `@repo/ui`'s Lexical editor (doc 37), or its read-only view.
 *
 * Rule 9: an emptied editor writes `undefined`, never an empty state — Ajv counts a present key as
 * present, so `required` would never fail on a field the citizen had cleared.
 */
function RichTextControl(props: ControlProps) {
  const { data, path, uischema, handleChange } = props;
  const config = richTextConfig(uischema.options);
  // Rule 4: never hand the editor a value it cannot seed from — a malformed object crashes Lexical, and
  // the code panel can author one.
  const value = richTextValue(data) ?? null;

  return (
    /**
     * NOT `noReadOnly` (doc 202 rule 50). That flag is for a control with no read-only REPRESENTATION, which
     * therefore falls back to `disabled`. This control has a better one — the view — so read-only is handled
     * here, and `disabled` keeps its own meaning.
     */
    <ControlField control={props}>
      {(input, ids) => {
        /**
         * Rule 14: READ-ONLY shows the view — the authored option or the form-level prop, either wins.
         *
         * DISABLED is NOT read-only, and conflating them was a bug found by hand: the studio canvas renders
         * every control disabled, so the field showed its label and NOTHING else (the view renders nothing
         * for empty content). A disabled Input still draws its box; a disabled rich text field draws its
         * editor chrome, non-editable, so an author can see the field they just added.
         */
        if (input.readOnly === true || config.readOnly === true)
          return <RichTextView value={value} />;
        return (
          <RichTextInput
            id={input.id}
            disabled={input.disabled}
            value={value}
            onChange={(next) => handleChange(path, richTextIsEmpty(next) ? undefined : next)}
            {...(config.toolbar === undefined ? {} : { toolbar: config.toolbar })}
            {...(config.placeholder === undefined ? {} : { placeholder: config.placeholder })}
            {...(config.rows === undefined ? {} : { rows: config.rows })}
            // Rule 8: the ContentEditable is a `div`, so `<label for>` cannot name it — the label's id is
            // forwarded instead. `ControlField` owns both ids.
            {...(ids.labelId === undefined ? {} : { 'aria-labelledby': ids.labelId })}
            {...(input['aria-describedby'] === undefined
              ? {}
              : { 'aria-describedby': input['aria-describedby'] })}
            {...(input['aria-invalid'] === undefined ? {} : { 'aria-invalid': true })}
          />
        );
      }}
    </ControlField>
  );
}

export const RichTextControlRenderer = withJsonFormsControlProps(RichTextControl);
