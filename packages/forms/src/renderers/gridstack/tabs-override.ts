import { createContext, useContext } from 'react';
import type { TabsComponent } from './tabs-options';

/**
 * Rules 31-32: the component a preview is FORCING, overriding whatever the element authored — or `null`
 * everywhere else, which is everywhere but the studio's preview.
 *
 * A context rather than a key on JSONForms' `config` (where doc 211 put `presentation`): nothing but this
 * renderer reads it, and the three preview paths each build their own `config`, so threading a key through all
 * of them to reach one component is more seam than the value is worth. It is never authored — only the
 * component drawing the preview provides one.
 */
const TabsOverrideContext = createContext<TabsComponent | null>(null);

export const TabsOverrideProvider = TabsOverrideContext.Provider;

export function useTabsOverride(): TabsComponent | null {
  return useContext(TabsOverrideContext);
}
