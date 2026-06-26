/**
 * Drag-and-drop id scheme + (de)serialization between the form model and the `@dnd-kit` sortable
 * "group record" used by the `move` helper. Pure + unit-tested so the dnd wiring stays thin.
 *
 * Sortable ids: a control is `f:<key>` (keys are unique across the whole form), a container is
 * `c:<rootIndex>`. Groups: the root list is `ROOT_GROUP`; each container's children are `g:<index>`.
 */
import type { ControlNode, FieldNode, FormModel } from './model';

export const ROOT_GROUP = 'root';
export const groupId = (containerIndex: number): string => `g:${containerIndex}`;
export const controlId = (key: string): string => `f:${key}`;
export const containerId = (index: number): string => `c:${index}`;

export type GroupRecord = Record<string, string[]>;

/** Build the `{ root: [...ids], 'g:<i>': [...childIds] }` record for the `move` helper. */
export function buildRecord(model: FormModel): GroupRecord {
  const record: GroupRecord = { [ROOT_GROUP]: [] };
  model.fields.forEach((field, i) => {
    if (field.kind === 'control') {
      record[ROOT_GROUP]?.push(controlId(field.key));
    } else {
      record[ROOT_GROUP]?.push(containerId(i));
      record[groupId(i)] = field.children.map((child) => controlId(child.key));
    }
  });
  return record;
}

/** Rebuild the model from a (post-`move`) record, resolving ids back to nodes in `model`. */
export function applyRecord(model: FormModel, record: GroupRecord): FormModel {
  const controlsByKey = new Map<string, ControlNode>();
  for (const field of model.fields) {
    if (field.kind === 'control') {
      controlsByKey.set(field.key, field);
    } else {
      field.children.forEach((child) => controlsByKey.set(child.key, child));
    }
  }
  const resolveControl = (id: string): ControlNode | undefined =>
    id.startsWith('f:') ? controlsByKey.get(id.slice(2)) : undefined;

  const fields: FieldNode[] = [];
  for (const id of record[ROOT_GROUP] ?? []) {
    if (id.startsWith('c:')) {
      const ci = Number(id.slice(2));
      const container = model.fields[ci];
      if (container === undefined || container.kind !== 'container') {
        continue;
      }
      const children = (record[groupId(ci)] ?? [])
        .map(resolveControl)
        .filter((c): c is ControlNode => c !== undefined);
      fields.push({ ...container, children });
    } else {
      const control = resolveControl(id);
      if (control !== undefined) {
        fields.push(control);
      }
    }
  }
  return { ...model, fields };
}
