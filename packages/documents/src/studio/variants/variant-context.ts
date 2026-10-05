import { createContext, useContext } from 'react';
import { DEFAULT_VARIANT } from '../document-types';

/** The variant the canvas is showing (doc 262): what studio renderers ask before offering a field-making action. */
export interface StudioVariant {
  name: string;
  isDefault: boolean;
}

export const StudioVariantContext = createContext<StudioVariant>({
  name: DEFAULT_VARIANT,
  isDefault: true,
});

export function useStudioVariant(): StudioVariant {
  return useContext(StudioVariantContext);
}

/** Why Copy is refused on a field outside default (doc 262 rule 13c). */
export const FIELD_COPY_REASON = 'A variant shows each field once';
