import { createContext, useContext, type ReactNode } from 'react';
import type { EditableSection } from '../../uischema-edit/types';

/**
 * Windowed section editing — the renderer half of the mechanism (feature 175).
 *
 * A layout element marked `options.edit` in the uischema renders an Edit affordance beside its
 * heading. `@repo/react` must stay app-agnostic (it knows no routes and no BFF), so the consuming
 * app injects the affordance through this context — the same hooks-port shape as
 * `GeoDataProvider`/`useGeo` for the address control.
 *
 * **No provider → no button.** {@link useEditActions} returns `null`, every layout renders exactly
 * as it did before, and unit tests / the citizen portal / the form-builder preview are untouched.
 *
 * Mount the provider around the READ-ONLY surface only, never at the app root: the editable
 * renderer set shares these same layout components, so a root-mounted provider would render Edit
 * buttons *inside* the edit window it opened.
 */

/** What a layout hands the app to identify itself. The element itself stays in the library. */
export type EditActionSection = Omit<EditableSection, 'element'>;

export interface EditActions {
  /** Return the affordance for this section, or `null` to render none (e.g. non-draft versions). */
  renderAction: (section: EditActionSection) => ReactNode;
}

const EditActionsContext = createContext<EditActions | null>(null);

export function EditActionProvider({
  value,
  children,
}: {
  value: EditActions;
  children: ReactNode;
}) {
  return <EditActionsContext.Provider value={value}>{children}</EditActionsContext.Provider>;
}

/** The injected edit actions, or `null` when no provider is mounted. */
export function useEditActions(): EditActions | null {
  return useContext(EditActionsContext);
}

/**
 * The affordance for an element whose `options.edit` has been stamped with a resolved id, or `null`
 * when the element isn't editable / no provider is mounted / the app declined to render one.
 *
 * Reads the STAMPED option: `stampEditIds` resolves each id against the whole uischema before the
 * tree reaches JSONForms, because a renderer only ever sees its own element and cannot derive a
 * document-unique id on its own. An unstamped `edit: true` therefore renders nothing — the id would
 * be a guess, and a wrong id opens the wrong window.
 */
export function useEditAction(uischema: unknown, label: string): ReactNode {
  const actions = useEditActions();
  const edit = (uischema as { options?: { edit?: unknown } } | undefined)?.options?.edit;
  if (actions === null || edit === null || typeof edit !== 'object' || Array.isArray(edit)) {
    return null;
  }
  const { id, editor, actionLabel } = edit as {
    id?: unknown;
    editor?: unknown;
    actionLabel?: unknown;
  };
  if (typeof id !== 'string' || id === '') {
    return null;
  }
  return actions.renderAction({
    id,
    label,
    editor: typeof editor === 'string' && editor !== '' ? editor : null,
    actionLabel: typeof actionLabel === 'string' && actionLabel !== '' ? actionLabel : null,
  });
}
