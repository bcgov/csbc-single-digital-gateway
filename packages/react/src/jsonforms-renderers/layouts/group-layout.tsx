import { rankWith, uiTypeIs } from '@jsonforms/core';
import type { GroupLayout, LayoutProps, RankedTester } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { useEditAction } from './edit-actions-context';

export const groupLayoutTester: RankedTester = rankWith(1, uiTypeIs('Group'));

function GroupLayoutComponent({ uischema, schema, path, enabled, visible }: LayoutProps) {
  const group = uischema as GroupLayout;
  // Windowed section editing (feature 175): `null` unless the group is marked `options.edit` AND
  // the host mounted an `EditActionProvider`. Called before the `visible` bail so the hook order
  // stays stable across renders.
  const editAction = useEditAction(uischema, typeof group.label === 'string' ? group.label : '');

  if (visible === false) {
    return null;
  }

  // The header block renders for a label OR a bare edit affordance — an unlabelled but editable
  // group still needs somewhere to put its button.
  return (
    <>
      {group.label || editAction ? (
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {group.label ? <h2 className="section-heading">{group.label}</h2> : null}
            {group.options?.description ? (
              <p className="text-sm text-muted-foreground">{group.options.description}</p>
            ) : null}
          </div>
          {editAction}
        </div>
      ) : null}

      {group.elements.map((child, index) => (
        <JsonFormsDispatch
          key={index}
          uischema={child}
          schema={schema}
          path={path}
          enabled={enabled}
        />
      ))}
    </>
  );
}

export const GroupLayoutRenderer = withJsonFormsLayoutProps(GroupLayoutComponent);
