import { createContext, useContext } from 'react';

/**
 * Doc 281: whether the canvas is FILLABLE — its controls live, not inert. Only a flag: each control reads and writes
 * its answer through JSONForms, so no renderer needs the answers themselves. Off by default and inside a record's
 * item form, whose fields are dispatched against the root schema and could not write a real answer (rule 12).
 */
export const StudioFillContext = createContext(false);

export function useStudioFill(): boolean {
  return useContext(StudioFillContext);
}

/**
 * The live parts of a control (doc 281 rules 13-14): a press there never starts a drag, and a double-click there
 * never opens the options editor. Base UI's Checkbox / Switch / Radio / Combobox roots are spans, not inputs.
 */
export const LIVE_CONTROL =
  'input,textarea,select,option,[contenteditable]:not([contenteditable="false"]),[role="checkbox"],[role="switch"],[role="radio"],[role="combobox"]';
